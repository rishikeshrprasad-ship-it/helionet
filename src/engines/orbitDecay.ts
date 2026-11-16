import { EARTH_GRAVITATIONAL_PARAMETER, EARTH_RADIUS_M } from '../config/constants'
import { LOST_ALTITUDE_M } from '../config/thresholds'

/**
 * Orbital decay engine using circular-orbit approximation.
 * Label: "Circular-orbit approximation"
 */

export const MU_EARTH = EARTH_GRAVITATIONAL_PARAMETER.value
export const R_EARTH_M = EARTH_RADIUS_M.value
export const DEFAULT_LOST_ALTITUDE_M = LOST_ALTITUDE_M.value

export const ORBIT_DECAY_MODEL_LABEL = 'Circular-orbit approximation'

export interface SatelliteBallistics {
  /** Drag coefficient Cd, typically ~2.2 for compact satellites */
  cd: number
  /** Cross-sectional area A in m^2 */
  areaM2: number
  /** Satellite mass m in kg */
  massKg: number
}

export interface OrbitState {
  /** Semi-major axis in meters */
  semiMajorAxisM: number
  /** Altitude in meters above Earth radius R_E */
  altitudeM: number
  /** Whether satellite has descended below the lost altitude threshold */
  isLost: boolean
}

/**
 * Computes orbital decay step:
 * a[n+1] = a[n] - rho(h) * (Cd * A / m) * sqrt(mu * a[n]) * dt
 *
 * @param currentSemiMajorAxisM Current semi-major axis in meters
 * @param densityKgM3 Atmospheric density rho at current altitude
 * @param ballistics Ballistic parameters (Cd, Area, Mass)
 * @param dt Time step in seconds
 * @param lostAltitudeM Altitude below which satellite is deemed lost (default 150 km)
 */
export function stepOrbitDecay(
  currentSemiMajorAxisM: number,
  densityKgM3: number,
  ballistics: SatelliteBallistics,
  dt: number,
  lostAltitudeM: number = DEFAULT_LOST_ALTITUDE_M,
): OrbitState {
  if (currentSemiMajorAxisM <= R_EARTH_M + lostAltitudeM) {
    return {
      semiMajorAxisM: currentSemiMajorAxisM,
      altitudeM: Math.max(0, currentSemiMajorAxisM - R_EARTH_M),
      isLost: true,
    }
  }

  // B = (Cd * A / m) in m^2 / kg (ballistic coefficient inverse)
  const bFactor = (ballistics.cd * ballistics.areaM2) / Math.max(0.001, ballistics.massKg)

  // delta_a = rho * B * sqrt(mu * a) * dt
  const decayRate = densityKgM3 * bFactor * Math.sqrt(MU_EARTH * currentSemiMajorAxisM)
  const deltaA = decayRate * dt

  const nextA = Math.max(R_EARTH_M, currentSemiMajorAxisM - deltaA)
  const nextAlt = nextA - R_EARTH_M
  const isLost = nextAlt <= lostAltitudeM

  return {
    semiMajorAxisM: nextA,
    altitudeM: nextAlt,
    isLost,
  }
}
