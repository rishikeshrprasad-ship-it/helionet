import React, { useState, useRef } from 'react'
import { useHelioStore } from '../store/helioStore'
import { TOKENS } from '../tokens'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useDialogFocus } from '../hooks/useDialogFocus'

/**
 * Landing hero page overlay.
 * Renders directly over the 3D Sun, Earth, Moon canvas at the bottom-left
 * so Earth stays unobstructed in the center. Respects prefers-reduced-motion.
 */
export function Landing(): React.ReactElement {
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'
  const reducedMotion = useReducedMotion()
  const setScene = useHelioStore((s) => s.setScene)
  const setValidationOpen = useHelioStore((s) => s.setValidationOpen)
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLElement>(null)

  useDialogFocus(
    isPhone && menuOpen,
    mobileMenuRef,
    () => setMenuOpen(false),
    '[data-testid="landing-menu-trigger"]'
  )

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 10,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: isPhone ? '64px 16px 68px 16px' : '48px 64px 72px 64px',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* Phone Header Bar with Menu Button */}
      {isPhone && (
        <header
          role="banner"
          aria-label="Navigation Header"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            background: TOKENS.panel.background,
            borderBottom: TOKENS.panel.border,
            zIndex: 40,
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              fontFamily: TOKENS.font.heading,
              fontSize: '16px',
              fontWeight: 700,
              color: TOKENS.color.text,
            }}
          >
            HelioNet
          </span>

          <button
            type="button"
            data-testid="landing-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.text,
              fontSize: '20px',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </header>
      )}

      {/* Mobile Navigation Dropdown */}
      {isPhone && menuOpen && (
        <nav
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          style={{
            position: 'fixed',
            top: '48px',
            left: 0,
            right: 0,
            background: TOKENS.panel.background,
            borderBottom: TOKENS.panel.border,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 39,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setScene('orbit')
              setMenuOpen(false)
            }}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              background: TOKENS.color.text,
              color: TOKENS.color.background,
              border: 'none',
              borderRadius: '6px',
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
          >
            Run the simulation
          </button>

          <button
            type="button"
            onClick={() => {
              setValidationOpen(true)
              setMenuOpen(false)
            }}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 4px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.text,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Validation
          </button>

          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/about')
              setScene('about')
              setMenuOpen(false)
            }}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 4px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.muted,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            About
          </button>
        </nav>
      )}

      {/* Hero Content directly over the 3D scene at the bottom-left (no card box) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
          gap: isPhone ? '16px' : '24px',
          maxWidth: isPhone ? '100%' : '580px',
          width: '100%',
          pointerEvents: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            fontFamily: TOKENS.font.heading,
            fontSize: isPhone ? '36px' : 'clamp(48px, 4.5vw, 64px)',
            fontWeight: 700,
            color: TOKENS.color.text,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
            textAlign: 'left',
          }}
        >
          Watch a solar storm cross the Earth-Moon system.
        </h1>

        <p
          style={{
            fontFamily: TOKENS.font.sans,
            fontSize: '16px',
            fontWeight: 400,
            color: TOKENS.color.text,
            maxWidth: '500px',
            lineHeight: 1.4,
            margin: 0,
            textAlign: 'left',
          }}
        >
          See what a storm does to a satellite network, then follow a rover as it races to shelter on the Moon.
        </p>

        <button
          type="button"
          aria-label="Run the simulation"
          onClick={() => setScene('orbit')}
          style={{
            minHeight: '44px',
            padding: '12px 24px',
            background: TOKENS.color.text,
            color: TOKENS.color.background,
            border: 'none',
            borderRadius: '6px',
            fontFamily: TOKENS.font.sans,
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.4,
            cursor: 'pointer',
            transition: reducedMotion ? 'none' : `opacity ${TOKENS.transition.fast}`,
          }}
          onMouseEnter={(e) => {
            if (!reducedMotion) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
          }}
          onMouseLeave={(e) => {
            if (!reducedMotion) (e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          Run the simulation
        </button>
      </div>

      {/* Plain text footer row (no pill container) */}
      <footer
        role="contentinfo"
        aria-label="Project source and reference links"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: isPhone ? '16px' : '64px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontFamily: TOKENS.font.sans,
          fontSize: '14px',
          lineHeight: 1.4,
          color: TOKENS.color.muted,
          pointerEvents: 'auto',
          maxWidth: 'calc(100% - 32px)',
          boxSizing: 'border-box',
        }}
      >
        <span>Data: NOAA SWPC, NASA</span>
        <button
          type="button"
          onClick={() => setValidationOpen(true)}
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
            padding: 0,
            minHeight: isPhone ? '44px' : '32px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Validation
        </button>
        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, '', '/about')
            setScene('about')
          }}
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
            padding: 0,
            minHeight: isPhone ? '44px' : '32px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          About
        </button>
      </footer>
    </main>
  )
}
