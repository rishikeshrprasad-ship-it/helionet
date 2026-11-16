import { describe, it, expect } from 'vitest'
import { TOKENS } from '../tokens'
import {
  parseHex,
  contrastRatio,
} from '../utils/wcag'

describe('WCAG 2.1 AA Contrast Ratio Verification', () => {
  const bgRgb = parseHex(TOKENS.color.background)
  const surfaceRgb = parseHex(TOKENS.color.surface)

  it('verifies primary text token contrast on background and surface >= 4.5:1', () => {
    const textRgb = parseHex(TOKENS.color.text)
    const crBg = contrastRatio(textRgb, bgRgb)
    const crSurface = contrastRatio(textRgb, surfaceRgb)

    expect(crBg).toBeGreaterThanOrEqual(4.5)
    expect(crSurface).toBeGreaterThanOrEqual(4.5)
  })

  it('verifies muted text token contrast on background and surface >= 4.5:1', () => {
    const mutedRgb = parseHex(TOKENS.color.muted)
    const crBg = contrastRatio(mutedRgb, bgRgb)
    const crSurface = contrastRatio(mutedRgb, surfaceRgb)

    expect(crBg).toBeGreaterThanOrEqual(4.5)
    expect(crSurface).toBeGreaterThanOrEqual(4.5)
  })

  it('verifies all AlertCard status labels and shape indicators meet contrast requirements on surface', () => {
    const statusIndicators = [
      { status: 'CONFIRMED', shapeHex: TOKENS.color.redOrange },
      { status: 'WATCH', shapeHex: TOKENS.color.amber },
      { status: 'RESOLVED', shapeHex: TOKENS.color.moss },
      { status: 'FALSE_ALARM', shapeHex: TOKENS.color.muted },
    ]

    const textRatio = contrastRatio(parseHex(TOKENS.color.text), surfaceRgb)
    expect(textRatio).toBeGreaterThanOrEqual(4.5)

    for (const item of statusIndicators) {
      const shapeRatio = contrastRatio(parseHex(item.shapeHex), surfaceRgb)
      // Status indicator shapes require >= 3.0:1 UI component contrast against surface
      expect(
        shapeRatio,
        `Status ${item.status} indicator contrast must be >= 3.0:1 (was ${shapeRatio.toFixed(2)}:1)`
      ).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('verifies large text tokens (>=18px) have contrast >= 3.0:1', () => {
    const amberRgb = parseHex(TOKENS.color.amber)
    const crAmberBg = contrastRatio(amberRgb, bgRgb)
    const crAmberSurface = contrastRatio(amberRgb, surfaceRgb)

    // Heading elements at >= 18px require at least 3.0:1
    expect(crAmberBg).toBeGreaterThanOrEqual(3.0)
    expect(crAmberSurface).toBeGreaterThanOrEqual(3.0)
  })
})
