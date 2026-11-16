import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useHelioStore } from '../store/helioStore'
import { ModelBoundary } from './ModelBoundary'
import { SolarFlare } from './SolarFlare'
import {
  disposeObject3D,
  prepareNormalizedScene,
  useVerifiedAssetUrl,
} from './modelUtils'

const PROCEDURAL_SUN_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const PROCEDURAL_SUN_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    // Bright incandescent pale-yellow core transitioning to rich amber limb
    vec3 limbAmber = vec3(0.95, 0.56, 0.14);
    vec3 coreYellow = vec3(1.0, 0.95, 0.78);
    vec3 col = mix(limbAmber, coreYellow, pow(ndotv, 1.15));
    gl_FragColor = vec4(col * 1.18, 1.0);
  }
`

const CORONA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CORONA_FRAGMENT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float d = length(centered);
    if (d >= 0.98) discard;

    // Solar limb normalized coordinate on this plane (d_limb = 16 / 38.4 = 0.4167)
    float dLimb = 0.4167;

    // Natural solar magnetic streamers (filaments extending radially into space)
    float angle = atan(centered.y, centered.x);
    float streamers = 0.84 + 0.16 * sin(angle * 7.0 + 1.2) * cos(angle * 11.0 - 0.5)
                    + 0.08 * sin(angle * 23.0 + 3.1);

    // Natural solar temperature gradient:
    // Core: incandescent white-hot (#FFFDF5)
    // Inner corona: brilliant golden yellow (#FFE270)
    // Outer corona: warm solar wind amber (#FF8818)
    vec3 whiteHot = vec3(1.0, 0.99, 0.94);
    vec3 gold = vec3(1.0, 0.84, 0.38);
    vec3 deepAmber = vec3(0.98, 0.46, 0.10);

    vec3 col;
    float alpha;

    if (d < dLimb) {
      // Incandescent core bloom seamlessly blending from blinding white center to limb gold
      float coreFactor = d / dLimb;
      col = mix(whiteHot, gold, smoothstep(0.0, 1.0, coreFactor));
      alpha = 0.95;
    } else {
      // Corona extending into space beyond solar limb
      float dist = (d - dLimb) / (0.95 - dLimb);
      if (dist >= 1.0) discard;

      // Physically-inspired solar corona: intense multi-component plasma bloom
      float innerGlow = exp(-dist * 8.5) * 1.9;
      float midGlow = exp(-dist * 3.6) * 0.65;
      float outerGlow = pow(1.0 - dist, 3.2) * exp(-dist * 1.4) * 0.35;
      float intensity = innerGlow + (midGlow + outerGlow) * streamers;

      col = mix(gold, deepAmber, smoothstep(0.0, 0.75, dist));
      alpha = clamp(intensity * 0.45, 0.0, 1.0);
      if (alpha <= 0.002) discard;
    }

    // Premultiply color by alpha for AdditiveBlending so outer space reaches true zero (no boundary ring)
    gl_FragColor = vec4(col * alpha, 1.0);
  }
`

function ProceduralSunBody({ radius }: { radius: number }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 48, 36), [radius])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PROCEDURAL_SUN_VERTEX,
        fragmentShader: PROCEDURAL_SUN_FRAGMENT,
      }),
    []
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} />
}

function SunGlbBody({ url, radius }: { url: string; radius: number }) {
  const gltf = useGLTF(url, '/draco/', true)

  const prepared = useMemo(() => {
    const group = prepareNormalizedScene(gltf.scene, { targetRadius: radius })
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const originalMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        const std = originalMat as THREE.MeshStandardMaterial
        const sunTexture = std?.map || std?.emissiveMap || null
        if (sunTexture) {
          sunTexture.colorSpace = THREE.SRGBColorSpace
          sunTexture.needsUpdate = true
        }

        // The Sun is a star: purely incandescent & self-luminous (Rule 7 compliant: only Sun glows)
        mesh.material = new THREE.MeshBasicMaterial({
          map: sunTexture || undefined,
          color: sunTexture ? '#FFFFFF' : '#FFD24D',
          side: THREE.DoubleSide,
        })
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

export interface SunProps {
  position: [number, number, number]
  radius: number
}

export function Sun({ position, radius }: SunProps) {
  const manifest = useHelioStore((s) => s.manifest)
  const reducedMotion = useReducedMotion()
  const { url: sunUrl, checked } = useVerifiedAssetUrl('sun_glb', manifest)

  const spinRef = useRef<THREE.Group>(null)
  const coronaRef = useRef<THREE.Mesh>(null)

  // Camera-facing corona plane blooming into space
  const coronaGeometry = useMemo(() => {
    const size = radius * 2.4 * 2
    return new THREE.PlaneGeometry(size, size)
  }, [radius])

  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORONA_VERTEX,
        fragmentShader: CORONA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useEffect(() => {
    return () => {
      coronaGeometry.dispose()
      coronaMaterial.dispose()
    }
  }, [coronaGeometry, coronaMaterial])

  useFrame(({ camera }, delta) => {
    if (coronaRef.current) {
      coronaRef.current.quaternion.copy(camera.quaternion)
    }
    if (spinRef.current && !reducedMotion) {
      spinRef.current.rotation.y += delta * 0.025
    }
  })

  return (
    <group position={position} name="SunRoot">
      <group ref={spinRef}>
        {/* Photosphere core body: incandescent procedural sphere is always present */}
        <ProceduralSunBody radius={radius} />
        {checked && sunUrl && (
          <ModelBoundary fallback={null}>
            <Suspense fallback={null}>
              <SunGlbBody url={sunUrl} radius={radius * 1.002} />
            </Suspense>
          </ModelBoundary>
        )}
      </group>

      {/* Camera-facing radial corona plane (ONLY glowing object in the scene) */}
      <mesh
        ref={coronaRef}
        geometry={coronaGeometry}
        material={coronaMaterial}
        renderOrder={1}
      />

      {/* Deterministic timeline-driven solar flare loops and limb flash */}
      <SolarFlare sunRadius={radius} sunPosition={position} earthPosition={[0, 0, 0]} />
    </group>
  )
}
