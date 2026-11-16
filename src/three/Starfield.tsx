import React, { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Stars } from './Stars'

interface StarfieldProps {
  count?: number
  radius?: number
}

/**
 * Starfield background component:
 * Loads /assets/space/milkyway.jpg mapped onto an inside-out sphere in sRGB color space.
 * If missing or load fails (e.g. empty asset folders), cleanly falls back to procedural Stars.
 * Fully disposes textures, geometry, and materials on unmount.
 */
export function Starfield({ count = 1400, radius = 700 }: StarfieldProps): React.ReactElement {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()

    loader.load(
      '/assets/space/milkyway.jpg',
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.needsUpdate = true
        setTexture(tex)
      },
      undefined,
      () => {
        if (!cancelled) {
          setLoadFailed(true)
        }
      }
    )

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose()
      }
    }
  }, [texture])

  if (loadFailed || !texture) {
    return <Stars count={count} radius={radius} />
  }

  return (
    <mesh scale={[-1, 1, 1]} rotation={[0.2, 0.4, 0]}>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
