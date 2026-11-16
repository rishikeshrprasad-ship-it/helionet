import { describe, it, expect } from 'vitest'
import {
  findParetoRoutes,
  selectOptimalShelterRoute,
  bruteForceOptimalPathFixedOnset,
  dominates,
} from '../shelterRouting'
import { type TerrainGrid } from '../terrain'

describe('Shelter Routing Engine (Feature 28)', () => {
  it('correctly determines Pareto dominance', () => {
    const l1 = { timeSeconds: 100, accumulatedDose: 10 }
    const l2 = { timeSeconds: 120, accumulatedDose: 15 }
    const l3 = { timeSeconds: 90, accumulatedDose: 20 }

    expect(dominates(l1, l2)).toBe(true)
    expect(dominates(l2, l1)).toBe(false)
    // l1 and l3 are non-dominating (trade-off)
    expect(dominates(l1, l3)).toBe(false)
    expect(dominates(l3, l1)).toBe(false)
  })

  it('TEST REQUIREMENT: With a fixed onset, matches brute force on a 6x6 grid', () => {
    const width = 6
    const height = 6
    const cellSizeM = 20.0

    // Mild elevation variations on 6x6 grid
    const elevations = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        elevations[y * width + x] = 2.0 * Math.sin(x * 0.8) + 1.5 * Math.cos(y * 0.8)
      }
    }

    const grid: TerrainGrid = {
      width,
      height,
      cellSizeM,
      elevations,
    }

    const svfMap = new Float32Array(width * height).fill(0.85)
    // Create a terrain shielding trench along row 2
    for (let x = 0; x < width; x++) {
      svfMap[2 * width + x] = 0.40
    }

    const startX = 0
    const startY = 0
    const goalX = 5
    const goalY = 5
    const roverSpeedMps = 1.0
    const radiationRate = 0.05
    const fixedOnsetSeconds = 250.0
    const doseCap = 20.0

    // 1. Brute force search
    const bruteForce = bruteForceOptimalPathFixedOnset({
      grid,
      startX,
      startY,
      goalX,
      goalY,
      svfMap,
      radiationRate,
      roverSpeedMps,
      fixedOnsetSeconds,
      doseCap,
    })

    expect(bruteForce.optimalPath).not.toBeNull()

    // 2. Pareto label-setting search
    const paretoRoutes = findParetoRoutes({
      grid,
      startX,
      startY,
      goalX,
      goalY,
      svfMap,
      radiationRate,
      roverSpeedMps,
      doseCap,
    })

    expect(paretoRoutes.length).toBeGreaterThan(0)

    // The minimum dose among feasible routes arriving before fixedOnsetSeconds
    // should match the brute-force minimum dose
    const feasibleRoutes = paretoRoutes.filter(
      (r) => r.timeSeconds <= fixedOnsetSeconds && r.accumulatedDose <= doseCap,
    )
    expect(feasibleRoutes.length).toBeGreaterThan(0)

    let minParetoDose = Infinity
    for (const r of feasibleRoutes) {
      if (r.accumulatedDose < minParetoDose) {
        minParetoDose = r.accumulatedDose
      }
    }

    expect(minParetoDose).toBeCloseTo(bruteForce.minDose, 4)
  })

  it('selects optimal route maximizing probability over 200 storm onset draws', () => {
    const width = 8
    const height = 8
    const grid: TerrainGrid = {
      width,
      height,
      cellSizeM: 20.0,
      elevations: new Float32Array(width * height).fill(0),
    }
    const svfMap = new Float32Array(width * height).fill(0.9)

    const routes = findParetoRoutes({
      grid,
      startX: 0,
      startY: 0,
      goalX: 7,
      goalY: 7,
      svfMap,
      radiationRate: 0.02,
      roverSpeedMps: 1.2,
      doseCap: 15.0,
    })

    const optimal = selectOptimalShelterRoute({
      candidateRoutes: routes,
      leadTimeMeanHours: 1.0, // 3600s
      leadTimeStdHours: 0.2,
      doseCap: 15.0,
      numSamples: 200,
      seed: 999,
    })

    expect(optimal.bestRoute).not.toBeNull()
    expect(optimal.maxSuccessProb).toBeGreaterThan(0.9)
  })
})
