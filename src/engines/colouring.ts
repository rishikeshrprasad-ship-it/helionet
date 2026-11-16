/**
 * Feature 15: Graph Colouring Engine.
 * 1. DSATUR heuristic for satellite/station channel allocation.
 * 2. Exact chromatic polynomial by deletion-contraction (<= 10 nodes).
 */

export interface ColouringResult {
  /** Assigned color (0-indexed) for each node */
  colors: number[]
  /** Chromatic number (total colors used) */
  numColors: number
}

/**
 * DSATUR (Degree of Saturation) graph coloring heuristic.
 * Chooses the uncolored vertex with the highest saturation degree
 * (number of different colors among its colored neighbors).
 * Ties broken by highest degree in the uncolored subgraph.
 */
export function dsaturColoring(numNodes: number, adjacencyList: number[][]): ColouringResult {
  if (numNodes === 0) {
    return { colors: [], numColors: 0 }
  }

  const colors = new Array<number>(numNodes).fill(-1)
  const colored = new Uint8Array(numNodes)

  // Track the set of colored neighbor colors for each node
  const neighborColorSets: Set<number>[] = Array.from({ length: numNodes }, () => new Set())

  for (let step = 0; step < numNodes; step++) {
    // Pick uncolored vertex with max saturation degree
    let bestNode = -1
    let maxSat = -1
    let maxDeg = -1

    for (let u = 0; u < numNodes; u++) {
      if (colored[u] === 0) {
        const sat = neighborColorSets[u].size
        const deg = adjacencyList[u].length

        if (sat > maxSat || (sat === maxSat && deg > maxDeg)) {
          maxSat = sat
          maxDeg = deg
          bestNode = u
        }
      }
    }

    if (bestNode === -1) break

    // Find the smallest color (0, 1, 2, ...) not used by neighbors
    const usedColors = neighborColorSets[bestNode]
    let chosenColor = 0
    while (usedColors.has(chosenColor)) {
      chosenColor++
    }

    colors[bestNode] = chosenColor
    colored[bestNode] = 1

    // Update saturation of uncolored neighbors
    for (const v of adjacencyList[bestNode]) {
      if (colored[v] === 0) {
        neighborColorSets[v].add(chosenColor)
      }
    }
  }

  const maxColor = Math.max(...colors)
  return {
    colors,
    numColors: maxColor >= 0 ? maxColor + 1 : 0,
  }
}

/**
 * Polynomial representation as an array of coefficients:
 * poly[i] is the coefficient of k^i.
 */
export type Polynomial = number[]

function subtractPolynomials(p1: Polynomial, p2: Polynomial): Polynomial {
  const len = Math.max(p1.length, p2.length)
  const res = new Array<number>(len).fill(0)
  for (let i = 0; i < len; i++) {
    const v1 = i < p1.length ? p1[i] : 0
    const v2 = i < p2.length ? p2[i] : 0
    res[i] = v1 - v2
  }
  return res
}

/**
 * Computes exact chromatic polynomial P(G, k) via deletion-contraction:
 * P(G, k) = P(G - e, k) - P(G / e, k)
 * Strictly bounded to graphs with <= 10 nodes for tractability.
 */
export function chromaticPolynomial(numNodes: number, edges: [number, number][]): Polynomial {
  if (numNodes > 10) {
    throw new Error('Exact chromatic polynomial is bounded to graphs with <= 10 nodes')
  }

  // Base case: no edges remaining -> P(G, k) = k^numNodes
  // Polynomial: [0, 0, ..., 1] where index numNodes has 1
  if (edges.length === 0) {
    const poly = new Array<number>(numNodes + 1).fill(0)
    poly[numNodes] = 1
    return poly
  }

  // Pick the first edge e = (u, v)
  const [u, v] = edges[0]
  const remainingEdges = edges.slice(1)

  // 1. Deletion: G - e
  const polyDelete = chromaticPolynomial(numNodes, remainingEdges)

  // 2. Contraction: G / e
  // Contract vertex v into u, re-indexing remaining vertices
  // Map node indices: v merges into u, and vertices > v shift down by 1
  const mapNode = (node: number): number => {
    if (node === v) return u < v ? u : u - 1
    const target = node > v ? node - 1 : node
    const uMapped = u > v ? u - 1 : u
    return node === u ? uMapped : target
  }

  const contractedEdgesMap = new Set<string>()
  const contractedEdges: [number, number][] = []

  for (const [x, y] of remainingEdges) {
    const mx = mapNode(x)
    const my = mapNode(y)
    // Ignore self-loops created by contraction
    if (mx !== my) {
      const edgeKey = mx < my ? `${mx}-${my}` : `${my}-${mx}`
      if (!contractedEdgesMap.has(edgeKey)) {
        contractedEdgesMap.add(edgeKey)
        contractedEdges.push([Math.min(mx, my), Math.max(mx, my)])
      }
    }
  }

  const polyContract = chromaticPolynomial(numNodes - 1, contractedEdges)

  // P(G) = P(G - e) - P(G / e)
  return subtractPolynomials(polyDelete, polyContract)
}

/**
 * Evaluates polynomial at integer value k.
 */
export function evaluatePolynomial(poly: Polynomial, k: number): number {
  let val = 0
  let kPower = 1
  for (let i = 0; i < poly.length; i++) {
    val += poly[i] * kPower
    kPower *= k
  }
  const rounded = Math.round(val)
  return rounded === 0 ? 0 : rounded
}
