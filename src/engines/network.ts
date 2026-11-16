import { EARTH_RADIUS_M } from '../config/constants'

export const R_EARTH_M = EARTH_RADIUS_M.value

export interface NetworkGraph {
  numNodes: number
  adjacencyList: number[][]
}

export interface ComponentAnalysis {
  components: number[][]
  numComponents: number
  largestComponentSize: number
  isFullyConnected: boolean
}

export interface DegreeAnalysis {
  degrees: number[]
  minDegree: number
  maxDegree: number
  avgDegree: number
}

export interface GroundPoint {
  x: number
  y: number
  z: number
  latDeg: number
  lonDeg: number
}

export interface SatellitePosition {
  id: number
  x: number
  y: number
  z: number
  active: boolean
}

/**
 * Feature 13: Computes BFS connected components of the network graph.
 */
export function findConnectedComponents(graph: NetworkGraph): ComponentAnalysis {
  const visited = new Uint8Array(graph.numNodes)
  const components: number[][] = []

  for (let i = 0; i < graph.numNodes; i++) {
    if (visited[i] === 0) {
      const component: number[] = []
      const queue: number[] = [i]
      visited[i] = 1

      while (queue.length > 0) {
        const u = queue.shift()!
        component.push(u)

        const neighbors = graph.adjacencyList[u] || []
        for (const v of neighbors) {
          if (visited[v] === 0) {
            visited[v] = 1
            queue.push(v)
          }
        }
      }
      components.push(component)
    }
  }

  let largest = 0
  for (const c of components) {
    if (c.length > largest) largest = c.length
  }

  return {
    components,
    numComponents: components.length,
    largestComponentSize: largest,
    isFullyConnected: components.length === 1 && graph.numNodes > 0,
  }
}

/**
 * Computes node degree distribution across all satellites.
 */
export function computeDegreeDistribution(graph: NetworkGraph): DegreeAnalysis {
  const degrees = graph.adjacencyList.map((neighbors) => neighbors.length)
  let min = graph.numNodes > 0 ? degrees[0] : 0
  let max = 0
  let sum = 0

  for (const d of degrees) {
    if (d < min) min = d
    if (d > max) max = d
    sum += d
  }

  return {
    degrees,
    minDegree: min,
    maxDegree: max,
    avgDegree: graph.numNodes > 0 ? sum / graph.numNodes : 0,
  }
}

/**
 * Bidirectional link handshake check:
 * Verifies that for every directed edge u -> v, the reverse edge v -> u also exists.
 * Returns { valid: true } or { valid: false, asymmetricPairs }.
 */
export function verifyLinkHandshake(graph: NetworkGraph): {
  valid: boolean
  asymmetricPairs: [number, number][]
} {
  const asymmetric: [number, number][] = []

  for (let u = 0; u < graph.numNodes; u++) {
    const neighborsU = new Set(graph.adjacencyList[u])
    for (const v of neighborsU) {
      const neighborsV = new Set(graph.adjacencyList[v] || [])
      if (!neighborsV.has(u)) {
        asymmetric.push([u, v])
      }
    }
  }

  return {
    valid: asymmetric.length === 0,
    asymmetricPairs: asymmetric,
  }
}

/**
 * Generates N ground points uniformly distributed on Earth's surface
 * using the deterministic spherical Fibonacci lattice.
 */
export function generateFibonacciGroundPoints(count: number = 500, radiusM: number = R_EARTH_M): GroundPoint[] {
  const points: GroundPoint[] = []
  const phi = (1 + Math.sqrt(5)) / 2 // Golden ratio

  for (let i = 0; i < count; i++) {
    // theta in [-pi/2, pi/2], phi in [0, 2pi)
    const y = 1 - (i / (count - 1)) * 2 // from 1 to -1
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = (2 * Math.PI * i) / phi

    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY

    const latRad = Math.asin(y)
    const lonRad = Math.atan2(z, x)

    points.push({
      x: x * radiusM,
      y: y * radiusM,
      z: z * radiusM,
      latDeg: (latRad * 180) / Math.PI,
      lonDeg: (lonRad * 180) / Math.PI,
    })
  }

  return points
}

/**
 * Computes coverage over 500 ground points at 10 degree minimum elevation.
 * A satellite at position S is visible from ground point G if:
 * elevation angle beta >= minElevationDeg (default 10 degrees).
 *
 * Vector geometry:
 * Vector d = S - G
 * Local zenith normal at G is unit vector n = G / |G|
 * cos(zenith_angle) = (d . n) / |d|
 * elevation_angle = 90 deg - zenith_angle = asin((d . n) / |d|)
 */
export function computeGroundCoverage(
  satellites: SatellitePosition[],
  groundPoints: GroundPoint[] = generateFibonacciGroundPoints(500),
  minElevationDeg: number = 10,
): { coveredCount: number; totalCount: number; coverageFraction: number } {
  if (!satellites || satellites.length === 0) {
    return {
      coveredCount: 0,
      totalCount: groundPoints?.length ?? 0,
      coverageFraction: 0,
    }
  }

  const minSinBeta = Math.sin((minElevationDeg * Math.PI) / 180)
  const activeSats = satellites.filter((s) => s.active)

  let coveredCount = 0

  for (const gp of groundPoints) {
    const gx = gp.x
    const gy = gp.y
    const gz = gp.z
    const gLen = Math.sqrt(gx * gx + gy * gy + gz * gz)
    const nx = gx / gLen
    const ny = gy / gLen
    const nz = gz / gLen

    let isCovered = false

    for (const sat of activeSats) {
      const dx = sat.x - gx
      const dy = sat.y - gy
      const dz = sat.z - gz
      const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dLen <= 0) continue

      // sin(beta) = (d . n) / |d|
      const dot = dx * nx + dy * ny + dz * nz
      const sinBeta = dot / dLen

      if (sinBeta >= minSinBeta) {
        isCovered = true
        break
      }
    }

    if (isCovered) {
      coveredCount++
    }
  }

  return {
    coveredCount,
    totalCount: groundPoints.length,
    coverageFraction: groundPoints.length > 0 ? coveredCount / groundPoints.length : 0,
  }
}
