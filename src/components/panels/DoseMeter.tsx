import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { formatNumber } from '../../utils/format'

export interface DoseMeterProps {
  containerMode?: boolean
  style?: React.CSSProperties
}

export function DoseMeter({ containerMode = false, style }: DoseMeterProps): React.ReactElement {
  const surface = useHelioStore((s) => s.surface)
  const setSurface = useHelioStore((s) => s.setSurface)
  const activeRow = useHelioStore((s) => s.activeRow)
  const isOpen = useHelioStore((s) => s.openSecondaryPanel === 'dose')
  const toggleSecondaryPanel = useHelioStore((s) => s.toggleSecondaryPanel)
  const reducedMotion = useReducedMotion()
  const isPhone = useBreakpoint() === 'phone'

  const { cumulativeDose, doseCap, isSheltered, targetShelterId, shelters } = surface
  const targetShelter = shelters.find((s) => s.id === targetShelterId) ?? shelters[0]

  // Space weather proton flux p10 from active replay row
  const p10 = activeRow?.obs.p10 ?? 1.2
  // Current dose rate r(t)
  const doseRate = isSheltered ? 0.01 : (0.05 + p10 * 0.04)
  const currentSvf = isSheltered ? 0.05 : 0.82

  const safeCap = doseCap || 50
  const scaleMax = Math.max(100, safeCap, cumulativeDose)
  const fillPct = Math.min(100, (cumulativeDose / scaleMax) * 100)
  const capTickPct = Math.min(100, (safeCap / scaleMax) * 100)
  const capRatioPct = Math.round((cumulativeDose / safeCap) * 100)

  const getDoseColor = (): string => {
    if (isSheltered) return TOKENS.color.moss
    if (capRatioPct > 80) return TOKENS.color.redOrange
    if (capRatioPct > 45) return TOKENS.color.slateBlue
    return TOKENS.color.moss
  }

  const doseColor = getDoseColor()

  return (
    <ErrorBoundary label="Crew Dose Panel">
      <aside
        aria-label="Crew radiation dose"
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
          onClick={() => toggleSecondaryPanel('dose')}
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
            Crew dose
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '13px',
                fontWeight: 500,
                color: isSheltered ? TOKENS.color.moss : TOKENS.color.slateBlue,
              }}
            >
              {isSheltered ? '✓ Sheltered' : '→ Racing'}
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
            {/* Group 1: Big mono dose number + thin bar with cap tick + 12px unit note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  className="tabular"
                  style={{
                    fontFamily: TOKENS.font.mono,
                    fontSize: '28px',
                    fontWeight: 500,
                    lineHeight: 1.1,
                    color: doseColor,
                  }}
                >
                  {formatNumber(cumulativeDose, 1)}
                </span>
                <span className="tabular" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', color: TOKENS.color.muted }}>
                  Cap {formatNumber(safeCap, 0)}
                </span>
              </div>

              {/* Thin bar with cap tick */}
              <div
                title={`Dose cap: ${safeCap}`}
                aria-label={`Accumulated dose ${formatNumber(cumulativeDose, 1)} against safety cap ${safeCap}`}
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
                    width: `${fillPct}%`,
                    height: '100%',
                    background: doseColor,
                    borderRadius: '2px',
                    transition: reducedMotion
                      ? 'none'
                      : `width ${TOKENS.transition.base}, background-color ${TOKENS.transition.base}`,
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: `${capTickPct}%`,
                    top: '-3px',
                    width: '2px',
                    height: '10px',
                    background: TOKENS.color.text,
                    transform: 'translateX(-1px)',
                  }}
                />
              </div>

              <div
                title="Not a validated physical conversion."
                aria-label="Illustrative dose units: Not a validated physical conversion."
                style={{
                  fontFamily: TOKENS.font.sans,
                  fontSize: '12px',
                  lineHeight: 1.4,
                  color: TOKENS.color.muted,
                }}
              >
                Illustrative dose units
              </div>
            </div>

            {/* Group 2: Hairline-separated rows for flux, sky-view factor and destination */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '8px' }}>
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>Flux</span>
                <span className="tabular" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', fontWeight: 500 }}>
                  {formatNumber(doseRate, 2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '8px' }}>
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>Sky-view factor</span>
                <span style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', fontWeight: 500, color: TOKENS.color.slateBlue }}>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{formatNumber(currentSvf, 2)}</span>{' '}
                  ({isSheltered ? 'Sheltered' : 'Approximation'})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '8px' }}>
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>Destination</span>
                <span style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', fontWeight: 500, color: TOKENS.color.slateBlue }}>
                  {targetShelter?.name ?? 'Shelter A'}
                </span>
              </div>
            </div>

            {/* Group 3: Configurable safety cap slider (no nested box) */}
            <div
              style={{
                borderTop: `1px solid ${TOKENS.color.hairline}`,
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label
                  htmlFor="dose-cap-input"
                  style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', color: TOKENS.color.muted }}
                >
                  Safety cap
                </label>
                <span className="tabular" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', fontWeight: 500 }}>
                  {doseCap}
                </span>
              </div>
              <input
                id="dose-cap-input"
                type="range"
                min="20"
                max="100"
                step="5"
                value={doseCap}
                onChange={(e) => setSurface({ doseCap: parseFloat(e.target.value) })}
                aria-label="Safety cap in illustrative dose units"
                style={{ width: '100%', accentColor: TOKENS.color.text, cursor: 'pointer', height: isPhone ? '44px' : '24px' }}
              />
            </div>
          </div>
        )}
        </div>
      </aside>
    </ErrorBoundary>
  )
}
