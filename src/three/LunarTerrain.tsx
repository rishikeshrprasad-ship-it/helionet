import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { generateLunarSouthPoleHeightmap, type TerrainGrid } from '../engines/terrain'
import { computeTerrainSkyViewFactorMap } from '../engines/shielding'
import { TOKENS } from '../tokens'

interface LunarTerrainProps {
  grid?: TerrainGrid
  onHeightmapReady?: (grid: TerrainGrid, svfMap: Float32Array) => void
}

const REGOLITH_BASE = new THREE.Color('#9E998E')
const EXPOSURE_AMBER = new THREE.Color(TOKENS.color.amber)

export function LunarTerrain({ onHeightmapReady }: LunarTerrainProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null)

  // 1. Generate procedural 128x128 lunar south pole terrain
  const { grid, svfMap } = useMemo(() => {
    const g = generateLunarSouthPoleHeightmap(128, 128, 39.0, 42)
    const svf = computeTerrainSkyViewFactorMap(g, 1600.0)
    return { grid: g, svfMap: svf }
  }, [])

  React.useEffect(() => {
    if (onHeightmapReady) {
      onHeightmapReady(grid, svfMap)
    }
  }, [grid, svfMap, onHeightmapReady])

  // 2. Build geometry with mid grey-beige slope shading and subtle amber tint on high-exposure ridges
  const geometry = useMemo(() => {
    const width = 128
    const height = 128
    const geom = new THREE.PlaneGeometry(100, 100, width - 1, height - 1)
    geom.rotateX(-Math.PI / 2)

    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const colors = new Float32Array(width * height * 3)
    const cellColor = new THREE.Color()
    const cellMeters = 100 / 128 / 0.025 // Approximate horizontal step in meters matching elevation scale

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const elevationM = grid.elevations[idx]
        positions[idx * 3 + 1] = elevationM * 0.025

        // Compute finite-difference slope to accentuate crater walls and ridges
        const xPrev = Math.max(0, x - 1)
        const xNext = Math.min(width - 1, x + 1)
        const yPrev = Math.max(0, y - 1)
        const yNext = Math.min(height - 1, y + 1)
        const dzdx = (grid.elevations[y * width + xNext] - grid.elevations[y * width + xPrev]) / (2 * cellMeters)
        const dzdy = (grid.elevations[yNext * width + x] - grid.elevations[yPrev * width + x]) / (2 * cellMeters)
        const slope = Math.sqrt(dzdx * dzdx + dzdy * dzdy)

        // Slight regolith tone modulation across slopes so topography reads crisply
        const slopeContrast = THREE.MathUtils.clamp(1.02 - slope * 0.18, 0.82, 1.04)
        cellColor.copy(REGOLITH_BASE).multiplyScalar(slopeContrast)

        // Subtle low-opacity amber tint on high-exposure areas only (svf > 0.84)
        const svf = svfMap[idx]
        if (svf > 0.84) {
          const rawT = THREE.MathUtils.clamp((svf - 0.84) / 0.16, 0, 1)
          const smoothT = rawT * rawT * (3 - 2 * rawT)
          cellColor.lerp(EXPOSURE_AMBER, smoothT * 0.24)
        }

        colors[idx * 3] = cellColor.r
        colors[idx * 3 + 1] = cellColor.g
        colors[idx * 3 + 2] = cellColor.b
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    posAttr.needsUpdate = true
    geom.computeVertexNormals()

    return geom
  }, [grid, svfMap])

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors={true}
          roughness={0.88}
          metalness={0.04}
          flatShading={false}
        />
      </mesh>
    </group>
  )
}
