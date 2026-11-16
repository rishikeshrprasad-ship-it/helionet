/**
 * Feature 16: Euler Tour Engine (Hierholzer's algorithm).
 * Used for satellite link-health inspection and lunar base survey trails.
 * If the graph has more than 2 odd vertices, returns { exists: false, oddVertices }.
 */

export interface EulerTourResult {
  exists: boolean
  oddVertices: number[]
  tour?: number[]
  isCircuit?: boolean
}

export function findEulerTour(numNodes: number, edges: [number, number][]): EulerTourResult {
  if (numNodes === 0 || edges.length === 0) {
    return { exists: true, oddVertices: [], tour: [], isCircuit: true }
  }

  // Build degrees and adjacency with unique edge IDs
  const degrees = new Array<number>(numNodes).fill(0)
  interface EdgeRef {
    to: number
    edgeId: number
  }

  const adj: EdgeRef[][] = Array.from({ length: numNodes }, () => [])

  for (let id = 0; id < edges.length; id++) {
    const [u, v] = edges[id]
    degrees[u]++
    degrees[v]++
    adj[u].push({ to: v, edgeId: id })
    adj[v].push({ to: u, edgeId: id })
  }

  // Identify all odd degree vertices
  const oddVertices: number[] = []
  for (let i = 0; i < numNodes; i++) {
    if (degrees[i] % 2 !== 0) {
      oddVertices.push(i)
    }
  }

  // Euler theorem: must have 0 or 2 odd vertices
  if (oddVertices.length !== 0 && oddVertices.length !== 2) {
    return {
      exists: false,
      oddVertices,
    }
  }

  // Choose start vertex: if 2 odd vertices, start at one of them; otherwise start at any node with edges
  let startNode = 0
  if (oddVertices.length === 2) {
    startNode = oddVertices[0]
  } else {
    for (let i = 0; i < numNodes; i++) {
      if (adj[i].length > 0) {
        startNode = i
        break
      }
    }
  }

  // Hierholzer's algorithm using edge visited array
  const usedEdges = new Uint8Array(edges.length)
  const stack: number[] = [startNode]
  const tour: number[] = []

  // Track next edge index per node to avoid repeated O(E) scans
  const nextEdgeIdx = new Array<number>(numNodes).fill(0)

  while (stack.length > 0) {
    const curr = stack[stack.length - 1]
    let found = false

    while (nextEdgeIdx[curr] < adj[curr].length) {
      const edge = adj[curr][nextEdgeIdx[curr]++]
      if (usedEdges[edge.edgeId] === 0) {
        usedEdges[edge.edgeId] = 1
        stack.push(edge.to)
        found = true
        break
      }
    }

    if (!found) {
      tour.push(stack.pop()!)
    }
  }

  // Verify all non-isolated edges were visited (graph connectivity check)
  for (let id = 0; id < edges.length; id++) {
    if (usedEdges[id] === 0) {
      return {
        exists: false,
        oddVertices,
      }
    }
  }

  tour.reverse()
  return {
    exists: true,
    oddVertices,
    tour,
    isCircuit: oddVertices.length === 0,
  }
}
