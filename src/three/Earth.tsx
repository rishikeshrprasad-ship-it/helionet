import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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

const AXIAL_TILT_RAD = THREE.MathUtils.degToRad(23.4)
const DEG_PER_HOUR_RAD = THREE.MathUtils.degToRad(15)

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123
  return n - Math.floor(n)
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const uz = fz * fz * (3 - 2 * fz)

  const n000 = hash3(ix, iy, iz)
  const n100 = hash3(ix + 1, iy, iz)
  const n010 = hash3(ix, iy + 1, iz)
  const n110 = hash3(ix + 1, iy + 1, iz)
  const n001 = hash3(ix, iy, iz + 1)
  const n101 = hash3(ix + 1, iy, iz + 1)
  const n011 = hash3(ix, iy + 1, iz + 1)
  const n111 = hash3(ix + 1, iy + 1, iz + 1)

  const nx00 = n000 + (n100 - n000) * ux
  const nx10 = n010 + (n110 - n010) * ux
  const nx01 = n001 + (n101 - n001) * ux
  const nx11 = n011 + (n111 - n011) * ux

  const nxy0 = nx00 + (nx10 - nx00) * uy
  const nxy1 = nx01 + (nx11 - nx01) * uy

  return nxy0 + (nxy1 - nxy0) * uz
}

function fbm3(x: number, y: number, z: number): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < 4; i += 1) {
    sum += amp * noise3(x * freq, y * freq, z * freq)
    freq *= 2.04
    amp *= 0.5
  }
  return sum
}

function createProceduralEarthTexture(width = 384, height = 192): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4)
  for (let py = 0; py < height; py += 1) {
    const v = py / (height - 1)
    const theta = v * Math.PI
    const sinTheta = Math.sin(theta)
    const cosTheta = Math.cos(theta)

    for (let px = 0; px < width; px += 1) {
      const u = px / width
      const phi = u * Math.PI * 2
      const sx = sinTheta * Math.cos(phi)
      const sy = cosTheta
      const sz = sinTheta * Math.sin(phi)

      const elevation = fbm3(sx * 2.1 + 1.4, sy * 2.1 - 0.7, sz * 2.1 + 2.3)
      const polarCap = Math.abs(sy) > 0.86 - elevation * 0.08
      const isLand = elevation > 0.515

      let r = 41
      let g = 61
      let b = 82

      if (polarCap) {
        r = 186
        g = 194
        b = 202
      } else if (isLand) {
        const highland = Math.min(1, Math.max(0, (elevation - 0.515) / 0.25))
        r = Math.round(98 + highland * 34)
        g = Math.round(122 + highland * 22)
        b = Math.round(104 + highland * 18)
      } else {
        const shelf = Math.min(1, Math.max(0, (elevation - 0.42) / 0.095))
        r = Math.round(35 + shelf * 14)
        g = Math.round(54 + shelf * 18)
        b = Math.round(76 + shelf * 20)
      }

      const idx = (py * width + px) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

function useOptionalColorTexture(url: string | null): THREE.Texture | null {
  const [loaded, setLoaded] = useState<{ url: string; tex: THREE.Texture } | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.needsUpdate = true
        setLoaded({ url, tex })
      },
      undefined,
      () => {
        // Ignore load failure; optional texture remains null
      }
    )
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const texToDispose = loaded?.tex
    return () => {
      if (texToDispose) texToDispose.dispose()
    }
  }, [loaded])

  return url && loaded?.url === url ? loaded.tex : null
}

function ProceduralEarth({
  radius,
  reliefUrl,
}: {
  radius: number
  reliefUrl: string | null
}) {
  const reliefTex = useOptionalColorTexture(reliefUrl)
  const fallbackTex = useMemo(() => createProceduralEarthTexture(), [])
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 64, 48), [radius])
  const map = reliefTex ?? fallbackTex

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useEffect(() => {
    return () => {
      fallbackTex.dispose()
    }
  }, [fallbackTex])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={map}
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  )
}

