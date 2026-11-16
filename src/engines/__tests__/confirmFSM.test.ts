import { describe, it, expect } from 'vitest'
import { ConfirmationStateMachine } from '../confirmFSM'

describe('Confirmation State Machine (Feature 5)', () => {
  it('transitions IDLE -> WATCH -> CONFIRMED -> RESOLVED with evidence logging', () => {
    const fsm = new ConfirmationStateMachine({
      hazardType: 'geomagnetic',
      costLossThreshold: 0.35,
      windowHours: 24,
    })

    expect(fsm.getState()).toBe('IDLE')

    // Hour 1: Low forecast probability (0.20 <= 0.35) -> remains IDLE
    fsm.step(0.20, { timeHours: 1, kp: 2.0 })
    expect(fsm.getState()).toBe('IDLE')

    // Hour 2: High forecast probability (0.65 > 0.35) -> transitions to WATCH
    fsm.step(0.65, { timeHours: 2, kp: 3.0 })
    expect(fsm.getState()).toBe('WATCH')
    expect(fsm.history.length).toBe(1)
    expect(fsm.history[0].to).toBe('WATCH')
    expect(fsm.history[0].evidence.forecastProb).toBe(0.65)

    // Hour 5: Observation crosses threshold kp >= 5.0 -> transitions to CONFIRMED
    fsm.step(0.70, { timeHours: 5, kp: 6.3 })
    expect(fsm.getState()).toBe('CONFIRMED')
    expect(fsm.history.length).toBe(2)
    expect(fsm.history[1].to).toBe('CONFIRMED')
    expect(fsm.history[1].evidence.metric).toBe('kp')
    expect(fsm.history[1].evidence.value).toBe(6.3)

    // Hours 6-10: kp drops below 5 for 5 hours (< 6 required) -> remains CONFIRMED
    for (let h = 6; h <= 10; h++) {
      fsm.step(0.30, { timeHours: h, kp: 3.5 })
      expect(fsm.getState()).toBe('CONFIRMED')
    }

    // Hour 11: 6th consecutive hour below threshold -> transitions to RESOLVED
    fsm.step(0.20, { timeHours: 11, kp: 2.0 })
    expect(fsm.getState()).toBe('RESOLVED')
    expect(fsm.history.length).toBe(3)
    expect(fsm.history[2].to).toBe('RESOLVED')
  })

  it('transitions WATCH -> FALSE_ALARM if window ends without threshold crossing', () => {
    const fsm = new ConfirmationStateMachine({
      hazardType: 'proton',
      costLossThreshold: 0.40,
      windowHours: 12,
    })

    // Start WATCH at hour 0
    fsm.step(0.60, { timeHours: 0, p10: 2.0 })
    expect(fsm.getState()).toBe('WATCH')

    // Observation never reaches 10 pfu (S1 threshold)
    fsm.step(0.50, { timeHours: 6, p10: 4.5 })
    expect(fsm.getState()).toBe('WATCH')

    // Window expires at hour 12
    fsm.step(0.30, { timeHours: 13, p10: 3.0 })
    expect(fsm.getState()).toBe('FALSE_ALARM')
    expect(fsm.history.some((t) => t.to === 'FALSE_ALARM')).toBe(true)
  })

  it('tests solar flare (xray >= 1e-5 W/m^2) threshold crossing', () => {
    const fsm = new ConfirmationStateMachine({
      hazardType: 'flare',
      costLossThreshold: 0.30,
      windowHours: 6,
    })

    fsm.step(0.55, { timeHours: 1, xray: 5e-6 })
    expect(fsm.getState()).toBe('WATCH')

    // M1.5 flare (1.5e-5 W/m^2)
    fsm.step(0.80, { timeHours: 2, xray: 1.5e-5 })
    expect(fsm.getState()).toBe('CONFIRMED')
  })
})
