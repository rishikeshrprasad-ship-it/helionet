import { FLARE_CLASS_THRESHOLDS } from '../config/thresholds'
import { FLARE_VISUAL_HOURS } from '../config/constants'
import { getFlareClass, type FlareClassification } from '../engines/flareClassification'
import type { ReplayRow } from '../store/helioStore'

export interface FlareIntensitySpec {
  arcCount: number
  flashIntensity: number
  patchOnly: boolean
}

export interface SolarFlareState {
  active: boolean
  tFlare: number | null
  progress: number
  flareClass: FlareClassification | null
  arcCount: number
  flashIntensity: number
  patchOnly: boolean
}

export interface ArcLoopParams {
  footStartLatDeg: number
  footStartLonOffsetDeg: number
  spanDeg: number
  angleRad: number
  apexFactor: number
  tubeRadiusFactor: number
  phaseOffset: number
}

/**
 * Deterministic 32-bit PRNG (Mulberry32) seeded from flare onset time.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Convert a simulated onset time in hours to a stable integer seed.
 */
export function seedFromFlareTime(tFlare: number): number {
  return Math.max(1, Math.round(tFlare * 1000) ^ 0x5f3759df)
}

/**
 * Find the first replay timestamp where GOES 0.1-0.8 nm X-ray flux reaches >= M1 (1e-5 W/m^2).
 */
export function findFirstM1CrossingHours(rows: readonly ReplayRow[]): number | null {
  const threshold = FLARE_CLASS_THRESHOLDS.M.value
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].obs.xray >= threshold) {
      return rows[i].t
    }
  }
  return null
}

/**
 * Linearly interpolate observed X-ray flux at arbitrary simulated time `t` from sorted replay rows.
 */
export function interpolateXrayAtTime(rows: readonly ReplayRow[], t: number): number {
  if (rows.length === 0) return 0
  if (t <= rows[0].t) return rows[0].obs.xray
  const last = rows[rows.length - 1]
  if (t >= last.t) return last.obs.xray

  for (let i = 0; i < rows.length - 1; i += 1) {
    const a = rows[i]
    const b = rows[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      if (span <= 0) return a.obs.xray
      const u = (t - a.t) / span
      return a.obs.xray + (b.obs.xray - a.obs.xray) * u
    }
  }
  return last.obs.xray
}

/**
 * Find peak X-ray flux experienced within [tStart, tEnd].
 */
function findPeakXrayInWindow(rows: readonly ReplayRow[], tStart: number, tEnd: number): number {
  let peak = interpolateXrayAtTime(rows, tStart)
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    if (row.t >= tStart && row.t <= tEnd && row.obs.xray > peak) {
      peak = row.obs.xray
    }
  }
  const endFlux = interpolateXrayAtTime(rows, tEnd)
  if (endFlux > peak) peak = endFlux
  return peak
}

/**
 * Map a flare classification to coronal loop arc count and flash intensity.
 */
export function getFlareIntensitySpec(flareClass: FlareClassification | null): FlareIntensitySpec {
  if (!flareClass || flareClass.classLetter === 'C') {
    return { arcCount: 0, flashIntensity: 0, patchOnly: true }
  }
  if (flareClass.classLetter === 'M') {
    if (flareClass.subNumber < 5) {
      return { arcCount: 1, flashIntensity: 0.4, patchOnly: false }
    }
    return { arcCount: 2, flashIntensity: 0.6, patchOnly: false }
  }
  // X-class: 3-5 arcs capped at X10, flash 1.0
  const capped = Math.min(Math.max(flareClass.subNumber, 1), 10)
  const extra = Math.floor(((capped - 1) / 9) * 2.0001)
  return {
    arcCount: Math.min(5, Math.max(3, 3 + extra)),
    flashIntensity: 1.0,
    patchOnly: false,
  }
}

/**
 * Compute full timeline-deterministic visual state for the SolarFlare effect.
 */
export function computeSolarFlareState(
  rows: readonly ReplayRow[],
  currentTimeHours: number,
  durationHours: number = FLARE_VISUAL_HOURS.value
): SolarFlareState {
  const tFlare = findFirstM1CrossingHours(rows)
  if (tFlare === null || durationHours <= 0) {
    return {
      active: false,
      tFlare,
      progress: 0,
      flareClass: null,
      arcCount: 0,
      flashIntensity: 0,
      patchOnly: true,
    }
  }

  const elapsed = currentTimeHours - tFlare
  if (elapsed < 0 || elapsed > durationHours) {
    return {
      active: false,
      tFlare,
      progress: 0,
      flareClass: null,
      arcCount: 0,
      flashIntensity: 0,
      patchOnly: true,
    }
  }

  const progress = Math.min(1, Math.max(0, elapsed / durationHours))
  const windowFlux = findPeakXrayInWindow(rows, tFlare, Math.min(tFlare + durationHours, currentTimeHours))
  const currentFlux = interpolateXrayAtTime(rows, currentTimeHours)
  const effectiveFlux = Math.max(currentFlux, windowFlux)
  const flareClass = getFlareClass(effectiveFlux)
  const spec = getFlareIntensitySpec(flareClass)

  return {
    active: true,
    tFlare,
    progress,
    flareClass,
    arcCount: spec.arcCount,
    flashIntensity: spec.flashIntensity,
    patchOnly: spec.patchOnly,
  }
}

/**
 * Generate deterministic seeded parameters for up to 5 pooled coronal magnetic loop arcs.
 */
export function generateSeededArcParams(tFlare: number, count: number = 5): ArcLoopParams[] {
  const rng = mulberry32(seedFromFlareTime(tFlare))
  const baseLatDeg = (rng() - 0.5) * 28 // +/- 14 deg around solar equator on Earth-facing limb
  const baseLonOffsetDeg = (rng() - 0.5) * 24 // slight offset within the Earth-facing limb hemisphere

  const params: ArcLoopParams[] = []
  for (let i = 0; i < count; i += 1) {
    const spanDeg = 5 + rng() * 10 // 5..15 deg between footpoints
    const apexFactor = 0.22 + rng() * 0.38 // 0.22..0.60 x sunRadius (always within 0.15..0.6)
    const angleRad = rng() * Math.PI * 2
    const tubeRadiusFactor = 0.038 + rng() * 0.016
    const phaseOffset = rng() * Math.PI * 2
    const jitterLat = (rng() - 0.5) * 8
    const jitterLon = (rng() - 0.5) * 8

    params.push({
      footStartLatDeg: baseLatDeg + jitterLat,
      footStartLonOffsetDeg: baseLonOffsetDeg + jitterLon,
      spanDeg,
      angleRad,
      apexFactor,
      tubeRadiusFactor,
      phaseOffset,
    })
  }
  return params
}
