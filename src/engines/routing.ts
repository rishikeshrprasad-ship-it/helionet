/**
 * Feature 17 & 18: Network Routing & Backbone Engine.
 * 1. Dijkstra with composite risk-latency weight:
 *    weight = latency + lambda * (-ln(1 - p_fail))
 * 2. Bellman-Ford algorithm (used for verification against Dijkstra).
 * 3. Kruskal's MST algorithm.
 * 4. Prim's MST algorithm.
 * Kruskal and Prim must produce identical total weight.
 */

import { ROUTING_LAMBDA } from '../config/constants'

export interface WeightedEdge {
  u: number
  v: number
  latencyMs: number
  pFail: number
}

export function computeCompositeWeight(
  latencyMs: number,
  pFail: number,
  lambdaRisk: number = ROUTING_LAMBDA.value,
): number {
  // Clamp pFail to avoid -ln(0) = infinity
  const p = Math.max(0, Math.min(0.999999, pFail))
  const riskCost = -Math.log(1.0 - p)
  return latencyMs + lambdaRisk * riskCost
}

export interface ShortestPathResult {
  distances: number[]
  previous: (number | null)[]
  path?: number[]
  cost?: number
  unreachable?: boolean
}

/**
 * Feature 17: Dijkstra's algorithm for constellation link rerouting.
 */
export function dijkstraRerouting(
  numNodes: number,
  edges: WeightedEdge[],
  source: number,
  target?: number,
  lambdaRisk: number = ROUTING_LAMBDA.value,
): ShortestPathResult {
  if (numNodes <= 0 || source < 0 || source >= numNodes) {
    return {
      distances: [],
      previous: [],
      path: target !== undefined ? [] : undefined,
      cost: target !== undefined ? Infinity : undefined,
      unreachable: true,
    }
  }

  if (target !== undefined && (target < 0 || target >= numNodes)) {
    return {
      distances: new Array<number>(numNodes).fill(Infinity),
      previous: new Array<number | null>(numNodes).fill(null),
      path: [],
      cost: Infinity,
      unreachable: true,
    }
  }

  interface AdjEdge {
    to: number
    weight: number
  }

  const adj: AdjEdge[][] = Array.from({ length: numNodes }, () => [])
  for (const e of edges) {
    if (e.u < 0 || e.u >= numNodes || e.v < 0 || e.v >= numNodes) continue
    const w = computeCompositeWeight(e.latencyMs, e.pFail, lambdaRisk)
    adj[e.u].push({ to: e.v, weight: w })
    adj[e.v].push({ to: e.u, weight: w })
  }

  const dist = new Array<number>(numNodes).fill(Infinity)
  const prev = new Array<number | null>(numNodes).fill(null)
  const visited = new Uint8Array(numNodes)

  dist[source] = 0

  for (let iter = 0; iter < numNodes; iter++) {
    let u = -1
    let minDist = Infinity
    for (let i = 0; i < numNodes; i++) {
      if (visited[i] === 0 && dist[i] < minDist) {
        minDist = dist[i]
        u = i
      }
    }

    if (u === -1 || dist[u] === Infinity) break
    visited[u] = 1

    if (target !== undefined && u === target) break

    for (const edge of adj[u]) {
      if (visited[edge.to] === 0) {
        const alt = dist[u] + edge.weight
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt
          prev[edge.to] = u
        }
      }
    }
  }

  if (target !== undefined) {
    if (dist[target] < Infinity) {
      const path: number[] = []
      let curr: number | null = target
      while (curr !== null) {
        path.push(curr)
        curr = prev[curr]
      }
      path.reverse()
      return { distances: dist, previous: prev, path, cost: dist[target], unreachable: false }
    } else {
      return { distances: dist, previous: prev, path: [], cost: Infinity, unreachable: true }
    }
  }

  return { distances: dist, previous: prev }
}

/**
 * Bellman-Ford algorithm for verification against Dijkstra.
 */
