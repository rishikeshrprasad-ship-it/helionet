import { describe, it, expect } from 'vitest'
import * as constants from '../constants'
import * as thresholds from '../thresholds'
import { DEFAULT_DENSITY_TABLE } from '../../engines/density'

describe('Central Config (Constants & Thresholds)', () => {
  const allConfigs = { ...constants, ...thresholds }

  it('all exports are frozen objects', () => {
    for (const [key, entry] of Object.entries(allConfigs)) {
      expect(Object.isFrozen(entry), `${key} must be frozen`).toBe(true)
    }
  })

  it('every entry has a non-empty unit and source', () => {
    for (const [key, entry] of Object.entries(allConfigs)) {
      if ('value' in entry) {
        expect(typeof entry.unit, `${key}.unit must be string`).toBe('string')
        expect(entry.unit.trim().length, `${key}.unit must not be empty`).toBeGreaterThan(0)
        expect(typeof entry.source, `${key}.source must be string`).toBe('string')
        expect(entry.source.trim().length, `${key}.source must not be empty`).toBeGreaterThan(0)
        expect(typeof entry.note, `${key}.note must be string`).toBe('string')
        expect(entry.note.trim().length, `${key}.note must not be empty`).toBeGreaterThan(0)
      } else {
        // Grouped threshold records like FLARE_CLASS_THRESHOLDS or NOAA_R_SCALE
        for (const [subKey, subEntry] of Object.entries(entry)) {
          const item = subEntry as { unit: string; source: string; note: string }
          expect(typeof item.unit, `${key}.${subKey}.unit must be string`).toBe('string')
          expect(item.unit.trim().length, `${key}.${subKey}.unit must not be empty`).toBeGreaterThan(0)
          expect(typeof item.source, `${key}.${subKey}.source must be string`).toBe('string')
          expect(item.source.trim().length, `${key}.${subKey}.source must not be empty`).toBeGreaterThan(0)
          expect(typeof item.note, `${key}.${subKey}.note must be string`).toBe('string')
          expect(item.note.trim().length, `${key}.${subKey}.note must not be empty`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('lost altitude is not below the density table minimum', () => {
    const minTableAltKm = DEFAULT_DENSITY_TABLE.altitudesKm[0]
    const lostAltitudeKm = thresholds.LOST_ALTITUDE_KM.value

    expect(lostAltitudeKm).toBeGreaterThanOrEqual(minTableAltKm)
    expect(thresholds.LOST_ALTITUDE_M.value).toBe(180000.0)
    expect(lostAltitudeKm).toBe(180.0)
  })

  it('Earth radius in meters matches derived km helper', () => {
    expect(constants.EARTH_RADIUS_KM.value).toBe(constants.EARTH_RADIUS_M.value / 1000)
    expect(constants.EARTH_RADIUS_M.value).toBe(6378137.0)
  })

  it('Speed of light in m/s matches derived km/s helper', () => {
    expect(constants.SPEED_OF_LIGHT_KM_S.value).toBe(constants.SPEED_OF_LIGHT_MPS.value / 1000)
    expect(constants.SPEED_OF_LIGHT_MPS.value).toBe(299792458.0)
  })

  it('NOAA thresholds match verified space weather scales', () => {
    expect(thresholds.NOAA_R_SCALE.R1.value).toBe(1e-5) // M1
    expect(thresholds.NOAA_R_SCALE.R2.value).toBe(5e-5) // M5
    expect(thresholds.NOAA_R_SCALE.R3.value).toBe(1e-4) // X1
    expect(thresholds.NOAA_R_SCALE.R4.value).toBe(1e-3) // X10
    expect(thresholds.NOAA_R_SCALE.R5.value).toBe(2e-3) // X20
    expect(thresholds.NOAA_S1_THRESHOLD.value).toBe(10.0) // 10 pfu
    expect(thresholds.NOAA_G1_THRESHOLD.value).toBe(5.0) // Kp 5
    expect(thresholds.COST_LOSS_RATIO.value).toBe(0.30)
  })
})
