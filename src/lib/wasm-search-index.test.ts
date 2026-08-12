import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { dotInt8 } from './embedding.ts'

interface DotBatchExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  dot_batch: (
    queryPointer: number,
    indexPointer: number,
    count: number,
    dimension: number,
    outputPointer: number,
  ) => void
}

describe('WASM SIMD dot product', () => {
  it('matches scalar signed INT8 arithmetic, including a tail', async () => {
    const bytes = await readFile(
      new URL('../../public/wasm/pinhole-index.wasm', import.meta.url),
    )
    const { instance } = await WebAssembly.instantiate(bytes)
    const wasm = instance.exports as DotBatchExports
    const dimension = 513
    const count = 3
    const query = Int8Array.from({ length: dimension }, (_, index) => (index % 19) - 9)
    const index = Int8Array.from(
      { length: dimension * count },
      (_, itemIndex) => (itemIndex % 23) - 11,
    )
    const indexPointer = 1024
    const outputPointer = Math.ceil((indexPointer + index.length + 16) / 4) * 4
    new Int8Array(wasm.memory.buffer, 0, query.length).set(query)
    new Int8Array(wasm.memory.buffer, indexPointer, index.length).set(index)

    wasm.dot_batch(0, indexPointer, count, dimension, outputPointer)
    const results = new Int32Array(wasm.memory.buffer, outputPointer, count)

    for (let item = 0; item < count; item += 1) {
      const start = item * dimension
      expect(results[item]).toBe(dotInt8(query, index.subarray(start, start + dimension)))
    }
  })
})
