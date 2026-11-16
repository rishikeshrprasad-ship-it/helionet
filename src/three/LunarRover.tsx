import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TerrainGrid } from '../engines/terrain'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useHelioStore } from '../store/helioStore'
import { ModelBoundary } from './ModelBoundary'
import {
  configureMaterialColorSpaces,
  disposeObject3D,
  prepareNormalizedScene,
  useVerifiedAssetUrl,
} from './modelUtils'

interface LunarRoverProps {
  grid: TerrainGrid
  roverRef?: React.RefObject<THREE.Group | null>
}

const PROCEDURAL_ROVER_SCALE = 1.45
const PROCEDURAL_WHEEL_OFFSET = 0.28
const GLB_WHEEL_OFFSET = 0.02
// Terrain grid maps 128x128 cells onto a 100x100 world plane (~3 terrain cells = 2.5 units)
const GLB_ROVER_TARGET_Z_SPAN = 3.2 * (100 / 128)

function sampleTerrainY(grid: TerrainGrid, gx: number, gy: number): number {
  const x0 = Math.min(Math.max(0, Math.floor(gx)), 127)
  const y0 = Math.min(Math.max(0, Math.floor(gy)), 127)
  const x1 = Math.min(x0 + 1, 127)
  const y1 = Math.min(y0 + 1, 127)
  const tx = gx - x0
  const ty = gy - y0

  const h00 = grid.elevations[y0 * 128 + x0] ?? 0
  const h10 = grid.elevations[y0 * 128 + x1] ?? 0
  const h01 = grid.elevations[y1 * 128 + x0] ?? 0
  const h11 = grid.elevations[y1 * 128 + x1] ?? 0

  const h0 = h00 + (h10 - h00) * tx
  const h1 = h01 + (h11 - h01) * tx
  return (h0 + (h1 - h0) * ty) * 0.025
}

function ProceduralRoverBody() {
  return (
    <group scale={[PROCEDURAL_ROVER_SCALE, PROCEDURAL_ROVER_SCALE, PROCEDURAL_ROVER_SCALE]}>
      {/* Chassis */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.4, 1.2]} />
        <meshStandardMaterial color="#E8E6E1" metalness={0.45} roughness={0.35} />
      </mesh>

      {/* Mast & Solar Deck (dark blue-grey #2E3A4D) */}
      <mesh position={[0, 0.6, 0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#7FA6C9" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.9, -0.15]} castShadow>
        <boxGeometry args={[0.52, 0.05, 0.62]} />
        <meshStandardMaterial color="#2E3A4D" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Rocker-Bogie 6 Wheels */}
      {[-0.45, 0, 0.45].map((zOffset, i) => (
        <React.Fragment key={i}>
          <mesh position={[0.52, 0, zOffset]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
            <meshStandardMaterial color="#1E2128" roughness={0.85} />
          </mesh>
          <mesh position={[-0.52, 0, zOffset]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.15, 12]} />
            <meshStandardMaterial color="#1E2128" roughness={0.85} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  )
}

function RoverGlbBody({ url }: { url: string }) {
  const gltf = useGLTF(url, '/draco/', true)

  const prepared = useMemo(() => {
    const group = prepareNormalizedScene(gltf.scene, {
      targetZSpan: GLB_ROVER_TARGET_Z_SPAN,
      alignBottomYZero: true,
    })

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          if (!mat) continue
          configureMaterialColorSpaces(mat)
          const std = mat as THREE.MeshStandardMaterial
          if ('roughness' in std) {
            // Keep metallic Curiosity chassis clearly readable inside shadowed craters
            std.metalness = Math.min(std.metalness ?? 0.25, 0.25)
            std.roughness = Math.max(std.roughness ?? 0.55, 0.55)
            if (std.emissive) {
              std.emissive.set(0, 0, 0)
              std.emissiveIntensity = 0.0
            }
          }
          mat.needsUpdate = true
        }
      }
    })
    return group
  }, [gltf.scene])

  useEffect(() => {
    return () => {
      disposeObject3D(prepared)
    }
  }, [prepared])

  return <primitive object={prepared} />
}

