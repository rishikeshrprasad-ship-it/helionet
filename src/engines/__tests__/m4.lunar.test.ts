import { describe, it, expect } from 'vitest'
import { generateLunarSouthPoleHeightmap } from '../terrain'
import { computeTerrainSkyViewFactorMap } from '../shielding'
import { findParetoRoutes } from '../shelterRouting'
import { stepRadiationDose } from '../dose'

describe('M4 Lunar Surface Scene & Radiation Engine Invariants', () => {
  it('generates a 128x128 lunar south pole terrain grid with Shackleton crater depression', () => {
    const grid = generateLunarSouthPoleHeightmap(128, 128, 39.0, 42)
    expect(grid.width).toBe(128)
    expect(grid.height).toBe(128)
    expect(grid.elevations.length).toBe(128 * 128)

    // Center of Shackleton crater (64, 64) should be deeply depressed
    const centerIdx = 64 * 128 + 64
    const centerElevation = grid.elevations[centerIdx]

    // Rim of Shackleton crater (~28 cells away, e.g. at 64, 92) should be elevated
    const rimIdx = 92 * 128 + 64
    const rimElevation = grid.elevations[rimIdx]

    expect(centerElevation).toBeLessThan(rimElevation)
  })

  it('computes Sky-View Factor shielding across terrain cells', () => {
    const grid = generateLunarSouthPoleHeightmap(32, 32, 39.0, 42)
    const svfMap = computeTerrainSkyViewFactorMap(grid, 500.0)

    expect(svfMap.length).toBe(32 * 32)
    for (let i = 0; i < svfMap.length; i++) {
      expect(svfMap[i]).toBeGreaterThanOrEqual(0.0)
      expect(svfMap[i]).toBeLessThanOrEqual(1.0)
    }
  })

  it('finds Pareto optimal route avoiding steep slopes and minimizing dose to shelter', () => {
    const grid = generateLunarSouthPoleHeightmap(128, 128, 39.0, 42)
    const svfMap = computeTerrainSkyViewFactorMap(grid, 200.0)

    const routes = findParetoRoutes({
      grid,
      startX: 20,
      startY: 20,
      goalX: 24,
      goalY: 24,
      svfMap,
      radiationRate: 0.005,
      roverSpeedMps: 1.5,
      doseCap: 50.0,
      maxLabelsPerCell: 4,
    })

    expect(routes.length).toBeGreaterThan(0)
    const bestRoute = routes[0]
    expect(bestRoute.path.length).toBeGreaterThan(2)
    expect(bestRoute.path[0]).toEqual([20, 20])
    expect(bestRoute.path[bestRoute.path.length - 1]).toEqual([24, 24])
    expect(bestRoute.accumulatedDose).toBeLessThanOrEqual(50.0)
  })

  it('steps radiation dose strictly following D[k+1] = D[k] + r(t)*SVF*(1 - s_shelter)*dt', () => {
    const currentDose = 10.0
    const radiationRate = 0.5 // IDU/sec
    const svf = 0.8
    const shelterShielding = 0.95 // 95% reduction inside shelter
    const dtSeconds = 10.0

    // Unshielded step
    const unshielded = stepRadiationDose({
      currentDose,
      radiationRate,
      skyViewFactor: svf,
      shelterShieldingEfficacy: 0.0,
      dtSeconds,
      doseCap: 50.0,
    })
    expect(unshielded.dose).toBeCloseTo(10.0 + 0.5 * 0.8 * 1.0 * 10.0, 5) // 14.0

    // Sheltered step
    const sheltered = stepRadiationDose({
      currentDose,
      radiationRate,
      skyViewFactor: svf,
      shelterShieldingEfficacy: shelterShielding,
      dtSeconds,
      doseCap: 50.0,
    })
    expect(sheltered.dose).toBeCloseTo(10.0 + 0.5 * 0.8 * 0.05 * 10.0, 5) // 10.2
    expect(sheltered.dose).toBeLessThan(unshielded.dose)
  })
})
