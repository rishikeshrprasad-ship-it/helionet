import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { FLARE_VISUAL_HOURS } from '../../config/constants'
import { getFlareClass } from '../../engines/flareClassification'
import type { ReplayRow } from '../../store/helioStore'
import {
  computeSolarFlareState,
  findFirstM1CrossingHours,
  generateSeededArcParams,
  getFlareIntensitySpec,
  mulberry32,
} from '../solarFlareMath'
import { disposeObject3D, prepareNormalizedScene } from '../modelUtils'

function makeRow(t: number, xray: number): ReplayRow {
  return {
    t,
    obs: {
      xray,
      p10: 1,
      kp: 2,
      dst: -10,
      vsw: 400,
      bz: -2,
    },
    forecast: {
      pFlare: 0.2,
      pProton: 0.1,
      pGeo: 0.2,
      leadH: 24,
    },
  }
}

describe('SolarFlare deterministic timeline state & scaling', () => {
  it('never triggers a visual flare when peak X-ray flux stays below M1 (1e-5 W/m^2)', () => {
    const cOnlyRows: ReplayRow[] = [makeRow(0, 1e-7), makeRow(2, 5e-6), makeRow(4, 9.9e-6)]
    expect(findFirstM1CrossingHours(cOnlyRows)).toBeNull()

    for (const t of [0, 2, 4, 5]) {
      const state = computeSolarFlareState(cOnlyRows, t)
      expect(state.active).toBe(false)
      expect(state.arcCount).toBe(0)
    }
  })

  it('triggers strictly at first M1 crossing and is deterministic across forward/reverse seeks', () => {
    const rows: ReplayRow[] = [
      makeRow(0, 8e-7),
      makeRow(2, 6e-6),
      makeRow(4, 1.2e-5), // first M1+ crossing (M1.2)
      makeRow(5, 1.8e-5),
      makeRow(8, 2e-6),
    ]

    expect(findFirstM1CrossingHours(rows)).toBe(4)

    // Before t_f
    expect(computeSolarFlareState(rows, 3.9).active).toBe(false)

    // At t_f + 0.75h (halfway through 1.5h window)
    const forwardMid = computeSolarFlareState(rows, 4.75, FLARE_VISUAL_HOURS.value)
    expect(forwardMid.active).toBe(true)
    expect(forwardMid.tFlare).toBe(4)
    expect(forwardMid.progress).toBeCloseTo(0.5, 5)
    expect(forwardMid.flareClass?.classLetter).toBe('M')
    expect(forwardMid.arcCount).toBe(1)
    expect(forwardMid.flashIntensity).toBe(0.4)

    // After t_f + 1.5h window
    expect(computeSolarFlareState(rows, 6.0, FLARE_VISUAL_HOURS.value).active).toBe(false)

    // Seek backward back to t=4.75 and confirm identical result
    const backwardMid = computeSolarFlareState(rows, 4.75, FLARE_VISUAL_HOURS.value)
    expect(backwardMid).toEqual(forwardMid)
  })

  it('maps C, M1..M4.9, M5..M9.9, and X (capped at X10) classes to exact arc counts and flash strength', () => {
    const cSpec = getFlareIntensitySpec(getFlareClass(4e-6))
    expect(cSpec).toEqual({ arcCount: 0, flashIntensity: 0, patchOnly: true })

    const mLowSpec = getFlareIntensitySpec(getFlareClass(2.5e-5))
    expect(mLowSpec).toEqual({ arcCount: 1, flashIntensity: 0.4, patchOnly: false })

    const mHighSpec = getFlareIntensitySpec(getFlareClass(5.2e-5))
    expect(mHighSpec).toEqual({ arcCount: 2, flashIntensity: 0.6, patchOnly: false })

    const xLowSpec = getFlareIntensitySpec(getFlareClass(1.5e-4))
    expect(xLowSpec.arcCount).toBe(3)
    expect(xLowSpec.flashIntensity).toBe(1.0)

    const x10Spec = getFlareIntensitySpec(getFlareClass(1e-3))
    expect(x10Spec.arcCount).toBe(5)
    expect(x10Spec.flashIntensity).toBe(1.0)

    // X25 stays capped at 5 pooled arcs and 1.0 flash
    const x25Spec = getFlareIntensitySpec(getFlareClass(2.5e-3))
    expect(x25Spec).toEqual(x10Spec)
  })

  it('generates seeded reproducible arc parameters within 5-15 deg span and 0.15-0.6 apex range', () => {
    const rngA = mulberry32(12345)
    const rngB = mulberry32(12345)
    expect(rngA()).toBe(rngB())
    expect(rngA()).toBe(rngB())

    const arcsA = generateSeededArcParams(4, 5)
    const arcsB = generateSeededArcParams(4, 5)
    expect(arcsA).toEqual(arcsB)
    expect(arcsA).toHaveLength(5)

    for (const arc of arcsA) {
      expect(arc.spanDeg).toBeGreaterThanOrEqual(5)
      expect(arc.spanDeg).toBeLessThanOrEqual(15)
      expect(arc.apexFactor).toBeGreaterThanOrEqual(0.15)
      expect(arc.apexFactor).toBeLessThanOrEqual(0.6)
    }
  })
})

describe('modelUtils normalization & disposal', () => {
  it('centers, scales to targetRadius or bottom-Y-zero targetZSpan, and disposes cleanly', () => {
    const source = new THREE.Group()
    const geom = new THREE.BoxGeometry(2, 4, 8)
    const mat = new THREE.MeshStandardMaterial({ color: '#cccccc' })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.set(10, 5, -3)
    source.add(mesh)

    const radiusNorm = prepareNormalizedScene(source, { targetRadius: 10 })
    const rBox = new THREE.Box3().setFromObject(radiusNorm)
    const rCenter = new THREE.Vector3()
    const rSize = new THREE.Vector3()
    rBox.getCenter(rCenter)
    rBox.getSize(rSize)
    expect(rCenter.x).toBeCloseTo(0, 4)
    expect(rCenter.y).toBeCloseTo(0, 4)
    expect(rCenter.z).toBeCloseTo(0, 4)
    expect(Math.max(rSize.x, rSize.y, rSize.z)).toBeCloseTo(20, 3)

    const roverNorm = prepareNormalizedScene(source, {
      targetZSpan: 2.34375,
      alignBottomYZero: true,
    })
    const roverBox = new THREE.Box3().setFromObject(roverNorm)
    const roverSize = new THREE.Vector3()
    roverBox.getSize(roverSize)
    expect(roverBox.min.y).toBeCloseTo(0, 4)
    expect(roverSize.z).toBeCloseTo(2.34375, 4)

    expect(() => disposeObject3D(radiusNorm)).not.toThrow()
    expect(() => disposeObject3D(roverNorm)).not.toThrow()
    geom.dispose()
    mat.dispose()
  })
})
