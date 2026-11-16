import React, { useEffect, useCallback, useMemo, useState } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TOKENS } from '../../tokens'
import { ErrorBoundary } from '../ErrorBoundary'
import { Skeleton } from '../Skeleton'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ConfirmationStateMachine } from '../../engines/confirmFSM'
import { COST_LOSS_RATIO } from '../../config/thresholds'

const SPEEDS: (1 | 10 | 60 | 240)[] = [1, 10, 60, 240]

interface TimelineEventMarker {
  status: 'WATCH' | 'CONFIRMED' | 'RESOLVED'
  timeHours: number
  reason: string
}

export interface TimelineProps {
  sheetSnap?: 'peek' | 'half' | 'hidden'
  style?: React.CSSProperties
}

export function Timeline({ sheetSnap = 'peek', style }: TimelineProps): React.ReactElement {
  const breakpoint = useBreakpoint()
  const reducedMotion = useReducedMotion()
  const playback = useHelioStore((s) => s.playback)
  const replay = useHelioStore((s) => s.replay)
  const replayStatus = useHelioStore((s) => s.replayStatus)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const setPlaying = useHelioStore((s) => s.setPlaying)
  const setSpeed = useHelioStore((s) => s.setSpeed)
  const setCurrentTimeHours = useHelioStore((s) => s.setCurrentTimeHours)
  const triggerReplayReload = useHelioStore((s) => s.triggerReplayReload)

  const [speedPopoverOpen, setSpeedPopoverOpen] = useState(false)
  const [shortcutTooltipOpen, setShortcutTooltipOpen] = useState(false)

  const { playing, speed, currentTimeHours, durationHours } = playback

  const togglePlay = useCallback(() => {
    setPlaying(!playing)
  }, [playing, setPlaying])

  // Keyboard shortcut listener: Space to toggle play/pause, Left/Right arrow to scrub 1 hour
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLInputElement && target.type !== 'range') ||
        target?.isContentEditable
      ) {
        return
      }

      if (e.code === 'Space') {
        if (target instanceof HTMLButtonElement && !target.closest('[aria-label="Simulation timeline controls"]')) {
          return
        }
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setCurrentTimeHours(Math.max(0, currentTimeHours - 1))
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setCurrentTimeHours(Math.min(durationHours, currentTimeHours + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, currentTimeHours, durationHours, setCurrentTimeHours])

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `T+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}h`
  }

  // Derive Watch, Confirmed, and Resolved event markers directly from replay rows via ConfirmationStateMachine
  const eventMarkers = useMemo<TimelineEventMarker[]>(() => {
    if (!replay || replay.rows.length === 0) return []
    const fsm = new ConfirmationStateMachine({
      hazardType: 'geomagnetic',
      costLossThreshold: COST_LOSS_RATIO.value,
      windowHours: replay.rows[0].forecast.leadH || 12,
    })
    for (const row of replay.rows) {
      fsm.step(row.forecast.pGeo, {
        timeHours: row.t,
        xray: row.obs.xray,
        p10: row.obs.p10,
        kp: row.obs.kp,
        dst: row.obs.dst,
        vsw: row.obs.vsw,
        bz: row.obs.bz,
      })
    }
    return fsm.history
      .filter((tr): tr is typeof tr & { to: 'WATCH' | 'CONFIRMED' | 'RESOLVED' } =>
        tr.to === 'WATCH' || tr.to === 'CONFIRMED' || tr.to === 'RESOLVED',
      )
      .map((tr) => ({
        status: tr.to,
        timeHours: tr.timeHours,
        reason: tr.reason,
      }))
  }, [replay])

  const getMarkerStyle = (status: TimelineEventMarker['status']) => {
    switch (status) {
      case 'WATCH':
        return { label: 'Watch', shape: '○', color: TOKENS.color.amber }
      case 'CONFIRMED':
        return { label: 'Confirmed', shape: '▲', color: TOKENS.color.redOrange }
      case 'RESOLVED':
        return { label: 'Resolved', shape: '✓', color: TOKENS.color.moss }
    }
  }

  // 1. Phone View: One row — play button, scrubber, T+ time, speed button
  if (breakpoint === 'phone') {
    let bottomOffset = 'calc(72px + 8px)'
    if (sheetSnap === 'half') bottomOffset = 'calc(45vh + 8px)'
    if (sheetSnap === 'hidden') bottomOffset = '16px'

    return (
      <ErrorBoundary label="Timeline Scrubber">
        <section
          aria-label="Simulation timeline controls"
          style={{
            position: 'absolute',
            bottom: bottomOffset,
            left: '16px',
            right: '16px',
            minHeight: '56px',
            background: TOKENS.panel.background,
            border: TOKENS.panel.border,
            borderRadius: TOKENS.panel.borderRadius,
            padding: '4px 8px',
            color: TOKENS.color.text,
            fontFamily: TOKENS.font.sans,
            lineHeight: 1.4,
            zIndex: 32,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxSizing: 'border-box',
            transition: reducedMotion
              ? 'none'
              : sheetSnap === 'half'
                ? `bottom ${TOKENS.transition.slow}`
                : `bottom ${TOKENS.transition.slowExit}`,
            ...style,
          }}
        >
          {/* Play / Pause primary button (min 44x44px touch target) */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause simulation' : 'Play simulation'}
            title="Space to toggle, left/right to scrub"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: TOKENS.color.text,
              color: TOKENS.color.background,
              border: 'none',
              borderRadius: '6px',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
          </button>

          {/* Scrubber slider */}
          <input
            type="range"
            min="0"
            max={durationHours}
            step="0.05"
            value={currentTimeHours}
            onChange={(e) => setCurrentTimeHours(parseFloat(e.target.value))}
            aria-label="Simulation time scrubber"
            title="Space to toggle, left/right to scrub"
            style={{
              flex: 1,
              accentColor: TOKENS.color.text,
              cursor: 'pointer',
              height: '44px',
              minWidth: '60px',
            }}
          />

          {/* T+ Time display */}
          <span
            className="tabular"
            style={{
              fontFamily: TOKENS.font.mono,
              fontSize: '14px',
              fontWeight: 500,
              color: TOKENS.color.text,
              flexShrink: 0,
            }}
          >
            {formatHours(currentTimeHours)}
          </span>

          {/* Speed button with popover (min 44x44px touch target) */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setSpeedPopoverOpen(!speedPopoverOpen)}
              aria-label={`Playback speed: currently ${speed}x`}
              aria-expanded={speedPopoverOpen}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                color: TOKENS.color.text,
                border: `1px solid ${TOKENS.color.hairline}`,
                borderRadius: '6px',
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {speed}x
            </button>

            {/* Speed selection popover */}
            {speedPopoverOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  bottom: '52px',
                  right: 0,
                  background: TOKENS.panel.background,
                  border: TOKENS.panel.border,
                  borderRadius: TOKENS.panel.borderRadius,
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 40,
                }}
              >
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSpeed(s)
                      setSpeedPopoverOpen(false)
                    }}
                    style={{
                      minWidth: '64px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: speed === s ? TOKENS.color.text : 'transparent',
                      color: speed === s ? TOKENS.color.background : TOKENS.color.text,
                      border: 'none',
                      borderRadius: '4px',
                      fontFamily: TOKENS.font.sans,
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </ErrorBoundary>
    )
  }

  // 2. Tablet & Desktop View
  const isTablet = breakpoint === 'tablet'
  const safeDuration = durationHours || 24

  return (
    <ErrorBoundary label="Timeline Scrubber">
      <section
        aria-label="Simulation timeline controls"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: isTablet ? '24px' : '50%',
          transform: isTablet ? 'none' : 'translateX(-50%)',
          width: isTablet ? 'calc(100% - 48px - 320px - 24px)' : 'min(720px, calc(100% - 48px))',
          maxWidth: '720px',
          background: TOKENS.panel.background,
          border: TOKENS.panel.border,
          borderRadius: TOKENS.panel.borderRadius,
          padding: '16px 20px',
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 25,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          ...style,
        }}
      >
        {/* Top Info Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            {replayStatus === 'loading' && !replay ? (
              <Skeleton lines={1} height={18} widths={['240px']} label="Loading replay title" />
            ) : replayStatus === 'error' ? (
              <span style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', color: TOKENS.color.redOrange, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Replay file failed to load
                <button
                  type="button"
                  onClick={triggerReplayReload}
                  style={{
                    background: 'transparent',
                    border: TOKENS.border.hairline,
                    borderRadius: '4px',
                    color: TOKENS.color.text,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '12px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </span>
            ) : (
              <>
                <h2
                  style={{
                    fontFamily: TOKENS.font.heading,
                    fontSize: presentationMode ? '20px' : '16px',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    margin: 0,
                    color: TOKENS.color.text,
                  }}
                >
                  {replay?.name ?? 'Feb 2022 storm (illustrative replay)'}
                </h2>
                {!presentationMode && (replay?.label === 'Illustrative' || !replay) && (
                  <span
                    style={{
                      fontFamily: TOKENS.font.sans,
                      fontSize: '12px',
                      lineHeight: 1.4,
                      color: TOKENS.color.muted,
                      fontWeight: 400,
                    }}
                  >
                    Illustrative data
                  </span>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
            <span
              className="tabular"
              style={{
                fontFamily: TOKENS.font.sans,
                fontVariantNumeric: 'tabular-nums',
                fontSize: presentationMode ? '26px' : '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
              }}
            >
              {formatHours(currentTimeHours)}
            </span>
            <span
              className="tabular"
              style={{
                fontFamily: TOKENS.font.sans,
                fontVariantNumeric: 'tabular-nums',
                fontSize: presentationMode ? '18px' : '14px',
                fontWeight: 400,
                lineHeight: 1.4,
                color: TOKENS.color.muted,
              }}
            >
              / {formatHours(durationHours)}
            </span>
          </div>
        </div>

        {/* Event Markers & Range Slider Scrubber */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {eventMarkers.length > 0 && (
            <div
              aria-label="Space weather event markers"
              style={{
                position: 'relative',
                width: '100%',
                height: '18px',
              }}
            >
              {eventMarkers.map((marker) => {
                const leftPct = Math.min(98, Math.max(2, (marker.timeHours / safeDuration) * 100))
                const meta = getMarkerStyle(marker.status)
                const tooltip = `${meta.label} · ${formatHours(marker.timeHours)} — ${marker.reason}`
                return (
                  <button
                    key={`${marker.status}-${marker.timeHours}`}
                    type="button"
                    onClick={() => setCurrentTimeHours(marker.timeHours)}
                    title={tooltip}
                    aria-label={tooltip}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      lineHeight: 1,
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: '12px', color: meta.color }}>{meta.shape}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '1px',
                        height: '5px',
                        background: meta.color,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          )}

          <input
            type="range"
            min="0"
            max={durationHours}
            step="0.05"
            value={currentTimeHours}
            onChange={(e) => setCurrentTimeHours(parseFloat(e.target.value))}
            aria-label="Simulation time scrubber"
            title="Space to toggle, left/right to scrub"
            style={{
              width: '100%',
              accentColor: '#E8E6E1',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>

        {/* Playback Controls & Speed Segmented Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Play primary button + ? popover */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause simulation' : 'Play simulation'}
              title="Space to toggle, left/right to scrub"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#E8E6E1',
                color: '#0E0F12',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: 1.4,
                cursor: 'pointer',
                transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8E6E1')}
            >
              <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>

            {!presentationMode && (
              <>
                <button
                  type="button"
                  onClick={() => setShortcutTooltipOpen((prev) => !prev)}
                  aria-expanded={shortcutTooltipOpen}
                  aria-label="Keyboard shortcuts: Space to toggle, left/right to scrub"
                  title="Space to toggle, left/right to scrub"
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    background: 'rgba(14, 15, 18, 0.78)',
                    border: '1px solid rgba(42, 45, 52, 0.6)',
                    borderRadius: '6px',
                    color: TOKENS.color.muted,
                    fontFamily: TOKENS.font.sans,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1), color 120ms',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                    el.style.color = '#E8E6E1'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.backgroundColor = 'rgba(14, 15, 18, 0.78)'
                    el.style.color = TOKENS.color.muted
                  }}
                >
                  ?
                </button>

                {shortcutTooltipOpen && (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      bottom: '44px',
                      left: 0,
                      background: 'rgba(14, 15, 18, 0.95)',
                      border: '1px solid rgba(42, 45, 52, 0.6)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontFamily: TOKENS.font.sans,
                      fontSize: '13px',
                      lineHeight: 1.4,
                      color: TOKENS.color.text,
                      whiteSpace: 'nowrap',
                      zIndex: 40,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    Space to toggle, left/right to scrub
                  </div>
                )}
              </>
            )}
          </div>

          {/* Speed Segmented Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '13px',
                color: TOKENS.color.muted,
              }}
            >
              Speed
            </span>
            <div
              role="group"
              aria-label="Playback speed"
              style={{
                display: 'inline-flex',
                background: 'rgba(14, 15, 18, 0.78)',
                border: '1px solid rgba(42, 45, 52, 0.6)',
                borderRadius: '8px',
                padding: '2px',
                gap: '2px',
              }}
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-label={`Set speed to ${s}x`}
                  aria-pressed={speed === s}
                  style={{
                    background: speed === s ? '#E8E6E1' : 'transparent',
                    color: speed === s ? '#0E0F12' : TOKENS.color.muted,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontFamily: TOKENS.font.sans,
                    fontSize: '13px',
                    fontWeight: speed === s ? 600 : 400,
                    lineHeight: 1.4,
                    cursor: 'pointer',
                    transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1), color 120ms',
                  }}
                  onMouseEnter={(e) => {
                    if (speed !== s) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                      el.style.color = '#E8E6E1'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (speed !== s) {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.backgroundColor = 'transparent'
                      el.style.color = TOKENS.color.muted
                    }
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </ErrorBoundary>
  )
}
