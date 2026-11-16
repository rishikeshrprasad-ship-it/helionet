import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/**
 * Traps keyboard Tab focus inside an open modal or drawer, closes on Escape,
 * moves initial focus in, and restores focus to the triggering button on close.
 */
export function useDialogFocus(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose?: () => void,
  fallbackFocusSelector = '[data-testid="topbar-menu-trigger"]',
): void {
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef<boolean>(false)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null

      const raf = requestAnimationFrame(() => {
        const container = containerRef.current
        if (!container) return
        const focusables = getFocusableElements(container)
        if (focusables.length > 0) {
          focusables[0].focus()
        } else {
          if (!container.hasAttribute('tabindex')) {
            container.setAttribute('tabindex', '-1')
          }
          container.focus()
        }
      })

      return () => cancelAnimationFrame(raf)
    }

    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false
      const opener = openerRef.current
      openerRef.current = null

      requestAnimationFrame(() => {
        if (opener && opener.isConnected) {
          opener.focus()
          return
        }
        const fallback = document.querySelector<HTMLElement>(fallbackFocusSelector)
        fallback?.focus()
      })
    }
  }, [isOpen, containerRef, fallbackFocusSelector])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return

      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
        return
      }

      if (e.key === 'Tab') {
        const focusables = getFocusableElements(container)
        if (focusables.length === 0) {
          e.preventDefault()
          container.focus()
          return
        }

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (e.shiftKey) {
          if (!active || !container.contains(active) || active === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (!active || !container.contains(active) || active === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, containerRef])
}
