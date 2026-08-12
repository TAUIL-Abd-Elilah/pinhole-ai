import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@huggingface/transformers'

const outputPath = process.argv.find((argument) => argument.startsWith('--output='))?.slice(9)
const modelId = 'pinhole-tinyclip'
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = resolve('public/models')

const cases = [
  ['red-firefighter-bicycle.webp', 'a close-up photo of a red bicycle'],
  ['golden-dog-in-snow.webp', 'a golden dog sitting in the snow'],
  ['birthday-cake-candles.webp', 'a birthday cake with pink candles'],
  ['mountains-at-sunset.webp', 'jagged mountains behind a green field'],
  ['blue-vintage-car.webp', 'a blue vintage car'],
  ['yellow-flower.webp', 'a yellow flower on a black background'],
  ['cat-on-sofa.webp', 'a sleeping cat on a sofa'],
  ['sailboat-at-sea.webp', 'a white sailboat on the water'],
  ['hiker-in-forest.webp', 'a trail through a dense forest'],
  ['homemade-pizza.webp', 'a vegetable pizza on a table'],
  ['coffee-and-book.webp', 'a cup of coffee on an open book'],
  ['airplane-wing-at-dusk.webp', 'an airplane wing above the clouds'],
]

function quantize(vector) {
  let max = 0
  for (const value of vector) max = Math.max(max, Math.abs(value))
  const scale = max === 0 ? 1 : max / 127
  return {
    scale,
    values: Int8Array.from(vector, (value) =>
      Math.max(-127, Math.min(127, Math.round(value / scale))),
    ),
  }
}

function dot(left, right) {
  let score = 0
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index]
  return score
}

function dotInt8(left, right) {
  let score = 0
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index]
  return score
}

function rank(query, photos, compact = false) {
  const queryVector = compact ? quantize(query) : query
  return photos
    .map((photo, index) => {
      const score = compact
        ? dotInt8(queryVector.values, photo.values) * queryVector.scale * photo.scale
        : dot(queryVector, photo)
      return { index, score }
    })
    .sort((left, right) => right.score - left.score)
}

const started = performance.now()
const [tokenizer, processor, textModel, visionModel] = await Promise.all([
  AutoTokenizer.from_pretrained(modelId, { local_files_only: true }),
  AutoProcessor.from_pretrained(modelId, { local_files_only: true }),
  CLIPTextModelWithProjection.from_pretrained(modelId, {
    local_files_only: true,
    dtype: 'q8',
  }),
  CLIPVisionModelWithProjection.from_pretrained(modelId, {
    local_files_only: true,
    dtype: 'q8',
  }),
])
const loadMs = performance.now() - started

const images = await Promise.all(
  cases.map(([file]) => RawImage.read(resolve('public/demo', file))),
)
const imageInputs = await processor(images)
const imageOutput = await visionModel({ pixel_values: imageInputs.pixel_values })
const textInputs = tokenizer(
  cases.map(([, query]) => query),
  { padding: true, truncation: true },
)
const textOutput = await textModel(textInputs)

const dimension = 512
const imageData = imageOutput.image_embeds.data
const textData = textOutput.text_embeds.data
const imageVectors = cases.map((_, index) =>
  imageData.slice(index * dimension, (index + 1) * dimension),
)
const textVectors = cases.map((_, index) =>
  textData.slice(index * dimension, (index + 1) * dimension),
)
const compactImages = imageVectors.map(quantize)

let floatCorrect = 0
let compactCorrect = 0
let top1Agreement = 0
const recallAt3 = []
const details = cases.map(([expectedFile, query], queryIndex) => {
  const floatRanking = rank(textVectors[queryIndex], imageVectors)
  const compactRanking = rank(textVectors[queryIndex], compactImages, true)
  if (floatRanking[0].index === queryIndex) floatCorrect += 1
  if (compactRanking[0].index === queryIndex) compactCorrect += 1
  if (floatRanking[0].index === compactRanking[0].index) top1Agreement += 1
  const floatTop = new Set(floatRanking.slice(0, 3).map((item) => item.index))
  recallAt3.push(
    compactRanking.slice(0, 3).filter((item) => floatTop.has(item.index)).length / 3,
  )
  return {
    query,
    expected: expectedFile,
    float_top3: floatRanking.slice(0, 3).map((item) => ({
      file: cases[item.index][0],
      score: item.score,
    })),
    compact_top3: compactRanking.slice(0, 3).map((item) => ({
      file: cases[item.index][0],
      score: item.score,
    })),
  }
})

const result = {
  schema: 'pinhole-retrieval-quality/v1',
  created_utc: new Date().toISOString(),
  runtime: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    github: Object.fromEntries(
      ['GITHUB_ACTIONS', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RUNNER_ARCH', 'RUNNER_OS', 'ImageOS', 'ImageVersion']
        .filter((key) => process.env[key])
        .map((key) => [key, process.env[key]]),
    ),
  },
  method: {
    photos: cases.length,
    queries: cases.length,
    dimension,
    model: 'TinyCLIP-ViT-8M-16-Text-3M-YFCC15M INT8 exact-parity split graphs',
    labels: 'one fixed natural-language query per attributed demo photo',
  },
  timings: { model_load_ms: loadMs },
  quality: {
    float_top1_accuracy: floatCorrect / cases.length,
    compact_top1_accuracy: compactCorrect / cases.length,
    compact_vs_float_top1_agreement: top1Agreement / cases.length,
    compact_vs_float_mean_recall_at_3:
      recallAt3.reduce((sum, value) => sum + value, 0) / recallAt3.length,
  },
  cases: details,
}

const rendered = `${JSON.stringify(result, null, 2)}\n`
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, rendered)
}
console.log(rendered)
