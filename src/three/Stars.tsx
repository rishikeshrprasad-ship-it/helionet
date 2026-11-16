import React, { useMemo } from 'react'
import { mulberry32 } from '../engines/random'

interface StarsProps {
  count?: number
  radius?: number
}

/**
 * Procedural starfield using Points and deterministic random generation.
 * No external texture needed — Rule 6 compliant.
 */
export function Stars({ count = 1200, radius = 400 }: StarsProps): React.ReactElement {
  const [positions, colors] = useMemo(() => {
    const rng = mulberry32(1337)
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Uniform distribution on sphere surface / shell
      const u = rng()
      const v = rng()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = radius * (0.8 + 0.4 * rng())

      const sinPhi = Math.sin(phi)
      pos[i * 3] = r * sinPhi * Math.cos(theta)
      pos[i * 3 + 1] = r * sinPhi * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      // Slight temperature variation: subtle blue-white to amber-white
      const temp = rng()
      if (temp > 0.8) {
        // Subtle warm
        col[i * 3] = 0.95
        col[i * 3 + 1] = 0.9
        col[i * 3 + 2] = 0.8
      } else if (temp < 0.2) {
        // Subtle cool
        col[i * 3] = 0.8
        col[i * 3 + 1] = 0.88
        col[i * 3 + 2] = 0.98
      } else {
        col[i * 3] = 0.91
        col[i * 3 + 1] = 0.9
        col[i * 3 + 2] = 0.88
      }
    }

    return [pos, col]
  }, [count, radius])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  )
}
