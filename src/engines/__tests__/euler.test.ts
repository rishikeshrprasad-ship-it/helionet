import { describe, it, expect } from 'vitest'
import { findEulerTour } from '../euler'

describe('Euler Tour Engine (Feature 16)', () => {
  it('TEST REQUIREMENT: returns { exists: false, oddVertices } if graph has more than 2 odd vertices', () => {
    // 4-star graph: center 0 connected to 1, 2, 3, 4
    // Vertices 1, 2, 3, 4 each have degree 1 (4 odd vertices)
    const numNodes = 5
    const edges: [number, number][] = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]

    const result = findEulerTour(numNodes, edges)
    expect(result.exists).toBe(false)
    expect(result.oddVertices.length).toBe(4)
    expect(result.oddVertices).toContain(1)
    expect(result.oddVertices).toContain(2)
    expect(result.oddVertices).toContain(3)
    expect(result.oddVertices).toContain(4)
    expect(result.tour).toBeUndefined()
  })

  it('finds Eulerian circuit when all vertices have even degrees (0 odd vertices)', () => {
    // Bowtie graph with 2 triangles sharing vertex 0 (all degrees 2 or 4)
    const numNodes = 5
    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 0], // Triangle 1
      [0, 3], [3, 4], [4, 0], // Triangle 2
    ]

    const result = findEulerTour(numNodes, edges)
    expect(result.exists).toBe(true)
    expect(result.oddVertices.length).toBe(0)
    expect(result.isCircuit).toBe(true)
    expect(result.tour).toBeDefined()
    expect(result.tour!.length).toBe(edges.length + 1)
    expect(result.tour![0]).toBe(result.tour![result.tour!.length - 1])
  })

  it('finds Eulerian path when exactly 2 vertices have odd degrees', () => {
    // Path graph 0 - 1 - 2 - 3 (degrees: 1, 2, 2, 1)
    const numNodes = 4
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
    ]

    const result = findEulerTour(numNodes, edges)
    expect(result.exists).toBe(true)
    expect(result.oddVertices.length).toBe(2)
    expect(result.isCircuit).toBe(false)
    expect(result.tour).toBeDefined()
    expect(result.tour!.length).toBe(4)
  })
})
