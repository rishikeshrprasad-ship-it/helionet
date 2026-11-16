import { describe, it, expect } from 'vitest'
import {
  failureProbGivenSeverity,
  totalFailureProbability,
  exactTwoTerminalUnreliability,
  importanceSamplingUnreliability,
  type GraphEdge,
} from '../failureProb'

describe('Failure Probability & Reliability Engine (Features 11 & 14)', () => {
  it('TEST REQUIREMENT: P(fail|s) equals 1 - prod(1 - p_i)', () => {
    const causesList = [
      { pDrag: 0.1, pCharging: 0.05, pRadiation: 0.02 },
      { pDrag: 0.4, pCharging: 0.25, pRadiation: 0.15 },
      { pDrag: 0.0, pCharging: 0.0, pRadiation: 0.0 },
      { pDrag: 1.0, pCharging: 0.5, pRadiation: 0.3 },
    ]

    for (const causes of causesList) {
      const pInclusionExclusion = failureProbGivenSeverity(causes)
      const pProd = 1.0 - (1.0 - causes.pDrag) * (1.0 - causes.pCharging) * (1.0 - causes.pRadiation)
      expect(pInclusionExclusion).toBeCloseTo(pProd, 12)
    }
  })

  it('computes total failure probability over severity distribution', () => {
    const dist = [
      { severity: 0, pSeverity: 0.7, causes: { pDrag: 0.01, pCharging: 0.01, pRadiation: 0.005 } },
      { severity: 1, pSeverity: 0.2, causes: { pDrag: 0.08, pCharging: 0.05, pRadiation: 0.03 } },
      { severity: 2, pSeverity: 0.1, causes: { pDrag: 0.35, pCharging: 0.20, pRadiation: 0.15 } },
    ]
    const totalP = totalFailureProbability(dist)
    expect(totalP).toBeGreaterThan(0.01)
    expect(totalP).toBeLessThan(0.35)
  })

  it('Feature 14: Importance sampling unreliability matches exact inclusion-exclusion on graph <= 12 edges', () => {
    // 5-node bridge network with 8 edges
    // Nodes: 0 (source), 1, 2, 3, 4 (target)
    const numNodes = 5
    const edges: GraphEdge[] = [
      { u: 0, v: 1 },
      { u: 0, v: 2 },
      { u: 1, v: 2 },
      { u: 1, v: 3 },
      { u: 2, v: 3 },
      { u: 1, v: 4 },
      { u: 2, v: 4 },
      { u: 3, v: 4 },
    ]

    const pFail = 0.05 // Rare failure probability
    const qBiased = 0.25 // Biased probability for IS

    const exactUnreliability = exactTwoTerminalUnreliability(numNodes, edges, 0, 4, pFail)
    const isResult = importanceSamplingUnreliability(numNodes, edges, 0, 4, pFail, qBiased, 5000, 777)

    expect(exactUnreliability).toBeGreaterThan(0)
    // The importance sampling estimate should match exact within 3 standard errors
    const diff = Math.abs(isResult.estimate - exactUnreliability)
    expect(diff).toBeLessThan(3.5 * isResult.stdError)
  })

  it('throws when exact inclusion-exclusion is requested for graph with > 12 edges', () => {
    const edges13: GraphEdge[] = Array.from({ length: 13 }, (_, i) => ({ u: i, v: (i + 1) % 13 }))
    expect(() => exactTwoTerminalUnreliability(13, edges13, 0, 1, 0.1)).toThrow(
      'Exact inclusion-exclusion is bounded to graphs with <= 12 edges',
    )
  })
})
