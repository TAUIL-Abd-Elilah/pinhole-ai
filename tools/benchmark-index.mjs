import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { dirname } from 'node:path'
import { performance } from 'node:perf_hooks'

const dimension = Number(process.env.PINHOLE_BENCH_DIMENSION ?? 512)
const count = Number(process.env.PINHOLE_BENCH_COUNT ?? 10_000)
const queryCount = Number(process.env.PINHOLE_BENCH_QUERIES ?? 25)
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
const floatScores = new Float32Array(count)
const baselineTimes = []
const optimizedTimes = []
const overlaps = []
let top1Agreements = 0

for (let queryNumber = 0; queryNumber < queryCount; queryNumber += 1) {
  const sourceItem = (queryNumber * 397) % count
  const query = new Float32Array(
    floatIndex.subarray(sourceItem * dimension, (sourceItem + 1) * dimension),
  )
  for (let index = 0; index < dimension; index += 1) query[index] += (random() - 0.5) * 0.002
  normalize(query)

  let started = performance.now()
  for (let item = 0; item < count; item += 1) {
    let score = 0
    const offset = item * dimension
    for (let index = 0; index < dimension; index += 1) {
      score += query[index] * floatIndex[offset + index]
    }
    floatScores[item] = score
  }
  const floatTop = topK(floatScores)
  baselineTimes.push(performance.now() - started)

  const intQuery = new Int8Array(memory.buffer, queryPointer, dimension)
  const queryScale = quantize(query, intQuery, 0)
  started = performance.now()
  dotBatch(queryPointer, indexPointer, count, dimension, outputPointer)
  const compactScores = new Float32Array(count)
  for (let item = 0; item < count; item += 1) {
    compactScores[item] = intScores[item] * queryScale * scales[item]
  }
  const compactTop = topK(compactScores)
  optimizedTimes.push(performance.now() - started)

  const floatSet = new Set(floatTop)
  overlaps.push(compactTop.filter((index) => floatSet.has(index)).length / 10)
  if (floatTop[0] === compactTop[0]) top1Agreements += 1
}

const baseline = summary(baselineTimes)
const optimized = summary(optimizedTimes)
const result = {
  schema: 'pinhole-index-benchmark/v1',
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
    top_k: 10,
    baseline: 'Float32 scalar JavaScript cosine scan plus full top-k sort',
    optimized: 'per-vector symmetric INT8, WebAssembly SIMD dot batch, plus full top-k sort',
  },
  memory: {
    baseline_bytes: floatIndex.byteLength,
    optimized_bytes: int8Index.byteLength + scales.byteLength,
    reduction_percent:
      (1 - (int8Index.byteLength + scales.byteLength) / floatIndex.byteLength) * 100,
  },
  latency: {
    baseline,
    optimized,
    speedup: baseline.median_ms / optimized.median_ms,
  },
  quality: {
    mean_recall_at_10: overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length,
    min_recall_at_10: Math.min(...overlaps),
    top1_agreement: top1Agreements / queryCount,
  },
}

const rendered = `${JSON.stringify(result, null, 2)}\n`
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, rendered)
}
console.log(rendered)
