import { SLOPE_MAX_DEG, SLOPE_MAX_RAD } from '../config/thresholds'

/**
 * Feature 24 & 26: Lunar Terrain Graph & Hazard Overlap Engine.
 *
 * Feature 24:
 * - 8-neighbour grid graph
 * - slope = atan(|dh| / d)
 * - cost = d * (1 + (slope / slope_max)^2)
 * - Blocked above slope_max (illustrative default 15 degrees = 0.261799 rad).
 *
 * Feature 26:
 * - Hazard zone overlap by inclusion-exclusion, tested against direct discrete pixel counts.
 */

export const DEFAULT_SLOPE_MAX_DEG = SLOPE_MAX_DEG.value
export const DEFAULT_SLOPE_MAX_RAD = SLOPE_MAX_RAD.value

export interface TerrainGrid {
  width: number
  height: number
  cellSizeM: number
  /** Row-major elevations in meters, size = width * height */
  elevations: Float32Array | number[]
}

export interface TerrainNeighborEdge {
  fromIndex: number
  toIndex: number
  toX: number
  toY: number
  distanceM: number
  slopeRad: number
  cost: number
  blocked: boolean
}

/**
 * Evaluates the movement cost and slope between two adjacent grid cells.
 */
export function computeCellTransition(
  x1: number,
  y1: number,
  h1: number,
  x2: number,
  y2: number,
  h2: number,
  cellSizeM: number,
  slopeMaxRad: number = DEFAULT_SLOPE_MAX_RAD,
): { distanceM: number; slopeRad: number; cost: number; blocked: boolean } {
  const dx = (x2 - x1) * cellSizeM
  const dy = (y2 - y1) * cellSizeM
  const d = Math.sqrt(dx * dx + dy * dy)

  const dh = Math.abs(h2 - h1)
  const slopeRad = Math.atan2(dh, d)

  const blocked = slopeRad > slopeMaxRad

  if (blocked) {
    return {
      distanceM: d,
      slopeRad,
      cost: Infinity,
      blocked: true,
    }
  }

  // cost = d * (1 + (slope / slope_max)^2)
  const slopeRatio = slopeRad / slopeMaxRad
  const cost = d * (1.0 + slopeRatio * slopeRatio)

  return {
    distanceM: d,
    slopeRad,
    cost,
    blocked: false,
  }
}

/**
 * Returns all valid 8-neighbor edges from cell (x, y) on the terrain grid.
 */
export function getTerrainNeighbors(
  x: number,
  y: number,
  grid: TerrainGrid,
  slopeMaxRad: number = DEFAULT_SLOPE_MAX_RAD,
): TerrainNeighborEdge[] {
  const fromIndex = y * grid.width + x
  const h1 = grid.elevations[fromIndex]
  const neighbors: TerrainNeighborEdge[] = []

  // 8 cardinal and diagonal directions
  const offsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ]

  for (const [ox, oy] of offsets) {
    const nx = x + ox
    const ny = y + oy

    if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
      const toIndex = ny * grid.width + nx
      const h2 = grid.elevations[toIndex]

      const transition = computeCellTransition(
        x,
        y,
        h1,
        nx,
        ny,
        h2,
        grid.cellSizeM,
        slopeMaxRad,
      )

      neighbors.push({
        fromIndex,
        toIndex,
        toX: nx,
        toY: ny,
        distanceM: transition.distanceM,
        slopeRad: transition.slopeRad,
        cost: transition.cost,
        blocked: transition.blocked,
      })
    }
  }

  return neighbors
}

/**
 * Feature 26: Inclusion-Exclusion Hazard Zone Overlap.
 * Computes the union area of 2 or 3 circular hazard regions:
 * |A U B| = |A| + |B| - |A n B|
 * |A U B U C| = |A| + |B| + |C| - |A n B| - |A n C| - |B n C| + |A n B n C|
 */
export interface CircularHazard {
  cx: number
  cy: number
  radius: number
}

/**
 * Checks whether a discrete pixel (px, py) is inside a circular hazard zone.
 */
export function isPixelInHazard(px: number, py: number, hazard: CircularHazard): boolean {
  const dx = px - hazard.cx
  const dy = py - hazard.cy
  return dx * dx + dy * dy <= hazard.radius * hazard.radius
}

/**
 * Computes exact discrete pixel count for intersection and union of hazard zones
 * over a bounding box domain.
 */
