/// <reference lib="webworker" />

import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
  type Processor,
  type PreTrainedTokenizer,
} from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol.ts'

const workerScope = self as unknown as DedicatedWorkerGlobalScope
const basePath = import.meta.env.BASE_URL
const modelId = 'pinhole-tinyclip'
const maxCachedQueries = 16

env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = `${basePath}models/`
env.useBrowserCache = true

const threadCount = workerScope.crossOriginIsolated
  ? Math.max(1, Math.min(4, Math.floor((workerScope.navigator.hardwareConcurrency || 2) / 2)))
  : 1

const wasmBackend = env.backends.onnx.wasm
if (!wasmBackend) throw new Error('ONNX Runtime WASM backend is unavailable')
wasmBackend.numThreads = threadCount
wasmBackend.wasmPaths = {
  mjs: `${basePath}wasm/ort-wasm-simd-threaded.mjs`,
  wasm: `${basePath}wasm/ort-wasm-simd-threaded.wasm`,
}

type TextModel = Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>>
type VisionModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>

class InferenceEngine {
  private tokenizer: PreTrainedTokenizer | null = null
  private processor: Processor | null = null
  private textModel: TextModel | null = null
  private visionModel: VisionModel | null = null
  private loading: Promise<void> | null = null
  private visionLoading: Promise<void> | null = null
  private textCache = new Map<string, Float32Array>()

  load(requestId: number): Promise<void> {
    this.loading ??= this.loadModels(requestId)
    return this.loading
  }

  private async loadModels(requestId: number): Promise<void> {
    const progress = (event: { file?: string; progress?: number; status?: string }) => {
      if (event.status !== 'progress' && event.status !== 'download') return
      this.post({
        id: requestId,
        type: 'progress',
        file: event.file?.split('/').at(-1) ?? 'model',
        progress: Math.max(0, Math.min(100, event.progress ?? 0)),
      })
    }

    const common = {
      local_files_only: true,
      progress_callback: progress,
    } as const

    const [tokenizer, processor, textModel] = await Promise.all([
      AutoTokenizer.from_pretrained(modelId, common),
      AutoProcessor.from_pretrained(modelId, common),
      CLIPTextModelWithProjection.from_pretrained(modelId, {
        ...common,
        device: 'wasm',
        dtype: 'q8',
      }),
    ])

    this.tokenizer = tokenizer
    this.processor = processor
    this.textModel = textModel
  }

  private async loadVisionModel(requestId: number): Promise<void> {
    this.visionLoading ??= CLIPVisionModelWithProjection.from_pretrained(modelId, {
      local_files_only: true,
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (event: { file?: string; progress?: number; status?: string }) => {
        if (event.status !== 'progress' && event.status !== 'download') return
        this.post({
          id: requestId,
          type: 'progress',
          file: event.file?.split('/').at(-1) ?? 'vision model',
          progress: Math.max(0, Math.min(100, event.progress ?? 0)),
        })
      },
    }).then((model) => {
      this.visionModel = model
    })
    await this.visionLoading
  }

  async embedText(text: string, requestId: number): Promise<void> {
    await this.load(requestId)
    if (!this.tokenizer || !this.textModel) throw new Error('Text encoder did not load')

    const started = performance.now()
    const cached = this.textCache.get(text)
    if (cached) {
      this.textCache.delete(text)
      this.textCache.set(text, cached)
      const embedding = cached.slice()
      this.post(
        {
          id: requestId,
          type: 'text-result',
          embedding,
          elapsedMs: performance.now() - started,
          cacheHit: true,
        },
        [embedding.buffer],
      )
      return
    }

    const textInputs = this.tokenizer([text], { padding: true, truncation: true })
    const output = await this.textModel(textInputs)
    const embedding = new Float32Array(output.text_embeds.data as Float32Array)
    this.textCache.set(text, embedding.slice())
    if (this.textCache.size > maxCachedQueries) {
      const oldest = this.textCache.keys().next().value
      if (oldest !== undefined) this.textCache.delete(oldest)
    }
    this.post(
      {
        id: requestId,
        type: 'text-result',
        embedding,
        elapsedMs: performance.now() - started,
        cacheHit: false,
      },
      [embedding.buffer],
    )
  }

  async embedImage(file: File, requestId: number): Promise<void> {
    await this.load(requestId)
    await this.loadVisionModel(requestId)
    if (!this.processor || !this.visionModel) throw new Error('Vision encoder did not load')

    const started = performance.now()
    const image = await RawImage.read(file)
    const { pixel_values: pixelValues } = await this.processor(image)
    const output = await this.visionModel({ pixel_values: pixelValues })
    const embedding = new Float32Array(output.image_embeds.data as Float32Array)

    const thumbnailImage = image.clone()
    const longestSide = Math.max(image.width, image.height)
    const ratio = Math.min(1, 720 / longestSide)
    await thumbnailImage.resize(
      Math.max(1, Math.round(image.width * ratio)),
      Math.max(1, Math.round(image.height * ratio)),
    )
    const thumbnail = await thumbnailImage.toBlob('image/webp', 0.82)

    this.post(
      {
        id: requestId,
        type: 'image-result',
        result: { embedding, thumbnail, width: image.width, height: image.height },
        elapsedMs: performance.now() - started,
      },
      [embedding.buffer],
    )
  }

  post(message: WorkerResponse, transfer: Transferable[] = []): void {
    workerScope.postMessage(message, transfer)
  }
}

const engine = new InferenceEngine()

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  const run = async () => {
    switch (request.type) {
      case 'load':
        await engine.load(request.id)
        engine.post({ id: request.id, type: 'loaded', threads: threadCount })
        break
      case 'embed-text':
        await engine.embedText(request.text, request.id)
        break
      case 'embed-image':
        await engine.embedImage(request.file, request.id)
        break
    }
  }

  void run().catch((error: unknown) => {
    engine.post({
      id: request.id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  })
})
