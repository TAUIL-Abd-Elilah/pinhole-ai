import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium } from 'playwright-core'
import axe from 'axe-core'
import { browserExecutablePath } from './browser-executable.mjs'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const executablePath = browserExecutablePath()
const viewport = {
  width: Number(process.env.PINHOLE_VIEWPORT_WIDTH ?? 1440),
  height: Number(process.env.PINHOLE_VIEWPORT_HEIGHT ?? 1000),
}
const screenshotPath = process.env.PINHOLE_SCREENSHOT ?? '.cache/pinhole-search.png'
const reportPath = process.env.PINHOLE_REPORT
const modelTimeout = Number(process.env.PINHOLE_MODEL_TIMEOUT ?? 120_000)
const networkProfileName = process.env.PINHOLE_NETWORK_PROFILE ?? 'native'
const networkProfiles = {
  native: null,
  'fast-4g': {
    downloadMbps: 4,
    uploadMbps: 3,
    latencyMs: 50,
  },
}
const networkProfile = networkProfiles[networkProfileName]
if (networkProfile === undefined) {
  throw new Error(`Unknown PINHOLE_NETWORK_PROFILE: ${networkProfileName}`)
}
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.width <= 760 })
const errors = []
const runtimeArtifacts = new Map()
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})
page.on('response', async (response) => {
  const url = response.url()
  if (!/\.(?:mjs|onnx|wasm)(?:$|\?)/i.test(url)) return
  const headers = await response.allHeaders().catch(() => ({}))
  runtimeArtifacts.set(url, {
    url,
    status: response.status(),
    responseContentLength: Number(headers['content-length'] ?? 0) || null,
    contentEncoding: headers['content-encoding'] ?? null,
    fromServiceWorker: response.fromServiceWorker(),
  })
})

try {
  if (networkProfile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: networkProfile.latencyMs,
      downloadThroughput: (networkProfile.downloadMbps * 1024 * 1024) / 8,
      uploadThroughput: (networkProfile.uploadMbps * 1024 * 1024) / 8,
    })
  }
  const flowStartedAt = performance.now()
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForFunction(
    () => document.querySelector('.engine-state')?.textContent?.includes('Local AI ready'),
    undefined,
    { timeout: modelTimeout },
  )
  const localAiReadyMs = Math.round(performance.now() - flowStartedAt)
  await page.getByRole('button', { name: 'Load demo roll' }).click()
  await page.waitForFunction(
    () => document.querySelector('.instrument-strip dd')?.textContent === '12',
    undefined,
    { timeout: 120_000 },
  )
  const demoIndexedMs = Math.round(performance.now() - flowStartedAt)

  await page.getByLabel('Describe what you remember').fill('golden dog in the snow')
  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () => document.querySelector('.photo-grid')?.getAttribute('data-results') === 'ranked',
    undefined,
    { timeout: 30_000 },
  )
  const firstResultMs = Math.round(performance.now() - flowStartedAt)

  const topResult = await page.locator('.photo-card').first().locator('figcaption span').innerText()
  const runtime = await page.locator('.privacy-proof small').innerText()
  const firstSearchMetrics = await page.locator('.instrument-strip dd').allInnerTexts()
  const crossOriginIsolated = await page.evaluate(() => globalThis.crossOriginIsolated)
  const controlledByServiceWorker = await page.evaluate(() =>
    Boolean(navigator.serviceWorker?.controller),
  )
  const loadedRuntimeArtifacts = [...runtimeArtifacts.values()]
  const knownResponseBytes = loadedRuntimeArtifacts.reduce(
    (sum, artifact) => sum + (artifact.responseContentLength ?? 0),
    0,
  )
  await page.waitForTimeout(1100)
  await page.addScriptTag({ content: axe.source })
  const accessibilityViolations = await page.evaluate(async () => {
    const report = await globalThis.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      },
    })
    return report.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
  })
  await mkdir('.cache', { recursive: true })
  await page.screenshot({
    path: screenshotPath,
    fullPage: process.env.PINHOLE_FULL_PAGE !== 'false',
  })

  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () => document.querySelectorAll('.instrument-strip dd')[3]?.textContent === 'cached',
    undefined,
    { timeout: 30_000 },
  )
  const repeatedTopResult = await page.locator('.photo-card').first().locator('figcaption span').innerText()
  const repeatedTextMetric = await page.locator('.instrument-strip dd').nth(3).innerText()
  const userAgent = await page.evaluate(() => navigator.userAgent)
  const report = {
    testedAt: new Date().toISOString(),
    target,
    topResult,
    photoCount: await page.locator('.photo-card').count(),
    firstSearchMetrics,
    repeatedQuery: { topResult: repeatedTopResult, textMetric: repeatedTextMetric },
    engine: await page.locator('.engine-state').innerText(),
    runtime,
    crossOriginIsolated,
    controlledByServiceWorker,
    environment: {
      browser: browser.version(),
      node: process.version,
      hostPlatform: process.platform,
      hostArchitecture: process.arch,
      userAgent,
    },
    networkProfile: { name: networkProfileName, ...networkProfile },
    coldFlowMs: { localAiReady: localAiReadyMs, demoIndexed: demoIndexedMs, firstResult: firstResultMs },
    runtimeArtifacts: loadedRuntimeArtifacts,
    knownResponseBytes,
    accessibilityViolations,
    viewport,
    screenshotPath,
    errors,
  }
  if (reportPath) {
    await mkdir(dirname(reportPath), { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
  console.log(JSON.stringify(report, null, 2))
  if (!topResult.toLowerCase().includes('golden dog')) {
    throw new Error(`Unexpected top result: ${topResult}`)
  }
  if (!runtime.toLowerCase().includes('wasm simd')) {
    throw new Error(`Expected the WASM SIMD search path, received: ${runtime}`)
  }
  if (!repeatedTopResult.toLowerCase().includes('golden dog') || repeatedTextMetric !== 'cached') {
    throw new Error('Repeated-query embedding cache did not preserve the ranked result')
  }
  if (process.env.PINHOLE_EXPECT_ISOLATED === 'true' && !crossOriginIsolated) {
    throw new Error('Expected a cross-origin-isolated page')
  }
  if (loadedRuntimeArtifacts.some(({ url }) => url.includes('.asyncify.'))) {
    throw new Error('The heavier Asyncify runtime was downloaded instead of the pinned plain runtime')
  }
  if (
    !loadedRuntimeArtifacts.some(({ url }) =>
      new URL(url).pathname.endsWith('/wasm/ort-wasm-simd-threaded.wasm'),
    )
  ) {
    throw new Error('The pinned plain ONNX Runtime WASM artifact was not observed')
  }
  if (accessibilityViolations.length > 0) {
    throw new Error(`WCAG violations: ${JSON.stringify(accessibilityViolations)}`)
  }
  if (errors.length > 0) process.exitCode = 1
} catch (error) {
  console.error(
    JSON.stringify(
      {
        failure: error instanceof Error ? error.message : String(error),
        url: page.url(),
        body: await page.locator('body').innerText().catch(() => ''),
        crossOriginIsolated: await page.evaluate(() => globalThis.crossOriginIsolated).catch(() => null),
        controlledByServiceWorker: await page
          .evaluate(() => Boolean(navigator.serviceWorker?.controller))
          .catch(() => null),
        errors,
      },
      null,
      2,
    ),
  )
  throw error
} finally {
  await browser.close()
}
