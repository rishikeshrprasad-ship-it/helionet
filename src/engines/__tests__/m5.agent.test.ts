import { describe, it, expect } from 'vitest'
import { ConfirmationStateMachine } from '../confirmFSM'
import { searchTopAnalogEvents, searchKnowledgeBase, type EventIndexEntry, type KBEntry } from '../analogSearch'

describe('M5 Forecaster & Autonomous Agent Loop Invariants', () => {
  it('executes Confirmation State Machine from IDLE to WATCH to CONFIRMED with evidence', () => {
    const fsm = new ConfirmationStateMachine({
      hazardType: 'geomagnetic',
      costLossThreshold: 0.30,
      windowHours: 24.0,
    })

    expect(fsm.getState()).toBe('IDLE')

    // 1. Forecast pGeo = 0.55 > C/L threshold 0.30 -> triggers WATCH
    const s1 = fsm.step(0.55, { timeHours: 1, kp: 3.0 })
    expect(s1).toBe('WATCH')
    expect(fsm.getState()).toBe('WATCH')

    // 2. Observation Kp crosses threshold (Kp = 6.0 >= 5.0) -> transitions to CONFIRMED
    const s2 = fsm.step(0.55, { timeHours: 3, kp: 6.0 })
    expect(s2).toBe('CONFIRMED')
    expect(fsm.getState()).toBe('CONFIRMED')

    // Evidence log audit
    const lastLog = fsm.history[fsm.history.length - 1]
    expect(lastLog.to).toBe('CONFIRMED')
    expect(lastLog.evidence).toBeDefined()
  })

  it('performs cosine analog search over historical storms catalog', () => {
    const catalog: EventIndexEntry[] = [
      {
        id: 'starlink-2022',
        name: 'February 2022 Starlink Drag Storm',
        date: '2022-02-03',
        description: 'LEO atmospheric drag caused 38 satellite de-orbits',
        embedding: [0.1, 0.5, 0.7, 0.2, 0.8],
        metrics: { kp: 6.7 },
      },
      {
        id: 'carrington-1859',
        name: '1859 Carrington Superflare',
        date: '1859-09-01',
        description: 'Extreme solar flare and worldwide telegraph auroral currents',
        embedding: [0.9, 0.9, 0.9, 0.9, 0.9],
        metrics: { kp: 9.0 },
      },
      {
        id: 'calm-day',
        name: 'Calm Space Weather',
        date: '2021-06-15',
        description: 'Solar minimum baseline',
        embedding: [0.01, 0.02, 0.01, 0.03, 0.01],
        metrics: { kp: 1.0 },
      },
    ]

    const query = [0.12, 0.48, 0.68, 0.21, 0.79] // Similar to Starlink 2022
    const topAnalogs = searchTopAnalogEvents(query, catalog, 2)

    expect(topAnalogs.length).toBe(2)
    expect(topAnalogs[0].event.id).toBe('starlink-2022')
    expect(topAnalogs[0].similarity).toBeGreaterThan(0.95)
  })

  it('searches knowledge base strictly without hallucinating text (Rule 1)', () => {
    const kb: KBEntry[] = [
      {
        id: 'noaa-g-scale',
        title: 'NOAA Geomagnetic Storm Scale (G-scale)',
        summary: 'G1 (minor) corresponds to Kp >= 5. G5 (extreme) corresponds to Kp = 9.',
        source: 'https://www.swpc.noaa.gov',
      },
      {
        id: 'goes-xray',
        title: 'GOES X-ray Flux Classification',
        summary: 'M-class threshold is 1e-5 W/m².',
        source: 'https://www.swpc.noaa.gov',
      },
    ]

    const matches = searchKnowledgeBase('geomagnetic kp', kb)
    expect(matches.length).toBe(1)
    expect(matches[0].id).toBe('noaa-g-scale')
    expect(matches[0].summary).toContain('Kp >= 5')
  })
})
