import { describe, it, expect } from 'vitest'
import { loadManifest } from '../../hooks/useAsset'
import { TOKENS } from '../../tokens'

describe('M1 Scene & Asset Fallback Tests', () => {
  it('loadManifest resolves without throwing', async () => {
    // In node/jsdom environment without mock fetch, it should catch and return {} safely
    const manifest = await loadManifest()
    expect(typeof manifest).toBe('object')
    expect(manifest).not.toBeNull()
  })

  it('tokens contain defined palette for celestial bodies and hazards', () => {
    expect(TOKENS.color.amber).toBe('#F2A33A') // Sun, watch, hazard
    expect(TOKENS.color.slateBlue).toBe('#7FA6C9') // Earth, network
    expect(TOKENS.color.redOrange).toBe('#E5533D') // Lost, danger
    expect(TOKENS.color.moss).toBe('#7BAE7F') // Safe, resolved
    expect(TOKENS.color.background).toBe('#0E0F12')
    expect(TOKENS.color.surface).toBe('#16181D')
  })

  it('verifies contrast ratio of amber against background is accessible for large text', () => {
    const relLum = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      const srgb = (c: number): number =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
    }
    const Lamber = relLum(TOKENS.color.amber)
    const Lbg = relLum(TOKENS.color.background)
    const contrast = (Math.max(Lamber, Lbg) + 0.05) / (Math.min(Lamber, Lbg) + 0.05)
    // Amber on #0E0F12 has high contrast > 8:1
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
})
