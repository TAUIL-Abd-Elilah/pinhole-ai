import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : chromium.executablePath())
const output = process.env.PINHOLE_COVER ?? 'docs/media/pinhole-cover.png'
const asDataUrl = async (path, type) =>
  `data:${type};base64,${(await readFile(resolve(path))).toString('base64')}`

const [mobileScreenshot, displayFont, monoFont] = await Promise.all([
  asDataUrl('docs/media/pinhole-mobile.png', 'image/png'),
  asDataUrl(
    'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
    'font/woff2',
  ),
  asDataUrl(
    'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
    'font/woff2',
  ),
])

const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})

await page.setContent(`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <style>
        @font-face { font-family: Bricolage; src: url('${displayFont}') format('woff2'); font-weight: 200 800; }
        @font-face { font-family: Plex; src: url('${monoFont}') format('woff2'); font-weight: 500; }
        * { box-sizing: border-box; }
        body { margin: 0; overflow: hidden; background: #dce7e8; color: #14282c; }
        .cover {
          position: relative; width: 1200px; height: 630px; padding: 35px 45px 37px;
          overflow: hidden; background:
            linear-gradient(90deg, transparent 49.9%, rgba(20,40,44,.045) 50%, transparent 50.1%),
            radial-gradient(circle at 86% 34%, rgba(170,197,197,.85), transparent 28%), #dce7e8;
        }
        .cover::after {
          content: ''; position: absolute; left: 45px; right: 45px; bottom: 36px;
          height: 1px; background: rgba(20,40,44,.25);
        }
        .top { display: flex; align-items: center; justify-content: space-between; width: 720px; }
        .wordmark { display: flex; align-items: center; gap: 10px; font: 700 23px/1 Bricolage; letter-spacing: -.04em; }
        .aperture {
          position: relative; width: 28px; height: 28px; border: 1.5px solid #14282c;
          border-radius: 50%; box-shadow: inset 0 0 0 8px #dce7e8, inset 0 0 0 14px #ed6547;
        }
        .track {
          padding: 8px 11px; border: 1px solid rgba(20,40,44,.35);
          font: 500 9px/1 Plex; letter-spacing: .12em; text-transform: uppercase;
        }
        .copy { position: relative; z-index: 2; width: 760px; margin-top: 69px; }
        .eyebrow { margin: 0 0 13px; color: #ed6547; font: 500 10px/1 Plex; letter-spacing: .14em; text-transform: uppercase; }
        h1 { margin: 0; font: 470 78px/.86 Bricolage; letter-spacing: -.068em; }
        .promise { margin: 23px 0 0; font: 530 25px/1.2 Bricolage; letter-spacing: -.025em; }
        .promise span { color: #ed6547; }
        .description { width: 610px; margin: 12px 0 0; color: #536c70; font: 400 14px/1.55 Arial, sans-serif; }
        .metrics { position: absolute; left: 45px; bottom: 57px; z-index: 2; display: flex; width: 715px; }
        .metric { flex: 1; padding: 0 21px; border-left: 1px solid rgba(20,40,44,.25); }
        .metric:first-child { padding-left: 0; border-left: 0; }
        .metric strong { display: block; color: #284c52; font: 580 29px/1 Bricolage; letter-spacing: -.045em; }
        .metric span { display: block; margin-top: 5px; color: #536c70; font: 500 8px/1.25 Plex; letter-spacing: .07em; text-transform: uppercase; }
        .phone {
          position: absolute; z-index: 3; right: 67px; top: 19px; width: 279px; height: 604px;
          padding: 8px; overflow: hidden; border: 1px solid rgba(20,40,44,.42); border-radius: 25px;
          background: #14282c; box-shadow: 22px 27px 48px rgba(20,40,44,.21); transform: rotate(1.2deg);
        }
        .phone::before {
          content: ''; position: absolute; z-index: 4; left: 50%; top: 13px; width: 54px; height: 4px;
          border-radius: 4px; background: rgba(20,40,44,.65); transform: translateX(-50%);
        }
        .phone img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 17px; }
        .accent-frame {
          position: absolute; right: 27px; top: 67px; width: 314px; height: 485px;
          border: 1px solid rgba(237,101,71,.65); transform: rotate(-3.2deg);
        }
        .micro {
          position: absolute; right: 365px; bottom: 17px; color: #536c70;
          font: 500 7px/1 Plex; letter-spacing: .09em; text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <main class="cover">
        <header class="top">
          <div class="wordmark"><i class="aperture"></i><span>pinhole</span></div>
          <div class="track">Arm Mobile AI · on-device</div>
        </header>
        <section class="copy">
          <p class="eyebrow">Private semantic camera-roll search</p>
          <h1>Find the photo<br>you remember.</h1>
          <p class="promise">Describe the moment. <span>Nothing leaves your phone.</span></p>
          <p class="description">Exact-parity TinyCLIP graph surgery and a 434-byte signed-INT8 WASM SIMD index—inside an installable local-first PWA.</p>
        </section>
        <div class="metrics">
          <div class="metric"><strong>11.30×</strong><span>faster Arm text query</span></div>
          <div class="metric"><strong>3.58×</strong><span>faster exact 10k scan</span></div>
          <div class="metric"><strong>−74.8%</strong><span>index memory</span></div>
        </div>
        <div class="accent-frame"></div>
        <div class="phone"><img src="${mobileScreenshot}" alt="Pinhole ranked mobile results"></div>
        <span class="micro">Bit-for-bit model parity · 99.6% mean Recall@10</span>
      </main>
    </body>
  </html>
`)
await page.screenshot({ path: output })
await browser.close()
console.log(`rendered ${resolve(output)}`)