export function computeDiscreteHazardPixelCounts(
  hazards: CircularHazard[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
): {
  individualCounts: number[]
  pairwiseIntersectionCounts: Record<string, number>
  tripleIntersectionCount: number
  exactUnionPixelCount: number
  inclusionExclusionUnionCount: number
} {
  const n = hazards.length
  const individualCounts = new Array<number>(n).fill(0)
  const pairwiseIntersectionCounts: Record<string, number> = {}
  let tripleIntersectionCount = 0
  let exactUnionPixelCount = 0

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const inHazard = hazards.map((h) => isPixelInHazard(x, y, h))

      // Check if inside any hazard
      let insideAny = false
      for (let i = 0; i < n; i++) {
        if (inHazard[i]) {
          individualCounts[i]++
          insideAny = true
        }
      }

      if (insideAny) {
        exactUnionPixelCount++
      }

      // Pairwise intersections
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (inHazard[i] && inHazard[j]) {
            const key = `${i}-${j}`
            pairwiseIntersectionCounts[key] = (pairwiseIntersectionCounts[key] || 0) + 1
          }
        }
      }

      // Triple intersection
      if (n >= 3 && inHazard[0] && inHazard[1] && inHazard[2]) {
        tripleIntersectionCount++
      }
    }
  }

  // Calculate union using Inclusion-Exclusion formula:
  // Union = sum(|A_i|) - sum(|A_i n A_j|) + |A_1 n A_2 n A_3|
  let sumSingle = individualCounts.reduce((a, b) => a + b, 0)
  let sumPairs = Object.values(pairwiseIntersectionCounts).reduce((a, b) => a + b, 0)

  let inclusionExclusionUnionCount = sumSingle - sumPairs
  if (n >= 3) {
    inclusionExclusionUnionCount += tripleIntersectionCount
  }

  return {
    individualCounts,
    pairwiseIntersectionCounts,
    tripleIntersectionCount,
    exactUnionPixelCount,
    inclusionExclusionUnionCount,
  }
}

/**
 * Procedural fallback heightmap generator for lunar south pole (Shackleton region).
 * Complies with Rule 2 (pure TS, mulberry32 seeded PRNG) & Rule 6 (zero asset startup fallback).
 */
export function generateLunarSouthPoleHeightmap(
  width = 128,
  height = 128,
  cellSizeM = 39.0,
  seed = 42,
): TerrainGrid {
  const elevations = new Float32Array(width * height)
  let s = seed

  // Mulberry32 step
  const rand = () => {
    let t = (s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Craters definition: [cx, cy, radius, depthM, rimHeightM]
  const craters = [
    { cx: 64, cy: 64, r: 28, depth: 380, rim: 140 }, // Shackleton main crater
    { cx: 28, cy: 92, r: 16, depth: 210, rim: 70 },  // Secondary crater
    { cx: 100, cy: 35, r: 14, depth: 180, rim: 60 }, // Ridge crater
    { cx: 90, cy: 100, r: 18, depth: 240, rim: 85 }, // Basin crater
    { cx: 22, cy: 30, r: 12, depth: 150, rim: 45 },  // Northwest crater
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let h = 0

      // 1. Crater impact sculpting
      for (const c of craters) {
        const dx = x - c.cx
        const dy = y - c.cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const normDist = dist / c.r

        if (normDist < 1.0) {
          // Bowl-shaped crater floor
          const bowl = Math.cos(normDist * (Math.PI / 2.0))
          h -= c.depth * Math.pow(bowl, 1.4)
        } else if (normDist >= 1.0 && normDist < 1.4) {
          // Raised ejecta rim
          const rimT = (normDist - 1.0) / 0.4
          h += c.rim * Math.sin(rimT * Math.PI)
        }
      }

      // 2. Rolling highland waves (multi-octave sinusoids)
      const nx = x / width
      const ny = y / height
      h += Math.sin(nx * 4.5 * Math.PI + 0.3) * 45.0
      h += Math.cos(ny * 5.2 * Math.PI - 0.7) * 40.0
      h += Math.sin((nx + ny) * 8.0 * Math.PI) * 18.0

      // 3. Fine regolith roughness
      h += (rand() - 0.5) * 6.0

      elevations[y * width + x] = h
    }
  }

  return {
    width,
    height,
    cellSizeM,
    elevations,
  }
}

