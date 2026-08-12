import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewport = {
  width: Number(process.env.PINHOLE_VIEWPORT_WIDTH ?? 1440),
  height: Number(process.env.PINHOLE_VIEWPORT_HEIGHT ?? 1000),
}
const screenshotPath = process.env.PINHOLE_SCREENSHOT ?? '.cache/pinhole-search.png'
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
    { timeout: 120_000 },
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
  await page.waitForTimeout(900)
  await mkdir('.cache', { recursive: true })
  await page.screenshot({
    path: screenshotPath,
    fullPage: process.env.PINHOLE_FULL_PAGE !== 'false',
  })
  console.log(
    JSON.stringify(
      {
        topResult,
        photoCount: await page.locator('.photo-card').count(),
        metrics: await page.locator('.instrument-strip dd').allInnerTexts(),
        engine: await page.locator('.engine-state').innerText(),
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
  if (errors.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
