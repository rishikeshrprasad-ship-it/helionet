import { describe, it, expect } from 'vitest'
import {
  computeFailureDistributionPGF,
  evaluatePGF,
  expectedFailures,
} from '../pgf'

describe('Probability Generating Function Engine (Feature 12)', () => {
  it('TEST REQUIREMENT: coefficients sum to 1', () => {
    const probabilities = [0.05, 0.12, 0.28, 0.45, 0.02, 0.60, 0.15]
    const coeffs = computeFailureDistributionPGF(probabilities)

    expect(coeffs.length).toBe(probabilities.length + 1)

    const sum = coeffs.reduce((acc, c) => acc + c, 0)
    expect(sum).toBeCloseTo(1.0, 10)

    for (const c of coeffs) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1.0)
    }
  })

  it('evaluates G(1) == 1 for any probability vector', () => {
    const probs = [0.1, 0.3, 0.5, 0.7]
    const gAt1 = evaluatePGF(probs, 1.0)
    expect(gAt1).toBeCloseTo(1.0, 10)
  })

  it('evaluates G(0) == P(K = 0) == prod(1 - p_i)', () => {
    const probs = [0.2, 0.4, 0.1]
    const gAt0 = evaluatePGF(probs, 0.0)
    const expectedP0 = 0.8 * 0.6 * 0.9
    expect(gAt0).toBeCloseTo(expectedP0, 10)

    const coeffs = computeFailureDistributionPGF(probs)
    expect(coeffs[0]).toBeCloseTo(expectedP0, 10)
  })

  it('expected value E[K] computed from distribution matches sum(p_i)', () => {
    const probs = [0.15, 0.25, 0.35, 0.45, 0.05]
    const coeffs = computeFailureDistributionPGF(probs)

    let eFromCoeffs = 0
    for (let k = 0; k < coeffs.length; k++) {
      eFromCoeffs += k * coeffs[k]
    }

    const eDirect = expectedFailures(probs)
    expect(eFromCoeffs).toBeCloseTo(eDirect, 10)
  })
})
