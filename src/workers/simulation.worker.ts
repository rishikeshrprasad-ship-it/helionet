import { stepOrbitDecay, type SatelliteBallistics } from '../engines/orbitDecay'
import { interpolateDensity } from '../engines/density'
import { dijkstraRerouting, type WeightedEdge } from '../engines/routing'
import { EARTH_GRAVITATIONAL_PARAMETER, EARTH_RADIUS_M } from '../config/constants'
import { LOST_ALTITUDE_KM, NOAA_G1_THRESHOLD } from '../config/thresholds'

const R_EARTH_M = EARTH_RADIUS_M.value

export type SatelliteStatus = 'nominal' | 'atRisk' | 'lost'

export interface WorkerSatellite {
  id: number
  plane: number
  indexInPlane: number
  altitudeKm: number
  semiMajorAxisM: number
  anomalyRad: number
  position: [number, number, number] // scaled 3D coordinates around Earth (radius=10)
  status: SatelliteStatus
  isDecaying: boolean
}

export interface SimulationStatePayload {
  satellites: WorkerSatellite[]
  activeLinks: [number, number][]
  reroutedPath: number[]
  nominalCount: number
  atRiskCount: number
  lostCount: number
  avgAltitudeKm: number
  isNetworkConnected: boolean
}

const TOTAL_PLANES = 6
const SATS_PER_PLANE = 20
const TOTAL_SATELLITES = TOTAL_PLANES * SATS_PER_PLANE // 120
const INCLINATION_RAD = (53.0 * Math.PI) / 180.0
const SCENE_EARTH_RADIUS = 10.0 // R3F scene units for Earth radius

const standardBallistics: SatelliteBallistics = {
  cd: 2.2,
  areaM2: 2.5,
  massKg: 260.0,
}

// Initialize 120 satellites in 6 planes
const satellites: WorkerSatellite[] = []
for (let p = 0; p < TOTAL_PLANES; p++) {
  for (let k = 0; k < SATS_PER_PLANE; k++) {
    const id = p * SATS_PER_PLANE + k
    // Phase offset per plane (Walker constellation)
    const anomaly = (k * 2.0 * Math.PI) / SATS_PER_PLANE + (p * Math.PI) / TOTAL_PLANES
    
    // In the Feb 2022 Starlink storm scenario, Planes 1 & 2 represent the newly inserted batch
    // deployed at low 210 km injection perigee (210–230 km), highly vulnerable to atmospheric drag surge
    const isLowInjectionBatch = (p === 1 || p === 2)
    const initialAltKm = isLowInjectionBatch ? 210.0 + (k % 5) * 4.0 : 550.0

    satellites.push({
      id,
      plane: p,
      indexInPlane: k,
      altitudeKm: initialAltKm,
      semiMajorAxisM: R_EARTH_M + initialAltKm * 1000.0,
      anomalyRad: anomaly,
      position: [0, 0, 0],
      status: isLowInjectionBatch ? 'atRisk' : 'nominal',
      isDecaying: isLowInjectionBatch,
    })
  }
}

/**
 * Computes 3D Cartesian coordinates for an orbit:
 * Semi-major axis a, inclination i, RAAN Omega, and anomaly M.
 */
function computeSatellitePosition(
  semiMajorAxisM: number,
  raan: number,
  inclination: number,
  anomaly: number,
): [number, number, number] {
  // Scene radial distance: Earth is 10 units = 6378 km
  const rScene = SCENE_EARTH_RADIUS * (semiMajorAxisM / R_EARTH_M)

  // Orbital plane coordinates
  const xOrb = rScene * Math.cos(anomaly)
  const yOrb = rScene * Math.sin(anomaly)

  // Rotate by inclination around X-axis, then RAAN around Y-axis
  const cosI = Math.cos(inclination)
  const sinI = Math.sin(inclination)
  const cosO = Math.cos(raan)
  const sinO = Math.sin(raan)

  const x1 = xOrb
  const y1 = yOrb * cosI
  const z1 = yOrb * sinI

  const x = x1 * cosO - z1 * sinO
  const y = y1
  const z = x1 * sinO + z1 * cosO

  return [x, y, z]
}

// Initial position calculation
for (const sat of satellites) {
  const raan = (sat.plane * 2.0 * Math.PI) / TOTAL_PLANES
  sat.position = computeSatellitePosition(
    sat.semiMajorAxisM,
    raan,
    INCLINATION_RAD,
    sat.anomalyRad,
  )
}

let lastReroutedSource = 0
let lastReroutedTarget = 45
let cachedReroutedPath: number[] = []

export interface WorkerTickPayload {
  dtSeconds: number
  kp?: number
  f107?: number
  ap?: number
  isActionApproved?: boolean
}

