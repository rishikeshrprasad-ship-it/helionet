import { describe, it, expect } from 'vitest'
import {
  analyzeRuleSetTruthTable,
  fireRules,
  evaluateRoverShelterDecision,
  type PropositionalRule,
} from '../rules'

describe('Rule Engine & Logic Decision (Features 23 & 32)', () => {
  it('detects contradictions, tautologies, and dead rules via truth-table analysis', () => {
    const rules: PropositionalRule[] = [
      {
        id: 'R1_TAUTOLOGY',
        name: 'Always True Rule',
        antecedent: {
          type: 'or',
          left: { type: 'var', name: 'P' },
          right: { type: 'not', expr: { type: 'var', name: 'P' } }, // P or not P
        },
        action: 'LOG_HEARTBEAT',
        justification: 'Tautology: P or not P is universally valid',
      },
      {
        id: 'R2_DEAD',
        name: 'Unsatisfiable Dead Rule',
        antecedent: {
          type: 'and',
          left: { type: 'var', name: 'Q' },
          right: { type: 'not', expr: { type: 'var', name: 'Q' } }, // Q and not Q
        },
        action: 'TRIGGER_EMERGENCY',
        justification: 'Dead rule: Q and not Q is never true',
      },
      {
        id: 'R3_CONFLICT_A',
        name: 'Action Alpha',
        antecedent: { type: 'var', name: 'P' },
        action: 'SHUTDOWN_ARRAY',
        justification: 'High storm condition',
      },
      {
        id: 'R4_CONFLICT_B',
        name: 'Action Beta',
        antecedent: { type: 'var', name: 'P' },
        action: 'BOOST_ARRAY',
        justification: 'Conflicting command under same premise',
      },
    ]

    const exclusivePairs: [string, string][] = [
      ['SHUTDOWN_ARRAY', 'BOOST_ARRAY'],
    ]

    const analysis = analyzeRuleSetTruthTable(rules, exclusivePairs)

    // Verify tautology detection
    expect(analysis.tautologies).toContain('R1_TAUTOLOGY')

    // Verify dead rule detection
    expect(analysis.deadRules).toContain('R2_DEAD')

    // Verify contradiction detection
    expect(analysis.contradictions.length).toBeGreaterThan(0)
    expect(analysis.contradictions[0].conflictingActions).toEqual(['SHUTDOWN_ARRAY', 'BOOST_ARRAY'])
  })

  it('fires matching rules and outputs rule justification', () => {
    const rules: PropositionalRule[] = [
      {
        id: 'R_GEOMAGNETIC_WATCH',
        name: 'Geomagnetic Watch Alert',
        antecedent: {
          type: 'and',
          left: { type: 'var', name: 'kp_high' },
          right: { type: 'var', name: 'bz_southward' },
        },
        action: 'RUN_SATELLITE_SIM',
        justification: 'Geomagnetic disturbance predicted due to elevated Kp and sustained southward Bz IMF.',
      },
    ]

    const context = { kp_high: true, bz_southward: true }
    const fired = fireRules(rules, context)

    expect(fired).not.toBeNull()
    expect(fired!.action).toBe('RUN_SATELLITE_SIM')
    expect(fired!.justification).toContain('southward Bz')
  })

  it('Feature 32: evaluates rover shelter emergency decision logic', () => {
    // 1. Not confirmed -> maintain nominal
    const res1 = evaluateRoverShelterDecision({
      alertConfirmed: false,
      rovers: [{ id: 'ROVER_ALPHA', reachableSheltersCount: 1 }],
    })
    expect(res1.action).toBe('maintain_nominal')

    // 2. Alert CONFIRMED and all rovers have reachable shelters -> go_shelter
    const res2 = evaluateRoverShelterDecision({
      alertConfirmed: true,
      rovers: [
        { id: 'ROVER_ALPHA', reachableSheltersCount: 2 },
        { id: 'ROVER_BETA', reachableSheltersCount: 1 },
      ],
    })
    expect(res2.action).toBe('go_shelter')
    expect(res2.allRoversSafe).toBe(true)

    // 3. Alert CONFIRMED but a rover lacks reachable shelter -> shelter_deficit
    const res3 = evaluateRoverShelterDecision({
      alertConfirmed: true,
      rovers: [
        { id: 'ROVER_ALPHA', reachableSheltersCount: 1 },
        { id: 'ROVER_GAMMA', reachableSheltersCount: 0 }, // cannot reach shelter
      ],
    })
    expect(res3.action).toBe('shelter_deficit')
    expect(res3.allRoversSafe).toBe(false)
    expect(res3.justification).toContain('ROVER_GAMMA')
  })
})
