/**
 * Shared mutable selection/hover state for constellation satellites.
 * Kept out of React state so 60fps Three.js loops read highlights with zero re-renders.
 */
export const satelliteSelection: {
  hoveredId: number | null
  selectedId: number | null
} = {
  hoveredId: null,
  selectedId: null,
}

/** Returns true when a satellite is currently hovered or selected. */
export function isSatelliteHighlighted(id: number): boolean {
  return (
    satelliteSelection.hoveredId === id ||
    satelliteSelection.selectedId === id
  )
}
