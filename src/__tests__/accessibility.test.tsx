// @vitest-environment jsdom
import { act, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertLiveRegion } from '../components/AlertLiveRegion'
import { ShortcutsModal } from '../components/panels/ShortcutsModal'
import { DoseMeter } from '../components/panels/DoseMeter'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useHelioStore } from '../store/helioStore'
import { TOKENS } from '../tokens'
import { contrastRatio, parseHex } from '../utils/wcag'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function compositeRgbOverWhite(rgba: string): [number, number, number] {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) {
    return parseHex(TOKENS.color.background)
  }
  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])
  const a = match[4] !== undefined ? Number(match[4]) : 1
  return [
    Math.round(r * a + 255 * (1 - a)),
    Math.round(g * a + 255 * (1 - a)),
    Math.round(b * a + 255 * (1 - a)),
  ]
}

function DialogHarness() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(open, dialogRef, () => setOpen(false), '[data-testid="opener-btn"]')

  return (
    <div>
      <button
        type="button"
        data-testid="opener-btn"
        onClick={() => setOpen(true)}
      >
        Open dialog
      </button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Test dialog">
          <button type="button" data-testid="first-btn">
            First
          </button>
          <button type="button" data-testid="second-btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}

describe('Accessibility guarantees', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useHelioStore.setState((s) => ({
      scene: 'orbit',
      shortcutsOpen: false,
      openSecondaryPanel: null,
      alert: {
        ...s.alert,
        status: 'IDLE',
        probability: 0.1,
        leadTime: 4,
        userChoice: null,
        ruleFired: '',
        evidence: '',
        recommendedAction: '',
        impact: '',
      },
    }))
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('announces alert status changes via aria-live assertive region', () => {
    act(() => {
      root.render(<AlertLiveRegion />)
    })

    const region = container.querySelector('[data-testid="alert-live-region"]')
    expect(region).not.toBeNull()
    expect(region?.getAttribute('aria-live')).toBe('assertive')
    expect(region?.textContent).toBe('')

    act(() => {
      useHelioStore.setState((s) => ({
        alert: { ...s.alert, status: 'WATCH' },
      }))
    })
    expect(region?.textContent).toBe('Alert is now Watch')

    act(() => {
      useHelioStore.setState((s) => ({
        alert: { ...s.alert, status: 'CONFIRMED' },
      }))
    })
    expect(region?.textContent).toBe('Alert is now Confirmed')

    act(() => {
      useHelioStore.setState((s) => ({
        alert: { ...s.alert, status: 'RESOLVED' },
      }))
    })
    expect(region?.textContent).toBe('Alert is now Resolved')
  })

  it('traps Tab focus inside a dialog, closes on Escape, and restores focus to opener', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })

    try {
      act(() => {
        root.render(<DialogHarness />)
      })

      const opener = container.querySelector<HTMLButtonElement>('[data-testid="opener-btn"]')
      expect(opener).not.toBeNull()

      act(() => {
        opener?.focus()
        opener?.click()
      })

      const first = container.querySelector<HTMLButtonElement>('[data-testid="first-btn"]')
      const second = container.querySelector<HTMLButtonElement>('[data-testid="second-btn"]')
      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      expect(document.activeElement).toBe(first)

      // Shift+Tab from first element wraps to last element
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
        )
      })
      expect(document.activeElement).toBe(second)

      // Tab from last element wraps back to first element
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
        )
      })
      expect(document.activeElement).toBe(first)

      // Escape closes dialog and restores focus to opener button
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
        )
      })
      expect(container.querySelector('[role="dialog"]')).toBeNull()
      expect(document.activeElement).toBe(opener)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('closes ShortcutsModal on Escape and sets dialog semantics', () => {
    act(() => {
      useHelioStore.setState({ shortcutsOpen: true })
      root.render(<ShortcutsModal />)
    })

    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
    })
    expect(useHelioStore.getState().shortcutsOpen).toBe(false)
  })

  it('includes shape + word in Crew dose status indicator', () => {
    act(() => {
      useHelioStore.setState((s) => ({
        surface: { ...s.surface, isSheltered: true },
      }))
      root.render(<DoseMeter containerMode />)
    })
    expect(container.textContent).toContain('✓ Sheltered')

    act(() => {
      useHelioStore.setState((s) => ({
        surface: { ...s.surface, isSheltered: false },
      }))
    })
    expect(container.textContent).toContain('→ Racing')
  })

  it('maintains >= 4.5:1 contrast for all status and UI text colors on translucent panel background even over white', () => {
    const worstCasePanelBg = compositeRgbOverWhite(TOKENS.panel.background)
    const textColors = [
      TOKENS.color.text,
      TOKENS.color.muted,
      TOKENS.color.amber,
      TOKENS.color.redOrange,
      TOKENS.color.slateBlue,
      TOKENS.color.moss,
    ]
    for (const hex of textColors) {
      expect(contrastRatio(parseHex(hex), worstCasePanelBg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
