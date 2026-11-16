import { describe, it, expect } from 'vitest'
import {
  greedyBudgetedProtection,
  exhaustiveBudgetedProtection,
  costLossDecision,
  type SatelliteProtectionProblem,
} from '../protection'

describe('Budgeted Protection & Cost-Loss Engine (Features 21 & 22)', () => {
  it('TEST REQUIREMENT: Cost-Loss decision acts if p > C / L', () => {
    const cost = 25000     // Cost to orbit raise / safeguard
    const loss = 100000    // Loss if constellation link is severed
    // Critical threshold C / L = 0.25

    const decisionBelow = costLossDecision(0.20, cost, loss)
    expect(decisionBelow.criticalThreshold).toBe(0.25)
    expect(decisionBelow.act).toBe(false)

    const decisionAbove = costLossDecision(0.30, cost, loss)
    expect(decisionAbove.act).toBe(true)

    // Expected expense comparisons
    expect(decisionAbove.expectedExpenseWithAction).toBe(cost)
    expect(decisionAbove.expectedExpenseWithoutAction).toBe(0.30 * loss)
  })

  it('TEST REQUIREMENT: Greedy protection matches or closely approximates exhaustive search for n <= 12', () => {
    // 8-satellite ring network with cross chords
    const numSatellites = 8
    const baseGraph: number[][] = [
      [1, 7, 4], // 0
      [0, 2, 5], // 1
      [1, 3, 6], // 2
      [2, 4, 7], // 3
      [3, 5, 0], // 4
      [4, 6, 1], // 5
      [5, 7, 2], // 6
      [6, 0, 3], // 7
    ]

    // High unprotected failure probability for central vulnerable nodes
    const unprotectedFailProb = [0.4, 0.5, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5]
    // Raising orbit drops failure probability to 0.05
    const protectedFailProb = new Array<number>(8).fill(0.05)
    const budgetK = 2

    const problem: SatelliteProtectionProblem = {
      numSatellites,
      baseGraph,
      unprotectedFailProb,
      protectedFailProb,
      budgetK,
    }

    const greedy = greedyBudgetedProtection(problem, 200, 123)
    const exhaustive = exhaustiveBudgetedProtection(problem, 200, 123)

    expect(greedy.chosenSatellites.length).toBe(budgetK)
    expect(exhaustive.optimalSatellites.length).toBe(budgetK)

    // Greedy score should achieve at least 95% of exhaustive optimal score
    expect(greedy.expectedScore).toBeGreaterThanOrEqual(exhaustive.maxScore * 0.95)
  })
})
