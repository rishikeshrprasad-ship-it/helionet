import { describe, it, expect } from 'vitest'
import {
  computeSkyViewFactor,
  SHIELDING_MODEL_LABEL,
  NUM_AZIMUTH_RAYS,
} from '../shielding'
import { type TerrainGrid } from '../terrain'

describe('Sky-View Factor Shielding Engine (Feature 25)', () => {
  it('has label "Approximation" and uses 16 azimuth rays', () => {
    expect(SHIELDING_MODEL_LABEL).toBe('Approximation')
    expect(NUM_AZIMUTH_RAYS).toBe(16)
  })

  it('TEST REQUIREMENT: flat terrain gives SVF = 1.0', () => {
    // 32 x 32 flat terrain with constant elevation 0 m, cell size 20 m
    const width = 32
    const height = 32
    const grid: TerrainGrid = {
      width,
      height,
      cellSizeM: 20.0,
      elevations: new Float32Array(width * height).fill(0), // perfectly flat
    }

    const center = Math.floor(width / 2)
    const result = computeSkyViewFactor(center, center, grid)

    expect(result.svf).toBe(1.0)
    for (const angle of result.horizonAnglesRad) {
      expect(angle).toBe(0)
    }
  })

  it('reduces SVF inside a deep crater depression with high rim walls', () => {
    const width = 32
    const height = 32
    const elevations = new Float32Array(width * height).fill(0)
    const cx = 16
    const cy = 16

    // Create a circular crater: rim at radius 6 is 120m high
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distCells = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (Math.abs(distCells - 6) <= 1) {
          elevations[y * width + x] = 120.0 // crater rim wall
        }
      }
    }

    const grid: TerrainGrid = {
      width,
      height,
      cellSizeM: 20.0,
      elevations,
    }

    const result = computeSkyViewFactor(cx, cy, grid)
    // Inside the crater, the rim occludes the sky, so SVF < 1.0
    expect(result.svf).toBeLessThan(0.95)
    expect(result.svf).toBeGreaterThan(0.2)
  })
})
