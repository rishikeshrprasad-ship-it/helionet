import React, { useState } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useModelInference } from '../../hooks/useModelInference'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { getFlareClass } from '../../engines/flareClassification'
import { formatNumber } from '../../utils/format'
import { COST_LOSS_RATIO } from '../../config/thresholds'

export interface ForecastProps {
  containerMode?: boolean
  style?: React.CSSProperties
}

export function Forecast({ containerMode = false, style }: ForecastProps): React.ReactElement {
  // Model loading and inference hook
  useModelInference()

  const forecast = useHelioStore((s) => s.forecast)
  const activeRow = useHelioStore((s) => s.activeRow)
  const replayStatus = useHelioStore((s) => s.replayStatus)
  const triggerReplayReload = useHelioStore((s) => s.triggerReplayReload)
  const isOpen = useHelioStore((s) => s.openSecondaryPanel === 'forecast')
  const toggleSecondaryPanel = useHelioStore((s) => s.toggleSecondaryPanel)
  const reducedMotion = useReducedMotion()
  const isPhone = useBreakpoint() === 'phone'
  const [infoOpen, setInfoOpen] = useState(false)

  const { pFlare, pProton, pGeo, leadH, isPrecomputed, modelBadge, inferenceTimeMs } = forecast
  const flareClass = activeRow?.obs.xray ? getFlareClass(activeRow.obs.xray) : null

  // Internal badge state matches model_card / hook strings; display in plain sentence case
  const badgeKey = modelBadge ?? (isPrecomputed ? 'PRECOMPUTED' : 'ILLUSTRATIVE MODEL')
  let badgeDisplay = 'Precomputed replay'
  if (badgeKey === 'ILLUSTRATIVE MODEL') {
    badgeDisplay = 'Illustrative ONNX model'
  } else if (badgeKey === 'ONNX MODEL') {
    badgeDisplay = 'ONNX model'
  }

  const infoTooltipText =
    'Thresholds: Geomagnetic storm (>= G1 / Kp 5), Radiation storm (>= S1 / 10 pfu), Solar flare (>= M-class / R1). Calibration: Platt / Isotonic Calibrated, NOAA SWPC Scale.'

  const renderGauge = (
    label: string,
    prob: number | null,
    thresholdRatio: number,
  ): React.ReactElement => {
    if (prob === null || !Number.isFinite(prob)) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: `1px solid ${TOKENS.color.hairline}`,
            paddingTop: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.4,
                color: TOKENS.color.text,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '13px',
                fontWeight: 400,
                lineHeight: 1.1,
                color: TOKENS.color.muted,
              }}
            >
              Not available
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              background: 'rgba(42, 45, 52, 0.4)',
              borderRadius: '2px',
            }}
          />
        </div>
      )
    }

    const pct = Math.min(100, Math.round(prob * 100))
    const thresholdPct = Math.min(100, Math.round(thresholdRatio * 100))
    const isAboveThreshold = prob >= thresholdRatio
    const barColor = isAboveThreshold ? TOKENS.color.redOrange : TOKENS.color.slateBlue

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderTop: `1px solid ${TOKENS.color.hairline}`,
          paddingTop: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              color: TOKENS.color.text,
            }}
          >
            {label}
          </span>
          <span
            className="tabular"
            style={{
              fontFamily: TOKENS.font.mono,
              fontSize: '20px',
              fontWeight: 500,
              lineHeight: 1.1,
              color: barColor,
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Thin progress track with decision threshold tick mark */}
        <div
          title={`Decision threshold: ${thresholdPct}%`}
          aria-label={`${label}: ${pct}%, decision threshold ${thresholdPct}%`}
          style={{
            position: 'relative',
            width: '100%',
            height: '4px',
            background: TOKENS.color.hairline,
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: barColor,
              borderRadius: '2px',
              transition: reducedMotion ? 'none' : `width ${TOKENS.transition.base}`,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: '-3px',
              width: '2px',
              height: '10px',
              background: TOKENS.color.text,
              transform: 'translateX(-1px)',
            }}
          />
        </div>
      </div>
    )
  }

  const stormRiskPct = Math.round(
    (Number.isFinite(pGeo) && pGeo > 0 ? pGeo : Number.isFinite(pProton) && pProton > 0 ? pProton : 0.35) * 100
  )

  return (
    <ErrorBoundary label="Forecast Panel">
      <aside
        aria-label="Space weather probability forecast"
        style={{
          position: containerMode ? 'relative' : 'absolute',
          top: containerMode ? 'auto' : '80px',
          right: containerMode ? 'auto' : '24px',
          width: containerMode ? '100%' : '320px',
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 20,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          ...style,
        }}
      >
        {/* Header sharing unified right-rail style */}
        <button
          type="button"
          onClick={() => toggleSecondaryPanel('forecast')}
          aria-expanded={isOpen}
          style={{
            width: '100%',
            minHeight: '44px',
            boxSizing: 'border-box',
            padding: '10px 14px',
            background: 'rgba(14, 15, 18, 0.78)',
            border: '1px solid rgba(42, 45, 52, 0.6)',
            borderRadius: '6px',
            color: TOKENS.color.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            textAlign: 'left',
            transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(14, 15, 18, 0.78)')}
        >
          <h2
            style={{
              fontFamily: TOKENS.font.heading,
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
              color: TOKENS.color.text,
            }}
          >
            Forecast
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '13px',
                color: TOKENS.color.muted,
                fontWeight: 400,
              }}
            >
              {`${stormRiskPct}% storm risk`}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 220ms cubic-bezier(0.25, 1, 0.5, 1)',
                color: isOpen ? TOKENS.color.text : TOKENS.color.muted,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <polyline points="6 4 10 8 6 12" />
            </svg>
          </div>
        </button>

        {/* Animated height container (220ms) */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '700px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 220ms cubic-bezier(0.25, 1, 0.5, 1), opacity 220ms cubic-bezier(0.25, 1, 0.5, 1)',
            background: TOKENS.panel.background,
            border: isOpen ? TOKENS.panel.border : 'none',
            borderRadius: TOKENS.panel.borderRadius,
            boxSizing: 'border-box',
          }}
        >
          {isOpen && (
            <div style={{ padding: TOKENS.panel.padding, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {replayStatus === 'loading' && !activeRow ? (
              <Skeleton lines={4} height={16} label="Loading forecast data" />
            ) : replayStatus === 'error' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: TOKENS.color.redOrange }}>
                  Could not load forecast replay data.
                </span>
                <button
                  type="button"
                  onClick={triggerReplayReload}
                  style={{
                    alignSelf: 'flex-start',
                    minHeight: isPhone ? '44px' : '36px',
                    padding: '0 12px',
                    background: 'transparent',
                    border: TOKENS.border.hairline,
                    borderRadius: '6px',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
            {/* Data source 12px muted line + info tooltip + Lead & flare class */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span
                  data-testid="forecast-model-badge"
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: TOKENS.color.muted,
                  }}
                >
                  Data source: {badgeDisplay}
                  {inferenceTimeMs !== undefined ? (
                    <>
                      {' · '}
                      <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>
                        {inferenceTimeMs.toFixed(1)}ms
                      </span>
                    </>
                  ) : null}
                </span>

                <button
                  type="button"
                  onClick={() => setInfoOpen((prev) => !prev)}
                  aria-expanded={infoOpen}
                  aria-label="Forecast thresholds and calibration details"
                  title={infoTooltipText}
                  style={{
                    minWidth: isPhone ? '44px' : '28px',
                    minHeight: isPhone ? '44px' : '28px',
                    padding: 0,
                    background: 'transparent',
                    border: `1px solid ${TOKENS.color.hairline}`,
                    borderRadius: '6px',
                    color: TOKENS.color.muted,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  i
                </button>
              </div>

              {infoOpen && (
                <div
                  role="tooltip"
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    lineHeight: 1.4,
                    color: TOKENS.color.muted,
                    borderTop: `1px solid ${TOKENS.color.hairline}`,
                    paddingTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div>Geomagnetic storm: (&gt;= G1 / Kp 5)</div>
                  <div>Radiation storm: (&gt;= S1 / 10 pfu)</div>
                  <div>Solar flare: (&gt;= M-class / R1)</div>
                  <div>Platt / Isotonic Calibrated, NOAA SWPC Scale</div>
                </div>
              )}

              <div
                style={{
                  borderTop: `1px solid ${TOKENS.color.hairline}`,
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', color: TOKENS.color.muted }}>
                  Lead{' '}
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono, color: TOKENS.color.text }}>
                    {leadH.toFixed(1)}h
                  </span>
                </span>
                <span
                  className="tabular"
                  style={{
                    fontFamily: TOKENS.font.mono,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: flareClass?.classLetter === 'X'
                      ? TOKENS.color.redOrange
                      : (flareClass ? TOKENS.color.text : TOKENS.color.muted),
                  }}
                >
                  {flareClass ? `${flareClass.label}, ${flareClass.rScale}` : formatNumber(null)}
                </span>
              </div>
            </div>

            {/* Three plain probability rows with 20px mono % and threshold tick */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderGauge('Geomagnetic storm', pGeo, COST_LOSS_RATIO.value)}
              {renderGauge('Radiation storm', pProton, 0.2)}
              {renderGauge('Solar flare', pFlare, COST_LOSS_RATIO.value)}
            </div>
              </>
            )}
            </div>
          )}
        </div>
      </aside>
    </ErrorBoundary>
  )
}
