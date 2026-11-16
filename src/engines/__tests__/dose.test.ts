import { describe, it, expect } from 'vitest'
import {
  stepRadiationDose,
  DOSE_MODEL_LABEL,
  DEFAULT_DOSE_CAP,
} from '../dose'

describe('Radiation Dose Engine (Feature 27)', () => {
  it('has label "Illustrative dose units" and default cap', () => {
    expect(DOSE_MODEL_LABEL).toBe('Illustrative dose units')
    expect(DEFAULT_DOSE_CAP).toBe(50.0)
  })

  it('accumulates dose in open regolith with SVF and dt', () => {
    const rRate = 0.05 // dose units / s
    const svf = 0.8
    const dt = 60.0 // 60s
    // Expected delta = 0.05 * 0.8 * 1.0 * 60 = 2.4 dose units

    const res = stepRadiationDose({
      currentDose: 10.0,
      radiationRate: rRate,
      skyViewFactor: svf,
      shelterShieldingEfficacy: 0.0,
      dtSeconds: dt,
    })

    expect(res.doseIncrement).toBeCloseTo(2.4, 6)
    expect(res.dose).toBeCloseTo(12.4, 6)
    expect(res.isCapped).toBe(false)
    expect(res.exceededCap).toBe(false)
  })

  it('reduces dose rate drastically inside a shielded habitat', () => {
    const res = stepRadiationDose({
      currentDose: 0.0,
      radiationRate: 0.1,
      skyViewFactor: 1.0,
      shelterShieldingEfficacy: 0.95, // 95% attenuation
      dtSeconds: 100,
    })

    // Delta = 0.1 * 1.0 * (1 - 0.95) * 100 = 0.5 dose units
    expect(res.doseIncrement).toBeCloseTo(0.5, 6)
  })

  it('clamps accumulated dose to configurable cap and flags exceededCap', () => {
    const customCap = 25.0
    const res = stepRadiationDose({
      currentDose: 24.0,
      radiationRate: 0.2,
      skyViewFactor: 1.0,
      dtSeconds: 60, // delta = 12.0 -> total 36.0 > 25.0
      doseCap: customCap,
    })

    expect(res.dose).toBe(customCap)
    expect(res.isCapped).toBe(true)
    expect(res.exceededCap).toBe(true)
  })
})
