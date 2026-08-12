import { describe, expect, it } from 'vitest'
import {
  dotFloat32,
  normalizeEmbedding,
  quantizeEmbedding,
  quantizedCosine,
  topK,
} from './embedding.ts'

describe('embedding utilities', () => {
  it('normalizes vectors without changing direction', () => {
    const normalized = normalizeEmbedding([3, 4])
    expect(normalized[0]).toBeCloseTo(0.6)
    expect(normalized[1]).toBeCloseTo(0.8)
    expect(dotFloat32(normalized, normalized)).toBeCloseTo(1)
  })

  it('keeps cosine similarity close after INT8 quantization', () => {
    const left = normalizeEmbedding(Array.from({ length: 512 }, (_, i) => Math.sin(i * 0.13)))
    const right = normalizeEmbedding(Array.from({ length: 512 }, (_, i) => Math.cos(i * 0.17)))
    const expected = dotFloat32(left, right)
    const actual = quantizedCosine(quantizeEmbedding(left), quantizeEmbedding(right))
    expect(Math.abs(expected - actual)).toBeLessThan(0.002)
  })

  it('returns the highest scores in descending order', () => {
    expect(
      topK(
        [
          { id: 'middle', score: 0.5 },
          { id: 'last', score: -1 },
          { id: 'first', score: 0.9 },
        ],
        2,
      ),
    ).toEqual([
      { id: 'first', score: 0.9 },
      { id: 'middle', score: 0.5 },
    ])
  })
})
