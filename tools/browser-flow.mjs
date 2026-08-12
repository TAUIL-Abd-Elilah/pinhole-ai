import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import axe from 'axe-core'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : chromium.executablePath())
const viewport = {
  width: Number(process.env.PINHOLE_VIEWPORT_WIDTH ?? 1440),
  height: Number(process.env.PINHOLE_VIEWPORT_HEIGHT ?? 1000),
}
const screenshotPath = process.env.PINHOLE_SCREENSHOT ?? '.cache/pinhole-search.png'
const modelTimeout = Number(process.env.PINHOLE_MODEL_TIMEOUT ?? 120_000)
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.width <= 760 })
const errors = []
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})

try {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForFunction(
    () => document.querySelector('.engine-state')?.textContent?.includes('Local AI ready'),
    undefined,
    { timeout: modelTimeout },
  )
  await page.getByRole('button', { name: 'Load demo roll' }).click()
  await page.waitForFunction(
    () => document.querySelector('.instrument-strip dd')?.textContent === '12',
    undefined,
    { timeout: 120_000 },
  )

  await page.getByLabel('Describe what you remember').fill('golden dog in the snow')
  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () => document.querySelector('.photo-grid')?.getAttribute('data-results') === 'ranked',
    undefined,
    { timeout: 30_000 },
  )

  const topResult = await page.locator('.photo-card').first().locator('figcaption span').innerText()
  const runtime = await page.locator('.privacy-proof small').innerText()
  const firstSearchMetrics = await page.locator('.instrument-strip dd').allInnerTexts()
  const crossOriginIsolated = await page.evaluate(() => globalThis.crossOriginIsolated)
  const controlledByServiceWorker = await page.evaluate(() =>
    Boolean(navigator.serviceWorker?.controller),
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
  console.log(
    JSON.stringify(
      {
        topResult,
        photoCount: await page.locator('.photo-card').count(),
        firstSearchMetrics,
        repeatedQuery: { topResult: repeatedTopResult, textMetric: repeatedTextMetric },
        engine: await page.locator('.engine-state').innerText(),
        runtime,
        crossOriginIsolated,
        controlledByServiceWorker,
        accessibilityViolations,
        viewport,
        screenshotPath,
        errors,
      },
      null,
      2,
    ),
  )
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
