import React from 'react'
import { TOKENS } from '../tokens'
import { useHelioStore } from '../store/helioStore'
import { AlertCard } from './panels/AlertCard'
import { Forecast } from './panels/Forecast'
import { SatelliteHealth } from './panels/SatelliteHealth'
import { DoseMeter } from './panels/DoseMeter'
import { Timeline } from './panels/Timeline'
import { AgentDrawer } from './panels/AgentDrawer'
import { ValidationModal } from './panels/ValidationModal'
import { useBreakpoint } from '../hooks/useBreakpoint'

/**
 * 2D Plain-HTML Telemetry View Fallback.
 * Rendered when WebGL is unavailable or forced with ?nowebgl=1.
 * Runs the same replay, simulation worker, and autonomous agent loop.
 */
export function NoWebGL(): React.ReactElement {
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'
  const setValidationOpen = useHelioStore((s) => s.setValidationOpen)
  const setScene = useHelioStore((s) => s.setScene)

  return (
    <div
      role="main"
      style={{
        width: '100%',
        minHeight: '100dvh',
        backgroundColor: TOKENS.color.background,
        color: TOKENS.color.text,
        fontFamily: TOKENS.font.sans,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        paddingBottom: isPhone ? '100px' : '90px',
      }}
    >
      {/* Top 2D Fallback Notification Bar */}
      <header
        style={{
          padding: isPhone ? '8px 16px' : '16px 24px',
          background: TOKENS.panel.background,
          borderBottom: TOKENS.panel.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: TOKENS.font.heading,
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.1,
              color: TOKENS.color.text,
              margin: 0,
            }}
          >
            HelioNet telemetry view
          </h1>
          <span
            style={{
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              lineHeight: 1.4,
              color: TOKENS.color.slateBlue,
              fontWeight: 500,
            }}
          >
            2D fallback
          </span>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setValidationOpen(true)}
            aria-label="Compare with documented values"
            style={{
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.text,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Validation
          </button>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/about')
              setScene('about')
            }}
            aria-label="View about page"
            style={{
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.muted,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            About
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      <div
        style={{
          padding: '8px 24px',
          background: TOKENS.color.surface,
          borderBottom: `1px solid ${TOKENS.color.hairline}`,
          fontFamily: TOKENS.font.sans,
          fontSize: '14px',
          lineHeight: 1.4,
          color: TOKENS.color.slateBlue,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span aria-hidden="true">⚡</span>
        <span>
          WebGL 3D canvas unavailable or disabled (?nowebgl=1). Running simulation engine and decision loop in 2D telemetry mode.
        </span>
      </div>

      {/* Main Telemetry Grid */}
      <div
        style={{
          padding: '16px 24px',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: isPhone ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Panel 1: Alert Card */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AlertCard containerMode />
        </div>

        {/* Panel 2: Forecast Gauges */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Forecast containerMode />
        </div>

        {/* Panel 3: Constellation Satellites Health */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SatelliteHealth containerMode />
        </div>

        {/* Panel 4: Radiation Dose Meter */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <DoseMeter containerMode />
        </div>
      </div>

      {/* Floating Agent Drawer and Scrubber */}
      <AgentDrawer />

      {/* Timeline Controls (fixed at bottom) */}
      <Timeline />

      {/* Validation Modal */}
      <ValidationModal />
    </div>
  )
}

let cachedWebGLAvailable: boolean | null = null

/**
 * Returns true if WebGL 2 is available and not disabled by query parameter.
 * Forced fallback when ?nowebgl=1 is in URL.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('nowebgl') === '1') {
      return false
    }
  }

  if (cachedWebGLAvailable !== null) {
    return cachedWebGLAvailable
  }
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    cachedWebGLAvailable = gl !== null
    const loseContext = gl?.getExtension('WEBGL_lose_context')
    loseContext?.loseContext()
    return cachedWebGLAvailable
  } catch {
    cachedWebGLAvailable = false
    return false
  }
}
