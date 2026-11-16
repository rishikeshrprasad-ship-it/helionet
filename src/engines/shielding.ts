import { type TerrainGrid } from './terrain'

export const SHIELDING_MODEL_LABEL = 'Approximation'
export const DEFAULT_MAX_RAY_DISTANCE_M = 2000.0 // 2 km
export const NUM_AZIMUTH_RAYS = 16

/**
 * Feature 25: Sky-View Factor (SVF) Lunar Terrain Radiation Shielding Engine.
 * Label: "Approximation"
 *
 * For each cell:
 * - 16 azimuth rays spaced uniformly: theta_k = k * (2*pi / 16)
 * - Along each ray up to maxDistanceM (2 km), sample terrain elevations
 * - Horizon elevation angle beta_k = max(0, arctan((h(r) - h0) / r))
 * - Sky-View Factor SVF = 1 - (1 / 16) * sum_{k=1}^{16} sin(beta_k)
 *
 * Test requirement: flat terrain gives SVF = 1.0.
 */
export function computeSkyViewFactor(
  originX: number,
  originY: number,
  grid: TerrainGrid,
  maxDistanceM: number = DEFAULT_MAX_RAY_DISTANCE_M,
): { svf: number; horizonAnglesRad: number[] } {
  const originIdx = originY * grid.width + originX
  const h0 = grid.elevations[originIdx]

  const maxSteps = Math.ceil(maxDistanceM / grid.cellSizeM)
  const horizonAnglesRad = new Array<number>(NUM_AZIMUTH_RAYS).fill(0)

  for (let k = 0; k < NUM_AZIMUTH_RAYS; k++) {
    const theta = (k * 2.0 * Math.PI) / NUM_AZIMUTH_RAYS
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)

    let maxTanBeta = 0

    for (let step = 1; step <= maxSteps; step++) {
      const sampleDistM = step * grid.cellSizeM
      if (sampleDistM > maxDistanceM) break

      const sampleX = Math.round(originX + (sampleDistM * cosTheta) / grid.cellSizeM)
      const sampleY = Math.round(originY + (sampleDistM * sinTheta) / grid.cellSizeM)

      if (
        sampleX >= 0 &&
        sampleX < grid.width &&
        sampleY >= 0 &&
        sampleY < grid.height
      ) {
        const sampleIdx = sampleY * grid.width + sampleX
        const hSample = grid.elevations[sampleIdx]
        const deltaH = hSample - h0

        if (deltaH > 0) {
          const tanBeta = deltaH / sampleDistM
          if (tanBeta > maxTanBeta) {
            maxTanBeta = tanBeta
          }
        }
      }
    }

    horizonAnglesRad[k] = Math.atan(maxTanBeta)
  }

  // SVF = 1 - (1/16) * sum(sin(beta_k))
  let sinSum = 0
  for (let k = 0; k < NUM_AZIMUTH_RAYS; k++) {
    sinSum += Math.sin(horizonAnglesRad[k])
  }

  const svf = Math.max(0, Math.min(1.0, 1.0 - (1.0 / NUM_AZIMUTH_RAYS) * sinSum))

  return {
    svf,
    horizonAnglesRad,
  }
}

/**
 * Computes an SVF map for an entire terrain patch.
 * Uses adaptive sampling stride for grids larger than 32x32 to stay well within 16ms budget.
 */
export function computeTerrainSkyViewFactorMap(
  grid: TerrainGrid,
  maxDistanceM: number = DEFAULT_MAX_RAY_DISTANCE_M,
  sampleStride: number = grid.width > 32 ? 4 : 1,
): Float32Array {
  const map = new Float32Array(grid.width * grid.height)
  const stride = Math.max(1, sampleStride)

  // 1. Compute SVF at grid nodes spaced by stride
  for (let y = 0; y < grid.height; y += stride) {
    for (let x = 0; x < grid.width; x += stride) {
      const { svf } = computeSkyViewFactor(x, y, grid, maxDistanceM)
      map[y * grid.width + x] = svf
    }
  }

  // 2. Bilinearly interpolate values between stride points
  if (stride > 1) {
    for (let y = 0; y < grid.height; y++) {
      const y0 = Math.floor(y / stride) * stride
      const y1 = Math.min(y0 + stride, grid.height - 1)
      const ty = (y - y0) / (y1 === y0 ? 1 : (y1 - y0))

      for (let x = 0; x < grid.width; x++) {
        if (x % stride === 0 && y % stride === 0) continue

        const x0 = Math.floor(x / stride) * stride
        const x1 = Math.min(x0 + stride, grid.width - 1)
        const tx = (x - x0) / (x1 === x0 ? 1 : (x1 - x0))

        const v00 = map[y0 * grid.width + x0]
        const v10 = map[y0 * grid.width + x1]
        const v01 = map[y1 * grid.width + x0]
        const v11 = map[y1 * grid.width + x1]

        const top = v00 * (1 - tx) + v10 * tx
        const bot = v01 * (1 - tx) + v11 * tx
        map[y * grid.width + x] = top * (1 - ty) + bot * ty
      }
    }
  }

  return map
}