export type WorkerMessage = { type: 'TICK'; payload: WorkerTickPayload }

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data

  if (type === 'TICK') {
    const { dtSeconds, kp = 2.0, f107 = 150, ap, isActionApproved = false } = payload

    // Space weather density multiplier from Kp / geomagnetic activity
    const effectiveF107 = f107
    const effectiveAp = ap ?? Math.max(4, Math.pow(2, kp))

    let nominalCount = 0
    let atRiskCount = 0
    let lostCount = 0
    let totalAltKm = 0

    // Update each satellite
    for (const sat of satellites) {
      if (!isActionApproved && sat.status === 'lost') {
        lostCount++
        totalAltKm += sat.altitudeKm
        continue
      }

      // Orbital mean motion n = sqrt(mu / a^3) in rad/s
      const meanMotion = Math.sqrt(EARTH_GRAVITATIONAL_PARAMETER.value / Math.pow(sat.semiMajorAxisM, 3))
      sat.anomalyRad = (sat.anomalyRad + meanMotion * dtSeconds) % (2.0 * Math.PI)

      // Query atmospheric density from engine
      const densityRes = interpolateDensity(sat.altitudeKm, effectiveF107, effectiveAp)
      let density = densityRes.density

      // If operator approved defensive action: satellites enter edge-on safe mode (reducing effective drag by 75%)
      // and activate ion propulsion to actively boost perigee altitude out of the dense thermosphere!
      if (isActionApproved) {
        density *= 0.25
        if (sat.altitudeKm < 550.0) {
          const boostRateKmPerSec = 8.0
          sat.altitudeKm = Math.min(550.0, sat.altitudeKm + dtSeconds * boostRateKmPerSec)
          sat.semiMajorAxisM = R_EARTH_M + sat.altitudeKm * 1000.0
        }
      } else if (kp >= NOAA_G1_THRESHOLD.value) {
        density *= 1.0 + (kp - 4) * 0.8
      }

      // Orbital decay step (Feature 10: Circular-orbit approximation)
      // Visual exaggeration factor to make orbit loss perceptible over simulation seconds
      const visualExaggerationFactor = isActionApproved ? 40.0 : 250.0
      const decayState = stepOrbitDecay(
        sat.semiMajorAxisM,
        density,
        standardBallistics,
        dtSeconds * visualExaggerationFactor,
      )

      if (!isActionApproved) {
        sat.semiMajorAxisM = decayState.semiMajorAxisM
        sat.altitudeKm = decayState.altitudeM / 1000.0
      }
      totalAltKm += sat.altitudeKm

      const raan = (sat.plane * 2.0 * Math.PI) / TOTAL_PLANES
      sat.position = computeSatellitePosition(
        sat.semiMajorAxisM,
        raan,
        INCLINATION_RAD,
        sat.anomalyRad,
      )

      // Status determination
      if (!isActionApproved && (decayState.isLost || sat.altitudeKm <= LOST_ALTITUDE_KM.value)) {
        sat.status = 'lost'
        sat.isDecaying = false
        lostCount++
      } else if (isActionApproved) {
        sat.status = 'nominal'
        sat.isDecaying = false
        nominalCount++
      } else if (sat.altitudeKm <= 350.0 || kp >= 6.0) {
        sat.status = 'atRisk'
        sat.isDecaying = true
        atRiskCount++
      } else {
        sat.status = 'nominal'
        sat.isDecaying = false
        nominalCount++
      }
    }

    // Build active links between satellites
    const activeLinks: [number, number][] = []
    const routingEdges: WeightedEdge[] = []

    for (const sat of satellites) {
      if (sat.status === 'lost') continue

      // In-plane neighbor (forward)
      const nextInPlaneId = sat.plane * SATS_PER_PLANE + ((sat.indexInPlane + 1) % SATS_PER_PLANE)
      const nextSat = satellites[nextInPlaneId]
      if (nextSat.status !== 'lost') {
        activeLinks.push([sat.id, nextSat.id])
        const pFail = sat.status === 'atRisk' || nextSat.status === 'atRisk' ? 0.35 : 0.01
        routingEdges.push({
          u: sat.id,
          v: nextSat.id,
          latencyMs: 15.0,
          pFail,
        })
      }

      // Cross-plane neighbor (adjacent plane, same relative phase index)
      const nextPlane = (sat.plane + 1) % TOTAL_PLANES
      const crossPlaneId = nextPlane * SATS_PER_PLANE + sat.indexInPlane
      const crossSat = satellites[crossPlaneId]
      if (crossSat.status !== 'lost') {
        activeLinks.push([sat.id, crossSat.id])
        const pFail = sat.status === 'atRisk' || crossSat.status === 'atRisk' ? 0.45 : 0.02
        routingEdges.push({
          u: sat.id,
          v: crossSat.id,
          latencyMs: 25.0,
          pFail,
        })
      }
    }

    // Reroute transmission path if any satellite failed or path was lost
    const sourceSat = satellites[lastReroutedSource]
    const targetSat = satellites[lastReroutedTarget]

    if (sourceSat.status !== 'lost' && targetSat.status !== 'lost' && routingEdges.length > 0) {
      const rerouted = dijkstraRerouting(TOTAL_SATELLITES, routingEdges, lastReroutedSource, lastReroutedTarget)
      if (rerouted.path && rerouted.path.length > 0) {
        cachedReroutedPath = rerouted.path
      }
    }

    const result: SimulationStatePayload = {
      satellites,
      activeLinks,
      reroutedPath: cachedReroutedPath,
      nominalCount,
      atRiskCount,
      lostCount,
      avgAltitudeKm: totalAltKm / TOTAL_SATELLITES,
      isNetworkConnected: activeLinks.length > 50,
    }

    self.postMessage({ type: 'STATE_UPDATE', payload: result })
  }
}
