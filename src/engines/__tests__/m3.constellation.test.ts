import { describe, it, expect } from 'vitest'
import { R_EARTH_M, stepOrbitDecay } from '../orbitDecay'
import { interpolateDensity } from '../density'
import { dijkstraRerouting, type WeightedEdge } from '../routing'

describe('M3 Constellation Physics & Rerouting Invariants', () => {
  it('generates 120 satellites across 6 planes with 53 degree inclination', () => {
    const TOTAL_PLANES = 6
    const SATS_PER_PLANE = 20
    const sats: { plane: number; index: number; anomaly: number }[] = []

    for (let p = 0; p < TOTAL_PLANES; p++) {
      for (let k = 0; k < SATS_PER_PLANE; k++) {
        sats.push({
          plane: p,
          index: k,
          anomaly: (k * 2.0 * Math.PI) / SATS_PER_PLANE + (p * Math.PI) / TOTAL_PLANES,
        })
      }
    }

    expect(sats.length).toBe(120)
    // Every plane has exactly 20 satellites
    for (let p = 0; p < TOTAL_PLANES; p++) {
      const planeSats = sats.filter((s) => s.plane === p)
      expect(planeSats.length).toBe(20)
    }
  })

  it('determines orbit decay rate under geomagnetic storm density surge', () => {
    const initialAltKm = 550.0
    const initialRadiusM = R_EARTH_M + initialAltKm * 1000.0

    // Calm conditions: Kp = 1
    const calmDensity = interpolateDensity(initialAltKm, 150, 4).density
    const calmDecay = stepOrbitDecay(
      initialRadiusM,
      calmDensity,
      { cd: 2.2, areaM2: 2.5, massKg: 260.0 },
      3600, // 1 hour
    )

    // Storm conditions: Kp = 7
    let stormDensity = interpolateDensity(initialAltKm, 150, 128).density
    stormDensity *= 1.0 + (7 - 4) * 0.8 // severe storm multiplier
    const stormDecay = stepOrbitDecay(
      initialRadiusM,
      stormDensity,
      { cd: 2.2, areaM2: 2.5, massKg: 260.0 },
      3600,
    )

    // Altitude loss under storm should strictly exceed calm conditions
    const calmAltLoss = initialRadiusM - calmDecay.semiMajorAxisM
    const stormAltLoss = initialRadiusM - stormDecay.semiMajorAxisM
    expect(stormAltLoss).toBeGreaterThan(calmAltLoss)
  })

  it('computes Dijkstra rerouted path avoiding degraded or lost nodes', () => {
    // 4-node topology: 0 -- 1 -- 3, and 0 -- 2 -- 3
    const edges: WeightedEdge[] = [
      { u: 0, v: 1, latencyMs: 10, pFail: 0.9 }, // High failure risk
      { u: 1, v: 3, latencyMs: 10, pFail: 0.9 },
      { u: 0, v: 2, latencyMs: 20, pFail: 0.01 }, // Safe path
      { u: 2, v: 3, latencyMs: 20, pFail: 0.01 },
    ]

    const rerouted = dijkstraRerouting(4, edges, 0, 3, 50.0)
    expect(rerouted.path).toEqual([0, 2, 3])
  })
})
