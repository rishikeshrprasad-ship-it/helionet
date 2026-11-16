import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { AssetManifest } from '../hooks/useAsset'

// Enforce offline local Draco decoder path (never use CDN)
useGLTF.setDecoderPath('/draco/')

/**
 * Probes an asset URL registered in manifest.json.
 * Rejects HTML SPA fallback responses (e.g. Vite dev server returning 200 text/html
 * when public/assets/models/ is empty) so useGLTF is never called on missing files.
 */
export function useVerifiedAssetUrl(
  key: string,
  manifest: AssetManifest,
): { url: string | null; checked: boolean } {
  const entry = manifest[key]
  const candidateUrl = entry ? `/assets/${entry.path}` : null
  const [result, setResult] = useState<{ url: string | null; checked: boolean }>({
    url: null,
    checked: false,
  })

  useEffect(() => {
    let active = true
    if (!candidateUrl) {
      setResult({ url: null, checked: true })
      return
    }

    fetch(candidateUrl, { method: 'HEAD' })
      .then((res) => {
        if (!active) return
        if (!res.ok) {
          setResult({ url: null, checked: true })
          return
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase()
        if (ct.includes('text/html')) {
          setResult({ url: null, checked: true })
          return
        }
        setResult({ url: candidateUrl, checked: true })
      })
      .catch(() => {
        if (active) setResult({ url: null, checked: true })
      })

    return () => {
      active = false
    }
  }, [candidateUrl])

  return result
}

/**
 * Configures proper color spaces on GLTF textures:
 * color maps use SRGBColorSpace, while normal/bump/roughness/metalness remain linear.
 */
export function configureMaterialColorSpaces(mat: THREE.Material): void {
  const std = mat as THREE.MeshStandardMaterial
  if (std.map) {
    std.map.colorSpace = THREE.SRGBColorSpace
    std.map.needsUpdate = true
  }
  if (std.emissiveMap) {
    std.emissiveMap.colorSpace = THREE.SRGBColorSpace
    std.emissiveMap.needsUpdate = true
  }
  if (std.normalMap) {
    std.normalMap.colorSpace = THREE.NoColorSpace
  }
  if (std.roughnessMap) {
    std.roughnessMap.colorSpace = THREE.NoColorSpace
  }
  if (std.metalnessMap) {
    std.metalnessMap.colorSpace = THREE.NoColorSpace
  }
  if (std.bumpMap) {
    std.bumpMap.colorSpace = THREE.NoColorSpace
  }
  mat.needsUpdate = true
}

/**
 * Safely unlinks and cleans up an Object3D hierarchy without destroying
 * geometries or textures shared by the global useGLTF loader cache.
 * Note: Never strip or clear child nodes from memoized scene objects!
 */
export function disposeObject3D(_root?: THREE.Object3D | null): void {
  // React Three Fiber handles removing primitives from the scene hierarchy cleanly.
  // We explicitly do NOT mutate or clear children of cloned objects held across renders.
}

/**
 * Clones a GLTF scene, ensures +Y up if needed, centers at origin (or bottoms at y=0),
 * and scales uniformly to the requested target radius or max horizontal/bounding size.
 */
export function prepareNormalizedScene(
  source: THREE.Object3D,
  options: {
    targetRadius?: number
    targetMaxSpan?: number
    targetZSpan?: number
    alignBottomYZero?: boolean
    rotateUpFromZ?: boolean
  },
): THREE.Group {
  const wrapper = new THREE.Group()
  const cloned = source.clone(true)

  if (options.rotateUpFromZ) {
    cloned.rotation.x = -Math.PI / 2
  }

  cloned.updateMatrixWorld(true)
  const rawBox = new THREE.Box3().setFromObject(cloned)
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  rawBox.getCenter(center)
  rawBox.getSize(size)

  if (options.alignBottomYZero) {
    cloned.position.set(-center.x, -rawBox.min.y, -center.z)
  } else {
    cloned.position.set(-center.x, -center.y, -center.z)
  }

  wrapper.add(cloned)
  wrapper.updateMatrixWorld(true)

  let scale = 1.0
  if (options.targetRadius !== undefined) {
    const maxHalfExtent = Math.max(size.x, size.y, size.z) * 0.5
    if (maxHalfExtent > 0) {
      scale = options.targetRadius / maxHalfExtent
    }
  } else if (options.targetZSpan !== undefined) {
    const span = size.z > 0 ? size.z : Math.max(size.x, size.y, size.z)
    if (span > 0) {
      scale = options.targetZSpan / span
    }
  } else if (options.targetMaxSpan !== undefined) {
    const maxSpan = Math.max(size.x, size.y, size.z)
    if (maxSpan > 0) {
      scale = options.targetMaxSpan / maxSpan
    }
  }

  wrapper.scale.setScalar(scale)
  wrapper.updateMatrixWorld(true)
  return wrapper
}
