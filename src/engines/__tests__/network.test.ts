import { describe, it, expect } from 'vitest'
import {
  findConnectedComponents,
  computeDegreeDistribution,
  verifyLinkHandshake,
  generateFibonacciGroundPoints,
  computeGroundCoverage,
  type NetworkGraph,
  type SatellitePosition,
} from '../network'
import { R_EARTH_M } from '../orbitDecay'

describe('Network Graph & Coverage Engine (Feature 13)', () => {
  it('identifies connected components via BFS', () => {
    // Two disconnected triangles: (0,1,2) and (3,4,5)
    const graph: NetworkGraph = {
      numNodes: 6,
      adjacencyList: [
        [1, 2], [0, 2], [0, 1], // Component 1
        [4, 5], [3, 5], [3, 4], // Component 2
      ],
    }

    const res = findConnectedComponents(graph)
    expect(res.numComponents).toBe(2)
    expect(res.isFullyConnected).toBe(false)
    expect(res.largestComponentSize).toBe(3)
  })

  it('computes accurate node degree distribution', () => {
    const graph: NetworkGraph = {
      numNodes: 4,
      adjacencyList: [
        [1, 2, 3], // degree 3
        [0],       // degree 1
        [0],       // degree 1
        [0],       // degree 1
      ],
    }

    const deg = computeDegreeDistribution(graph)
    expect(deg.minDegree).toBe(1)
    expect(deg.maxDegree).toBe(3)
    expect(deg.avgDegree).toBe(1.5)
  })

  it('detects asymmetric link handshakes', () => {
    const asymmetricGraph: NetworkGraph = {
      numNodes: 3,
      adjacencyList: [
        [1], // 0 -> 1
        [],  // 1 has no back-link to 0
        [],
      ],
    }

    const check = verifyLinkHandshake(asymmetricGraph)
    expect(check.valid).toBe(false)
    expect(check.asymmetricPairs).toEqual([[0, 1]])

    const symmetricGraph: NetworkGraph = {
      numNodes: 2,
      adjacencyList: [[1], [0]],
    }
    expect(verifyLinkHandshake(symmetricGraph).valid).toBe(true)
  })

  it('generates exactly 500 ground points on Earth sphere', () => {
    const points = generateFibonacciGroundPoints(500)
    expect(points.length).toBe(500)
    for (const p of points) {
      const radius = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
      expect(radius).toBeCloseTo(R_EARTH_M, 1)
      expect(p.latDeg).toBeGreaterThanOrEqual(-90)
      expect(p.latDeg).toBeLessThanOrEqual(90)
    }
  })

  it('evaluates ground coverage at 10 degree elevation', () => {
    const groundPoints = generateFibonacciGroundPoints(500)

    // Constellation of 24 satellites at 550 km altitude in LEO
    const satRadiusM = R_EARTH_M + 550000
    const satellites: SatellitePosition[] = []
    for (let i = 0; i < 24; i++) {
      const theta = (i * 2.0 * Math.PI) / 24
      satellites.push({
        id: i,
        x: satRadiusM * Math.cos(theta),
        y: 0,
        z: satRadiusM * Math.sin(theta),
        active: true,
      })
    }

    const coverage = computeGroundCoverage(satellites, groundPoints, 10)
    expect(coverage.totalCount).toBe(500)
    expect(coverage.coveredCount).toBeGreaterThan(0)
    expect(coverage.coverageFraction).toBeGreaterThan(0)
    expect(coverage.coverageFraction).toBeLessThanOrEqual(1.0)
  })
})
