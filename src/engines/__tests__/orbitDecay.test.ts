import { describe, it, expect } from 'vitest'
import {
  stepOrbitDecay,
  R_EARTH_M,
  ORBIT_DECAY_MODEL_LABEL,
  DEFAULT_LOST_ALTITUDE_M,
  type SatelliteBallistics,
} from '../orbitDecay'

describe('Orbit Decay Engine (Feature 10)', () => {
  const standardBallistics: SatelliteBallistics = {
    cd: 2.2,
    areaM2: 1.5,
    massKg: 260.0,
  }

  it('has label "Circular-orbit approximation"', () => {
    expect(ORBIT_DECAY_MODEL_LABEL).toBe('Circular-orbit approximation')
  })

  it('TEST REQUIREMENT: rho = 0 gives constant altitude', () => {
    const initialAltM = 350000 // 350 km
    const initialSemiMajorAxisM = R_EARTH_M + initialAltM
    const dt = 3600 // 1 hour step

    const next = stepOrbitDecay(initialSemiMajorAxisM, 0.0, standardBallistics, dt)

    expect(next.altitudeM).toBe(initialAltM)
    expect(next.semiMajorAxisM).toBe(initialSemiMajorAxisM)
    expect(next.isLost).toBe(false)
  })

  it('decays altitude when atmospheric density is non-zero', () => {
    const initialAltM = 300000 // 300 km
    const initialSemiMajorAxisM = R_EARTH_M + initialAltM
    const density = 2.5e-11 // kg/m^3
    const dt = 86400 // 1 day

    const next = stepOrbitDecay(initialSemiMajorAxisM, density, standardBallistics, dt)

    expect(next.altitudeM).toBeLessThan(initialAltM)
    expect(next.semiMajorAxisM).toBeLessThan(initialSemiMajorAxisM)
    expect(next.isLost).toBe(false)
  })

  it('marks satellite as lost below configurable lost altitude threshold (default 180 km)', () => {
    const nearLostAltM = DEFAULT_LOST_ALTITUDE_M + 500 // 180.5 km
    const initialA = R_EARTH_M + nearLostAltM
    const severeDensity = 5.0e-9 // high drag at low altitude
    const dt = 3600

    const next = stepOrbitDecay(initialA, severeDensity, standardBallistics, dt, DEFAULT_LOST_ALTITUDE_M)

    expect(next.altitudeM).toBeLessThan(DEFAULT_LOST_ALTITUDE_M)
    expect(next.isLost).toBe(true)
  })
})
