import { describe, it, expect } from 'vitest'
import {
  dsaturColoring,
  chromaticPolynomial,
  evaluatePolynomial,
} from '../colouring'

describe('Graph Colouring Engine (Feature 15)', () => {
  it('DSATUR produces a valid proper coloring (no adjacent vertices share colors)', () => {
    // Wheel graph W_5 (hub 0 connected to cycle 1-2-3-4-1)
    const numNodes = 5
    const adj = [
      [1, 2, 3, 4],       // Hub 0
      [0, 2, 4],          // 1
      [0, 1, 3],          // 2
      [0, 2, 4],          // 3
      [0, 1, 3],          // 4
    ]

    const result = dsaturColoring(numNodes, adj)
    expect(result.numColors).toBeGreaterThanOrEqual(3)

    // Check proper coloring property: color[u] != color[v] for all edges
    for (let u = 0; u < numNodes; u++) {
      for (const v of adj[u]) {
        expect(result.colors[u]).not.toBe(result.colors[v])
      }
    }
  })

  it('TEST REQUIREMENT: Complete graph K_n chromatic polynomial gives k*(k-1)*...*(k-n+1)', () => {
    // Test K_4
    const n = 4
    const edges: [number, number][] = []
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        edges.push([i, j])
      }
    }

    const poly = chromaticPolynomial(n, edges)

    // For any k >= 1: P(K_n, k) = k * (k - 1) * ... * (k - n + 1)
    for (let k = 1; k <= 7; k++) {
      let expected = 1
      for (let i = 0; i < n; i++) {
        expected *= (k - i)
      }
      const actual = evaluatePolynomial(poly, k)
      const normalizedExpected = expected === 0 ? 0 : expected
      expect(actual).toBe(normalizedExpected)
    }
  })

  it('TEST REQUIREMENT: Cycle graph C_n chromatic polynomial gives (k-1)^n + (-1)^n * (k-1)', () => {
    // Test C_5 (odd cycle)
    const n = 5
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ]

    const poly = chromaticPolynomial(n, edges)

    for (let k = 1; k <= 6; k++) {
      // (k - 1)^5 + (-1)^5 * (k - 1) = (k - 1)^5 - (k - 1)
      const expected = Math.pow(k - 1, n) + Math.pow(-1, n) * (k - 1)
      const actual = evaluatePolynomial(poly, k)
      expect(actual).toBe(expected)
    }

    // Test C_4 (even cycle)
    const n4 = 4
    const edges4: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ]
    const poly4 = chromaticPolynomial(n4, edges4)
    for (let k = 1; k <= 6; k++) {
      // (k - 1)^4 + (-1)^4 * (k - 1) = (k - 1)^4 + (k - 1)
      const expected = Math.pow(k - 1, n4) + Math.pow(-1, n4) * (k - 1)
      const actual = evaluatePolynomial(poly4, k)
      expect(actual).toBe(expected)
    }
  })

  it('bounds chromatic polynomial to <= 10 nodes', () => {
    const edges11: [number, number][] = [[0, 1]]
    expect(() => chromaticPolynomial(11, edges11)).toThrow(
      'Exact chromatic polynomial is bounded to graphs with <= 10 nodes',
    )
  })
})
