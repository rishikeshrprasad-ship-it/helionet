import React, { useRef, useState } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TOKENS } from '../../tokens'
import { AlertCard } from './AlertCard'
import { Forecast } from './Forecast'
import { SatelliteHealth } from './SatelliteHealth'
import { DoseMeter } from './DoseMeter'
import { SceneLegend } from './SceneLegend'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'

export type BottomSheetSnap = 'peek' | 'half' | 'hidden'
export type BottomSheetTab = 'alert' | 'forecast' | 'satellites' | 'agent'

export interface PhoneBottomSheetProps {
  scene: 'orbit' | 'surface'
  snap: BottomSheetSnap
  onSnapChange: (snap: BottomSheetSnap) => void
  activeTab: BottomSheetTab
  onTabChange: (tab: BottomSheetTab) => void
}

export function PhoneBottomSheet({
  scene,
  snap,
  onSnapChange,
  activeTab,
  onTabChange,
}: PhoneBottomSheetProps): React.ReactElement {
  const alert = useHelioStore((s) => s.alert)
  const agentLog = useHelioStore((s) => s.agentLog)
  const reducedMotion = useReducedMotion()

  const [traceOpen, setTraceOpen] = useState(true)
  const [analogsOpen, setAnalogsOpen] = useState(false)
  const [citationsOpen, setCitationsOpen] = useState(false)

  const dragStartYRef = useRef<number | null>(null)
  const dragHandledRef = useRef(false)

  const getStatusChip = () => {
    switch (alert.status) {
      case 'CONFIRMED':
        return { label: 'Confirmed', color: TOKENS.color.text, dot: TOKENS.color.redOrange, icon: '▲' }
      case 'WATCH':
        return { label: 'Watch', color: TOKENS.color.text, dot: TOKENS.color.amber, icon: '○' }
      case 'RESOLVED':
        return { label: 'Resolved', color: TOKENS.color.text, dot: TOKENS.color.moss, icon: '✓' }
      case 'FALSE_ALARM':
        return { label: 'False alarm', color: TOKENS.color.text, dot: TOKENS.color.muted, icon: '—' }
      default:
        return { label: alert.status, color: TOKENS.color.text, dot: TOKENS.color.muted, icon: '—' }
    }
  }

  const chip = getStatusChip()

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = e.clientY
    dragHandledRef.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handleDragEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return
    const deltaY = e.clientY - dragStartYRef.current
    dragStartYRef.current = null

    if (deltaY < -28) {
      dragHandledRef.current = true
      if (snap === 'hidden') onSnapChange('peek')
      else if (snap === 'peek') onSnapChange('half')
    } else if (deltaY > 28) {
      dragHandledRef.current = true
      if (snap === 'half') {
        onSnapChange(deltaY > 140 ? 'hidden' : 'peek')
      } else if (snap === 'peek') {
        onSnapChange('hidden')
      }
    }
  }

  const handleHandleClick = () => {
    if (dragHandledRef.current) {
      dragHandledRef.current = false
      return
    }
    if (snap === 'hidden') onSnapChange('peek')
    else if (snap === 'peek') onSnapChange('half')
    else onSnapChange('peek')
  }

  const handleHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (snap === 'hidden') onSnapChange('peek')
      else if (snap === 'peek') onSnapChange('half')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (snap === 'half') onSnapChange('peek')
      else if (snap === 'peek') onSnapChange('hidden')
    }
  }

  const dragBar = (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: '36px',
        height: '4px',
        borderRadius: '2px',
        background: TOKENS.color.muted,
      }}
    />
  )

  // 1. Hidden State: Centred drag handle above timeline to restore sheet
  if (snap === 'hidden') {
    return (
      <button
        type="button"
        onPointerDown={handleDragStart}
        onPointerUp={handleDragEnd}
        onClick={handleHandleClick}
        onKeyDown={handleHandleKeyDown}
        aria-label="Drag or tap to show bottom sheet"
        style={{
          position: 'absolute',
          bottom: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: '88px',
          minHeight: '44px',
          padding: '0 16px',
          background: TOKENS.panel.background,
          border: TOKENS.panel.border,
          borderRadius: TOKENS.panel.borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          zIndex: 35,
          touchAction: 'none',
        }}
      >
        {dragBar}
      </button>
    )
  }

  // 2. Peek State: 72px bar with centred drag handle + status shape, word, probability and lead time
  if (snap === 'peek') {
    return (
      <aside
        aria-label="Space weather telemetry peek sheet"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '72px',
          background: TOKENS.panel.background,
          borderTop: TOKENS.panel.border,
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          transition: reducedMotion
            ? `opacity ${TOKENS.transition.reduced}`
            : `height ${TOKENS.transition.slowExit}`,
        }}
      >
        <button
          type="button"
          onPointerDown={handleDragStart}
          onPointerUp={handleDragEnd}
          onClick={handleHandleClick}
          onKeyDown={handleHandleKeyDown}
          aria-label="Drag up to expand sheet or drag down to hide"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '44px',
            padding: '6px 16px 8px',
            background: 'transparent',
            border: 'none',
            color: TOKENS.color.text,
            fontFamily: TOKENS.font.sans,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            touchAction: 'none',
            boxSizing: 'border-box',
          }}
        >
          {dragBar}

          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                color: chip.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span aria-hidden="true" style={{ color: chip.dot }}>{chip.icon}</span>
              {chip.label}
            </span>

            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                color: TOKENS.color.muted,
              }}
            >
              p{' '}
              <span className="tabular" style={{ fontFamily: TOKENS.font.mono, color: TOKENS.color.text }}>
                {Math.round(alert.probability * 100)}%
              </span>
              {' · Lead '}
              <span className="tabular" style={{ fontFamily: TOKENS.font.mono, color: TOKENS.color.text }}>
                {alert.leadTime.toFixed(1)}h
              </span>
            </span>
          </div>
        </button>
      </aside>
    )
  }

  // 3. Half State: 45vh with centred drag handle and 4 tabs (Alert, Forecast, Satellites, Agent)
  const thirdTabName = scene === 'orbit' ? 'Satellites' : 'Dose'

  return (
    <aside
      aria-label="Space weather telemetry panel sheet"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45vh',
        background: TOKENS.panel.background,
        borderTop: TOKENS.panel.border,
        color: TOKENS.color.text,
        fontFamily: TOKENS.font.sans,
        lineHeight: 1.4,
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: reducedMotion
          ? `opacity ${TOKENS.transition.reduced}`
          : `height ${TOKENS.transition.slow}`,
      }}
    >
      {/* Centred Drag Handle Header (no heading, no boxed Peek label, no X button) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onPointerDown={handleDragStart}
          onPointerUp={handleDragEnd}
          onClick={handleHandleClick}
          onKeyDown={handleHandleKeyDown}
          aria-label="Drag handle to resize or hide bottom sheet"
          style={{
            width: '100%',
            minHeight: '44px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            touchAction: 'none',
            padding: 0,
          }}
        >
          {dragBar}
        </button>
      </div>

      {/* Tabs Row (min 44px touch targets, 2px underline in text colour) */}
      <nav
        aria-label="Panel navigation tabs"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: `1px solid ${TOKENS.color.hairline}`,
          flexShrink: 0,
        }}
      >
        {(
          [
            { id: 'alert', label: 'Alert' },
            { id: 'forecast', label: 'Forecast' },
            { id: 'satellites', label: thirdTabName },
            { id: 'agent', label: 'Agent' },
          ] as const
        ).map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-selected={isActive}
              style={{
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${TOKENS.color.text}` : '2px solid transparent',
                color: isActive ? TOKENS.color.text : TOKENS.color.muted,
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: reducedMotion
                  ? `color ${TOKENS.transition.reduced}, border-color ${TOKENS.transition.reduced}`
                  : `color ${TOKENS.transition.fast}, border-color ${TOKENS.transition.fast}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Active Tab Panel Body (all text >= 14px) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: TOKENS.panel.padding,
          boxSizing: 'border-box',
          fontSize: '14px',
        }}
      >
        <ErrorBoundary label={`Phone Tab ${activeTab}`}>
          {activeTab === 'alert' && <AlertCard containerMode />}
          {activeTab === 'forecast' && <Forecast containerMode />}
          {activeTab === 'satellites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scene === 'orbit' ? <SatelliteHealth containerMode /> : <DoseMeter containerMode />}
              <SceneLegend containerMode />
            </div>
          )}
          {activeTab === 'agent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Section 1: Execution Trace (default open) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  type="button"
                  onClick={() => setTraceOpen(!traceOpen)}
                  aria-expanded={traceOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    Execution trace (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{agentLog.steps.length}</span> steps)
                  </span>
                  <span aria-hidden="true">{traceOpen ? '▾' : '▸'}</span>
                </button>
                {traceOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {agentLog.steps.length === 0 ? (
                      <Skeleton lines={3} height={16} label="Loading cycle trace" />
                    ) : (
                      agentLog.steps.map((st, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderTop: `1px solid ${TOKENS.color.hairline}`,
                            paddingTop: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontFamily: TOKENS.font.sans,
                            fontSize: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: TOKENS.color.text, fontWeight: 500 }}>
                              <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{idx + 1}.</span> {st.step}
                            </span>
                            {typeof st.outputs?.inferenceTimeMs === 'string' && (
                              <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                                ({st.outputs.inferenceTimeMs})
                              </span>
                            )}
                          </div>
                          <span className="tabular" style={{ color: TOKENS.color.muted, fontFamily: TOKENS.font.mono, fontSize: '14px' }}>
                            {st.ms} ms
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Historical Analogs (default closed) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  type="button"
                  onClick={() => setAnalogsOpen(!analogsOpen)}
                  aria-expanded={analogsOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    Historical analogs (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{agentLog.analogs.length}</span>)
                  </span>
                  <span aria-hidden="true">{analogsOpen ? '▾' : '▸'}</span>
                </button>
                {analogsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {agentLog.analogs.map((an) => (
                      <div
                        key={an.id}
                        style={{
                          borderTop: `1px solid ${TOKENS.color.hairline}`,
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                            {an.name}
                          </span>
                          <span style={{ color: TOKENS.color.slateBlue, fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px' }}>
                            <span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{Math.round(an.similarity * 100)}%</span> match
                          </span>
                        </div>
                        <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                          {an.source && an.source.trim().length > 0 && an.source.startsWith('http') ? (
                            `${an.description.slice(0, 110)}...`
                          ) : (
                            <span style={{ fontStyle: 'italic', color: TOKENS.color.muted }}>No sourced summary</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: KB Citations (default closed) */}
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}` }}>
                <button
                  type="button"
                  onClick={() => setCitationsOpen(!citationsOpen)}
                  aria-expanded={citationsOpen}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>
                    KB citations (<span className="tabular" style={{ fontFamily: TOKENS.font.mono }}>{agentLog.kbCitations.length}</span>)
                  </span>
                  <span aria-hidden="true">{citationsOpen ? '▾' : '▸'}</span>
                </button>
                {citationsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
                    {agentLog.kbCitations.map((cit, i) => (
                      <div
                        key={i}
                        style={{
                          borderTop: `1px solid ${TOKENS.color.hairline}`,
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: TOKENS.color.text, fontFamily: TOKENS.font.heading }}>
                            {cit.title}
                          </div>
                          {cit.needs_verification && (
                            <span
                              style={{
                                fontFamily: TOKENS.font.sans,
                                fontSize: '14px',
                                fontWeight: 500,
                                color: TOKENS.color.muted,
                                flexShrink: 0,
                              }}
                            >
                              Unverified
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: TOKENS.color.muted, fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4 }}>
                          {cit.summary.slice(0, 120)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </aside>
  )
}
