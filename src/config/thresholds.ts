/**
 * Central Operational and Space Weather Hazard Thresholds for HelioNet.
 * Every export is a frozen object { value, unit, source, note }.
 */

export interface ThresholdEntry<T = number> {
  readonly value: T
  readonly unit: string
  readonly source: string
  readonly note: string
}

/**
 * Satellite lost altitude threshold in meters.
 * Set to 180 km (180,000 m).
 * Note: Extending the atmospheric density table below 180 km requires offline pymsis data (done in a later batch).
 */
export const LOST_ALTITUDE_M: ThresholdEntry<number> = Object.freeze({
  value: 180000.0,
  unit: 'm',
  source: 'Density table bound / Illustrative',
  note: 'Threshold below which satellite is classified as lost/decayed (180 km). Extending below 180 km requires offline pymsis data in a later batch.',
})

/**
 * Satellite lost altitude threshold in kilometers (derived helper).
 */
export const LOST_ALTITUDE_KM: ThresholdEntry<number> = Object.freeze({
  value: LOST_ALTITUDE_M.value / 1000.0,
  unit: 'km',
  source: LOST_ALTITUDE_M.source,
  note: 'Satellite lost altitude threshold in kilometers (derived from LOST_ALTITUDE_M)',
})

/**
 * GOES 0.1-0.8 nm solar soft X-ray flare classification thresholds.
 */
export const FLARE_CLASS_THRESHOLDS = Object.freeze({
  A: Object.freeze({
    value: 1e-8,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'A-class flare threshold (1e-8 W/m^2)',
  }),
  B: Object.freeze({
    value: 1e-7,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'B-class flare threshold (1e-7 W/m^2)',
  }),
  C: Object.freeze({
    value: 1e-6,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'C-class flare threshold (1e-6 W/m^2)',
  }),
  M: Object.freeze({
    value: 1e-5,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'M-class flare threshold (1e-5 W/m^2)',
  }),
  X: Object.freeze({
    value: 1e-4,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'X-class flare threshold (1e-4 W/m^2)',
  }),
})

/**
 * NOAA Radio Blackout Scale (R-scale) levels.
 * R1 = M1, R2 = M5, R3 = X1, R4 = X10, R5 = X20.
 */
export const NOAA_R_SCALE = Object.freeze({
  R1: Object.freeze({
    value: 1e-5,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'R1 Minor Radio Blackout (M1 flare, 1e-5 W/m^2)',
  }),
  R2: Object.freeze({
    value: 5e-5,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'R2 Moderate Radio Blackout (M5 flare, 5e-5 W/m^2)',
  }),
  R3: Object.freeze({
    value: 1e-4,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'R3 Strong Radio Blackout (X1 flare, 1e-4 W/m^2)',
  }),
  R4: Object.freeze({
    value: 1e-3,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'R4 Severe Radio Blackout (X10 flare, 1e-3 W/m^2)',
  }),
  R5: Object.freeze({
    value: 2e-3,
    unit: 'W/m^2',
    source: 'NOAA Space Weather Scales',
    note: 'R5 Extreme Radio Blackout (X20+ flare, >=2e-3 W/m^2)',
  }),
})

/**
 * NOAA S1 Minor Solar Radiation Storm threshold (10 pfu at >=10 MeV).
 */
export const NOAA_S1_THRESHOLD: ThresholdEntry<number> = Object.freeze({
  value: 10.0,
  unit: 'pfu',
  source: 'NOAA Space Weather Scales',
  note: 'S1 Minor Solar Radiation Storm threshold (>=10 MeV proton flux >= 10 pfu)',
})

/**
 * NOAA G1 Minor Geomagnetic Storm threshold (Kp >= 5.0).
 */
export const NOAA_G1_THRESHOLD: ThresholdEntry<number> = Object.freeze({
  value: 5.0,
  unit: 'Kp index',
  source: 'NOAA Space Weather Scales',
  note: 'G1 Minor Geomagnetic Storm threshold (planetary Kp index >= 5.0)',
})

/**
 * Cost/Loss ratio C/L decision threshold for triggering autonomous Watch status.
 */
export const COST_LOSS_RATIO: ThresholdEntry<number> = Object.freeze({
  value: 0.30,
  unit: 'ratio',
  source: 'Illustrative',
  note: 'Cost-loss ratio C/L decision threshold for issuing storm Watch status',
})

/**
 * Maximum radiation dose cap for lunar surface operations.
 * Stays strictly "Illustrative dose units".
 */
export const DOSE_CAP: ThresholdEntry<number> = Object.freeze({
  value: 50.0,
  unit: 'Illustrative dose units',
  source: 'Illustrative',
  note: 'Illustrative radiation dose cap before shelter refuge or mission abort is required',
})

/**
 * Maximum traversable terrain slope angle in degrees.
 */
export const SLOPE_MAX_DEG: ThresholdEntry<number> = Object.freeze({
  value: 15.0,
  unit: 'deg',
  source: 'Illustrative',
  note: 'Maximum traversable slope angle for lunar terrain cells (15 degrees)',
})

/**
 * Maximum traversable terrain slope angle in radians (derived helper).
 */
export const SLOPE_MAX_RAD: ThresholdEntry<number> = Object.freeze({
  value: (SLOPE_MAX_DEG.value * Math.PI) / 180.0,
  unit: 'rad',
  source: SLOPE_MAX_DEG.source,
  note: 'Maximum traversable slope angle in radians (derived from SLOPE_MAX_DEG)',
})
