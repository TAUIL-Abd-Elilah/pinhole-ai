import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : chromium.executablePath())
const output = process.env.PINHOLE_VIDEO ?? '.cache/video/pinhole-demo.webm'
const videoDirectory = '.cache/video/playwright'
const viewport = { width: 1280, height: 720 }

await mkdir(videoDirectory, { recursive: true })
const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDirectory, size: viewport },
})
const page = await context.newPage()
const errors = []
let firstResult = ''
let offlineTopResult = ''
let networkForcedOffline = false

page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})

const pause = (milliseconds) => page.waitForTimeout(milliseconds)

async function showCard({ kicker, title, body, stats = [], footer = '' }) {
  await page.evaluate(
    ({ kicker, title, body, stats, footer }) => {
      document.querySelector('#pinhole-video-card')?.remove()
      if (!document.querySelector('#pinhole-video-style')) {
        const style = document.createElement('style')
        style.id = 'pinhole-video-style'
        style.textContent = `
          #pinhole-video-card {
            position: fixed; inset: 0; z-index: 2147483647;
            display: grid; grid-template-rows: auto 1fr auto;
            padding: 52px 68px 42px; color: #14282c; background:
              linear-gradient(90deg, transparent 49.9%, rgba(20,40,44,.055) 50%, transparent 50.1%),
              #dce7e8; opacity: 0; transition: opacity 500ms ease;
            font-family: 'Spline Sans Variable', Arial, sans-serif;
          }
          #pinhole-video-card.visible { opacity: 1; }
          #pinhole-video-card::before {
            content: ''; position: absolute; right: 68px; top: 52px;
            width: 28px; height: 28px; border: 1.5px solid #14282c;
            border-radius: 50%; box-shadow: inset 0 0 0 9px #dce7e8, inset 0 0 0 14px #ed6547;
          }
          #pinhole-video-card .kicker {
            margin: 0; color: #ed6547; font: 500 12px/1.2 'IBM Plex Mono', monospace;
            letter-spacing: .15em; text-transform: uppercase;
          }
          #pinhole-video-card .content { align-self: center; max-width: 1110px; }
          #pinhole-video-card h2 {
            max-width: 1050px; margin: 0; white-space: pre-line;
            font-family: 'Bricolage Grotesque Variable', Arial, sans-serif;
            font-size: 78px; font-weight: 480; line-height: .92; letter-spacing: -.065em;
          }
          #pinhole-video-card .body {
            max-width: 760px; margin: 28px 0 0; color: #4f696d;
            font-size: 20px; line-height: 1.5;
          }
          #pinhole-video-card .stats {
            margin-top: 42px; display: grid; grid-template-columns: repeat(3, 1fr);
            border-top: 1px solid rgba(20,40,44,.35); border-bottom: 1px solid rgba(20,40,44,.35);
          }
          #pinhole-video-card .stat { padding: 23px 28px 22px; border-left: 1px solid rgba(20,40,44,.22); }
          #pinhole-video-card .stat:first-child { padding-left: 0; border-left: 0; }
          #pinhole-video-card .stat strong {
            display: block; font-family: 'Bricolage Grotesque Variable', Arial, sans-serif;
            color: #284c52; font-size: 44px; font-weight: 580; letter-spacing: -.045em;
          }
          #pinhole-video-card .stat span {
            display: block; margin-top: 5px; color: #4f696d;
            font: 500 10px/1.3 'IBM Plex Mono', monospace; letter-spacing: .08em;
            text-transform: uppercase;
          }
          #pinhole-video-card .footer {
            display: flex; justify-content: space-between; color: #4f696d;
            font: 500 10px/1.3 'IBM Plex Mono', monospace; letter-spacing: .08em;
            text-transform: uppercase;
          }
          #pinhole-video-card .footer strong { color: #ed6547; font-weight: 500; }
        `
        document.head.append(style)
      }

      const card = document.createElement('section')
      card.id = 'pinhole-video-card'
      const statMarkup = stats.length
        ? `<div class="stats">${stats
            .map(
              ({ value, label }) =>
                `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`,
            )
            .join('')}</div>`
        : ''
      card.innerHTML = `
        <p class="kicker">${kicker}</p>
        <div class="content">
          <h2>${title}</h2>
          ${body ? `<p class="body">${body}</p>` : ''}
          ${statMarkup}
        </div>
        <div class="footer"><span>${footer}</span><strong>browser ⟶ nowhere</strong></div>
      `
      document.body.append(card)
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')))
    },
    { kicker, title, body, stats, footer },
  )
  await pause(600)
}

async function hideCard() {
  await page.evaluate(() => document.querySelector('#pinhole-video-card')?.classList.remove('visible'))
  await pause(550)
  await page.evaluate(() => document.querySelector('#pinhole-video-card')?.remove())
}

