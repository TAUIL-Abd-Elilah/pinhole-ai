import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { browserExecutablePath } from './browser-executable.mjs'

const target = process.env.PINHOLE_URL ?? 'http://127.0.0.1:5173'
const baselinePath = resolve(process.env.PINHOLE_BASELINE_MODEL ?? '.cache/models/tinyclip-int8.onnx')
const splitPath = resolve('public/models/pinhole-tinyclip/onnx/text_model_quantized.onnx')
const expectedBaselineHash = '844d1a46ab18acf50c989e541b12fe3b6dc7f8d6004725b4e992d142788e0600'
const outputArgument = process.argv.find((argument) => argument.startsWith('--output='))?.slice(9)
const samples = Number(process.env.PINHOLE_BROWSER_BENCH_SAMPLES ?? 30)
const warmup = Number(process.env.PINHOLE_BROWSER_BENCH_WARMUP ?? 7)
const executablePath = browserExecutablePath()

async function artifact(path) {
  const bytes = await readFile(path)
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

const [baselineArtifact, splitArtifact] = await Promise.all([
  artifact(baselinePath),
  artifact(splitPath),
])
if (baselineArtifact.sha256 !== expectedBaselineHash) {
  throw new Error(
    `Baseline checksum mismatch: expected ${expectedBaselineHash}, received ${baselineArtifact.sha256}`,
  )
}

const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => {
  errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
})

try {
  const benchmarkUrl = new URL('tools/browser-model-benchmark.html', `${target.replace(/\/$/, '')}/`)
  const fileUrl = pathToFileURL(baselinePath).href
  benchmarkUrl.searchParams.set('baseline', `/@fs/${fileUrl.slice('file:///'.length)}`)
  benchmarkUrl.searchParams.set('samples', String(samples))
  benchmarkUrl.searchParams.set('warmup', String(warmup))
  await page.goto(benchmarkUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForFunction(
    () => globalThis.__PINHOLE_BROWSER_BENCHMARK__ !== undefined,
    undefined,
    { timeout: 30_000 },
  )
  const outcome = await page.evaluate(() => globalThis.__PINHOLE_BROWSER_BENCHMARK__)
  if (!outcome.ok) throw new Error(outcome.error)

  const result = {
    schema: 'pinhole-browser-model-benchmark/v1',
    created_utc: new Date().toISOString(),
    browser: await browser.version(),
    host: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
    },
    artifacts: {
      combined: baselineArtifact,
      split_text: splitArtifact,
    },
    github: Object.fromEntries(
      ['GITHUB_ACTIONS', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_ARCH', 'RUNNER_OS', 'ImageOS', 'ImageVersion']
        .filter((key) => process.env[key])
        .map((key) => [key, process.env[key]]),
    ),
    ...outcome.result,
    errors,
  }

  const rendered = `${JSON.stringify(result, null, 2)}\n`
  if (outputArgument) {
    await mkdir(dirname(outputArgument), { recursive: true })
    await writeFile(outputArgument, rendered)
  }
  console.log(rendered)

  if (!result.parity.text_exact) throw new Error(`Browser graph parity failed: ${result.parity.text_max_abs_error}`)
  if (errors.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
