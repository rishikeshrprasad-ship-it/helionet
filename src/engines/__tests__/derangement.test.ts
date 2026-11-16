import { describe, it, expect } from 'vitest'
import {
  computeDerangementsCount,
  generateDerangementPermutation,
  isDerangement,
} from '../derangement'

describe('Derangement Engine (Feature 19)', () => {
  it('TEST REQUIREMENT: D_5 = 44', () => {
    expect(computeDerangementsCount(5)).toBe(44)
  })

  it('computes exact subfactorial values for small n', () => {
    // Known values: D_0=1, D_1=0, D_2=1, D_3=2, D_4=9, D_5=44, D_6=265
    expect(computeDerangementsCount(0)).toBe(1)
    expect(computeDerangementsCount(1)).toBe(0)
    expect(computeDerangementsCount(2)).toBe(1)
    expect(computeDerangementsCount(3)).toBe(2)
    expect(computeDerangementsCount(4)).toBe(9)
    expect(computeDerangementsCount(5)).toBe(44)
    expect(computeDerangementsCount(6)).toBe(265)
  })

  it('reassigns tasks with zero fixed points (pi[i] != i)', () => {
    for (const n of [3, 5, 8, 12]) {
      const perm = generateDerangementPermutation(n, 100 + n)
      expect(perm.length).toBe(n)
      expect(isDerangement(perm)).toBe(true)

      // Ensure it is a complete bijection (permutation of 0..n-1)
      const sorted = [...perm].sort((a, b) => a - b)
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })
})
