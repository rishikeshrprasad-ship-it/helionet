import { useState, useEffect } from 'react'

/**
 * Returns true when the user has requested reduced motion via the OS
 * or browser accessibility settings.
 *
 * Rule 8: all animations must respect prefers-reduced-motion.
 */
export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'

  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
