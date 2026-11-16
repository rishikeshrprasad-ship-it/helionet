import { describe, it, expect } from 'vitest'
import {
  dijkstraRerouting,
  bellmanFord,
  kruskalMST,
  primMST,
  computeCompositeWeight,
  type WeightedEdge,
} from '../routing'

describe('Routing & Backbone Engine (Features 17 & 18)', () => {
  const edges: WeightedEdge[] = [
    { u: 0, v: 1, latencyMs: 15, pFail: 0.02 },
    { u: 0, v: 2, latencyMs: 25, pFail: 0.05 },
    { u: 1, v: 2, latencyMs: 10, pFail: 0.01 },
    { u: 1, v: 3, latencyMs: 35, pFail: 0.10 },
    { u: 2, v: 3, latencyMs: 20, pFail: 0.03 },
    { u: 2, v: 4, latencyMs: 40, pFail: 0.08 },
    { u: 3, v: 4, latencyMs: 12, pFail: 0.01 },
    { u: 0, v: 4, latencyMs: 90, pFail: 0.20 },
  ]
  const numNodes = 5

  it('computes composite weight = latency + lambda * (-ln(1 - p_fail))', () => {
    const lat = 20
    const p = 0.1
    const lambda = 50.0
    const expected = 20 + 50.0 * (-Math.log(0.9))
    const actual = computeCompositeWeight(lat, p, lambda)
    expect(actual).toBeCloseTo(expected, 8)
  })

  it('TEST REQUIREMENT: Dijkstra matches Bellman-Ford on shortest path distances', () => {
    const source = 0
    const dijkstraResult = dijkstraRerouting(numNodes, edges, source)
    const bfDistances = bellmanFord(numNodes, edges, source)

    expect(dijkstraResult.distances.length).toBe(numNodes)
    expect(bfDistances.length).toBe(numNodes)

    for (let i = 0; i < numNodes; i++) {
      expect(dijkstraResult.distances[i]).toBeCloseTo(bfDistances[i], 8)
    }
  })

  it('TEST REQUIREMENT: Kruskal and Prim must give equal total weight for MST', () => {
    const kruskalResult = kruskalMST(numNodes, edges)
    const primResult = primMST(numNodes, edges)

    expect(kruskalResult.mstEdges.length).toBe(numNodes - 1)
    expect(primResult.mstEdges.length).toBe(numNodes - 1)

    // Total weights must be identical
    expect(kruskalResult.totalWeight).toBeCloseTo(primResult.totalWeight, 8)
  })

  it('re-routes path avoiding a link when p_fail increases sharply', () => {
    // Nominal route from 0 to 4
    const nominal = dijkstraRerouting(numNodes, edges, 0, 4)
    expect(nominal.path).toBeDefined()

    // Simulate severe radiation storm degrading edge (3, 4)
    const degradedEdges = edges.map((e) =>
      (e.u === 3 && e.v === 4) || (e.u === 4 && e.v === 3)
        ? { ...e, pFail: 0.999 } // almost failed
        : e,
    )

    const rerouted = dijkstraRerouting(numNodes, degradedEdges, 0, 4)
    expect(rerouted.path).toBeDefined()
    // Should avoid link 3-4
    for (let i = 0; i < rerouted.path!.length - 1; i++) {
      const u = rerouted.path![i]
      const v = rerouted.path![i + 1]
      const isDegradedLink = (u === 3 && v === 4) || (u === 4 && v === 3)
      expect(isDegradedLink).toBe(false)
    }
  })
})
