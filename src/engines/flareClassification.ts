import { FLARE_CLASS_THRESHOLDS, NOAA_R_SCALE } from '../config/thresholds'

export type FlareClassLetter = 'A' | 'B' | 'C' | 'M' | 'X'
export type NoaaRScale = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export interface FlareClassification {
  classLetter: FlareClassLetter
  subNumber: number
  label: string
  rScale: NoaaRScale
}

/**
 * Classifies solar soft X-ray flux (0.1-0.8 nm in W/m^2) into NOAA flare class and R-scale.
 *
 * Rules:
 * - Negative, zero, or non-finite (NaN, +/-Infinity) flux returns null.
 * - Flux < 1e-8 returns class 'A' with subNumber < 1.0.
 * - Classes:
 *   A: [1e-8, 1e-7) -> base 1e-8
 *   B: [1e-7, 1e-6) -> base 1e-7
 *   C: [1e-6, 1e-5) -> base 1e-6
 *   M: [1e-5, 1e-4) -> base 1e-5
 *   X: >= 1e-4      -> base 1e-4
 * - NOAA R-scale:
 *   R5: >= 2e-3 W/m^2 (X20+)
 *   R4: >= 1e-3 W/m^2 (X10)
 *   R3: >= 1e-4 W/m^2 (X1)
 *   R2: >= 5e-5 W/m^2 (M5)
 *   R1: >= 1e-5 W/m^2 (M1)
 *   R0: < 1e-5 W/m^2
 */
export function getFlareClass(flux: number): FlareClassification | null {
  if (!Number.isFinite(flux) || flux <= 0) {
    return null
  }

  let classLetter: FlareClassLetter
  let base: number

  if (flux >= FLARE_CLASS_THRESHOLDS.X.value) {
    classLetter = 'X'
    base = FLARE_CLASS_THRESHOLDS.X.value
  } else if (flux >= FLARE_CLASS_THRESHOLDS.M.value) {
    classLetter = 'M'
    base = FLARE_CLASS_THRESHOLDS.M.value
  } else if (flux >= FLARE_CLASS_THRESHOLDS.C.value) {
    classLetter = 'C'
    base = FLARE_CLASS_THRESHOLDS.C.value
  } else if (flux >= FLARE_CLASS_THRESHOLDS.B.value) {
    classLetter = 'B'
    base = FLARE_CLASS_THRESHOLDS.B.value
  } else {
    classLetter = 'A'
    base = FLARE_CLASS_THRESHOLDS.A.value
  }

  const rawSubNumber = flux / base
  const subNumber = Math.round(rawSubNumber * 10) / 10
  const label = `${classLetter}${subNumber.toFixed(1)}`

  let rScale: NoaaRScale = 'R0'
  if (flux >= NOAA_R_SCALE.R5.value) {
    rScale = 'R5'
  } else if (flux >= NOAA_R_SCALE.R4.value) {
    rScale = 'R4'
  } else if (flux >= NOAA_R_SCALE.R3.value) {
    rScale = 'R3'
  } else if (flux >= NOAA_R_SCALE.R2.value) {
    rScale = 'R2'
  } else if (flux >= NOAA_R_SCALE.R1.value) {
    rScale = 'R1'
  } else {
    rScale = 'R0'
  }

  return {
    classLetter,
    subNumber,
    label,
    rScale,
  }
}
