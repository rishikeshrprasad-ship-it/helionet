import React from 'react'
import { useHelioStore } from '../../store/helioStore'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TopBar } from './TopBar'

/**
 * Top bar overlay for Orbit scene.
 */
export function OrbitHud(): React.ReactElement {
  const reducedMotion = useReducedMotion()
  const transitionScene = useHelioStore((s) => s.transitionScene)

  return (
    <TopBar
      ariaLabel="Orbit navigation header"
      title="Orbit"
      backAriaLabel="Return to landing page"
      onBack={() => transitionScene('landing', reducedMotion)}
      switchLabel="Go to the Moon"
      switchAriaLabel="Go to the Moon surface view"
      onSwitchScene={() => transitionScene('surface', reducedMotion)}
      controlsHint="Rotate: Left drag · Zoom: Scroll · Pan: Right drag"
    />
  )
}
