import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useHelioStore } from '../store/helioStore'
import { ModelBoundary } from './ModelBoundary'
import {
  configureMaterialColorSpaces,
  disposeObject3D,
  prepareNormalizedScene,
  useVerifiedAssetUrl,
} from './modelUtils'

function ProceduralMoonBody({ radius }: { radius: number }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 36, 28), [radius])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8D9096',
        roughness: 0.92,
        metalness: 0.0,
      }),
    []
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} receiveShadow castShadow />
}

function MoonGlbBody({ url, radius }: { url: string; radius: number }) {
  const gltf = useGLTF(url, '/draco/', true)

  const prepared = useMemo(() => {
    const group = prepareNormalizedScene(gltf.scene, { targetRadius: radius })
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
            std.roughness = 0.92
            std.metalness = 0.0
          }
          mat.side = THREE.FrontSide
          mat.needsUpdate = true
        }
      }
    })
    return group
  }, [gltf.scene, radius])

  useEffect(() => {
    return () => {
      disposeObject3D(prepared)
    }
  }, [prepared])

  return <primitive object={prepared} />
}

export interface MoonProps {
  position: [number, number, number]
  radius: number
  sunPosition?: [number, number, number]
}

export function Moon({ position, radius }: MoonProps) {
  const manifest = useHelioStore((s) => s.manifest)
  const { url: moonUrl, checked } = useVerifiedAssetUrl('moon_glb', manifest)
  const groupRef = useRef<THREE.Group>(null)

  // Keep Moon tidally locked facing Earth at origin [0, 0, 0]
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(0, 0, 0)
    }
  })

  return (
    <group ref={groupRef} position={position} name="MoonRoot">
      {checked && moonUrl ? (
        <ModelBoundary fallback={<ProceduralMoonBody radius={radius} />}>
          <Suspense fallback={<ProceduralMoonBody radius={radius} />}>
            <MoonGlbBody url={moonUrl} radius={radius} />
          </Suspense>
        </ModelBoundary>
      ) : (
        <ProceduralMoonBody radius={radius} />
      )}
    </group>
  )
}
