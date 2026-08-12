import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { dirname } from 'node:path'
import { performance } from 'node:perf_hooks'

const dimension = Number(process.env.PINHOLE_BENCH_DIMENSION ?? 512)
const count = Number(process.env.PINHOLE_BENCH_COUNT ?? 10_000)
const queryCount = Number(process.env.PINHOLE_BENCH_QUERIES ?? 25)
const warmupCount = Number(process.env.PINHOLE_BENCH_WARMUP ?? 3)
const outputPath = process.argv.find((argument) => argument.startsWith('--output='))?.slice(9)

let state = 0x5eeda11
function random() {
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  return (state >>> 0) / 0x1_0000_0000
}

function normalize(vector) {
  let sum = 0
  for (let index = 0; index < vector.length; index += 1) sum += vector[index] * vector[index]
  const inverse = 1 / Math.sqrt(sum)
  for (let index = 0; index < vector.length; index += 1) vector[index] *= inverse
}

function quantize(vector, target, offset) {
  let max = 0
  for (let index = 0; index < vector.length; index += 1) {
    max = Math.max(max, Math.abs(vector[index]))
  }
  const scale = max === 0 ? 1 : max / 127
  for (let index = 0; index < vector.length; index += 1) {
    target[offset + index] = Math.max(-127, Math.min(127, Math.round(vector[index] / scale)))
  }
  return scale
}

function topK(scores, limit = 10) {
  const indices = Array.from({ length: scores.length }, (_, index) => index)
  indices.sort((left, right) => scores[right] - scores[left])
  return indices.slice(0, limit)
}

function summary(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const median = sorted[Math.floor(sorted.length / 2)]
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  const deviations = sorted.map((value) => Math.abs(value - median)).sort((a, b) => a - b)
  return {
    samples: values.length,
    median_ms: median,
    p95_ms: p95,
    min_ms: sorted[0],
    max_ms: sorted.at(-1),
    mad_ms: deviations[Math.floor(deviations.length / 2)],
  }
}

console.error(`building deterministic ${count} × ${dimension} corpus`)
const floatIndex = new Float32Array(count * dimension)
const int8Index = new Int8Array(count * dimension)
const scales = new Float32Array(count)
for (let item = 0; item < count; item += 1) {
  const vector = floatIndex.subarray(item * dimension, (item + 1) * dimension)
  for (let index = 0; index < dimension; index += 1) vector[index] = random() - 0.5
  normalize(vector)
  scales[item] = quantize(vector, int8Index, item * dimension)
}

const wasmBytes = await readFile('public/wasm/pinhole-index.wasm')
const { instance } = await WebAssembly.instantiate(wasmBytes)
const { memory, dot_batch: dotBatch } = instance.exports
const queryPointer = 0
const indexPointer = Math.ceil(dimension / 64) * 64
const outputPointer = Math.ceil((indexPointer + int8Index.length) / 16) * 16
const requiredBytes = outputPointer + count * Int32Array.BYTES_PER_ELEMENT
if (requiredBytes > memory.buffer.byteLength) {
  memory.grow(Math.ceil((requiredBytes - memory.buffer.byteLength) / 65_536))
}
new Int8Array(memory.buffer, indexPointer, int8Index.length).set(int8Index)
const intScores = new Int32Array(memory.buffer, outputPointer, count)
const scalarIntScores = new Int32Array(count)
const floatScores = new Float32Array(count)
const compactScores = new Float32Array(count)
const baselineTimes = []
const scalarControlTimes = []
const optimizedTimes = []
const scalarScanTimes = []
const wasmScanTimes = []
const overlaps = []
let top1Agreements = 0
let maxIntegerDifference = 0
let quantizedTopKMatches = true

function runFloat32(query) {
  const started = performance.now()
  for (let item = 0; item < count; item += 1) {
    let score = 0
    const offset = item * dimension
    for (let index = 0; index < dimension; index += 1) {
      score += query[index] * floatIndex[offset + index]
    }
    floatScores[item] = score
  }
  const top = topK(floatScores)
  return { top, total_ms: performance.now() - started }
}

function runScalarInt8(query, queryScale) {
  const started = performance.now()
  for (let item = 0; item < count; item += 1) {
    let score = 0
    const offset = item * dimension
    for (let index = 0; index < dimension; index += 1) {
      score += query[index] * int8Index[offset + index]
    }
    scalarIntScores[item] = score
  }
  const scan_ms = performance.now() - started
  for (let item = 0; item < count; item += 1) {
    compactScores[item] = scalarIntScores[item] * queryScale * scales[item]
  }
  const top = topK(compactScores)
  return { top, scan_ms, total_ms: performance.now() - started }
}

function runWasmInt8(queryScale) {
  const started = performance.now()
  dotBatch(queryPointer, indexPointer, count, dimension, outputPointer)
  const scan_ms = performance.now() - started
  for (let item = 0; item < count; item += 1) {
    compactScores[item] = intScores[item] * queryScale * scales[item]
  }
  const top = topK(compactScores)
  return { top, scan_ms, total_ms: performance.now() - started }
}