export function LunarRover({ grid, roverRef }: LunarRoverProps): React.ReactElement {
  const localRef = useRef<THREE.Group>(null)
  const roverGroupRef = roverRef ?? localRef

  const manifest = useHelioStore((s) => s.manifest)
  const activeRoute = useHelioStore((s) => s.surface.activeRoute)
  const roverProgress = useHelioStore((s) => s.surface.roverProgress)
  const setSurface = useHelioStore((s) => s.setSurface)
  const playback = useHelioStore((s) => s.playback)
  const reducedMotion = useReducedMotion()

  const { url: roverUrl, checked } = useVerifiedAssetUrl('rover_glb', manifest)
  const useGlb = Boolean(checked && roverUrl)

  const lookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const visualProgressRef = useRef<number>(roverProgress)

  const getInterpolatedPosition = useCallback(
    (progress: number): { pos: THREE.Vector3; forward: THREE.Vector3 } => {
      const wheelOffset = useGlb ? GLB_WHEEL_OFFSET : PROCEDURAL_WHEEL_OFFSET
      if (!activeRoute || activeRoute.length < 2) {
        const gx = 20
        const gy = 24
        const wx = (gx / 128) * 100 - 50
        const wz = (gy / 128) * 100 - 50
        const wy = sampleTerrainY(grid, gx, gy) + wheelOffset
        return { pos: new THREE.Vector3(wx, wy, wz), forward: new THREE.Vector3(0, 0, 1) }
      }

      const totalSegments = activeRoute.length - 1
      const scaledIndex = progress * totalSegments
      const segIdx = Math.min(Math.floor(scaledIndex), totalSegments - 1)
      const segT = scaledIndex - segIdx

      const [x1, y1] = activeRoute[segIdx]
      const [x2, y2] = activeRoute[Math.min(segIdx + 1, totalSegments)]

      const interpX = x1 + (x2 - x1) * segT
      const interpY = y1 + (y2 - y1) * segT

      const wx = (interpX / 128) * 100 - 50
      const wz = (interpY / 128) * 100 - 50
      const wy = sampleTerrainY(grid, interpX, interpY) + wheelOffset

      const pos = new THREE.Vector3(wx, wy, wz)
      const nextWx = (x2 / 128) * 100 - 50
      const nextWz = (y2 / 128) * 100 - 50
      const nextWy = sampleTerrainY(grid, x2, y2) + wheelOffset
      const forward = new THREE.Vector3(nextWx - wx, nextWy - wy, nextWz - wz).normalize()
      if (forward.lengthSq() < 0.001) forward.set(0, 0, 1)

      return { pos, forward }
    },
    [activeRoute, grid, useGlb]
  )

  useFrame((_, delta) => {
    const group = roverGroupRef.current
    if (!group) return

    const duration = Math.max(1, playback.durationHours)
    const targetProgress = THREE.MathUtils.clamp(playback.currentTimeHours / duration, 0, 1)

    if (reducedMotion) {
      visualProgressRef.current = targetProgress
    } else {
      const blend = 1 - Math.exp(-delta * 10)
      visualProgressRef.current = THREE.MathUtils.lerp(
        visualProgressRef.current,
        targetProgress,
        blend
      )
    }

    const { pos, forward } = getInterpolatedPosition(visualProgressRef.current)
    group.position.copy(pos)
    lookTargetRef.current.copy(pos).add(forward)
    group.lookAt(lookTargetRef.current)

    if (Math.abs(targetProgress - roverProgress) > 0.002) {
      const isSheltered = targetProgress >= 0.99
      setSurface({
        roverProgress: targetProgress,
        roverWorldPos: [pos.x, pos.y, pos.z],
        isSheltered,
      })
    }
  })

  return (
    <group ref={roverGroupRef} name="LunarRoverRoot">
      {useGlb && roverUrl ? (
        <ModelBoundary fallback={<ProceduralRoverBody />}>
          <Suspense fallback={<ProceduralRoverBody />}>
            <RoverGlbBody url={roverUrl} />
          </Suspense>
        </ModelBoundary>
      ) : (
        <ProceduralRoverBody />
      )}
    </group>
  )
}
