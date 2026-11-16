import React, { useRef } from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { TOKENS } from '../../tokens'

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: 'Space', description: 'Play or pause simulation' },
  { keys: '← / →', description: 'Step timeline backward or forward 1 hour' },
  { keys: 'T', description: 'Start or close guided tour' },
  { keys: 'P', description: 'Toggle presentation mode' },
  { keys: '?', description: 'Open or close keyboard shortcuts' },
  { keys: 'Esc', description: 'Close open dialog, tour, or presentation mode' },
]

/**
 * Keyboard shortcuts & camera controls modal triggered by "?" or TopBar help button.
 */
export function ShortcutsModal(): React.ReactElement | null {
  const isOpen = useHelioStore((s) => s.shortcutsOpen)
  const setOpen = useHelioStore((s) => s.setShortcutsOpen)
  const scene = useHelioStore((s) => s.scene)
  const breakpoint = useBreakpoint()
  const isPhone = breakpoint === 'phone'
  const dialogRef = useRef<HTMLDivElement>(null)

  useDialogFocus(isOpen, dialogRef, () => setOpen(false))

  if (!isOpen) return null

  const cameraControls =
    scene === 'surface'
      ? 'Pan: Left drag · Zoom: Scroll · Orbit: Right drag'
      : 'Rotate: Left drag · Zoom: Scroll · Pan: Right drag'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts and controls"
      data-testid="shortcuts-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(14, 15, 18, 0.72)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: TOKENS.color.surface,
          border: TOKENS.panel.border,
          borderRadius: TOKENS.panel.borderRadius,
          padding: isPhone ? '16px' : '24px',
          color: TOKENS.color.text,
          fontFamily: TOKENS.font.sans,
          lineHeight: 1.4,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: TOKENS.font.heading,
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1.1,
              color: TOKENS.color.text,
            }}
          >
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close keyboard shortcuts"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: TOKENS.color.muted,
              fontSize: '16px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${TOKENS.color.hairline}`, paddingTop: '12px' }}>
          {SHORTCUTS.map((item) => (
            <div
              key={item.keys}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                fontSize: '14px',
              }}
            >
              <span style={{ color: TOKENS.color.muted }}>{item.description}</span>
              <kbd
                style={{
                  fontFamily: TOKENS.font.mono,
                  fontSize: '14px',
                  color: TOKENS.color.text,
                  background: TOKENS.color.background,
                  border: TOKENS.border.hairline,
                  borderRadius: '4px',
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: `1px solid ${TOKENS.color.hairline}`,
            paddingTop: '12px',
            fontSize: '14px',
            color: TOKENS.color.muted,
          }}
        >
          Camera: {cameraControls}
        </div>
      </div>
    </div>
  )
}