function EarthGlbBody({
  url,
  radius,
  colorUrl,
  heightUrl,
  nightUrl,
  sunPosition,
}: {
  url: string
  radius: number
  colorUrl: string | null
  heightUrl: string | null
  nightUrl: string | null
  sunPosition?: [number, number, number]
}) {
  const gltf = useGLTF(url, '/draco/', true)
  const colorTex = useOptionalColorTexture(colorUrl)
  const heightBump = useOptionalColorTexture(heightUrl)
  const nightTex = useOptionalColorTexture(nightUrl)

  const sunPosVec = useMemo(
    () => (sunPosition ? new THREE.Vector3(...sunPosition) : new THREE.Vector3(-48, 12, -26)),
    [sunPosition]
  )

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
            std.roughness = 0.9
            std.metalness = 0.0
            if (colorTex) {
              std.map = colorTex
              std.color.set('#FFFFFF')
            } else if (!std.map) {
              std.color.set('#3B72A8')
            } else {
              std.color.set('#FFFFFF')
            }
            if (std.normalMap && std.normalScale) {
              std.normalScale.set(0.35, 0.35)
            }
            if (heightBump) {
              std.bumpMap = heightBump
              std.bumpScale = 0.04
            }
            // Ensure no emissive glow
            if (std.emissive) {
              std.emissive.set(0, 0, 0)
              std.emissiveIntensity = 0.0
            }

            if (nightTex) {
              std.customProgramCacheKey = () => 'earth-night-blend-v2'
              std.onBeforeCompile = (shader) => {
                shader.uniforms.uNightMap = { value: nightTex }
                shader.uniforms.uSunPos = { value: sunPosVec }

                shader.vertexShader = shader.vertexShader
                  .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec2 vEarthUv;
                    varying vec3 vWorldNormal;
                    varying vec3 vWorldPos;`
                  )
                  .replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                    vEarthUv = uv;
                    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                  )

                shader.fragmentShader = shader.fragmentShader
                  .replace(
                    '#include <common>',
                    `#include <common>
                    uniform sampler2D uNightMap;
                    uniform vec3 uSunPos;
                    varying vec2 vEarthUv;
                    varying vec3 vWorldNormal;
                    varying vec3 vWorldPos;`
                  )
                  .replace(
                    '#include <emissivemap_fragment>',
                    `#include <emissivemap_fragment>
                    vec3 sunDir = normalize(uSunPos - vWorldPos);
                    float NdotL = dot(vWorldNormal, sunDir);
                    float nightFactor = smoothstep(0.15, -0.15, NdotL);
                    vec4 nightSample = texture2D(uNightMap, vEarthUv);
                    // City lights glow warmly on the dark night side
                    totalEmissiveRadiance += nightSample.rgb * nightFactor * 2.4;
                    // Soft celestial / starlight fill so night continents & oceans remain clearly legible
                    totalEmissiveRadiance += diffuseColor.rgb * nightFactor * 0.22;`
                  )
              }
            }
          }
          mat.needsUpdate = true
        }
      }
    })
    return group
  }, [gltf.scene, radius, colorTex, heightBump, nightTex, sunPosVec])

  useEffect(() => {
    return () => {
      disposeObject3D(prepared)
    }
  }, [prepared])

  return <primitive object={prepared} />
}

export interface EarthProps {
  position: [number, number, number]
  radius: number
  sunPosition?: [number, number, number]
}

export function Earth({ position, radius, sunPosition }: EarthProps) {
  const manifest = useHelioStore((s) => s.manifest)
  const { url: earthUrl, checked: earthChecked } = useVerifiedAssetUrl('earth_glb', manifest)
  const { url: colorUrl } = useVerifiedAssetUrl('earth_color', manifest)
  const { url: heightUrl } = useVerifiedAssetUrl('earth_height', manifest)
  const { url: reliefUrl } = useVerifiedAssetUrl('earth_relief', manifest)
  const { url: nightUrl } = useVerifiedAssetUrl('earth_night_space', manifest)

  const spinRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!spinRef.current) return
    const currentTimeHours = useHelioStore.getState().playback.currentTimeHours
    // Earth spins 15 deg per simulated hour strictly from timeline position
    spinRef.current.rotation.y = currentTimeHours * DEG_PER_HOUR_RAD
  })

  const effectiveBumpUrl = heightUrl || reliefUrl

  return (
    <group position={position} rotation={[0, 0, AXIAL_TILT_RAD]} name="EarthRoot">
      <group ref={spinRef}>
        {earthChecked && earthUrl ? (
          <ModelBoundary fallback={<ProceduralEarth radius={radius} reliefUrl={effectiveBumpUrl} />}>
            <Suspense fallback={<ProceduralEarth radius={radius} reliefUrl={effectiveBumpUrl} />}>
              <EarthGlbBody
                url={earthUrl}
                radius={radius}
                colorUrl={colorUrl}
                heightUrl={effectiveBumpUrl}
                nightUrl={nightUrl}
                sunPosition={sunPosition}
              />
            </Suspense>
          </ModelBoundary>
        ) : (
          <ProceduralEarth radius={radius} reliefUrl={effectiveBumpUrl} />
        )}
      </group>
    </group>
  )
}
