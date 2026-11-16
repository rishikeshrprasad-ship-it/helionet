import { NOAA_R_SCALE, NOAA_S1_THRESHOLD, NOAA_G1_THRESHOLD } from '../config/thresholds'

/**
 * Feature 5: Space Weather Confirmation State Machine.
 *
 * Transitions:
 * - IDLE -> WATCH: when calibrated probability p > C / L threshold.
 * - WATCH -> CONFIRMED: when matching observation crosses threshold within forecast window:
 *     - xray >= 1e-5 W/m^2 (M-class flare / R1)
 *     - p10 >= 10 pfu (S1 radiation storm)
 *     - kp >= 5 (G1 geomagnetic storm)
 * - WATCH -> FALSE_ALARM: if forecast window ends with no crossing.
 * - CONFIRMED -> RESOLVED: after 6 consecutive hours below threshold.
 *
 * Every transition logs its timestamp, source state, target state, and evidence.
 */

export type FSMState = 'IDLE' | 'WATCH' | 'CONFIRMED' | 'FALSE_ALARM' | 'RESOLVED'
export type HazardType = 'flare' | 'proton' | 'geomagnetic'

export interface ObservationData {
  timeHours: number
  xray?: number // W/m^2
  p10?: number  // pfu (>= 10 MeV)
  kp?: number   // 0-9 index
  dst?: number  // nT
  vsw?: number  // km/s
  bz?: number   // nT
}

export interface TransitionLog {
  timeHours: number
  from: FSMState
  to: FSMState
  reason: string
  evidence: Record<string, number | string | boolean>
}

export interface FSMConfig {
  hazardType: HazardType
  costLossThreshold: number // C / L
  windowHours: number       // Lead time window
}

export class ConfirmationStateMachine {
  private state: FSMState = 'IDLE'
  private watchStartHour: number | null = null
  private belowThresholdHoursCount: number = 0
  private readonly config: FSMConfig
  public readonly history: TransitionLog[] = []

  constructor(config: FSMConfig) {
    this.config = config
  }

  public getState(): FSMState {
    return this.state
  }

  /**
   * Evaluates whether an observation crosses the defined NOAA threshold.
   */
  public isThresholdCrossed(obs: ObservationData): { crossed: boolean; metric: string; value: number; limit: number } {
    switch (this.config.hazardType) {
      case 'flare': {
        const val = obs.xray ?? 0
        const limit = NOAA_R_SCALE.R1.value // M-class flare / R1
        return { crossed: val >= limit, metric: 'xray', value: val, limit }
      }
      case 'proton': {
        const val = obs.p10 ?? 0
        const limit = NOAA_S1_THRESHOLD.value // S1 storm
        return { crossed: val >= limit, metric: 'p10', value: val, limit }
      }
      case 'geomagnetic': {
        const val = obs.kp ?? 0
        const limit = NOAA_G1_THRESHOLD.value // G1 storm
        return { crossed: val >= limit, metric: 'kp', value: val, limit }
      }
    }
  }

  /**
   * Steps the state machine with forecast probability and latest observation.
   */
  public step(forecastProb: number, obs: ObservationData): FSMState {
    const { crossed, metric, value, limit } = this.isThresholdCrossed(obs)
    const t = obs.timeHours

    switch (this.state) {
      case 'IDLE':
      case 'RESOLVED':
      case 'FALSE_ALARM': {
        if (forecastProb > this.config.costLossThreshold) {
          const from = this.state
          this.state = 'WATCH'
          this.watchStartHour = t
          this.belowThresholdHoursCount = 0
          this.history.push({
            timeHours: t,
            from,
            to: 'WATCH',
            reason: `Calibrated probability (${forecastProb.toFixed(3)}) exceeds C/L threshold (${this.config.costLossThreshold.toFixed(3)})`,
            evidence: { forecastProb, costLossThreshold: this.config.costLossThreshold },
          })
        }
        break
      }

      case 'WATCH': {
        if (crossed) {
          this.state = 'CONFIRMED'
          this.belowThresholdHoursCount = 0
          this.history.push({
            timeHours: t,
            from: 'WATCH',
            to: 'CONFIRMED',
            reason: `Threshold crossed for ${metric}: ${value} >= ${limit}`,
            evidence: { metric, value, limit },
          })
        } else if (this.watchStartHour !== null && t - this.watchStartHour >= this.config.windowHours) {
          this.state = 'FALSE_ALARM'
          this.history.push({
            timeHours: t,
            from: 'WATCH',
            to: 'FALSE_ALARM',
            reason: `Forecast lead time window (${this.config.windowHours}h) expired without observation crossing threshold`,
            evidence: { elapsedHours: t - this.watchStartHour, windowHours: this.config.windowHours },
          })
        }
        break
      }

      case 'CONFIRMED': {
        if (!crossed) {
          this.belowThresholdHoursCount++
          if (this.belowThresholdHoursCount >= 6) {
            this.state = 'RESOLVED'
            this.history.push({
              timeHours: t,
              from: 'CONFIRMED',
              to: 'RESOLVED',
              reason: 'Observation remained below threshold for 6 consecutive hours',
              evidence: { belowThresholdHoursCount: this.belowThresholdHoursCount },
            })
          }
        } else {
          this.belowThresholdHoursCount = 0
        }
        break
      }
    }

    return this.state
  }
}
