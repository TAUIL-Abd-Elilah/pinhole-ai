import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { browserExecutablePath } from './browser-executable.mjs'

const target = process.env.PINHOLE_URL ?? 'https://tauil-abd-elilah.github.io/pinhole-ai/'
const executablePath = browserExecutablePath()
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const page = await context.newPage()
const errors = []

page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})

async function waitForModel() {
  await page.waitForFunction(
    () => document.querySelector('.engine-state')?.textContent?.includes('Local AI ready'),
    undefined,
    { timeout: 120_000 },
  )
}

async function searchFor(query) {
  await page.getByLabel('Describe what you remember').fill(query)
  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () => document.querySelector('.photo-grid')?.getAttribute('data-results') === 'ranked',
    undefined,
    { timeout: 30_000 },
  )
  return page.locator('.photo-card').first().locator('figcaption span').innerText()
}

try {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await waitForModel()
  await page.evaluate(() => navigator.serviceWorker?.ready)
  await page.getByRole('button', { name: 'Load demo roll' }).click()
  await page.waitForFunction(
    () => document.querySelector('.instrument-strip dd')?.textContent === '12',
    undefined,
    { timeout: 120_000 },
  )
  const onlineTopResult = await searchFor('golden dog in the snow')

  errors.length = 0
  await context.setOffline(true)
  await page.waitForFunction(
    () => document.querySelector('.engine-state--offline')?.textContent?.includes('local search active'),
    undefined,
    { timeout: 10_000 },
  )
  const offlineStateBeforeReload = await page.locator('.engine-state--offline').innerText()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(150)
  await mkdir('.cache', { recursive: true })
  await page.screenshot({ path: '.cache/pinhole-offline-state.png', fullPage: false })
  const networkProbeBlocked = await page.evaluate(async () => {
    try {
      const probe = new URL(`offline-probe-${Date.now()}.txt`, document.baseURI)
      await fetch(probe, { cache: 'no-store' })
      return false
    } catch {
      return true
    }
  })
  errors.length = 0
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 })
  await waitForModel()
  const offlineTopResult = await searchFor('coffee on an open book')
  await page.waitForTimeout(700)
  await page.screenshot({ path: '.cache/pinhole-offline.png', fullPage: false })

  const result = {
    onlineTopResult,
    offlineTopResult,
    photoCount: await page.locator('.photo-card').count(),
    navigatorOnlineSignal: await page.evaluate(() => navigator.onLine),
    networkProbeBlocked,
    controlledByServiceWorker: await page.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
    crossOriginIsolated: await page.evaluate(() => globalThis.crossOriginIsolated),
    engine: await page.locator('.engine-state').innerText(),
    offlineStateBeforeReload,
    offlineStateAfterReload: await page.locator('.engine-state--offline').textContent().catch(() => null),
    offlineStateScreenshot: '.cache/pinhole-offline-state.png',
    errors,
  }
  console.log(JSON.stringify(result, null, 2))

  if (!onlineTopResult.toLowerCase().includes('golden dog')) process.exitCode = 1
  if (!offlineTopResult.toLowerCase().includes('coffee')) process.exitCode = 1
  if (!networkProbeBlocked || errors.length > 0) process.exitCode = 1
  if (!offlineStateBeforeReload.toLowerCase().includes('local search active')) process.exitCode = 1
  if (process.env.PINHOLE_EXPECT_ISOLATED === 'true' && !result.crossOriginIsolated) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
