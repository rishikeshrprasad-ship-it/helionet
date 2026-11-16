import { describe, it, expect } from 'vitest'
import {
  buildValidationComparison,
  type ValidationFile,
} from '../validation'

describe('Validation Comparison Engine (Feature 33)', () => {
  it('builds comparison table, marks unverified fields, and labels lunar entries as "Scenario test"', () => {
    const valFile: ValidationFile = {
      event: 'May 2024 Storm',
      event_id: 'may2024',
      documented_outcome: [
        {
          field: 'min_dst_nt',
          value: -412,
          source: 'Kyoto WDC',
          domain: 'space',
        },
        {
          field: 'satellites_deorbited',
          value: 0,
          source: '', // Missing source
          domain: 'satellite',
        },
        {
          field: 'rover_shelter_arrival_time_min',
          value: 42.5,
          source: 'Lunar simulated mission logs',
          domain: 'lunar',
        },
      ],
    }

    const predicted = {
      min_dst_nt: -398,
      satellites_deorbited: 0,
      rover_shelter_arrival_time_min: 44.1,
    }

    const rows = buildValidationComparison(valFile, predicted)
    expect(rows.length).toBe(3)

    // Row 0: Verified space weather field
    expect(rows[0].field).toBe('min_dst_nt')
    expect(rows[0].verified).toBe(true)
    expect(rows[0].source).toBe('Kyoto WDC')
    expect(rows[0].label).toBeUndefined()

    // Row 1: Missing source -> Unverified
    expect(rows[1].field).toBe('satellites_deorbited')
    expect(rows[1].verified).toBe(false)
    expect(rows[1].source).toBe('Unverified')

    // Row 2: Lunar field -> Labelled "Scenario test"
    expect(rows[2].field).toBe('rover_shelter_arrival_time_min')
    expect(rows[2].label).toBe('Scenario test')
    expect(rows[2].verified).toBe(true)
  })
})
