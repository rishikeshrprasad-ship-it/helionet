import React, { useMemo, useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { type ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useHelioStore, type ShelterInfo } from '../store/helioStore'
import type { TerrainGrid } from '../engines/terrain'
import { TOKENS } from '../tokens'

interface LunarSheltersProps {
  grid: TerrainGrid
}

export function LunarShelters({ grid }: LunarSheltersProps): React.ReactElement {
  const shelters = useHelioStore((s) => s.surface.shelters)
  const targetShelterId = useHelioStore((s) => s.surface.targetShelterId)
  const selectedEntity = useHelioStore((s) => s.selectedEntity)
  const setHoveredEntity = useHelioStore((s) => s.setHoveredEntity)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)
  const [habitatModel, setHabitatModel] = useState<THREE.Group | null>(null)
  const lastHoverPosRef = useRef<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loader = new GLTFLoader()
    loader.load(
      '/assets/habitat.glb',
      (gltf) => {
        if (!isMounted) return
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const s = 3.8 / maxDim
          gltf.scene.scale.set(s, s, s)
        }
        setHabitatModel(gltf.scene)
      },
      undefined,
      () => {
        // Not found: procedural fallback remains active
      },
    )
    return () => {
      isMounted = false
    }
  }, [])

  const getShelterWorldPos = (gx: number, gy: number): [number, number, number] => {
    const wx = (gx / 128) * 100 - 50
    const wz = (gy / 128) * 100 - 50
    const idx = Math.min(Math.max(0, gy * 128 + gx), grid.elevations.length - 1)
    const wy = grid.elevations[idx] * 0.025
    return [wx, wy, wz]
  }

  return (
    <group>
      {shelters.map((shelter) => {
        const [wx, wy, wz] = getShelterWorldPos(shelter.gridX, shelter.gridY)
        const isTarget = shelter.id === targetShelterId

        const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
          const x = e.nativeEvent.clientX
          const y = e.nativeEvent.clientY
          const prev = lastHoverPosRef.current
          if (!prev || prev.id !== shelter.id || Math.abs(prev.x - x) > 5 || Math.abs(prev.y - y) > 5) {
            lastHoverPosRef.current = { id: shelter.id, x, y }
            setHoveredEntity({ kind: 'shelter', id: shelter.id, x, y })
          }
        }

        const handlePointerOut = () => {
          lastHoverPosRef.current = null
          setHoveredEntity(null)
          document.body.style.cursor = 'auto'
        }

        const handleClick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          const isSame = selectedEntity?.kind === 'shelter' && selectedEntity.id === shelter.id
          setSelectedEntity(isSame ? null : { kind: 'shelter', id: shelter.id })
        }

        return (
          <group
            key={shelter.id}
            position={[wx, wy, wz]}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            {habitatModel ? (
              <group>
                <primitive object={habitatModel.clone()} />
                <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[2.45, 0.18, 12, 36]} />
                  <meshStandardMaterial
                    color={TOKENS.color.moss}
                    emissive={TOKENS.color.moss}
                    emissiveIntensity={isTarget ? 0.35 : 0.15}
                    roughness={0.5}
                  />
                </mesh>
              </group>
            ) : (
              /* Procedural Shelter: crisp dome silhouette with moss ring */
              <group>
                {/* 1. Dome Silhouette */}
                <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                  <sphereGeometry args={[2.0, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial
                    color="#D2D6DE"
                    metalness={0.28}
                    roughness={0.5}
                  />
                </mesh>

                {/* 2. Visible Moss Perimeter Ring */}
                <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[2.35, isTarget ? 0.2 : 0.14, 12, 36]} />
                  <meshStandardMaterial
                    color={TOKENS.color.moss}
                    emissive={TOKENS.color.moss}
                    emissiveIntensity={isTarget ? 0.38 : 0.18}
                    roughness={0.45}
                    metalness={0.15}
                  />
                </mesh>

                {/* 3. Grounding Regolith Berm Base */}
                <mesh position={[0, 0.02, 0]} receiveShadow>
                  <cylinderGeometry args={[2.25, 2.75, 0.72, 24]} />
                  <meshStandardMaterial color="#252830" roughness={0.95} metalness={0.08} />
                </mesh>

                {/* 4. Airlock Module */}
                <mesh position={[1.8, 0.42, 0]} castShadow>
                  <boxGeometry args={[1.2, 0.78, 0.85]} />
                  <meshStandardMaterial color="#383C46" roughness={0.75} metalness={0.3} />
                </mesh>

                {/* 5. Solar Panel Array (dark blue-grey #2E3A4D) */}
                <group position={[-1.85, 0.15, 1.35]}>
                  <mesh position={[0, 0.55, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
                    <meshStandardMaterial color="#7C828E" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 1.1, 0]} rotation={[0.35, 0.5, 0]}>
                    <boxGeometry args={[1.2, 0.04, 0.8]} />
                    <meshStandardMaterial color="#2E3A4D" metalness={0.45} roughness={0.35} />
                  </mesh>
                </group>
              </group>
            )}

            <ShelterLabel shelter={shelter} isTarget={isTarget} />
          </group>
        )
      })}
    </group>
  )
}

function ShelterLabel({ shelter, isTarget }: { shelter: ShelterInfo; isTarget: boolean }): React.ReactElement {
  const spriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 384
    canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = 'rgba(14, 15, 18, 0.86)'
    ctx.strokeStyle = isTarget ? TOKENS.color.moss : TOKENS.color.hairline
    ctx.lineWidth = 2
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 368, 80, 6)
    } else {
      ctx.rect(8, 8, 368, 80)
    }
    ctx.fill()
    ctx.stroke()

    ctx.font = '600 22px "Bricolage Grotesque", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = isTarget ? TOKENS.color.moss : TOKENS.color.text
    ctx.fillText(shelter.name, 192, 38)

    ctx.font = '500 16px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = TOKENS.color.muted
    ctx.fillText(`Cap: ${shelter.capacity} · Shielded`, 192, 66)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }, [shelter.name, shelter.capacity, isTarget])

  if (!spriteTexture) return <group />

  return (
    <sprite position={[0, 3.8, 0]} scale={[5.6, 1.4, 1]}>
      <spriteMaterial map={spriteTexture} transparent={true} depthTest={false} />
    </sprite>
  )
}
