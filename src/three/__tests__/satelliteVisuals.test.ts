import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { getVisualSatellitePosition } from '../satelliteVisuals'
import type { WorkerSatellite } from '../../workers/simulation.worker'

describe('satelliteVisuals: getVisualSatellitePosition', () => {
  it('preserves nominal satellite positions when altitude is 550 km', () => {
    const sat: WorkerSatellite = {
      id: 0,
      plane: 0,
      indexInPlane: 0,
      altitudeKm: 550,
      semiMajorAxisM: 6928137,
      anomalyRad: 0,
      position: [10.862, 0, 0],
      status: 'nominal',
      isDecaying: false,
    }

    const target = new THREE.Vector3()
    getVisualSatellitePosition(sat, target)

    // Should remain at nominal scene radius ~10.862
    expect(target.x).toBeCloseTo(10.862, 2)
    expect(target.y).toBe(0)
    expect(target.z).toBe(0)
  })

  it('visibly scales altitude downward when satellite is decaying', () => {
    const satAtRisk: WorkerSatellite = {
      id: 1,
      plane: 0,
      indexInPlane: 1,
      altitudeKm: 350,
      semiMajorAxisM: 6728137,
      anomalyRad: 0,
      position: [10.548, 0, 0],
      status: 'atRisk',
      isDecaying: true,
    }

    const satLost: WorkerSatellite = {
      id: 2,
      plane: 0,
      indexInPlane: 2,
      altitudeKm: 120,
      semiMajorAxisM: 6498137,
      anomalyRad: 0,
      position: [10.188, 0, 0],
      status: 'lost',
      isDecaying: false,
    }

    const targetAtRisk = new THREE.Vector3()
    const targetLost = new THREE.Vector3()

    getVisualSatellitePosition(satAtRisk, targetAtRisk)
    getVisualSatellitePosition(satLost, targetLost)

    // At-risk satellite radius should be lower than nominal (10.862)
    expect(targetAtRisk.length()).toBeLessThan(10.86)
    // Lost satellite radius should be lower than at-risk
    expect(targetLost.length()).toBeLessThan(targetAtRisk.length())
    // Lost satellite should hover just above Earth surface (radius 10.0)
    expect(targetLost.length()).toBeGreaterThanOrEqual(10.15)
  })
})
