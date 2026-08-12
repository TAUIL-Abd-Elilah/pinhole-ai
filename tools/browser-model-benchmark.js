import * as ort from 'onnxruntime-web/wasm'

const params = new URLSearchParams(location.search)
const baselineUrl = params.get('baseline')
const samples = Number(params.get('samples') ?? 30)
const warmup = Number(params.get('warmup') ?? 7)
const status = document.querySelector('#status')

if (!baselineUrl) throw new Error('Missing baseline model URL')

const threads = crossOriginIsolated
  ? Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)))
  : 1

ort.env.wasm.numThreads = threads
ort.env.wasm.wasmPaths = {
  mjs: new URL('../wasm/ort-wasm-simd-threaded.mjs', location.href).href,
  wasm: new URL('../wasm/ort-wasm-simd-threaded.wasm', location.href).href,
}

function median(sorted) {
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const center = median(sorted)
  const deviations = sorted.map((value) => Math.abs(value - center)).sort((a, b) => a - b)
  return {
    samples: sorted.length,
    median_ms: center,
    p95_ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
    min_ms: sorted[0],
    max_ms: sorted.at(-1),
    mad_ms: median(deviations),
  }
}

function disposeOutputs(outputs) {
  for (const tensor of Object.values(outputs)) tensor.dispose?.()
}

async function measurePaths(paths) {
  const entries = Object.entries(paths)
  for (let repetition = 0; repetition < warmup; repetition += 1) {
    for (const [, run] of entries) disposeOutputs(await run())
  }
  const timings = Object.fromEntries(entries.map(([name]) => [name, []]))
  for (let repetition = 0; repetition < samples; repetition += 1) {
    const offset = repetition % entries.length
    const rotated = [...entries.slice(offset), ...entries.slice(0, offset)]
    for (const [name, run] of rotated) {
      const started = performance.now()
      const outputs = await run()
      timings[name].push(performance.now() - started)
      disposeOutputs(outputs)
    }
  }
  return Object.fromEntries(
    Object.entries(timings).map(([name, values]) => [name, summarize(values)]),
  )
}

async function loadSession(url) {
  const started = performance.now()
  const session = await ort.InferenceSession.create(url, {
    executionProviders: ['wasm'],
    executionMode: 'sequential',
    graphOptimizationLevel: 'all',
  })
  return { session, elapsed_ms: performance.now() - started }
}

async function runBenchmark() {
  if (!Number.isInteger(samples) || samples < 1) throw new Error(`Invalid sample count: ${samples}`)
  if (!Number.isInteger(warmup) || warmup < 0) throw new Error(`Invalid warm-up count: ${warmup}`)

  status.textContent = 'Loading combined and split graphs…'
  const splitUrl = new URL(
    '../models/pinhole-tinyclip/onnx/text_model_quantized.onnx',
    location.href,
  ).href
  const [combinedLoad, splitLoad] = await Promise.all([
    loadSession(baselineUrl),
    loadSession(splitUrl),
  ])

  const inputIds = new BigInt64Array(77).fill(49407n)
  inputIds[0] = 49406n
  ;[320n, 1125n, 539n, 320n, 1929n, 267n, 494n, 518n, 2582n].forEach(
    (token, index) => { inputIds[index + 1] = token },
  )
  const attentionMask = new BigInt64Array(77)
  attentionMask.fill(1n, 0, 11)
  const textFeeds = {
    input_ids: new ort.Tensor('int64', inputIds, [1, 77]),
    attention_mask: new ort.Tensor('int64', attentionMask, [1, 77]),
  }
  const combinedFeeds = {
    ...textFeeds,
    pixel_values: new ort.Tensor('float32', new Float32Array(3 * 224 * 224), [1, 3, 224, 224]),
  }

  status.textContent = 'Checking exact graph parity…'
  const combinedParityOutput = await combinedLoad.session.run(combinedFeeds, ['text_embeds'])
  const splitParityOutput = await splitLoad.session.run(textFeeds, ['text_embeds'])
  const combinedEmbedding = combinedParityOutput.text_embeds.data
  const splitEmbedding = splitParityOutput.text_embeds.data
  let maxAbsoluteError = 0
  for (let index = 0; index < combinedEmbedding.length; index += 1) {
    maxAbsoluteError = Math.max(
      maxAbsoluteError,
      Math.abs(Number(combinedEmbedding[index]) - Number(splitEmbedding[index])),
    )
  }
  const exact = maxAbsoluteError === 0
  disposeOutputs(combinedParityOutput)
  disposeOutputs(splitParityOutput)

  status.textContent = `Measuring ${samples} forwards per path…`
  const latency = await measurePaths({
    stock_combined_forward: () => combinedLoad.session.run(combinedFeeds),
    combined_requested_text_only: () => combinedLoad.session.run(combinedFeeds, ['text_embeds']),
    split_text_forward: () => splitLoad.session.run(textFeeds, ['text_embeds']),
  })

  textFeeds.input_ids.dispose?.()
  textFeeds.attention_mask.dispose?.()
  combinedFeeds.pixel_values.dispose?.()
  await combinedLoad.session.release()
  await splitLoad.session.release()

  const result = {
    runtime: {
      user_agent: navigator.userAgent,
      hardware_concurrency: navigator.hardwareConcurrency,
      cross_origin_isolated: crossOriginIsolated,
      wasm_threads: threads,
      backend: 'onnxruntime-web/wasm-simd',
    },
    method: {
      warmup,
      samples,
      scheduling: 'paths interleaved with a rotating order for every measured repetition',
      input: 'one 77-token sequence and one zero-valued 224x224 RGB control image',
      stock: 'combined graph with all outputs requested',
      strongest_control: 'combined graph with only text_embeds requested',
      optimized: 'exact-parity extracted text graph with only text_embeds requested',
    },
    session_load_ms: {
      combined: combinedLoad.elapsed_ms,
      split_text: splitLoad.elapsed_ms,
    },
    latency: {
      ...latency,
      speedup_vs_stock:
        latency.stock_combined_forward.median_ms / latency.split_text_forward.median_ms,
      speedup_vs_requested_text_only:
        latency.combined_requested_text_only.median_ms / latency.split_text_forward.median_ms,
    },
    parity: {
      text_exact: exact,
      text_max_abs_error: maxAbsoluteError,
    },
  }
  status.textContent = JSON.stringify(result, null, 2)
  return result
}

globalThis.__PINHOLE_BROWSER_BENCHMARK__ = runBenchmark().then(
  (result) => ({ ok: true, result }),
  (error) => {
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
    status.textContent = message
    return { ok: false, error: message }
  },
)
