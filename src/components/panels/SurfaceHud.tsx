import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { ErrorBoundary } from '../ErrorBoundary'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TopBar } from './TopBar'

/**
 * Top bar overlay for Lunar Surface scene.
 */
export function SurfaceHud(): React.ReactElement {
  const reducedMotion = useReducedMotion()
  const transitionScene = useHelioStore((s) => s.transitionScene)

  return (
    <ErrorBoundary label="Surface HUD">
      <TopBar
        ariaLabel="Moon surface navigation header"
        title="Moon surface"
        backAriaLabel="Return to landing page"
        onBack={() => transitionScene('landing', reducedMotion)}
        switchLabel="Back to orbit"
        switchAriaLabel="Return to orbit view"
        onSwitchScene={() => transitionScene('orbit', reducedMotion)}
        controlsHint="Pan: Left drag · Zoom: Scroll · Orbit: Right drag"
      />
    </ErrorBoundary>
  )
}
