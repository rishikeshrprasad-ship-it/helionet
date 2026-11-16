import { mulberry32 } from './random'
import { findConnectedComponents } from './network'

export interface SatelliteProtectionProblem {
  numSatellites: number
  /** Adjacency list of inter-satellite links */
  baseGraph: number[][]
  /** Baseline individual failure probability per satellite if unprotected */
  unprotectedFailProb: number[]
  /** Reduced failure probability if protected (orbit-raised) */
  protectedFailProb: number[]
  /** Protection budget: maximum number of satellites that can be orbit-raised */
  budgetK: number
}

/**
 * Feature 22: Cost-Loss economic decision rule.
 * Decides whether to initiate protection action based on event probability p,
 * protective cost C, and loss L without action.
 * Action rule: Act IF p > C / L.
 */
export function costLossDecision(
  eventProbability: number,
  protectionCost: number,
  potentialLoss: number,
): { act: boolean; criticalThreshold: number; expectedExpenseWithAction: number; expectedExpenseWithoutAction: number } {
  if (potentialLoss <= 0) {
    return {
      act: false,
      criticalThreshold: 1.0,
      expectedExpenseWithAction: protectionCost,
      expectedExpenseWithoutAction: 0,
    }
  }

  const criticalThreshold = protectionCost / potentialLoss
  const act = eventProbability > criticalThreshold

  // Expense if we take action: Cost C always incurred
  const expectedExpenseWithAction = protectionCost
  // Expense if no action taken: Loss L incurred with probability p
  const expectedExpenseWithoutAction = eventProbability * potentialLoss

  return {
    act,
    criticalThreshold,
    expectedExpenseWithAction,
    expectedExpenseWithoutAction,
  }
}

/**
 * Evaluates expected connectivity (fraction of nodes in largest component)
 * over N Monte Carlo failure scenarios given a set of protected satellite IDs.
 */
export function evaluateProtectionPlan(
  problem: SatelliteProtectionProblem,
  protectedSet: Set<number>,
  scenarioSeeds: number[],
): number {
  let totalScore = 0
  const n = problem.numSatellites

  for (const seed of scenarioSeeds) {
    const rng = mulberry32(seed)
    // Sample active surviving satellites
    const surviving = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
      const pFail = protectedSet.has(i)
        ? problem.protectedFailProb[i]
        : problem.unprotectedFailProb[i]
      if (rng() >= pFail) {
        surviving[i] = 1
      }
    }

    // Induced subgraph of surviving nodes
    const inducedAdj: number[][] = Array.from({ length: n }, () => [])
    for (let u = 0; u < n; u++) {
      if (surviving[u] === 1) {
        for (const v of problem.baseGraph[u]) {
          if (surviving[v] === 1) {
            inducedAdj[u].push(v)
          }
        }
      }
    }

    const compAnalysis = findConnectedComponents({
      numNodes: n,
      adjacencyList: inducedAdj,
    })

    // Connectivity score: size of largest surviving component / total nodes
    totalScore += compAnalysis.largestComponentSize / n
  }

  return totalScore / scenarioSeeds.length
}

/**
 * Feature 21: Greedy budgeted protection heuristic.
 * Iteratively chooses satellite offering highest marginal expected connectivity gain.
 */
export function greedyBudgetedProtection(
  problem: SatelliteProtectionProblem,
  numScenarios: number = 200,
  baseSeed: number = 42,
): { chosenSatellites: number[]; expectedScore: number } {
  const scenarioSeeds = Array.from({ length: numScenarios }, (_, i) => baseSeed + i * 17)
  const chosen = new Set<number>()

  for (let step = 0; step < problem.budgetK; step++) {
    let bestSat = -1
    let bestScore = -1

    for (let candidate = 0; candidate < problem.numSatellites; candidate++) {
      if (!chosen.has(candidate)) {
        chosen.add(candidate)
        const score = evaluateProtectionPlan(problem, chosen, scenarioSeeds)
        chosen.delete(candidate)

        if (score > bestScore) {
          bestScore = score
          bestSat = candidate
        }
      }
    }

    if (bestSat !== -1) {
      chosen.add(bestSat)
    } else {
      break
    }
  }

  const finalScore = evaluateProtectionPlan(problem, chosen, scenarioSeeds)
  return {
    chosenSatellites: Array.from(chosen).sort((a, b) => a - b),
    expectedScore: finalScore,
  }
}

/**
 * Exhaustive search for optimal protection plan on small graphs (numSatellites <= 12).
 * Used to test and benchmark the greedy algorithm.
 */
export function exhaustiveBudgetedProtection(
  problem: SatelliteProtectionProblem,
  numScenarios: number = 200,
  baseSeed: number = 42,
): { optimalSatellites: number[]; maxScore: number } {
  if (problem.numSatellites > 12) {
    throw new Error('Exhaustive search is only for graphs with <= 12 satellites')
  }

  const scenarioSeeds = Array.from({ length: numScenarios }, (_, i) => baseSeed + i * 17)
  const n = problem.numSatellites
  const k = problem.budgetK

  let bestSet: number[] = []
  let bestScore = -1

  // Combinations generator of n choose k
  function generateCombinations(start: number, current: number[]) {
    if (current.length === k) {
      const set = new Set(current)
      const score = evaluateProtectionPlan(problem, set, scenarioSeeds)
      if (score > bestScore) {
        bestScore = score
        bestSet = [...current]
      }
      return
    }

    for (let i = start; i < n; i++) {
      current.push(i)
      generateCombinations(i + 1, current)
      current.pop()
    }
  }

  generateCombinations(0, [])

  return {
    optimalSatellites: bestSet,
    maxScore: bestScore,
  }
}
