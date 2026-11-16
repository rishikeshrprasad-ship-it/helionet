import React from 'react'
import { useHelioStore } from '../store/helioStore'
import { TOKENS } from '../tokens'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useBreakpoint } from '../hooks/useBreakpoint'

interface CreditEntry {
  name: string
  licence: string
  usage: string
}

const IN_USE_CREDITS: CreditEntry[] = [
  {
    name: 'NOAA SWPC',
    licence: 'Public domain',
    usage: 'Operational R-scale, S-scale, and G-scale space weather thresholds and event schemas.',
  },
  {
    name: 'NASA / GSFC / SVS (Sun, Earth with Clouds, Moon)',
    licence: 'Public domain (NASA policy)',
    usage: '3D Sun, Earth, and Lunar Reconnaissance Orbiter Moon GLB models in the orbit scene.',
  },
  {
    name: 'NASA 3D Resources (Satellite Kit & Curiosity Rover)',
    licence: 'Public domain',
    usage: 'Instanced satellite bus/wings/radio models and generic Curiosity rover model in the lunar surface scene.',
  },
]

const PLANNED_CREDITS: CreditEntry[] = [
  {
    name: 'NASA Earth Observatory',
    licence: 'Public domain',
    usage: 'Standalone Earth relief/Blue Marble map (earth_relief.jpg not currently present; GLB textures and procedural fallback in use).',
  },
  {
    name: 'NASA PGDA LOLA',
    licence: 'Public domain',
    usage: 'Lunar south pole DEM elevation binary terrain.bin (not yet added; procedural terrain in use).',
  },
  {
    name: 'Solar System Scope',
    licence: 'CC BY 4.0',
    usage: 'Additional planetary texture maps (not yet added).',
  },
]

/**
 * /about page component documenting credits and engineering notes.
 */
export function About(): React.ReactElement {
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'
  const setScene = useHelioStore((s) => s.setScene)

  const handleBack = () => {
    if (window.location.pathname === '/about') {
      window.history.pushState({}, '', '/')
    }
    setScene('orbit')
  }

  const renderCreditRow = (credit: CreditEntry): React.ReactElement => (
    <div
      key={credit.name}
      style={{
        borderTop: `1px solid ${TOKENS.color.hairline}`,
        padding: '12px 0',
        display: 'grid',
        gridTemplateColumns: isPhone ? '1fr' : 'minmax(160px, 1.2fr) minmax(120px, 1fr) minmax(220px, 2fr)',
        gap: '4px 16px',
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.text }}>
        {credit.name}
      </span>
      <span style={{ fontFamily: TOKENS.font.sans, fontWeight: 400, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.muted }}>
        {credit.licence}
      </span>
      <span style={{ fontFamily: TOKENS.font.sans, fontWeight: 400, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.muted }}>
        {credit.usage}
      </span>
    </div>
  )

  return (
    <ErrorBoundary label="About Page">
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100dvh',
          backgroundColor: TOKENS.color.background,
          color: TOKENS.color.text,
          overflowY: 'auto',
          padding: '40px 24px 80px',
          boxSizing: 'border-box',
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Top Navigation: underlined back link only */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: `1px solid ${TOKENS.color.hairline}`,
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              aria-label="Return to orbit simulation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.text,
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.4,
                textDecoration: 'underline',
                padding: '8px 0',
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              ← Back to simulation
            </button>
          </div>

          {/* Header & Intro */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: '28px',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: 0,
                color: TOKENS.color.text,
              }}
            >
              About HelioNet
            </h1>
            <p
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '16px',
                fontWeight: 400,
                color: TOKENS.color.text,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              A simulation of how a solar storm affects satellites in orbit and a rover on the Moon.
            </p>
          </header>

          {/* In use credits list */}
          <section aria-labelledby="credits-in-use" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              id="credits-in-use"
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
                margin: 0,
              }}
            >
              In use
            </h2>
            <div>{IN_USE_CREDITS.map(renderCreditRow)}</div>
          </section>

          {/* Planned credits list */}
          <section aria-labelledby="credits-planned" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              id="credits-planned"
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
                margin: 0,
              }}
            >
              Planned
            </h2>
            <p
              style={{
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                lineHeight: 1.4,
                color: TOKENS.color.muted,
                margin: 0,
              }}
            >
              Credited below once their asset files are added to the app. Procedural fallbacks are currently rendered instead.
            </p>
            <div>{PLANNED_CREDITS.map(renderCreditRow)}</div>
          </section>

          {/* Engineering Notes */}
          <section aria-labelledby="invariants-heading" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              id="invariants-heading"
              style={{
                fontFamily: TOKENS.font.heading,
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: TOKENS.color.text,
                margin: 0,
              }}
            >
              Simulation notes
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.text }}>
                  Zero invented data
                </span>
                <p style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.muted, margin: 0 }}>
                  Numbers come from local data files or deterministic math engines. Missing parameters display "No data", and rover runs are labeled "Scenario test".
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: TOKENS.font.sans, fontWeight: 500, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.text }}>
                  Pure TypeScript engines
                </span>
                <p style={{ fontFamily: TOKENS.font.sans, fontSize: '14px', lineHeight: 1.4, color: TOKENS.color.muted, margin: 0 }}>
                  Computational engines run deterministically without external asset downloads.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer
            style={{
              paddingTop: '16px',
              borderTop: `1px solid ${TOKENS.color.hairline}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              lineHeight: 1.4,
              color: TOKENS.color.muted,
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>HelioNet space weather simulation</span>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: TOKENS.color.text,
                cursor: 'pointer',
                fontFamily: TOKENS.font.sans,
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1.4,
                textDecoration: 'underline',
                minHeight: '44px',
                padding: 0,
              }}
            >
              Return to simulation
            </button>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  )
}
