import { describe, it, expect } from 'vitest'
import {
  computeCellTransition,
  getTerrainNeighbors,
  computeDiscreteHazardPixelCounts,
  DEFAULT_SLOPE_MAX_DEG,
  DEFAULT_SLOPE_MAX_RAD,
  type TerrainGrid,
  type CircularHazard,
} from '../terrain'

describe('Terrain Graph & Hazard Overlap Engine (Features 24 & 26)', () => {
  it('computes slope and cost, blocking above slope_max (15 degrees default)', () => {
    const cellSizeM = 20.0
    expect(DEFAULT_SLOPE_MAX_DEG).toBe(15.0)
    expect(DEFAULT_SLOPE_MAX_RAD).toBeCloseTo((15.0 * Math.PI) / 180.0, 8)

    // Flat transition: dh = 0
    const flat = computeCellTransition(0, 0, 100, 1, 0, 100, cellSizeM)
    expect(flat.slopeRad).toBe(0)
    expect(flat.cost).toBeCloseTo(cellSizeM, 6)
    expect(flat.blocked).toBe(false)

    // Gentle slope (5 degrees): tan(5 deg) * 20m ~= 1.75m
    const gentleH2 = 100 + cellSizeM * Math.tan((5 * Math.PI) / 180)
    const gentle = computeCellTransition(0, 0, 100, 1, 0, gentleH2, cellSizeM)
    expect(gentle.blocked).toBe(false)
    expect(gentle.cost).toBeGreaterThan(cellSizeM)

    // Steep cliff (25 degrees > 15 degrees): dh = 20m * tan(25 deg) ~= 9.3m
    const steepH2 = 100 + cellSizeM * Math.tan((25 * Math.PI) / 180)
    const steep = computeCellTransition(0, 0, 100, 1, 0, steepH2, cellSizeM)
    expect(steep.blocked).toBe(true)
    expect(steep.cost).toBe(Infinity)
  })

  it('generates 8 neighbors for interior grid cells', () => {
    const grid: TerrainGrid = {
      width: 5,
      height: 5,
      cellSizeM: 20.0,
      elevations: new Float32Array(25).fill(100),
    }

    const neighbors = getTerrainNeighbors(2, 2, grid)
    expect(neighbors.length).toBe(8)
    for (const n of neighbors) {
      expect(n.blocked).toBe(false)
      expect(n.distanceM).toBeGreaterThanOrEqual(20.0)
    }
  })

  it('TEST REQUIREMENT: Hazard overlap by inclusion-exclusion matches direct pixel count', () => {
    // 3 overlapping circular hazard areas
    const hazards: CircularHazard[] = [
      { cx: 50, cy: 50, radius: 25 },
      { cx: 65, cy: 50, radius: 25 },
      { cx: 58, cy: 65, radius: 25 },
    ]

    const bounds = { minX: 10, maxX: 100, minY: 10, maxY: 100 }
    const result = computeDiscreteHazardPixelCounts(hazards, bounds)

    expect(result.exactUnionPixelCount).toBeGreaterThan(0)
    // The inclusion-exclusion formula result must match the exact discrete pixel count of the union
    expect(result.inclusionExclusionUnionCount).toBe(result.exactUnionPixelCount)
  })
})
