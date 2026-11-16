import { mulberry32 } from './random'

/**
 * Standard atmospheric density table structure.
 * Altitude (km), F10.7 (sfu), Ap index.
 */
export interface DensityTable {
  altitudesKm: number[]
  f107Values: number[]
  apValues: number[]
  /** 3D grid values: densities[altIdx][f107Idx][apIdx] in kg/m^3 */
  densities: number[][][]
}

export interface DensityLookupResult {
  density: number
  clamped: boolean
  warning?: string
}

/**
 * Default fallback MSIS-style density table for altitudes 150–600 km,
 * F10.7 from 70 to 250 sfu, Ap from 4 to 200.
 * Pure TypeScript, deterministic.
 */
export const DEFAULT_DENSITY_TABLE: DensityTable = (() => {
  const altitudesKm = [150, 200, 250, 300, 350, 400, 450, 500, 550, 600]
  const f107Values = [70, 100, 150, 200, 250]
  const apValues = [4, 15, 50, 100, 200]

  // Exponential scale heights per altitude base
  const densities: number[][][] = altitudesKm.map((alt) => {
    // Base density at 200 km is ~3.3e-10 kg/m^3, scale height ~50 km
    const baseRho = 3.3e-10 * Math.exp(-(alt - 200) / 55)
    return f107Values.map((f107) => {
      const f107Factor = 1.0 + (f107 - 70) * 0.003
      return apValues.map((ap) => {
        const apFactor = 1.0 + Math.log10(Math.max(1, ap / 4)) * 0.4
        return baseRho * f107Factor * apFactor
      })
    })
  })

  return { altitudesKm, f107Values, apValues, densities }
})()

/**
 * Trilinear interpolation over altitude x F10.7 x Ap table.
 * Clamps input to table bounds and records a warning when clamping occurs.
 */
export function interpolateDensity(
  altitudeKm: number,
  f107: number,
  ap: number,
  table: DensityTable = DEFAULT_DENSITY_TABLE,
): DensityLookupResult {
  let clamped = false
  const warnings: string[] = []

  // Altitude clamp
  const minAlt = table.altitudesKm[0]
  const maxAlt = table.altitudesKm[table.altitudesKm.length - 1]
  let a = altitudeKm
  if (a < minAlt) {
    a = minAlt
    clamped = true
    warnings.push(`Altitude ${altitudeKm.toFixed(1)} km clamped to minimum ${minAlt} km`)
  } else if (a > maxAlt) {
    a = maxAlt
    clamped = true
    warnings.push(`Altitude ${altitudeKm.toFixed(1)} km clamped to maximum ${maxAlt} km`)
  }

  // F10.7 clamp
  const minF = table.f107Values[0]
  const maxF = table.f107Values[table.f107Values.length - 1]
  let f = f107
  if (f < minF) {
    f = minF
    clamped = true
    warnings.push(`F10.7 ${f107.toFixed(1)} clamped to minimum ${minF}`)
  } else if (f > maxF) {
    f = maxF
    clamped = true
    warnings.push(`F10.7 ${f107.toFixed(1)} clamped to maximum ${maxF}`)
  }

  // Ap clamp
  const minAp = table.apValues[0]
  const maxAp = table.apValues[table.apValues.length - 1]
  let p = ap
  if (p < minAp) {
    p = minAp
    clamped = true
    warnings.push(`Ap ${ap.toFixed(1)} clamped to minimum ${minAp}`)
  } else if (p > maxAp) {
    p = maxAp
    clamped = true
    warnings.push(`Ap ${ap.toFixed(1)} clamped to maximum ${maxAp}`)
  }

  // Helper to find bracket index and fraction t in [0, 1]
  function findBracket(val: number, arr: number[]): { i0: number; i1: number; t: number } {
    for (let i = 0; i < arr.length - 1; i++) {
      if (val <= arr[i + 1]) {
        const span = arr[i + 1] - arr[i]
        const t = span > 0 ? (val - arr[i]) / span : 0
        return { i0: i, i1: i + 1, t }
      }
    }
    const last = arr.length - 1
    return { i0: last - 1, i1: last, t: 1 }
  }

  const { i0: ai0, i1: ai1, t: at } = findBracket(a, table.altitudesKm)
  const { i0: fi0, i1: fi1, t: ft } = findBracket(f, table.f107Values)
  const { i0: pi0, i1: pi1, t: pt } = findBracket(p, table.apValues)

  // Trilinear interpolation on log-density to maintain physically realistic scale
  function getLog(ai: number, fi: number, pi: number): number {
    return Math.log(table.densities[ai][fi][pi])
  }

  const c000 = getLog(ai0, fi0, pi0)
  const c001 = getLog(ai0, fi0, pi1)
  const c010 = getLog(ai0, fi1, pi0)
  const c011 = getLog(ai0, fi1, pi1)
  const c100 = getLog(ai1, fi0, pi0)
  const c101 = getLog(ai1, fi0, pi1)
  const c110 = getLog(ai1, fi1, pi0)
  const c111 = getLog(ai1, fi1, pi1)

  const c00 = c000 * (1 - pt) + c001 * pt
  const c01 = c010 * (1 - pt) + c011 * pt
  const c10 = c100 * (1 - pt) + c101 * pt
  const c11 = c110 * (1 - pt) + c111 * pt

  const c0 = c00 * (1 - ft) + c01 * ft
  const c1 = c10 * (1 - ft) + c11 * ft

  const logRho = c0 * (1 - at) + c1 * at
  const density = Math.exp(logRho)

  return {
    density,
    clamped,
    warning: warnings.length > 0 ? warnings.join('; ') : undefined,
  }
}

/**
 * Standard Normal Box-Muller generator using seeded mulberry32 PRNG.
 */
export function sampleStandardNormal(rng: () => number): number {
  let u1 = rng()
  while (u1 <= 1e-15) {
    u1 = rng()
  }
  const u2 = rng()
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
}

/**
 * Feature 9: Ornstein-Uhlenbeck process on log atmospheric density fluctuations.
 * x[k+1] = phi * x[k] + sigma * sqrt(1 - phi^2) * eps
 * phi = exp(-dt / tau)
 */
export class OrnsteinUhlenbeckNoise {
  private x: number
  private readonly sigma: number
  private readonly tau: number
  private readonly rng: () => number

  constructor(sigma: number, tau: number, seed: number = 42, initialX: number = 0) {
    this.sigma = sigma
    this.tau = tau
    this.x = initialX
    this.rng = mulberry32(seed)
  }

  public step(dt: number): number {
    const phi = Math.exp(-dt / this.tau)
    const eps = sampleStandardNormal(this.rng)
    const innovation = this.sigma * Math.sqrt(Math.max(0, 1.0 - phi * phi)) * eps
    this.x = phi * this.x + innovation
    return this.x
  }

  public getValue(): number {
    return this.x
  }

  public reset(val: number = 0): void {
    this.x = val
  }
}
