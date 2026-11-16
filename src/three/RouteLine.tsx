import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useHelioStore } from '../store/helioStore'
import type { TerrainGrid } from '../engines/terrain'
import { TOKENS } from '../tokens'

interface RouteLineProps {
  grid: TerrainGrid
}

export function RouteLine({ grid }: RouteLineProps): React.ReactElement {
  const activeRoute = useHelioStore((s) => s.surface.activeRoute)

  const { outlinePoints, foregroundPoints } = useMemo(() => {
    if (!activeRoute || activeRoute.length < 2) {
      return { outlinePoints: [], foregroundPoints: [] }
    }

    const outline: [number, number, number][] = []
    const foreground: [number, number, number][] = []
    for (const [gx, gy] of activeRoute) {
      const wx = (gx / 128) * 100 - 50
      const wz = (gy / 128) * 100 - 50
      const idx = Math.min(Math.max(0, gy * 128 + gx), grid.elevations.length - 1)
      const terrainY = grid.elevations[idx] * 0.025
      outline.push([wx, terrainY + 0.28, wz])
      foreground.push([wx, terrainY + 0.32, wz])
    }
    return { outlinePoints: outline, foregroundPoints: foreground }
  }, [activeRoute, grid])

  if (foregroundPoints.length < 2) {
    return <group />
  }

  return (
    <group>
      {/* Dark outline under the ivory route */}
      <Line
        points={outlinePoints}
        color={TOKENS.color.background}
        lineWidth={5}
        polygonOffset={true}
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        renderOrder={1}
      />

      {/* Ivory 3px thick route line slightly above the terrain */}
      <Line
        points={foregroundPoints}
        color={TOKENS.color.text}
        lineWidth={3}
        polygonOffset={true}
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        renderOrder={2}
      />
    </group>
  )
}
