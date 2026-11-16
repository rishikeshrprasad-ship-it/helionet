import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { formatNumber } from '../../utils/format'

export interface SatelliteHealthProps {
  containerMode?: boolean
  style?: React.CSSProperties
}

export function SatelliteHealth({ containerMode = false, style }: SatelliteHealthProps): React.ReactElement {
  const constellation = useHelioStore((s) => s.constellation)
  const activeRow = useHelioStore((s) => s.activeRow)
  const isOpen = useHelioStore((s) => s.openSecondaryPanel === 'satellites')
  const toggleSecondaryPanel = useHelioStore((s) => s.toggleSecondaryPanel)

  const {
    satellites,
    nominalCount,
    atRiskCount,
    lostCount,
    avgAltitudeKm,
    activeLinks,
    reroutedPath,
  } = constellation

  return (
    <ErrorBoundary label="Satellite Health Panel">
      <aside
        aria-label="Satellites constellation health"
        style={{
          position: containerMode ? 'relative' : 'absolute',
          top: containerMode ? 'auto' : '136px',
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
          onClick={() => toggleSecondaryPanel('satellites')}
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
            Satellites
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
              {`${nominalCount} nominal`}
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
            {satellites.length === 0 ? (
              <Skeleton lines={4} height={16} label="Loading constellation telemetry" />
            ) : (
              <>
            {/* Single status line with shapes + counts + 12px muted decay note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: TOKENS.color.text,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span aria-hidden="true" style={{ color: TOKENS.color.moss }}>✓</span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{nominalCount}</span>{' '}
                  nominal
                </span>
                <span style={{ color: TOKENS.color.muted }}>/</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    aria-hidden="true"
                    style={{ color: atRiskCount > 0 ? TOKENS.color.redOrange : TOKENS.color.muted }}
                  >
                    ○
                  </span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{atRiskCount}</span>{' '}
                  at risk
                </span>
                <span style={{ color: TOKENS.color.muted }}>/</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    aria-hidden="true"
                    style={{ color: lostCount > 0 ? TOKENS.color.redOrange : TOKENS.color.muted }}
                  >
                    ▲
                  </span>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{lostCount}</span>{' '}
                  lost
                </span>
              </div>

              <div
                style={{
                  fontFamily: TOKENS.font.sans,
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: TOKENS.color.muted,
                }}
              >
                Decay exaggerated · 6 planes (53° LEO)
              </div>
            </div>

            {/* Three hairline-separated metric rows: mean altitude, active links, Kp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: `1px solid ${TOKENS.color.hairline}`,
                  paddingTop: '8px',
                }}
              >
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>
                  Mean altitude
                </span>
                <span className="tabular" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', fontWeight: 500 }}>
                  {formatNumber(avgAltitudeKm > 0 ? avgAltitudeKm : null, 1, ' km')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: `1px solid ${TOKENS.color.hairline}`,
                  paddingTop: '8px',
                }}
              >
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>
                  Active links
                </span>
                <span style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', fontWeight: 500, color: TOKENS.color.slateBlue }}>
                  <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{activeLinks.length}</span>
                  {reroutedPath.length > 0 ? (
                    <>
                      {' '}
                      (Dijkstra <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{reroutedPath.length}</span> hops)
                    </>
                  ) : null}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: `1px solid ${TOKENS.color.hairline}`,
                  paddingTop: '8px',
                }}
              >
                <span style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px' }}>
                  Kp
                </span>
                <span
                  className="tabular"
                  style={{
                    fontFamily: TOKENS.font.mono,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: (activeRow?.obs.kp ?? 0) >= 5 ? TOKENS.color.redOrange : TOKENS.color.text,
                  }}
                >
                  {formatNumber(activeRow?.obs.kp, 1)}
                </span>
              </div>
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
