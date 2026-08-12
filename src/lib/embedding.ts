export const EMBEDDING_DIMENSION = 512

export interface QuantizedEmbedding {
  values: Int8Array
  scale: number
}

export interface ScoredItem {
  id: string
  score: number
}

export function normalizeEmbedding(input: ArrayLike<number>): Float32Array {
  let squaredNorm = 0
  for (let index = 0; index < input.length; index += 1) {
    const value = input[index] ?? 0
    squaredNorm += value * value
  }

  const norm = Math.sqrt(squaredNorm)
  const output = new Float32Array(input.length)
  if (norm === 0) return output

  for (let index = 0; index < input.length; index += 1) {
    output[index] = (input[index] ?? 0) / norm
  }
  return output
}

/** Per-vector symmetric INT8 quantization. */
export function quantizeEmbedding(input: ArrayLike<number>): QuantizedEmbedding {
  let maxAbsolute = 0
  for (let index = 0; index < input.length; index += 1) {
    maxAbsolute = Math.max(maxAbsolute, Math.abs(input[index] ?? 0))
  }

  if (maxAbsolute === 0) {
    return { values: new Int8Array(input.length), scale: 1 }
  }

  const scale = maxAbsolute / 127
  const values = new Int8Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const rounded = Math.round((input[index] ?? 0) / scale)
    values[index] = Math.max(-127, Math.min(127, rounded))
  }
  return { values, scale }
}

export function dotFloat32(left: ArrayLike<number>, right: ArrayLike<number>): number {
  if (left.length !== right.length) throw new Error('Embedding dimensions do not match')
  let score = 0
  for (let index = 0; index < left.length; index += 1) {
    score += (left[index] ?? 0) * (right[index] ?? 0)
  }
  return score
}

export function dotInt8(left: Int8Array, right: Int8Array): number {
  if (left.length !== right.length) throw new Error('Embedding dimensions do not match')
  let score = 0
  for (let index = 0; index < left.length; index += 1) {
    score += (left[index] ?? 0) * (right[index] ?? 0)
  }
  return score
}

export function quantizedCosine(
  left: QuantizedEmbedding,
  right: QuantizedEmbedding,
): number {
  return dotInt8(left.values, right.values) * left.scale * right.scale
}

export function topK(items: ScoredItem[], limit: number): ScoredItem[] {
  return items.sort((left, right) => right.score - left.score).slice(0, limit)
}
