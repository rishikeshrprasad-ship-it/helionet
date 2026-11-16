import { DOSE_CAP } from '../config/thresholds'

/**
 * Feature 27: Radiation Dose Accumulation Engine.
 * Label: "Illustrative dose units"
 *
 * Equation:
 * D[k+1] = D[k] + r(t) * SVF * (1 - s_shelter) * dt
 *
 * Parameters:
 *   D[k]: Accumulated dose
 *   r(t): Incident space weather radiation rate at time t
 *   SVF: Local terrain Sky-View Factor in [0, 1]
 *   s_shelter: Shelter shielding efficacy in [0, 1] (0 = unshielded open regolith, 1 = perfect shelter)
 *   dt: Elapsed time step (seconds)
 */

export const DOSE_MODEL_LABEL = 'Illustrative dose units'
export const DEFAULT_DOSE_CAP = DOSE_CAP.value // Illustrative dose cap units

export interface DoseStepParams {
  currentDose: number
  radiationRate: number
  skyViewFactor: number
  shelterShieldingEfficacy?: number
  dtSeconds: number
  doseCap?: number
}

export interface DoseState {
  dose: number
  doseIncrement: number
  isCapped: boolean
  exceededCap: boolean
  label: string
}

/**
 * Steps the radiation dose forward by dt:
 * D[k+1] = D[k] + r(t) * SVF * (1 - s_shelter) * dt
 */
export function stepRadiationDose(params: DoseStepParams): DoseState {
  const {
    currentDose,
    radiationRate,
    skyViewFactor,
    shelterShieldingEfficacy = 0.0,
    dtSeconds,
    doseCap = DEFAULT_DOSE_CAP,
  } = params

  // Explicit zero-flux / invalid flux guard:
  // If incident radiation rate (solar flux) is <= 0 or non-finite, no radiation is accumulated.
  // Returns immediately with 0 increment without clamping current dose.
  if (!Number.isFinite(radiationRate) || radiationRate <= 0) {
    return {
      dose: Number.isFinite(currentDose) ? currentDose : 0,
      doseIncrement: 0,
      isCapped: currentDose >= doseCap,
      exceededCap: currentDose > doseCap,
      label: DOSE_MODEL_LABEL,
    }
  }

  const effectiveSVF = Math.max(0, Math.min(1.0, skyViewFactor))
  const shelterFactor = Math.max(0, Math.min(1.0, 1.0 - shelterShieldingEfficacy))

  // Rate in dose units / sec
  const deltaDose = Math.max(0, radiationRate) * effectiveSVF * shelterFactor * Math.max(0, dtSeconds)
  const nextDose = currentDose + deltaDose
  const exceededCap = nextDose > doseCap
  const clampedDose = Math.min(nextDose, doseCap)

  return {
    dose: clampedDose,
    doseIncrement: deltaDose,
    isCapped: nextDose >= doseCap,
    exceededCap,
    label: DOSE_MODEL_LABEL,
  }
}
