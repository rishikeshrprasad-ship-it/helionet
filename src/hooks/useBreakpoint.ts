import { useState, useEffect } from 'react'

export type Breakpoint = 'phone' | 'tablet' | 'desktop'

export function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'phone'
  if (width < 1200) return 'tablet'
  return 'desktop'
}

/**
 * Shared responsive breakpoint hook per specification:
 * - "phone": below 768px
 * - "tablet": 768px to 1199px
 * - "desktop": 1200px and up
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop',
  )

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}