async function enableOfflineProof() {
  await context.setOffline(true)
  networkForcedOffline = await page.evaluate(() => !navigator.onLine)
  if (!networkForcedOffline) throw new Error('Browser did not enter the forced-offline state')

  await page.evaluate(() => {
    if (!document.querySelector('#pinhole-offline-proof-style')) {
      const style = document.createElement('style')
      style.id = 'pinhole-offline-proof-style'
      style.textContent = `
        #pinhole-offline-proof {
          position: fixed; top: 18px; right: 18px; z-index: 2147483000;
          display: flex; align-items: center; gap: 9px; padding: 10px 13px;
          border: 1px solid rgba(220,231,232,.32); border-radius: 999px;
          color: #dce7e8; background: #14282c;
          box-shadow: 0 10px 28px rgba(20,40,44,.22);
          font: 500 10px/1 'IBM Plex Mono', monospace;
          letter-spacing: .1em; text-transform: uppercase;
        }
        #pinhole-offline-proof::before {
          content: ''; width: 8px; height: 8px; border-radius: 50%;
          background: #ed6547; box-shadow: 0 0 0 3px rgba(237,101,71,.2);
        }
      `
      document.head.append(style)
    }
    const badge = document.createElement('div')
    badge.id = 'pinhole-offline-proof'
    badge.textContent = 'Browser network forced offline'
    document.body.append(badge)
  })
  await pause(650)
}

try {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForFunction(
    () => document.querySelector('.engine-state')?.textContent?.includes('Local AI ready'),
    undefined,
    { timeout: 120_000 },
  )

  await showCard({
    kicker: 'Arm Mobile AI · fully on-device',
    title: 'The photo you remember.\nWithout the upload.',
    body: 'Pinhole is private semantic camera-roll search for Arm-powered Android devices.',
    footer: 'Pinhole · local photo intelligence',
  })
  await pause(4300)
  await hideCard()
  await pause(3200)

  await page.getByRole('button', { name: 'Load demo roll' }).click()
  await page.waitForFunction(
    () => document.querySelector('.instrument-strip dd')?.textContent === '12',
    undefined,
    { timeout: 120_000 },
  )
  await pause(1800)

  const search = page.getByLabel('Describe what you remember')
  await search.pressSequentially('golden dog in the snow', { delay: 78 })
  await pause(700)
  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () => document.querySelector('.photo-grid')?.getAttribute('data-results') === 'ranked',
    undefined,
    { timeout: 30_000 },
  )
  await pause(6500)

  firstResult = await page.locator('.photo-card').first().locator('figcaption span').innerText()
  if (!firstResult.toLowerCase().includes('golden dog')) {
    throw new Error(`Unexpected first result: ${firstResult}`)
  }

  await showCard({
    kicker: 'Measured twice on real Arm64 · medians, not best runs',
    title: 'Less work.\nSame answers.',
    body: 'Exact graph surgery removes the vision transformer from every text query. Compact vectors are scanned by one signed-INT8 SIMD call.',
    stats: [
      { value: '11.47×', label: 'faster text query · 1 thread' },
      { value: '15.44×', label: 'faster isolated INT8 scan' },
      { value: '−74.8%', label: 'index memory' },
    ],
    footer: 'Bit-for-bit model parity · 99.6% Recall@10',
  })
  await pause(8900)
  await hideCard()

  await enableOfflineProof()
  await search.fill('coffee on an open book')
  await page.getByRole('button', { name: 'Find it' }).click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('.photo-card figcaption span')
        ?.textContent?.toLowerCase()
        .includes('coffee'),
    undefined,
    { timeout: 30_000 },
  )
  offlineTopResult = await page.locator('.photo-card').first().locator('figcaption span').innerText()
  await pause(5200)

  await showCard({
    kicker: 'Browser network forced offline · search completed',
    title: 'Photos in.\nNothing out.',
    body: 'The vision model wakes only for imports. IndexedDB keeps a WebP thumbnail and a 516-byte embedding—not the original. The second search just completed with browser networking disabled.',
    stats: [
      { value: '15.37 MB', label: 'text-only query graph' },
      { value: '8.96 MB', label: 'lazy vision graph' },
      { value: '434 B', label: 'WASM SIMD kernel' },
    ],
    footer: 'No account · no API key · no analytics',
  })
  await pause(8400)

  await page.evaluate(() => {
    const card = document.querySelector('#pinhole-video-card')
    if (!card) return
    const kicker = card.querySelector('.kicker')
    const title = card.querySelector('h2')
    const body = card.querySelector('.body')
    const stats = card.querySelector('.stats')
    const footer = card.querySelector('.footer span')
    if (kicker) kicker.textContent = 'Open source · MIT · reproducible Arm evidence'
    if (title) title.textContent = 'Describe the moment.\nFind the photo.'
    if (body) body.textContent = 'Try the live PWA. Inspect every model hash, benchmark, quality guard, and line of the SIMD kernel in the public repository.'
    stats?.remove()
    if (footer) footer.textContent = 'tauil-abd-elilah.github.io/pinhole-ai'
  })
  await pause(7200)
} finally {
  const video = page.video()
  await context.close()
  if (video) await video.saveAs(output)
  await browser.close()
}

console.log(
  JSON.stringify(
    { output, firstResult, offlineTopResult, networkForcedOffline, errors },
    null,
    2,
  ),
)
if (!offlineTopResult.toLowerCase().includes('coffee')) process.exitCode = 1
if (errors.length > 0) process.exitCode = 1
