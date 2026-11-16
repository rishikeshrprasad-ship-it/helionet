/**
 * Central Physical and Engineering Constants for HelioNet.
 * Every export is a frozen object { value, unit, source, note }.
 */

export interface ConfigEntry<T = number> {
  readonly value: T
  readonly unit: string
  readonly source: string
  readonly note: string
}

/**
 * Earth equatorial radius in meters (WGS-84 / IERS Numerical Standards 2010).
 */
export const EARTH_RADIUS_M: ConfigEntry<number> = Object.freeze({
  value: 6378137.0,
  unit: 'm',
  source: 'WGS-84 / IERS Numerical Standards (2010)',
  note: 'Earth equatorial radius in meters',
})

/**
 * Earth equatorial radius in kilometers (derived helper).
 */
export const EARTH_RADIUS_KM: ConfigEntry<number> = Object.freeze({
  value: EARTH_RADIUS_M.value / 1000.0,
  unit: 'km',
  source: EARTH_RADIUS_M.source,
  note: 'Earth equatorial radius in kilometers (derived from EARTH_RADIUS_M)',
})

/**
 * Earth standard gravitational parameter mu = GM (m^3/s^2).
 */
export const EARTH_GRAVITATIONAL_PARAMETER: ConfigEntry<number> = Object.freeze({
  value: 3.986004418e14,
  unit: 'm^3/s^2',
  source: 'IERS Standards / EGM96',
  note: 'Earth standard gravitational parameter (mu = GM)',
})

/**
 * Speed of light in vacuum in meters per second.
 */
export const SPEED_OF_LIGHT_MPS: ConfigEntry<number> = Object.freeze({
  value: 299792458.0,
  unit: 'm/s',
  source: 'CODATA 2018 / SI definition',
  note: 'Speed of light in vacuum in meters per second',
})

/**
 * Speed of light in vacuum in kilometers per second (derived helper).
 */
export const SPEED_OF_LIGHT_KM_S: ConfigEntry<number> = Object.freeze({
  value: SPEED_OF_LIGHT_MPS.value / 1000.0,
  unit: 'km/s',
  source: SPEED_OF_LIGHT_MPS.source,
  note: 'Speed of light in vacuum in kilometers per second',
})

/**
 * Nominal lunar rover transit speed across regolith terrain.
 */
export const ROVER_SPEED_MPS: ConfigEntry<number> = Object.freeze({
  value: 1.2,
  unit: 'm/s',
  source: 'Illustrative',
  note: 'Nominal lunar surface rover traversal speed across terrain',
})

/**
 * Maximum line-of-sight laser cross-link range between satellites.
 */
export const LINK_RANGE_KM: ConfigEntry<number> = Object.freeze({
  value: 5000.0,
  unit: 'km',
  source: 'Illustrative',
  note: 'Maximum optical inter-satellite laser link range in kilometers',
})

/**
 * Maximum line-of-sight laser cross-link range in meters.
 */
export const LINK_RANGE_M: ConfigEntry<number> = Object.freeze({
  value: LINK_RANGE_KM.value * 1000.0,
  unit: 'm',
  source: LINK_RANGE_KM.source,
  note: 'Maximum optical inter-satellite laser link range in meters',
})

/**
 * Risk-latency composite weighting parameter for constellation routing.
 */
export const ROUTING_LAMBDA: ConfigEntry<number> = Object.freeze({
  value: 50.0,
  unit: 'ms/cost',
  source: 'Illustrative',
  note: 'Lambda weighting parameter balancing latency (ms) against failure risk -ln(1 - p)',
})

/**
 * Visible solar flare arcade and flash duration in simulated timeline hours.
 */
export const FLARE_VISUAL_HOURS: ConfigEntry<number> = Object.freeze({
  value: 1.5,
  unit: 'hours',
  source: 'Illustrative',
  note: 'Visible duration of solar flare coronal loops and flash driven by the simulation timeline',
})
