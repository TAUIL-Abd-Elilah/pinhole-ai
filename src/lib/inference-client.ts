import type {
  EmbeddedImageResult,
  WorkerRequest,
  WorkerResponse,
} from '../workers/protocol.ts'

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  progress?: (file: string, progress: number) => void
}

type RequestWithoutId<T> = T extends { id: number } ? Omit<T, 'id'> : never
type WorkerRequestBody = RequestWithoutId<WorkerRequest>

export interface TimedResult<T> {
  value: T
  elapsedMs: number
}

export class InferenceClient {
  private readonly worker = new Worker(
    new URL('../workers/inference.worker.ts', import.meta.url),
    { type: 'module' },
  )
  private nextRequestId = 1
  private pending = new Map<number, PendingRequest<unknown>>()

  constructor() {
    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      const pending = this.pending.get(response.id)
      if (!pending) return

      if (response.type === 'progress') {
        pending.progress?.(response.file, response.progress)
        return
      }
      if (response.type === 'error') {
        this.pending.delete(response.id)
        pending.reject(new Error(response.message))
        return
      }

      this.pending.delete(response.id)
      if (response.type === 'loaded') pending.resolve(response.threads)
      if (response.type === 'text-result') {
        pending.resolve({ value: response.embedding, elapsedMs: response.elapsedMs })
      }
      if (response.type === 'image-result') {
        pending.resolve({ value: response.result, elapsedMs: response.elapsedMs })
      }
    })

    this.worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Inference worker stopped unexpectedly')
      for (const pending of this.pending.values()) pending.reject(error)
      this.pending.clear()
    })
  }

  load(progress?: (file: string, progress: number) => void): Promise<number> {
    return this.request<number>({ type: 'load' }, progress)
  }

  embedText(text: string): Promise<TimedResult<Float32Array>> {
    return this.request<TimedResult<Float32Array>>({ type: 'embed-text', text })
  }

  embedImage(file: File): Promise<TimedResult<EmbeddedImageResult>> {
    return this.request<TimedResult<EmbeddedImageResult>>({ type: 'embed-image', file })
  }

  dispose(): void {
    this.worker.terminate()
    const error = new Error('Inference client was disposed')
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }

  private request<T>(
    body: WorkerRequestBody,
    progress?: (file: string, progress: number) => void,
  ): Promise<T> {
    const id = this.nextRequestId
    this.nextRequestId += 1
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        progress,
      })
      this.worker.postMessage({ ...body, id } as WorkerRequest)
    })
  }
}
