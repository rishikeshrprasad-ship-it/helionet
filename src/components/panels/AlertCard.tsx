import React, { useState, useEffect, useRef } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { formatNumber } from '../../utils/format'
import { getFlareClass } from '../../engines/flareClassification'
import { COST_LOSS_RATIO, NOAA_S1_THRESHOLD } from '../../config/thresholds'
import { satelliteSelection } from '../../three/satelliteSelection'

export interface AlertCardProps {
  containerMode?: boolean
  style?: React.CSSProperties
}

export function AlertCard({ containerMode = false, style }: AlertCardProps): React.ReactElement | null {
  const scene = useHelioStore((s) => s.scene)
  const alert = useHelioStore((s) => s.alert)
  const setAlert = useHelioStore((s) => s.setAlert)
  const activeRow = useHelioStore((s) => s.activeRow)
  const forecast = useHelioStore((s) => s.forecast)
  const surface = useHelioStore((s) => s.surface)
  const constellation = useHelioStore((s) => s.constellation)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const replayStatus = useHelioStore((s) => s.replayStatus)
  const dataError = useHelioStore((s) => s.dataError)
  const triggerReplayReload = useHelioStore((s) => s.triggerReplayReload)
  const reducedMotion = useReducedMotion()
  const isPhone = useBreakpoint() === 'phone'

  const [whyOpen, setWhyOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [affectedModalOpen, setAffectedModalOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!affectedModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAffectedModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [affectedModalOpen])

  const affectedSatellites = (() => {
    const sats = constellation.satellites
    if (!sats || sats.length === 0) {
      return Array.from({ length: 40 }, (_, i) => ({
        id: 20 + i,
        plane: 20 + i < 40 ? 1 : 2,
        altitudeKm: 210.0 + (i % 5) * 4.0,
        status: 'atRisk' as const,
      }))
    }
    return sats.filter(
      (s) => s.plane === 1 || s.plane === 2 || s.status === 'atRisk' || s.status === 'lost'
    )
  })()

  const flareClass = activeRow?.obs.xray ? getFlareClass(activeRow.obs.xray) : null
  const isSurfaceScene = scene === 'surface'

  const surfaceAlert = (() => {
    const p10 = activeRow?.obs.p10 ?? 0
    const pProton = forecast.pProton
    const s1Limit = NOAA_S1_THRESHOLD.value
    const clThreshold = COST_LOSS_RATIO.value

    let surfaceStatus: typeof alert.status = 'WATCH'
    if (p10 >= s1Limit) {
      surfaceStatus = 'CONFIRMED'
    } else if (pProton >= clThreshold) {
      surfaceStatus = 'WATCH'
    } else if (alert.status === 'RESOLVED' || (surface.cumulativeDose > 0 && surface.isSheltered)) {
      surfaceStatus = 'RESOLVED'
    } else if (alert.status === 'FALSE_ALARM') {
      surfaceStatus = 'FALSE_ALARM'
    }

    let surfaceAction = 'Prepare lunar south pole rovers to move toward nearest radiation shelter'
    if (surface.isSheltered && surfaceStatus !== 'RESOLVED') {
      surfaceAction = 'Keep rovers inside radiation shelter until proton flux drops below S1'
    } else if (surfaceStatus === 'CONFIRMED') {
      surfaceAction = 'Move lunar south pole rovers into the nearest radiation shelter now'
    } else if (surfaceStatus === 'RESOLVED') {
      surfaceAction = 'Radiation storm subsided; resume nominal lunar surface traverse'
    }

    const surfaceEvidence =
      p10 >= s1Limit
        ? `Observed >=10 MeV proton flux = ${formatNumber(p10, 1, ' pfu')} >= ${s1Limit.toFixed(0)} pfu (NOAA S1 threshold)`
        : `Forecast pProton = ${formatNumber(pProton * 100, 0, '%')} (C/L Threshold: ${(clThreshold * 100).toFixed(0)}%), p10 = ${formatNumber(p10, 1, ' pfu')}`

    return {
      visible: alert.visible,
      status: surfaceStatus,
      probability: pProton,
      leadTime: forecast.leadH,
      impact: `Lunar south pole rovers and EVA radiation dose (${formatNumber(surface.cumulativeDose, 1)} / ${formatNumber(surface.doseCap, 0)})`,
      recommendedAction: surfaceAction,
      ruleFired: 'Solar proton lunar shelter (pProton >= 20% & p10 >= 10 pfu)',
      evidence: surfaceEvidence,
      userChoice: alert.userChoice,
    }
  })()

  const displayAlert = isSurfaceScene ? surfaceAlert : alert
  const {
    visible,
    status,
    probability,
    leadTime,
    impact,
    recommendedAction,
    ruleFired,
    evidence,
    userChoice,
  } = displayAlert

  // If hidden and in container mode, collapse completely
  if (containerMode && !visible) {
    return null
  }

  const getStatusChip = (): {
    label: string
    dotColor: string
    icon: string
  } => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'Confirmed',
          dotColor: TOKENS.color.redOrange,
          icon: '▲',
        }
      case 'WATCH':
        return {
          label: 'Watch',
          dotColor: TOKENS.color.amber,
          icon: '○',
        }
      case 'RESOLVED':
        return {
          label: 'Resolved',
          dotColor: TOKENS.color.moss,
          icon: '✓',
        }
      case 'FALSE_ALARM':
        return {
          label: 'False alarm',
          dotColor: TOKENS.color.muted,
          icon: '—',
        }
      default:
        return {
          label: status,
          dotColor: TOKENS.color.muted,
          icon: '—',
        }
    }
  }

  const chip = getStatusChip()

  return (
    <ErrorBoundary label="Alert Card Panel">
      <section
        aria-label={isSurfaceScene ? 'Lunar radiation hazard alert' : 'Space weather hazard alert'}
        style={{
          position: containerMode ? 'relative' : 'absolute',
          top: containerMode ? 'auto' : '80px',
          left: containerMode ? 'auto' : '24px',
          width: containerMode ? '100%' : presentationMode ? '396px' : '340px',
          background: TOKENS.panel.background,
          border: TOKENS.panel.border,
          borderRadius: TOKENS.panel.borderRadius,
          padding: isMinimized ? '12px 16px' : (presentationMode ? '20px' : TOKENS.panel.padding),
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 25,
          transform:
            containerMode || reducedMotion
              ? 'none'
              : visible
                ? 'translateX(0)'
                : 'translateX(-120%)',
          opacity: visible ? 1 : 0,
          transition: reducedMotion
            ? `opacity ${TOKENS.transition.reduced}`
            : visible
              ? `transform ${TOKENS.transition.base}, opacity ${TOKENS.transition.base}`
              : `transform ${TOKENS.transition.baseExit}, opacity ${TOKENS.transition.baseExit}`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: isMinimized ? '0px' : '24px',
          ...style,
        }}
      >
        {/* Group 1: status shape + word (28px) with flare class muted next to it, and ONE muted line below */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: presentationMode ? '32px' : '28px',
                fontWeight: 700,
                lineHeight: 1.1,
                margin: 0,
                color: TOKENS.color.text,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span aria-hidden="true" style={{ color: chip.dotColor }}>
                {chip.icon}
              </span>
              {chip.label}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {flareClass ? (
                <span
                  title={`NOAA Solar Flare Class ${flareClass.label}, Radio Blackout Scale ${flareClass.rScale}`}
                  style={{
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    color: TOKENS.color.muted,
                  }}
                >
                  {flareClass.label}, {flareClass.rScale}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                aria-label={isMinimized ? 'Expand alert card' : 'Minimize alert card'}
                title={isMinimized ? 'Expand alert card' : 'Minimize alert card'}
                style={{
                  background: 'transparent',
                  border: `1px solid ${TOKENS.color.hairline}`,
                  borderRadius: '4px',
                  color: TOKENS.color.muted,
                  cursor: 'pointer',
                  padding: '2px 8px',
                  fontFamily: TOKENS.font.mono,
                  fontSize: '12px',
                  minHeight: '26px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMinimized ? '+' : '—'}
              </button>
            </div>
          </div>

          <div
            style={{
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 1.4,
              color: TOKENS.color.muted,
            }}
          >
            {`Lead ${Number.isFinite(leadTime) ? (leadTime % 1 === 0 ? `${leadTime.toFixed(0)} h` : `${leadTime.toFixed(1)} h`) : '—'}  ·  Probability ${Number.isFinite(probability) ? `${Math.round(probability * 100)}%` : '—'}`}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Group 2: Recommendation (16px, max 2 lines) & What it affects (wraps 2 lines, no ellipsis) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {replayStatus === 'loading' && !activeRow ? (
                <Skeleton lines={3} height={14} label="Loading alert details" />
              ) : replayStatus === 'error' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: TOKENS.color.redOrange }}>
                    {dataError ?? 'Could not load replay file for storm alert.'}
                  </div>
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
                  <div
                    style={{
                      fontFamily: TOKENS.font.sans,
                      fontSize: presentationMode ? '20px' : '16px',
                      fontWeight: 400,
                      color: TOKENS.color.text,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {recommendedAction}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        fontFamily: TOKENS.font.sans,
                        fontSize: presentationMode ? '16px' : '14px',
                        fontWeight: 400,
                        color: TOKENS.color.muted,
                        lineHeight: 1.4,
                      }}
                    >
                      What it affects:
                    </div>
                    <button
                      type="button"
                      onClick={() => setAffectedModalOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={affectedModalOpen}
                      aria-label="Inspect list of affected satellites"
                      style={{
                        background: 'rgba(255, 107, 74, 0.1)',
                        border: '1px solid rgba(255, 107, 74, 0.35)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: TOKENS.color.text,
                        fontFamily: TOKENS.font.sans,
                        fontSize: '13px',
                        lineHeight: 1.4,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'background-color 120ms ease, border-color 120ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 107, 74, 0.2)'
                        e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 107, 74, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.35)'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{impact}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: TOKENS.color.redOrange,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        <span>Inspect</span>
                        <span aria-hidden="true">↗</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Group 3: Approve action (primary fill) & Reject (text-only) on one row; Why? expander below */}
            <div
              style={{
                borderTop: `1px solid ${TOKENS.color.hairline}`,
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {userChoice ? (
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${TOKENS.color.hairline}`,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    lineHeight: 1.4,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                      color: userChoice === 'approved' ? TOKENS.color.moss : TOKENS.color.muted,
                    }}
                  >
                    <span aria-hidden="true">{userChoice === 'approved' ? '✓' : '—'}</span>
                    {userChoice === 'approved' ? 'Safe mode approved' : 'Action rejected'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setAlert({ userChoice: null })}
                    aria-label="Reset action decision"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${TOKENS.color.hairline}`,
                      borderRadius: '4px',
                      color: TOKENS.color.text,
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontFamily: TOKENS.font.sans,
                      cursor: 'pointer',
                      minHeight: '32px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: `background 120ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    }}
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAlert({ userChoice: 'approved' })
                      const sats = constellation.satellites
                      if (sats && sats.length > 0) {
                        const updated = sats.map((s) => (s.plane === 1 || s.plane === 2 || s.status === 'atRisk' ? { ...s, status: 'nominal' as const, isDecaying: false } : s))
                        useHelioStore.getState().setConstellation({
                          satellites: updated,
                          atRiskCount: 0,
                          nominalCount: 120,
                          lostCount: 0,
                        })
                      }
                    }}
                    aria-label="Approve recommended mitigation action"
                    style={{
                      minHeight: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#E8E6E1',
                      border: 'none',
                      color: '#0E0F12',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontFamily: TOKENS.font.sans,
                      fontSize: presentationMode ? '16px' : '14px',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      transition: `background-color 120ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8E6E1')}
                  >
                    Approve action
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlert({ userChoice: 'rejected' })}
                    aria-label="Reject recommended mitigation action"
                    style={{
                      minHeight: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: TOKENS.color.muted,
                      padding: '8px 16px',
                      fontFamily: TOKENS.font.sans,
                      fontSize: presentationMode ? '16px' : '14px',
                      fontWeight: 500,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      transition: `color 120ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#E8E6E1')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted)}
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* "Why?" expander below the action buttons */}
              {!presentationMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setWhyOpen((prev) => !prev)}
                    aria-expanded={whyOpen}
                    style={{
                      alignSelf: 'flex-start',
                      minHeight: isPhone ? '44px' : '28px',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: TOKENS.color.muted,
                      fontFamily: TOKENS.font.sans,
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: `color 120ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#E8E6E1')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted)}
                  >
                    <span>Why?</span>
                    <span aria-hidden="true">{whyOpen ? '▾' : '▸'}</span>
                  </button>

                  {whyOpen && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${TOKENS.color.hairline}`,
                      }}
                    >
                      <div style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', color: TOKENS.color.muted, lineHeight: 1.4 }}>
                        Condition: <span style={{ color: TOKENS.color.text }}>{ruleFired}</span>
                      </div>
                      <div style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', color: TOKENS.color.slateBlue, lineHeight: 1.4 }}>
                        Evidence: {evidence}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {affectedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="affected-sats-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 6, 8, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isPhone ? '16px' : '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAffectedModalOpen(false)
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              background: 'rgba(14, 15, 18, 0.98)',
              border: '1px solid rgba(42, 45, 52, 0.8)',
              borderRadius: '10px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: TOKENS.color.text,
              fontFamily: TOKENS.font.sans,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${TOKENS.color.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2
                  id="affected-sats-title"
                  style={{
                    margin: 0,
                    fontFamily: TOKENS.font.heading,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: TOKENS.color.text,
                  }}
                >
                  Affected Satellites &amp; Vulnerable Nodes
                </h2>
                <div style={{ fontSize: '13px', color: TOKENS.color.muted, marginTop: '4px' }}>
                  {affectedSatellites.length} satellites in Planes 1 &amp; 2 (210–350 km injection orbits) facing drag surge
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAffectedModalOpen(false)}
                aria-label="Close dialog"
                style={{
                  minWidth: '32px',
                  minHeight: '32px',
                  background: 'transparent',
                  border: 'none',
                  color: TOKENS.color.muted,
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.text)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted)}
              >
                ✕
              </button>
            </div>

            {/* Summary Chips */}
            <div
              style={{
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: `1px solid ${TOKENS.color.hairline}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '13px',
              }}
            >
              {userChoice === 'approved' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: TOKENS.color.moss, fontWeight: 700 }}>✓</span>
                    <span style={{ color: TOKENS.color.moss, fontWeight: 600 }}>Action Approved: 40 Satellites Protected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: TOKENS.color.moss }}>✓</span>
                    <span>Safe Mode Active (Ion Boost Raising Orbit)</span>
                  </div>
                  <div style={{ color: TOKENS.color.muted, marginLeft: 'auto' }}>
                    Ballistic Drag: -75% (Feathered)
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: TOKENS.color.redOrange }}>○</span>
                    <span>At Risk: <strong>{constellation.atRiskCount || affectedSatellites.filter((s) => s.status === 'atRisk').length}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: TOKENS.color.redOrange }}>▲</span>
                    <span>De-orbited (Lost): <strong>{constellation.lostCount}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: TOKENS.color.moss }}>✓</span>
                    <span>Nominal in Group: <strong>{affectedSatellites.filter((s) => s.status === 'nominal').length}</strong></span>
                  </div>
                  <div style={{ color: TOKENS.color.muted, marginLeft: 'auto' }}>
                    Drag Expansion: +50% to +80%
                  </div>
                </>
              )}
            </div>

            {/* Scrollable Satellite Table */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '480px',
              }}
            >
              {affectedSatellites.map((sat) => {
                const isApproved = userChoice === 'approved'
                const isAtRisk = !isApproved && (sat.status === 'atRisk' || sat.altitudeKm <= 350)
                const isLost = !isApproved && (sat.status === 'lost' || sat.altitudeKm <= 200)
                const statusColor = isApproved ? TOKENS.color.moss : isLost ? TOKENS.color.redOrange : isAtRisk ? TOKENS.color.redOrange : TOKENS.color.moss
                const statusIcon = isApproved ? '✓' : isLost ? '▲' : isAtRisk ? '○' : '✓'
                const statusLabel = isApproved ? 'Protected (Safe Mode Active)' : isLost ? 'Lost (De-orbited)' : isAtRisk ? 'At Risk (Drag Surge)' : 'Nominal'

                return (
                  <div
                    key={sat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: isApproved
                        ? 'rgba(74, 222, 128, 0.08)'
                        : isAtRisk || isLost
                        ? 'rgba(255, 107, 74, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${
                        isApproved
                          ? 'rgba(74, 222, 128, 0.3)'
                          : isAtRisk || isLost
                          ? 'rgba(255, 107, 74, 0.25)'
                          : 'rgba(42, 45, 52, 0.4)'
                      }`,
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: statusColor, fontWeight: 700 }}>{statusIcon}</span>
                      <span style={{ fontFamily: TOKENS.font.mono, fontWeight: 600, fontSize: '14px' }}>
                        SAT-{String(sat.id).padStart(3, '0')}
                      </span>
                      <span style={{ fontSize: '12px', color: TOKENS.color.muted }}>
                        Plane {sat.plane} (53° LEO)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className="tabular" style={{ fontFamily: TOKENS.font.mono, fontSize: '13px', color: TOKENS.color.text }}>
                        {formatNumber(sat.altitudeKm, 1, ' km')}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor }}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          satelliteSelection.selectedId = sat.id
                          setSelectedEntity({ kind: 'satellite', id: sat.id })
                          setAffectedModalOpen(false)
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          borderRadius: '4px',
                          color: TOKENS.color.text,
                          fontFamily: TOKENS.font.sans,
                          fontSize: '12px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        Track in 3D
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: `1px solid ${TOKENS.color.hairline}`,
                background: 'rgba(14, 15, 18, 0.98)',
                fontSize: '12px',
                color: TOKENS.color.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Physics: Thermospheric expansion concentrates drag at lower injection perigees (210–350 km).
              </span>
              <button
                type="button"
                onClick={() => setAffectedModalOpen(false)}
                style={{
                  background: TOKENS.color.text,
                  color: TOKENS.color.background,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}
