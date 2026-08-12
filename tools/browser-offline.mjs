import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const target = process.env.PINHOLE_URL ?? 'https://tauil-abd-elilah.github.io/pinhole-ai/'
const executablePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
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
  await mkdir('.cache', { recursive: true })
  await page.screenshot({ path: '.cache/pinhole-offline.png', fullPage: false })

  const result = {
    onlineTopResult,
    offlineTopResult,
    photoCount: await page.locator('.photo-card').count(),
    navigatorOnlineSignal: await page.evaluate(() => navigator.onLine),
    networkProbeBlocked,
    controlledByServiceWorker: await page.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
    engine: await page.locator('.engine-state').innerText(),
    errors,
  }
  console.log(JSON.stringify(result, null, 2))

  if (!onlineTopResult.toLowerCase().includes('golden dog')) process.exitCode = 1
  if (!offlineTopResult.toLowerCase().includes('coffee')) process.exitCode = 1
  if (!networkProbeBlocked || errors.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
