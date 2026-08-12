export type WorkerRequest =
  | { id: number; type: 'load' }
  | { id: number; type: 'embed-text'; text: string }
  | { id: number; type: 'embed-image'; file: File }

export interface EmbeddedImageResult {
  embedding: Float32Array
  thumbnail: Blob
  width: number
  height: number
}

export type WorkerResponse =
  | { id: number; type: 'progress'; file: string; progress: number }
  | { id: number; type: 'loaded'; threads: number }
  | { id: number; type: 'text-result'; embedding: Float32Array; elapsedMs: number }
  | { id: number; type: 'image-result'; result: EmbeddedImageResult; elapsedMs: number }
  | { id: number; type: 'error'; message: string }
