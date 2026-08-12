import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const timeout = Number(process.env.PINHOLE_SMOKE_TIMEOUT ?? 120_000)
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : chromium.executablePath())
const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []

page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})

await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
let ready = false
try {
  await page.waitForFunction(
    () => document.querySelector('.engine-state')?.textContent?.includes('Local AI ready'),
    undefined,
    { timeout },
  )
  ready = true
} catch (error) {
  errors.push(`readiness: ${error instanceof Error ? error.message : String(error)}`)
}
await mkdir('.cache', { recursive: true })
await page.screenshot({ path: '.cache/pinhole-home.png', fullPage: true })

console.log(
  JSON.stringify(
    {
      title: await page.title(),
      heading: await page.locator('h1').innerText(),
      engine: await page.locator('.engine-state').innerText(),
      alert: await page.locator('[role="alert"]').allInnerTexts(),
      crossOriginIsolated: await page.evaluate(() => crossOriginIsolated),
      ready,
      errors,
    },
    null,
    2,
  ),
)

await browser.close()
if (!ready || errors.length > 0) process.exitCode = 1