const warmQuery = new Float32Array(floatIndex.subarray(0, dimension))
const warmIntQuery = new Int8Array(dimension)
const warmQueryScale = quantize(warmQuery, warmIntQuery, 0)
new Int8Array(memory.buffer, queryPointer, dimension).set(warmIntQuery)
for (let warmup = 0; warmup < warmupCount; warmup += 1) {
  runFloat32(warmQuery)
  runScalarInt8(warmIntQuery, warmQueryScale)
  runWasmInt8(warmQueryScale)
}

for (let queryNumber = 0; queryNumber < queryCount; queryNumber += 1) {
  const sourceItem = (queryNumber * 397) % count
  const query = new Float32Array(
    floatIndex.subarray(sourceItem * dimension, (sourceItem + 1) * dimension),
  )
  for (let index = 0; index < dimension; index += 1) query[index] += (random() - 0.5) * 0.002
  normalize(query)

  const intQuery = new Int8Array(dimension)
  const queryScale = quantize(query, intQuery, 0)
  new Int8Array(memory.buffer, queryPointer, dimension).set(intQuery)

  const measured = {}
  const paths = [
    ['float32', () => runFloat32(query)],
    ['int8_scalar', () => runScalarInt8(intQuery, queryScale)],
    ['wasm_simd', () => runWasmInt8(queryScale)],
  ]
  const rotation = queryNumber % paths.length
  const orderedPaths = [...paths.slice(rotation), ...paths.slice(0, rotation)]
  for (const [name, run] of orderedPaths) measured[name] = run()

  const floatTop = measured.float32.top
  const scalarTop = measured.int8_scalar.top
  const compactTop = measured.wasm_simd.top
  baselineTimes.push(measured.float32.total_ms)
  scalarControlTimes.push(measured.int8_scalar.total_ms)
  optimizedTimes.push(measured.wasm_simd.total_ms)
  scalarScanTimes.push(measured.int8_scalar.scan_ms)
  wasmScanTimes.push(measured.wasm_simd.scan_ms)

  for (let item = 0; item < count; item += 1) {
    maxIntegerDifference = Math.max(
      maxIntegerDifference,
      Math.abs(scalarIntScores[item] - intScores[item]),
    )
  }
  if (scalarTop.some((item, index) => item !== compactTop[index])) {
    quantizedTopKMatches = false
  }

  const floatSet = new Set(floatTop)
  overlaps.push(compactTop.filter((index) => floatSet.has(index)).length / 10)
  if (floatTop[0] === compactTop[0]) top1Agreements += 1
}

const baseline = summary(baselineTimes)
const scalarControl = summary(scalarControlTimes)
const optimized = summary(optimizedTimes)
const scalarScan = summary(scalarScanTimes)
const wasmScan = summary(wasmScanTimes)
const result = {
  schema: 'pinhole-index-benchmark/v2',
  created_utc: new Date().toISOString(),
  runtime: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    logical_cpus: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? null,
    github: Object.fromEntries(
      ['GITHUB_ACTIONS', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_ARCH', 'RUNNER_OS', 'ImageOS', 'ImageVersion']
        .filter((key) => process.env[key])
        .map((key) => [key, process.env[key]]),
    ),
  },
  method: {
    seed: '0x05eeda11',
    vectors: count,
    dimension,
    queries: queryCount,
    warmup: warmupCount,
    top_k: 10,
    baseline: 'Float32 scalar JavaScript cosine scan plus full top-k sort',
    quantized_scalar_control:
      'the same signed-INT8 vectors and scales as the optimized path, scalar JavaScript dot batch, plus full top-k sort',
    optimized: 'per-vector symmetric INT8, WebAssembly SIMD dot batch, plus full top-k sort',
    scheduling: 'three paths interleaved with a rotating order for every measured query',
  },
  memory: {
    baseline_bytes: floatIndex.byteLength,
    optimized_bytes: int8Index.byteLength + scales.byteLength,
    reduction_percent:
      (1 - (int8Index.byteLength + scales.byteLength) / floatIndex.byteLength) * 100,
  },
  latency: {
    baseline,
    int8_scalar_control: scalarControl,
    optimized,
    speedup: baseline.median_ms / optimized.median_ms,
    simd_speedup_vs_int8_scalar: scalarControl.median_ms / optimized.median_ms,
    scan_only: {
      int8_scalar: scalarScan,
      wasm_simd: wasmScan,
      speedup: scalarScan.median_ms / wasmScan.median_ms,
    },
  },
  parity: {
    wasm_matches_scalar_int8: maxIntegerDifference === 0,
    max_integer_dot_difference: maxIntegerDifference,
    top_k_exact: quantizedTopKMatches,
  },
  quality: {
    mean_recall_at_10: overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length,
    min_recall_at_10: Math.min(...overlaps),
    top1_agreement: top1Agreements / queryCount,
  },
}

if (!result.parity.wasm_matches_scalar_int8 || !result.parity.top_k_exact) {
  throw new Error(`WASM/scalar INT8 parity failed: ${JSON.stringify(result.parity)}`)
}

const rendered = `${JSON.stringify(result, null, 2)}\n`
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, rendered)
}
console.log(rendered)
