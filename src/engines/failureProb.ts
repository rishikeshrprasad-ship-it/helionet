import { mulberry32 } from './random'

export interface CauseProbabilities {
  /** Drag-induced re-entry or tumble probability p1 */
  pDrag: number
  /** Surface/internal charging discharge probability p2 */
  pCharging: number
  /** Single event upset / radiation damage probability p3 */
  pRadiation: number
}

export interface StormSeverityDistribution {
  /** Severity level index/identifier */
  severity: number
  /** Probability of this severity level occurring P(s) */
  pSeverity: number
  /** Cause probabilities given this severity level */
  causes: CauseProbabilities
}

/**
 * Feature 11: Compute failure probability given storm severity s.
 * By inclusion-exclusion for 3 independent events:
 * P(fail|s) = (p1 + p2 + p3) - (p1*p2 + p1*p3 + p2*p3) + (p1*p2*p3)
 * Exactly equals 1 - (1 - p1)*(1 - p2)*(1 - p3).
 */
export function failureProbGivenSeverity(causes: CauseProbabilities): number {
  const { pDrag: p1, pCharging: p2, pRadiation: p3 } = causes
  // Exact inclusion-exclusion expansion
  const sum1 = p1 + p2 + p3
  const sum2 = p1 * p2 + p1 * p3 + p2 * p3
  const sum3 = p1 * p2 * p3
  return sum1 - sum2 + sum3
}

/**
 * Total marginal failure probability integrated over all storm severities:
 * P(fail) = sum_s P(s) * P(fail|s)
 */
export function totalFailureProbability(distribution: StormSeverityDistribution[]): number {
  let totalP = 0
  for (const item of distribution) {
    const pGivenS = failureProbGivenSeverity(item.causes)
    totalP += item.pSeverity * pGivenS
  }
  return totalP
}

export interface GraphEdge {
  u: number
  v: number
}

/**
 * Feature 14: Exact network unreliability (two-terminal disconnection)
 * via inclusion-exclusion over minimal cut sets for graphs with <= 12 edges.
 *
 * @param numNodes Total nodes in graph
 * @param edges Array of edges (each edge has failure probability p)
 * @param s Source node index
 * @param t Target node index
 * @param pEdgeFail Failure probability for each edge
 */
export function exactTwoTerminalUnreliability(
  numNodes: number,
  edges: GraphEdge[],
  s: number,
  t: number,
  pEdgeFail: number,
): number {
  if (edges.length > 12) {
    throw new Error('Exact inclusion-exclusion is bounded to graphs with <= 12 edges')
  }

  const numEdges = edges.length
  const totalStates = 1 << numEdges
  let unreliability = 0

  // Iterate over all 2^E operational/failure states
  for (let mask = 0; mask < totalStates; mask++) {
    // Determine which edges have failed (bit is 1)
    let failedCount = 0
    const adj: number[][] = Array.from({ length: numNodes }, () => [])

    for (let e = 0; e < numEdges; e++) {
      if ((mask & (1 << e)) !== 0) {
        failedCount++
      } else {
        // Edge is operational
        const { u, v } = edges[e]
        adj[u].push(v)
        adj[v].push(u)
      }
    }

    // Check if s and t are connected using BFS
    const visited = new Set<number>()
    const queue = [s]
    visited.add(s)
    let connected = false

    while (queue.length > 0) {
      const curr = queue.shift()!
      if (curr === t) {
        connected = true
        break
      }
      for (const neighbor of adj[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    // If disconnected, add probability of this state
    if (!connected) {
      const probState =
        Math.pow(pEdgeFail, failedCount) * Math.pow(1 - pEdgeFail, numEdges - failedCount)
      unreliability += probState
    }
  }

  return unreliability
}

/**
 * Feature 14: Importance sampling estimation of rare network unreliability.
 * Biased edge failure probability q > p.
 * Weights: prod (p/q)^x * ((1-p)/(1-q))^(1-x)
 */
export function importanceSamplingUnreliability(
  numNodes: number,
  edges: GraphEdge[],
  s: number,
  t: number,
  p: number,
  q: number,
  samples: number = 2000,
  seed: number = 101,
): { estimate: number; stdError: number } {
  const rng = mulberry32(seed)
  const numEdges = edges.length
  let weightedSum = 0
  let weightedSqSum = 0

  for (let iter = 0; iter < samples; iter++) {
    let disconnected = false
    let weight = 1.0
    const adj: number[][] = Array.from({ length: numNodes }, () => [])

    for (let e = 0; e < numEdges; e++) {
      const fails = rng() < q
      // Likelihood ratio W(x) = (p/q)^x * ((1-p)/(1-q))^(1-x)
      const edgeWeight = fails ? p / q : (1 - p) / (1 - q)
      weight *= edgeWeight

      if (!fails) {
        const { u, v } = edges[e]
        adj[u].push(v)
        adj[v].push(u)
      }
    }

    // BFS connectivity test
    const visited = new Set<number>()
    const queue = [s]
    visited.add(s)
    let connected = false

    while (queue.length > 0) {
      const curr = queue.shift()!
      if (curr === t) {
        connected = true
        break
      }
      for (const neighbor of adj[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    disconnected = !connected
    const score = disconnected ? weight : 0
    weightedSum += score
    weightedSqSum += score * score
  }

  const estimate = weightedSum / samples
  const variance = Math.max(0, weightedSqSum / samples - estimate * estimate)
  const stdError = Math.sqrt(variance / samples)

  return { estimate, stdError }
}
