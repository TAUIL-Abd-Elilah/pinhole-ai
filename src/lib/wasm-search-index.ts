import {
  EMBEDDING_DIMENSION,
  dotInt8,
  quantizeEmbedding,
  topK,
  type QuantizedEmbedding,
  type ScoredItem,
} from './embedding.ts'

export interface IndexItem {
  id: string
  embedding: QuantizedEmbedding
}

interface PinholeWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  dot_batch: (
    queryPointer: number,
    indexPointer: number,
    count: number,
    dimension: number,
    outputPointer: number,
  ) => void
}

function align(value: number, boundary: number): number {
  return Math.ceil(value / boundary) * boundary
}

export class WasmSearchIndex {
  private readonly wasm: PinholeWasmExports | null
  private readonly items: IndexItem[]
  private readonly dimension: number
  private readonly indexPointer: number
  private readonly outputPointer: number
  private contiguousIndex: Int8Array

  private constructor(wasm: PinholeWasmExports | null, items: IndexItem[], dimension: number) {
    this.wasm = wasm
    this.items = items
    this.dimension = dimension
    this.indexPointer = align(dimension, 64)
    this.outputPointer = align(this.indexPointer + items.length * dimension, 16)
    this.contiguousIndex = new Int8Array(items.length * dimension)

    items.forEach((item, index) => {
      if (item.embedding.values.length !== dimension) {
        throw new Error(`Expected ${dimension} dimensions for ${item.id}`)
      }
      this.contiguousIndex.set(item.embedding.values, index * dimension)
    })

    if (this.wasm) {
      const requiredBytes = this.outputPointer + items.length * Int32Array.BYTES_PER_ELEMENT
      const currentBytes = this.wasm.memory.buffer.byteLength
      if (requiredBytes > currentBytes) {
        this.wasm.memory.grow(Math.ceil((requiredBytes - currentBytes) / 65_536))
      }
      new Int8Array(this.wasm.memory.buffer, this.indexPointer, this.contiguousIndex.length).set(
        this.contiguousIndex,
      )
    }
  }

  static async create(
    items: IndexItem[],
    wasmUrl: string,
    dimension = EMBEDDING_DIMENSION,
  ): Promise<WasmSearchIndex> {
    try {
      const response = await fetch(wasmUrl)
      if (!response.ok) throw new Error(`WASM request failed with ${response.status}`)
      const bytes = await response.arrayBuffer()
      const result = await WebAssembly.instantiate(bytes)
      return new WasmSearchIndex(result.instance.exports as PinholeWasmExports, items, dimension)
    } catch (error) {
      console.warn('Pinhole SIMD index unavailable; using scalar search.', error)
      return new WasmSearchIndex(null, items, dimension)
    }
  }

  get backend(): 'wasm-simd' | 'scalar-js' {
    return this.wasm ? 'wasm-simd' : 'scalar-js'
  }

  get size(): number {
    return this.items.length
  }

  search(query: ArrayLike<number>, limit = 24): ScoredItem[] {
    const quantizedQuery = quantizeEmbedding(query)
    if (quantizedQuery.values.length !== this.dimension) {
      throw new Error(`Expected a ${this.dimension}-dimension query`)
    }

    const scores = this.wasm
      ? this.searchWasm(quantizedQuery)
      : this.searchScalar(quantizedQuery)
    return topK(scores, Math.min(limit, scores.length))
  }

  private searchWasm(query: QuantizedEmbedding): ScoredItem[] {
    const wasm = this.wasm
    if (!wasm) return this.searchScalar(query)

    new Int8Array(wasm.memory.buffer, 0, this.dimension).set(query.values)
    wasm.dot_batch(0, this.indexPointer, this.items.length, this.dimension, this.outputPointer)
    const integerScores = new Int32Array(wasm.memory.buffer, this.outputPointer, this.items.length)

    return this.items.map((item, index) => ({
      id: item.id,
      score: (integerScores[index] ?? 0) * query.scale * item.embedding.scale,
    }))
  }

  private searchScalar(query: QuantizedEmbedding): ScoredItem[] {
    return this.items.map((item, index) => {
      const start = index * this.dimension
      const vector = this.contiguousIndex.subarray(start, start + this.dimension)
      return {
        id: item.id,
        score: dotInt8(query.values, vector) * query.scale * item.embedding.scale,
      }
    })
  }
}
