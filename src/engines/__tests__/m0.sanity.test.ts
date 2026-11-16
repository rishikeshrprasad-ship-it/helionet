import { describe, it, expect } from 'vitest'
import { mulberry32 } from '../random'
import { TOKENS } from '../../tokens'

/**
 * M0 sanity tests:
 * 1. mulberry32 is deterministic and produces values in [0, 1)
 * 2. Design token colours are present and non-empty
 */
describe('mulberry32 PRNG', () => {
  it('produces the same sequence for the same seed', () => {
    const rng1 = mulberry32(42)
    const rng2 = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1)
    const rng2 = mulberry32(2)
    const s1 = Array.from({ length: 10 }, () => rng1())
    const s2 = Array.from({ length: 10 }, () => rng2())
    expect(s1).not.toEqual(s2)
  })

  it('all values are in [0, 1)', () => {
    const rng = mulberry32(99999)
    for (let i = 0; i < 10000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('produces reasonably uniform output (mean near 0.5)', () => {
    const rng = mulberry32(12345)
    const n = 100_000
    let sum = 0
    for (let i = 0; i < n; i++) sum += rng()
    const mean = sum / n
    expect(mean).toBeGreaterThan(0.49)
    expect(mean).toBeLessThan(0.51)
  })
})

describe('design tokens', () => {
  it('has all required colour tokens', () => {
    const required = [
      'background', 'surface', 'hairline', 'text', 'muted',
      'amber', 'slateBlue', 'redOrange', 'moss',
    ] as const
    for (const key of required) {
      expect(TOKENS.color[key]).toBeTruthy()
      expect(typeof TOKENS.color[key]).toBe('string')
      expect(TOKENS.color[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('background contrast: text on background >= 4.5:1', () => {
    // Relative luminance of #0E0F12 and #E8E6E1
    const relLum = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      const srgb = (c: number): number =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
    }
    const L1 = relLum(TOKENS.color.text)
    const L2 = relLum(TOKENS.color.background)
    const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
})
