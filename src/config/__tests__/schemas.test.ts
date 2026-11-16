import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  validateReplayFile,
  validateValidationFile,
  validateKBCatalog,
  validateEventsIndex,
  validateCalibrationFile,
  validateModelCard,
} from '../schemas'

describe('Data Contracts and Schema Validators', () => {
  it('validates public/replay/feb2022.json', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('public/replay/feb2022.json'), 'utf8'))
    const res = validateReplayFile(raw, 'public/replay/feb2022.json')
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.data?.event_id).toBe('feb2022')
    expect(res.data?.rows.length).toBeGreaterThan(0)
  })

  it('validates public/validation/feb2022.json and may2024.json', () => {
    for (const file of ['feb2022.json', 'may2024.json']) {
      const p = path.resolve('public/validation', file)
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
      const res = validateValidationFile(raw, file)
      expect(res.ok, `File ${file} should validate: ${JSON.stringify(res.errors)}`).toBe(true)
      expect(res.errors).toHaveLength(0)
    }
  })

  it('validates public/kb.json', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('public/kb.json'), 'utf8'))
    const res = validateKBCatalog(raw, 'public/kb.json')
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.data?.length).toBeGreaterThanOrEqual(5)
  })

  it('validates public/models/events_index.json', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('public/models/events_index.json'), 'utf8'))
    const res = validateEventsIndex(raw, 'public/models/events_index.json')
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.data?.length).toBeGreaterThanOrEqual(1)
  })

  it('validates public/models/calibration.json', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('public/models/calibration.json'), 'utf8'))
    const res = validateCalibrationFile(raw, 'public/models/calibration.json')
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('validates public/models/model_card.json', () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve('public/models/model_card.json'), 'utf8'))
    const res = validateModelCard(raw, 'public/models/model_card.json')
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('deliberately broken replay fixture fails with the right field path', () => {
    const brokenFixture = {
      event_id: 'broken_event',
      name: 'Broken Replay',
      label: 'Illustrative',
      rows: [
        {
          t: 0,
          obs: { xray: 'not-a-number', p10: 1.2, kp: 1.7, dst: -12, vsw: 410, bz: 1.2 },
          forecast: { pFlare: 1.5, pProton: 0.05, pGeo: 0.22, leadH: 28 },
        },
      ],
    }

    const res = validateReplayFile(brokenFixture, 'broken.json')
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.path === '$.rows[0].obs.xray')).toBe(true)
    expect(res.errors.some((e) => e.path === '$.rows[0].forecast.pFlare')).toBe(true)
  })

  it('broken validation fixture fails with path', () => {
    const brokenValidation = {
      event: 'Missing documented_outcome',
      event_id: 'broken_val',
      note: 'Note',
      documented_outcome: [
        { field: '', value: 'val', source: 'src', domain: 'space' },
      ],
    }

    const res = validateValidationFile(brokenValidation, 'broken_val.json')
    expect(res.ok).toBe(false)
    expect(res.errors.some((e) => e.path === '$.documented_outcome[0].field')).toBe(true)
  })
})
