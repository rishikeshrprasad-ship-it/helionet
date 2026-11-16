import { mulberry32 } from './random'
import { getTerrainNeighbors, type TerrainGrid } from './terrain'
import { ROVER_SPEED_MPS } from '../config/constants'
import { DOSE_CAP } from '../config/thresholds'

export interface ParetoLabel {
  timeSeconds: number
  accumulatedDose: number
  path: [number, number][]
}

export interface ShelterCandidate {
  id: string
  x: number
  y: number
  name: string
  capacity: number
}

/**
 * Checks if label 1 dominates label 2:
 * (t1 <= t2 and d1 <= d2) with at least one strict inequality.
 */
export function dominates(l1: { timeSeconds: number; accumulatedDose: number }, l2: { timeSeconds: number; accumulatedDose: number }): boolean {
  return (
    l1.timeSeconds <= l2.timeSeconds &&
    l1.accumulatedDose <= l2.accumulatedDose &&
    (l1.timeSeconds < l2.timeSeconds || l1.accumulatedDose < l2.accumulatedDose)
  )
}

/**
 * Feature 28: Label-setting Pareto search for bi-criterion shortest paths (time, dose)
 * over the terrain grid from start (sx, sy) to goal (gx, gy).
 */
export function findParetoRoutes(params: {
  grid: TerrainGrid
  startX: number
  startY: number
  goalX: number
  goalY: number
  svfMap: Float32Array
  radiationRate: number
  roverSpeedMps?: number
  doseCap?: number
  maxLabelsPerCell?: number
}): ParetoLabel[] {
  const {
    grid,
    startX,
    startY,
    goalX,
    goalY,
    svfMap,
    radiationRate,
    roverSpeedMps = ROVER_SPEED_MPS.value,
    doseCap = DOSE_CAP.value,
    maxLabelsPerCell = 16,
  } = params

  const numCells = grid.width * grid.height
  const cellLabels: ParetoLabel[][] = Array.from({ length: numCells }, () => [])

  // Priority queue / frontier of active labels
  interface ActiveQueueItem {
    cellIdx: number
    x: number
    y: number
    label: ParetoLabel
  }

  const queue: ActiveQueueItem[] = []

  const startIdx = startY * grid.width + startX
  const initialLabel: ParetoLabel = {
    timeSeconds: 0,
    accumulatedDose: 0,
    path: [[startX, startY]],
  }

  cellLabels[startIdx].push(initialLabel)
  queue.push({ cellIdx: startIdx, x: startX, y: startY, label: initialLabel })

  // Spatial bounding box to avoid exhaustive unbounded grid expansion
  const margin = 10
  const minX = Math.max(0, Math.min(startX, goalX) - margin)
  const maxX = Math.min(grid.width - 1, Math.max(startX, goalX) + margin)
  const minY = Math.max(0, Math.min(startY, goalY) - margin)
  const maxY = Math.min(grid.height - 1, Math.max(startY, goalY) + margin)

  let iter = 0
  const maxIterations = 4000

  while (queue.length > 0 && iter++ < maxIterations) {
    // Find item with smallest time (O(N) search instead of O(N log N) full array sort)
    let minIdx = 0
    let minTime = queue[0].label.timeSeconds
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].label.timeSeconds < minTime) {
        minTime = queue[i].label.timeSeconds
        minIdx = i
      }
    }
    const { x, y, label: currLabel } = queue.splice(minIdx, 1)[0]

    // If goal reached, no need to expand further from here
    if (x === goalX && y === goalY) {
      continue
    }

    const neighbors = getTerrainNeighbors(x, y, grid)

    for (const edge of neighbors) {
      if (edge.blocked) continue

      const nx = edge.toX
      const ny = edge.toY

      // Bounding box filter
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue

      const nextIdx = edge.toIndex

      // Transit time = edge distance / rover speed
      const dt = edge.distanceM / roverSpeedMps
      const nextTime = currLabel.timeSeconds + dt

      // Dose accumulated along transition
      const avgSVF = (svfMap[currLabel.path[currLabel.path.length - 1][1] * grid.width + currLabel.path[currLabel.path.length - 1][0]] + svfMap[nextIdx]) * 0.5
      const nextDose = currLabel.accumulatedDose + radiationRate * avgSVF * dt

      if (nextDose > doseCap) continue

      // Avoid simple cycles
      if (currLabel.path.some(([px, py]) => px === nx && py === ny)) continue

      const candidateLabel: ParetoLabel = {
        timeSeconds: nextTime,
        accumulatedDose: nextDose,
        path: [...currLabel.path, [nx, ny]],
      }

      // Check domination against existing labels at next cell
      const existing = cellLabels[nextIdx]
      let isDominated = false

      for (const ex of existing) {
        if (dominates(ex, candidateLabel)) {
          isDominated = true
          break
        }
      }

      if (!isDominated) {
        // Filter out any existing labels dominated by the new candidate
        const remaining = existing.filter((ex) => !dominates(candidateLabel, ex))
        if (remaining.length < maxLabelsPerCell) {
          remaining.push(candidateLabel)
          cellLabels[nextIdx] = remaining
          queue.push({ cellIdx: nextIdx, x: nx, y: ny, label: candidateLabel })
        }
      }
    }
  }

  const goalIdx = goalY * grid.width + goalX
  return cellLabels[goalIdx]
}

