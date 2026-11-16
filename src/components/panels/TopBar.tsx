import React, { useState, useRef } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { TOKENS } from '../../tokens'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export interface TopBarProps {
  ariaLabel: string
  title: string
  onBack: () => void
  backAriaLabel: string
  switchLabel: string
  switchAriaLabel: string
  onSwitchScene: () => void
  controlsHint: string
}

/**
 * Shared 48px top navigation bar for Orbit and Moon surface scenes.
 * Phone (<768px): scene title + menu button only.
 * Tablet / Desktop: left back + scene title; right scene switcher, "?" controls popover, and menu.
 */
export function TopBar({
  ariaLabel,
  title,
  onBack,
  backAriaLabel,
  switchLabel,
  switchAriaLabel,
  onSwitchScene,
  controlsHint,
}: TopBarProps): React.ReactElement {
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'

  const setScene = useHelioStore((s) => s.setScene)
  const setValidationOpen = useHelioStore((s) => s.setValidationOpen)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const togglePresentationMode = useHelioStore((s) => s.togglePresentationMode)
  const tourOpen = useHelioStore((s) => s.tourOpen)
  const startTour = useHelioStore((s) => s.startTour)
  const closeTour = useHelioStore((s) => s.closeTour)
  const shortcutsOpen = useHelioStore((s) => s.shortcutsOpen)
  const toggleShortcutsOpen = useHelioStore((s) => s.toggleShortcutsOpen)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLElement>(null)

  useDialogFocus(
    menuOpen && !presentationMode,
    menuRef,
    () => setMenuOpen(false),
    '[data-testid="topbar-menu-trigger"]'
  )

  const openValidation = () => {
    setValidationOpen(true)
    setMenuOpen(false)
  }

  const openAbout = () => {
    window.history.pushState({}, '', '/about')
    setScene('about')
    setMenuOpen(false)
  }

  const handleToggleTour = () => {
    if (tourOpen) {
      closeTour()
    } else {
      startTour(0)
    }
    setMenuOpen(false)
  }

  const handleTogglePresentation = () => {
    togglePresentationMode()
    setMenuOpen(false)
  }

  const btnMinHeight = isPhone ? '44px' : '32px'

  return (
    <>
      <header
        role="banner"
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isPhone ? '0 16px' : '0 24px',
          background: TOKENS.panel.background,
          borderBottom: TOKENS.panel.border,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          zIndex: 35,
        }}
      >
        {/* Left: Back button (tablet/desktop) + scene title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isPhone && (
            <>
              <button
                type="button"
                onClick={onBack}
                aria-label={backAriaLabel}
                style={{
                  minHeight: '44px',
                  background: 'transparent',
                  border: 'none',
                  color: TOKENS.color.muted,
                  cursor: 'pointer',
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '0 4px',
                  transition: `color ${TOKENS.transition.fast}`,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.text)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = TOKENS.color.muted)}
              >
                ← Home
              </button>

              <div style={{ width: '1px', height: '16px', background: TOKENS.color.hairline }} />
            </>
          )}

          <span
            style={{
              fontFamily: TOKENS.font.heading,
              fontSize: presentationMode ? '24px' : '20px',
              fontWeight: 700,
              lineHeight: 1.1,
              color: TOKENS.color.text,
            }}
          >
            {title}
          </span>
        </div>

        {/* Right: Presentation mode bar OR Phone menu / Desktop scene switch + ? shortcuts + Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {presentationMode ? (
            <>
              {!isPhone && (
                <button
                  type="button"
                  onClick={onSwitchScene}
                  aria-label={switchAriaLabel}
                  style={{
                    background: TOKENS.color.text,
                    border: 'none',
                    color: TOKENS.color.background,
                    cursor: 'pointer',
                    fontFamily: TOKENS.font.sans,
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '6px 16px',
                    minHeight: btnMinHeight,
                    borderRadius: '6px',
                    transition: `opacity ${TOKENS.transition.fast}`,
                  }}
                >
                  {switchLabel}
                </button>
              )}
              <button
                type="button"
                onClick={togglePresentationMode}
                aria-label="Exit presentation mode"
                style={{
                  minHeight: btnMinHeight,
                  padding: '0 12px',
                  background: 'transparent',
                  border: TOKENS.border.hairline,
                  borderRadius: '6px',
                  color: TOKENS.color.text,
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: `border-color ${TOKENS.transition.fast}`,
                }}
              >
                Exit presentation (P)
              </button>
            </>
          ) : (
            <>
              {!isPhone && (
                <>
                  <button
                    type="button"
                    onClick={onSwitchScene}
                    aria-label={switchAriaLabel}
                    style={{
                      background: '#E8E6E1',
                      border: 'none',
                      color: '#0E0F12',
                      cursor: 'pointer',
                      fontFamily: TOKENS.font.sans,
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '0 16px',
                      height: '36px',
                      borderRadius: '6px',
                      transition: 'background-color 120ms cubic-bezier(0.25, 1, 0.5, 1), opacity 120ms cubic-bezier(0.25, 1, 0.5, 1)',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8E6E1')}
                  >
                    {switchLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleShortcutsOpen()
                      setMenuOpen(false)
                    }}
                    aria-label="Keyboard shortcuts and controls"
                    aria-expanded={shortcutsOpen}
                    title={`Keyboard shortcuts (?) · ${controlsHint}`}
                    style={{
                      minWidth: '32px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: shortcutsOpen ? TOKENS.color.text : TOKENS.color.muted,
                      fontFamily: TOKENS.font.sans,
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    ?
                  </button>
                </>
              )}

              <button
                type="button"
                data-testid="topbar-menu-trigger"
                onClick={() => {
                  setMenuOpen((v) => !v)
                }}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: TOKENS.color.text,
                  fontFamily: TOKENS.font.sans,
                  fontSize: isPhone ? '20px' : '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {isPhone ? (
                  <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
                ) : (
                  <>
                    <span>Menu</span>
                    <span aria-hidden="true">▾</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Navigation Menu Dropdown (All Sizes) */}
      {menuOpen && !presentationMode && (
        <nav
          ref={menuRef}
          role="dialog"
          aria-modal={true}
          aria-label="Navigation menu"
          style={{
            position: 'absolute',
            top: '56px',
            left: isPhone ? 0 : 'auto',
            right: isPhone ? 0 : '24px',
            minWidth: isPhone ? 'auto' : '200px',
            background: TOKENS.panel.background,
            border: isPhone ? 'none' : TOKENS.panel.border,
            borderBottom: TOKENS.panel.border,
            borderRadius: isPhone ? 0 : TOKENS.panel.borderRadius,
            padding: TOKENS.panel.padding,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 40,
          }}
        >
          {isPhone && (
            <>
              <button
                type="button"
                onClick={() => {
                  onSwitchScene()
                  setMenuOpen(false)
                }}
                aria-label={switchAriaLabel}
                style={{
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  background: TOKENS.color.text,
                  border: 'none',
                  borderRadius: '6px',
                  color: TOKENS.color.background,
                  fontFamily: TOKENS.font.sans,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {switchLabel}
              </button>

              <button
                type="button"
                onClick={() => {
                  onBack()
                  setMenuOpen(false)
                }}
                aria-label={backAriaLabel}
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
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ← Home
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleToggleTour}
            aria-label={tourOpen ? 'Stop guided tour' : 'Start guided tour'}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '0 4px',
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
            <span>{tourOpen ? 'Stop guided tour' : 'Guided tour'}</span>
            <span aria-hidden="true" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', color: TOKENS.color.muted }}>T</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePresentation}
            aria-label="Toggle presentation mode"
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '0 4px',
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
            <span>Presentation mode</span>
            <span aria-hidden="true" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', color: TOKENS.color.muted }}>P</span>
          </button>

          <button
            type="button"
            onClick={openValidation}
            aria-label="Compare with documented values"
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
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Validation
          </button>

          <button
            type="button"
            onClick={openAbout}
            aria-label="Open about and credits"
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
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            About
          </button>

          <button
            type="button"
            onClick={() => {
              toggleShortcutsOpen()
              setMenuOpen(false)
            }}
            aria-label="Keyboard shortcuts"
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '0 4px',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.muted,
              fontFamily: TOKENS.font.sans,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>Keyboard shortcuts</span>
            <span aria-hidden="true" style={{ fontFamily: TOKENS.font.mono, fontSize: '14px', color: TOKENS.color.muted }}>?</span>
          </button>
        </nav>
      )}
    </>
  )
}
