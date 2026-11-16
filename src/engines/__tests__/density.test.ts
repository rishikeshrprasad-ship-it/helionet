import { describe, it, expect } from 'vitest'
import {
  interpolateDensity,
  OrnsteinUhlenbeckNoise,
} from '../density'

describe('Atmospheric Density Engine (Features 8 & 9)', () => {
  it('interpolates within bounds without clamping or warnings', () => {
    const res = interpolateDensity(300, 120, 30)
    expect(res.clamped).toBe(false)
    expect(res.warning).toBeUndefined()
    expect(res.density).toBeGreaterThan(1e-13)
    expect(res.density).toBeLessThan(1e-9)
  })

  it('clamps altitude below minimum and issues warning', () => {
    const res = interpolateDensity(100, 100, 10)
    expect(res.clamped).toBe(true)
    expect(res.warning).toContain('clamped to minimum 150 km')
    const resAtMin = interpolateDensity(150, 100, 10)
    expect(res.density).toBeCloseTo(resAtMin.density, 10)
  })

  it('clamps altitude above maximum and issues warning', () => {
    const res = interpolateDensity(800, 100, 10)
    expect(res.clamped).toBe(true)
    expect(res.warning).toContain('clamped to maximum 600 km')
  })

  it('density decreases with altitude', () => {
    const rho200 = interpolateDensity(200, 120, 20).density
    const rho400 = interpolateDensity(400, 120, 20).density
    const rho600 = interpolateDensity(600, 120, 20).density
    expect(rho200).toBeGreaterThan(rho400)
    expect(rho400).toBeGreaterThan(rho600)
  })

  it('Feature 9: Ornstein-Uhlenbeck noise variance matches sigma^2', () => {
    const sigma = 0.25
    const tau = 1800.0 // 30 mins
    const dt = 60.0    // 1 min steps
    const ou = new OrnsteinUhlenbeckNoise(sigma, tau, 12345)

    const samples: number[] = []
    const totalSteps = 25000

    for (let i = 0; i < totalSteps; i++) {
      samples.push(ou.step(dt))
    }

    // Discard initial transient burn-in (first 2000 steps)
    const stationarySamples = samples.slice(2000)
    const n = stationarySamples.length

    let sum = 0
    let sumSq = 0
    for (const val of stationarySamples) {
      sum += val
      sumSq += val * val
    }

    const mean = sum / n
    const variance = sumSq / n - mean * mean
    const targetVariance = sigma * sigma

    // Sample variance should be close to theoretical sigma^2 within statistical tolerance
    expect(mean).toBeCloseTo(0, 1)
    expect(variance).toBeGreaterThan(targetVariance * 0.85)
    expect(variance).toBeLessThan(targetVariance * 1.15)
  })
})