/**
 * Feature 28: Evaluates 200 sampled storm-onset times and picks the route
 * that maximizes P(arrive before onset AND dose <= cap).
 */
export function selectOptimalShelterRoute(params: {
  candidateRoutes: ParetoLabel[]
  leadTimeMeanHours: number
  leadTimeStdHours: number
  doseCap: number
  numSamples?: number
  seed?: number
}): { bestRoute: ParetoLabel | null; maxSuccessProb: number } {
  const {
    candidateRoutes,
    leadTimeMeanHours,
    leadTimeStdHours,
    doseCap,
    numSamples = 200,
    seed = 42,
  } = params

  if (candidateRoutes.length === 0) {
    return { bestRoute: null, maxSuccessProb: 0 }
  }

  const rng = mulberry32(seed)

  // Draw 200 storm onset times in seconds
  const sampledOnsetTimesSec: number[] = []
  for (let i = 0; i < numSamples; i++) {
    // Box-Muller normal sample
    const u1 = Math.max(1e-15, rng())
    const u2 = rng()
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    const hours = Math.max(0.1, leadTimeMeanHours + leadTimeStdHours * z)
    sampledOnsetTimesSec.push(hours * 3600.0)
  }

  let bestRoute: ParetoLabel | null = null
  let maxSuccessProb = -1

  for (const route of candidateRoutes) {
    let successCount = 0
    for (const onsetSec of sampledOnsetTimesSec) {
      if (route.timeSeconds <= onsetSec && route.accumulatedDose <= doseCap) {
        successCount++
      }
    }

    const prob = successCount / numSamples
    if (prob > maxSuccessProb) {
      maxSuccessProb = prob
      bestRoute = route
    }
  }

  return { bestRoute, maxSuccessProb }
}

/**
 * Brute force exhaustive path enumerator on small grids (e.g. 6x6)
 * for testing and ground-truth verification of Pareto search.
 */
export function bruteForceOptimalPathFixedOnset(params: {
  grid: TerrainGrid
  startX: number
  startY: number
  goalX: number
  goalY: number
  svfMap: Float32Array
  radiationRate: number
  roverSpeedMps?: number
  fixedOnsetSeconds: number
  doseCap?: number
}): { optimalPath: [number, number][] | null; minDose: number; minTime: number } {
  const {
    grid,
    startX,
    startY,
    goalX,
    goalY,
    svfMap,
    radiationRate,
    roverSpeedMps = ROVER_SPEED_MPS.value,
    fixedOnsetSeconds,
    doseCap = DOSE_CAP.value,
  } = params

  let bestPath: [number, number][] | null = null
  let bestDose = Infinity
  let bestTime = Infinity

  function dfs(
    cx: number,
    cy: number,
    currentTime: number,
    currentDose: number,
    visitedPath: [number, number][],
  ) {
    if (
      currentTime > fixedOnsetSeconds ||
      currentDose > doseCap ||
      currentDose >= bestDose ||
      visitedPath.length > 8
    ) {
      return
    }

    if (cx === goalX && cy === goalY) {
      if (currentDose < bestDose || (currentDose === bestDose && currentTime < bestTime)) {
        bestDose = currentDose
        bestTime = currentTime
        bestPath = [...visitedPath]
      }
      return
    }

    const neighbors = getTerrainNeighbors(cx, cy, grid)
    // Sort neighbors by Euclidean distance to goal to find optimal path quickly
    neighbors.sort((a, b) => {
      const da = (a.toX - goalX) ** 2 + (a.toY - goalY) ** 2
      const db = (b.toX - goalX) ** 2 + (b.toY - goalY) ** 2
      return da - db
    })

    for (const edge of neighbors) {
      if (edge.blocked) continue
      const nx = edge.toX
      const ny = edge.toY

      if (visitedPath.some(([px, py]) => px === nx && py === ny)) continue

      const dt = edge.distanceM / roverSpeedMps
      const avgSVF =
        (svfMap[cy * grid.width + cx] + svfMap[ny * grid.width + nx]) * 0.5
      const dDose = radiationRate * avgSVF * dt

      visitedPath.push([nx, ny])
      dfs(nx, ny, currentTime + dt, currentDose + dDose, visitedPath)
      visitedPath.pop()
    }
  }

  dfs(startX, startY, 0, 0, [[startX, startY]])

  return { optimalPath: bestPath, minDose: bestDose, minTime: bestTime }
}