export function bellmanFord(
  numNodes: number,
  edges: WeightedEdge[],
  source: number,
  lambdaRisk: number = ROUTING_LAMBDA.value,
): number[] {
  if (numNodes <= 0 || source < 0 || source >= numNodes) {
    return []
  }

  const dist = new Array<number>(numNodes).fill(Infinity)
  dist[source] = 0

  // Expand undirected edges into directed edges
  interface DirEdge {
    u: number
    v: number
    w: number
  }
  const allEdges: DirEdge[] = []
  for (const e of edges) {
    const w = computeCompositeWeight(e.latencyMs, e.pFail, lambdaRisk)
    allEdges.push({ u: e.u, v: e.v, w })
    allEdges.push({ u: e.v, v: e.u, w })
  }

  for (let i = 1; i < numNodes; i++) {
    let changed = false
    for (const e of allEdges) {
      if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) {
        dist[e.v] = dist[e.u] + e.w
        changed = true
      }
    }
    if (!changed) break
  }

  return dist
}

/**
 * Feature 18: Kruskal's Minimum Spanning Tree algorithm.
 */
export function kruskalMST(
  numNodes: number,
  edges: WeightedEdge[],
  lambdaRisk: number = ROUTING_LAMBDA.value,
): { totalWeight: number; mstEdges: WeightedEdge[] } {
  if (numNodes <= 1 || edges.length === 0) {
    return { totalWeight: 0, mstEdges: [] }
  }

  // Disjoint Set Union (DSU) with path compression and union by rank
  const parent = Array.from({ length: numNodes }, (_, i) => i)
  const rank = new Array<number>(numNodes).fill(0)

  function find(i: number): number {
    if (parent[i] === i) return i
    parent[i] = find(parent[i])
    return parent[i]
  }

  function union(i: number, j: number): boolean {
    const rootI = find(i)
    const rootJ = find(j)
    if (rootI === rootJ) return false
    if (rank[rootI] < rank[rootJ]) {
      parent[rootI] = rootJ
    } else if (rank[rootI] > rank[rootJ]) {
      parent[rootJ] = rootI
    } else {
      parent[rootJ] = rootI
      rank[rootI]++
    }
    return true
  }

  // Sort edges by composite weight
  const sorted = [...edges].sort((a, b) => {
    const wa = computeCompositeWeight(a.latencyMs, a.pFail, lambdaRisk)
    const wb = computeCompositeWeight(b.latencyMs, b.pFail, lambdaRisk)
    return wa - wb
  })

  let totalWeight = 0
  const mstEdges: WeightedEdge[] = []

  for (const e of sorted) {
    if (union(e.u, e.v)) {
      totalWeight += computeCompositeWeight(e.latencyMs, e.pFail, lambdaRisk)
      mstEdges.push(e)
      if (mstEdges.length === numNodes - 1) break
    }
  }

  return { totalWeight, mstEdges }
}

/**
 * Feature 18: Prim's Minimum Spanning Tree algorithm.
 */
export function primMST(
  numNodes: number,
  edges: WeightedEdge[],
  lambdaRisk: number = ROUTING_LAMBDA.value,
): { totalWeight: number; mstEdges: WeightedEdge[] } {
  if (numNodes <= 1 || edges.length === 0) {
    return { totalWeight: 0, mstEdges: [] }
  }

  interface AdjEntry {
    neighbor: number
    edge: WeightedEdge
    weight: number
  }

  const adj: AdjEntry[][] = Array.from({ length: numNodes }, () => [])
  for (const e of edges) {
    const w = computeCompositeWeight(e.latencyMs, e.pFail, lambdaRisk)
    adj[e.u].push({ neighbor: e.v, edge: e, weight: w })
    adj[e.v].push({ neighbor: e.u, edge: e, weight: w })
  }

  const inMST = new Uint8Array(numNodes)
  inMST[0] = 1

  let totalWeight = 0
  const mstEdges: WeightedEdge[] = []

  for (let count = 0; count < numNodes - 1; count++) {
    let minW = Infinity
    let bestEdge: WeightedEdge | null = null
    let nextNode = -1

    for (let u = 0; u < numNodes; u++) {
      if (inMST[u] === 1) {
        for (const entry of adj[u]) {
          if (inMST[entry.neighbor] === 0 && entry.weight < minW) {
            minW = entry.weight
            bestEdge = entry.edge
            nextNode = entry.neighbor
          }
        }
      }
    }

    if (bestEdge === null || nextNode === -1) break
    inMST[nextNode] = 1
    totalWeight += minW
    mstEdges.push(bestEdge)
  }

  return { totalWeight, mstEdges }
}
