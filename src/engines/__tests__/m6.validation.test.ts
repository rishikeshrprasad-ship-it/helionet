import { describe, it, expect } from 'vitest'
import { buildValidationComparison, type ValidationFile } from '../validation'
import feb2022Data from '../../../public/validation/feb2022.json'
import may2024Data from '../../../public/validation/may2024.json'

describe('Milestone 6: Validation & Polish Engine Verification', () => {
  it('validates February 2022 Starlink storm benchmark against ground truth rules', () => {
    // Unit test fixture retains test-only verification row per Prompt 4
    const febFile: ValidationFile = {
      ...(feb2022Data as ValidationFile),
      documented_outcome: [
        ...(feb2022Data as ValidationFile).documented_outcome,
        {
          field: 'Thermospheric Nitric Oxide Cooling Flux',
          value: '7.8 GW',
          source: '',
          domain: 'space',
        },
      ],
    }
    expect(febFile.event_id).toBe('feb2022')
    expect(febFile.documented_outcome.length).toBeGreaterThan(0)

    const predicted = {
      'Peak Kp Index': '5.3 (G1 Storm)',
      'Dst Minimum': '-66 nT',
      'Max Solar Wind Speed': '690 km/s',
      'Peak Atmospheric Density Increase': '+48%',
      'Satellites Deorbited / Lost': '38 of 49',
      'Thermospheric Nitric Oxide Cooling Flux': 'No data',
      'Lunar Surface Dose Baseline Rate': '0.12 mGy/h',
      'Rover Radiation Shelter Destination': 'Shelter A',
    }

    const rows = buildValidationComparison(febFile, predicted)
    expect(rows.length).toBe(febFile.documented_outcome.length)

    // Unverified check
    const unverifiedRow = rows.find((r) => r.field === 'Thermospheric Nitric Oxide Cooling Flux')
    expect(unverifiedRow).toBeDefined()
    expect(unverifiedRow?.verified).toBe(false)
    expect(unverifiedRow?.source).toBe('Unverified')

    // Lunar Scenario test check
    const lunarRows = rows.filter((r) => r.domain === 'lunar' || r.field.toLowerCase().includes('lunar') || r.field.toLowerCase().includes('rover'))
    expect(lunarRows.length).toBeGreaterThan(0)
    for (const lr of lunarRows) {
      expect(lr.label).toBe('Scenario test')
    }

    // Verified ground truth check
    const kpRow = rows.find((r) => r.field === 'Peak Kp Index')
    expect(kpRow).toBeDefined()
    expect(kpRow?.verified).toBe(true)
    expect(kpRow?.source).toContain('NOAA')
  })

  it('validates May 2024 G5 Gannon storm benchmark against ground truth rules', () => {
    // Unit test fixture retains test-only verification row per Prompt 4
    const mayFile: ValidationFile = {
      ...(may2024Data as ValidationFile),
      documented_outcome: [
        ...(may2024Data as ValidationFile).documented_outcome,
        {
          field: 'Mid-Latitude Ionospheric Total Electron Content Drop',
          value: '85 TECU',
          source: '',
          domain: 'space',
        },
      ],
    }
    expect(mayFile.event_id).toBe('may2024')
    expect(mayFile.documented_outcome.length).toBeGreaterThan(0)

    const predicted = {
      'Peak Kp Index': '9.0 (G5 Extreme Storm)',
      'Dst Minimum': '-412 nT',
      'Max Solar Wind Speed': '820 km/s',
      'Satellites Lost in Low Orbit': '0',
    }

    const rows = buildValidationComparison(mayFile, predicted)
    expect(rows.length).toBe(mayFile.documented_outcome.length)

    const kpRow = rows.find((r) => r.field === 'Peak Kp Index')
    expect(kpRow).toBeDefined()
    expect(kpRow?.verified).toBe(true)
    expect(kpRow?.documentedValue).toContain('9.0')

    const unverifiedRow = rows.find((r) => r.source === 'Unverified')
    expect(unverifiedRow).toBeDefined()
    expect(unverifiedRow?.verified).toBe(false)
  })
})
