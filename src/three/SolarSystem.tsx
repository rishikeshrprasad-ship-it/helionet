import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { mulberry32 } from '../engines/random'
import { useHelioStore } from '../store/helioStore'
import { ModelBoundary } from './ModelBoundary'
import {
  configureMaterialColorSpaces,
  disposeObject3D,
  prepareNormalizedScene,
} from './modelUtils'

interface PlanetConfig {
  name: string
  distance: number
  radius: number
  orbitPeriodHours: number
  textureUrl?: string
  modelUrl?: string
  color: string
  tiltDeg?: number
}

const PLANETS: PlanetConfig[] = [
  {
    name: 'Mercury',
    distance: 20,
    radius: 0.7,
    orbitPeriodHours: 88 * 24,
    textureUrl: '/assets/space/mercury.jpg',
    color: '#A29B91',
  },
  {
    name: 'Venus',
    distance: 28,
    radius: 1.1,
    orbitPeriodHours: 224 * 24,
    textureUrl: '/assets/space/venus.jpg',
    color: '#E3BB7B',
  },
  {
    name: 'Earth',
    distance: 38,
    radius: 1.25,
    orbitPeriodHours: 365 * 24,
    modelUrl: '/assets/models/earth.glb',
    textureUrl: '/assets/space/earth_color.jpg',
    color: '#4A82B8',
  },
  {
    name: 'Mars',
    distance: 48,
    radius: 0.85,
    orbitPeriodHours: 687 * 24,
    textureUrl: '/assets/space/mars.jpg',
    color: '#C1440E',
  },
  {
    name: 'Jupiter',
    distance: 74,
    radius: 3.2,
    orbitPeriodHours: 4332 * 24,
    textureUrl: '/assets/space/jupiter.jpg',
    color: '#C88B3A',
  },
  {
    name: 'Saturn',
    distance: 96,
    radius: 2.7,
    orbitPeriodHours: 10759 * 24,
    textureUrl: '/assets/space/saturn.jpg',
    color: '#E2BF7D',
    tiltDeg: 26,
  },
  {
    name: 'Uranus',
    distance: 118,
    radius: 1.9,
    orbitPeriodHours: 30685 * 24,
    modelUrl: '/assets/models/uranus.glb',
    textureUrl: '/assets/space/uranus.jpg',
    color: '#79C1D2',
    tiltDeg: 97,
  },
  {
    name: 'Neptune',
    distance: 138,
    radius: 1.85,
    orbitPeriodHours: 60189 * 24,
    textureUrl: '/assets/space/neptune.jpg',
    color: '#4B70DD',
  },
]

function TexturedSphere({
  radius,
  textureUrl,
  fallbackColor,
}: {
  radius: number
  textureUrl?: string
  fallbackColor: string
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!textureUrl) return
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(
      textureUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        setTexture(tex)
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null)
      }
    )
    return () => {
      cancelled = true
    }
  }, [textureUrl])

  useEffect(() => {
    return () => {
      if (texture) texture.dispose()
    }
  }, [texture])

  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? '#FFFFFF' : fallbackColor}
        roughness={0.7}
        metalness={0.05}
      />
    </mesh>
  )
}

function GlbModelObject({
  url,
  targetRadius,
  isSun = false,
}: {
  url: string
  targetRadius: number
  isSun?: boolean
}) {
  const gltf = useGLTF(url, '/draco/', true)

  const prepared = useMemo(() => {
    const group = prepareNormalizedScene(gltf.scene, { targetRadius })
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (isSun) {
          // ONLY the Sun glows (Rule 7) — purely incandescent self-luminous star
          const originalMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          const std = originalMat as THREE.MeshStandardMaterial
          const sunTex = std?.map || std?.emissiveMap || null
          if (sunTex) {
            sunTex.colorSpace = THREE.SRGBColorSpace
            sunTex.needsUpdate = true
          }
          mesh.material = new THREE.MeshBasicMaterial({
            map: sunTex || undefined,
            color: sunTex ? '#FFFFFF' : '#FFD24D',
          })
          mesh.castShadow = false
          mesh.receiveShadow = false
          return
        }

        mesh.castShadow = true
        mesh.receiveShadow = true
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          if (!mat) continue
          configureMaterialColorSpaces(mat)
          const std = mat as THREE.MeshStandardMaterial
          if ('roughness' in std) {
            std.roughness = 0.7
            std.metalness = 0.1
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
  }, [gltf.scene, targetRadius, isSun])

  useEffect(() => {
    return () => {
      disposeObject3D(prepared)
    }
  }, [prepared])

  return <primitive object={prepared} />
}

function SunObject() {
  return (
    <group position={[0, 0, 0]}>
      {/* Radiant photosphere core is always visible */}
      <mesh>
        <sphereGeometry args={[7.5, 32, 24]} />
        <meshBasicMaterial color="#FFD24D" />
      </mesh>
      <ModelBoundary fallback={null}>
        <Suspense fallback={null}>
          <GlbModelObject
            url="/assets/models/sun.glb"
            targetRadius={7.52}
            isSun={true}
          />
        </Suspense>
      </ModelBoundary>

      {/* Subtle non-additive solar corona glow */}
      <mesh>
        <sphereGeometry args={[8.8, 20, 16]} />
        <meshBasicMaterial
          color="#FFA500"
          transparent={true}
          opacity={0.25}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function SaturnRings({ innerRadius, outerRadius }: { innerRadius: number; outerRadius: number }) {
  const [alphaTex, setAlphaTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.load(
      '/assets/space/saturn_ring.png',
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        setAlphaTex(tex)
      },
      undefined,
      () => {
        if (!cancelled) setAlphaTex(null)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (alphaTex) alphaTex.dispose()
    }
  }, [alphaTex])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerRadius, outerRadius, 48]} />
      <meshStandardMaterial
        map={alphaTex ?? undefined}
        alphaMap={alphaTex ?? undefined}
        color="#D9C29E"
        transparent={true}
        opacity={alphaTex ? 0.9 : 0.6}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.0}
      />
    </mesh>
  )
}

function OrbitLine({ radius }: { radius: number }) {
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius))
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    return geom
  }, [radius])

  useEffect(() => {
    return () => {
      lineGeometry.dispose()
    }
  }, [lineGeometry])

  return (
    <lineLoop geometry={lineGeometry}>
      <lineBasicMaterial color="#E2E6EE" transparent={true} opacity={0.15} />
    </lineLoop>
  )
}

function AsteroidBelt() {
  const pointsGeometry = useMemo(() => {
    const rng = mulberry32(98765)
    const count = 350
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const r = 56 + rng() * 11
      const theta = rng() * Math.PI * 2
      const y = (rng() - 0.5) * 2.2

      positions[i * 3] = Math.cos(theta) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(theta) * r
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [])

  useEffect(() => {
    return () => {
      pointsGeometry.dispose()
    }
  }, [pointsGeometry])

  return (
    <points geometry={pointsGeometry}>
      <pointsMaterial size={1.0} color="#8E929B" transparent={true} opacity={0.65} />
    </points>
  )
}

export function SolarSystem(): React.ReactElement {
  const planetRefs = useRef<(THREE.Group | null)[]>([])
  const aceRef = useRef<THREE.Group>(null)
  const junoRef = useRef<THREE.Group>(null)

  // Seed initial orbital phases deterministically
  const initialPhases = useMemo(() => {
    const rng = mulberry32(20261114)
    return PLANETS.map(() => rng() * Math.PI * 2)
  }, [])

  useFrame(() => {
    const timeHours = useHelioStore.getState().playback.currentTimeHours
    // Advance slow orbital motion strictly tied to timeline time (not frame clock)
    const speedFactor = 120

    let earthX = 0
    let earthZ = 0
    let jupiterX = 0
    let jupiterZ = 0

    PLANETS.forEach((planet, idx) => {
      const group = planetRefs.current[idx]
      if (!group) return
      const phase = initialPhases[idx]
      const orbitalSpeed = (2 * Math.PI) / (planet.orbitPeriodHours / speedFactor)
      const currentAngle = phase + timeHours * orbitalSpeed

      const x = Math.cos(currentAngle) * planet.distance
      const z = Math.sin(currentAngle) * planet.distance
      group.position.set(x, 0, z)

      if (planet.name === 'Earth') {
        earthX = x
        earthZ = z
      } else if (planet.name === 'Jupiter') {
        jupiterX = x
        jupiterZ = z
      }
    })

    // Place ACE at Sun-Earth L1 point (between Sun and Earth, ~88% of Earth distance towards Sun)
    if (aceRef.current) {
      const l1DistanceFraction = 0.88
      aceRef.current.position.set(earthX * l1DistanceFraction, 0, earthZ * l1DistanceFraction)
    }

    // Place Juno probe in orbit near Jupiter
    if (junoRef.current) {
      const junoAngle = timeHours * 0.08
      const junoOffsetR = 5.2
      junoRef.current.position.set(
        jupiterX + Math.cos(junoAngle) * junoOffsetR,
        Math.sin(junoAngle * 0.5) * 1.5,
        jupiterZ + Math.sin(junoAngle) * junoOffsetR
      )
    }
  })

  return (
    <group name="SolarSystemRoot">
      {/* Sunlight radiating outward from the Sun: decay=0 eliminates heavy per-fragment decay calculations */}
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={600} decay={0} color="#FFF8E7" />

      {/* Ambient fill light so planetary details remain clearly legible in deep space */}
      <ambientLight intensity={0.38} color="#C8D6E8" />

      {/* 1. Central Sun */}
      <SunObject />

      {/* 2. Asteroid Belt between Mars & Jupiter */}
      <AsteroidBelt />

      {/* 3. Orbit lines & Planets */}
      {PLANETS.map((planet, idx) => {
        const hasModel = Boolean(planet.modelUrl)

        return (
          <React.Fragment key={planet.name}>
            {/* 1px circular orbit line */}
            <OrbitLine radius={planet.distance} />

            {/* Orbiting Planet Body */}
            <group
              ref={(el) => {
                planetRefs.current[idx] = el
              }}
              rotation={planet.tiltDeg ? [0, 0, THREE.MathUtils.degToRad(planet.tiltDeg)] : undefined}
            >
              {hasModel && planet.modelUrl ? (
                <ModelBoundary
                  fallback={
                    <TexturedSphere
                      radius={planet.radius}
                      textureUrl={planet.textureUrl}
                      fallbackColor={planet.color}
                    />
                  }
                >
                  <Suspense
                    fallback={
                      <TexturedSphere
                        radius={planet.radius}
                        textureUrl={planet.textureUrl}
                        fallbackColor={planet.color}
                      />
                    }
                  >
                    <GlbModelObject
                      url={planet.modelUrl}
                      targetRadius={planet.radius}
                    />
                  </Suspense>
                </ModelBoundary>
              ) : (
                <TexturedSphere
                  radius={planet.radius}
                  textureUrl={planet.textureUrl}
                  fallbackColor={planet.color}
                />
              )}

              {/* Saturn Rings */}
              {planet.name === 'Saturn' && (
                <SaturnRings
                  innerRadius={planet.radius * 1.35}
                  outerRadius={planet.radius * 2.35}
                />
              )}
            </group>
          </React.Fragment>
        )
      })}

      {/* 4. ACE (solar wind monitor) at Sun-Earth L1 */}
      <group ref={aceRef} name="ACE_L1">
        <ModelBoundary
          fallback={
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#CCD2DC" metalness={0.8} roughness={0.2} />
            </mesh>
          }
        >
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#CCD2DC" metalness={0.8} roughness={0.2} />
              </mesh>
            }
          >
            <GlbModelObject
              url="/assets/models/ace.glb"
              targetRadius={0.65}
            />
          </Suspense>
        </ModelBoundary>
      </group>

      {/* 5. Juno spacecraft orbiting near Jupiter */}
      <group ref={junoRef} name="Juno_Jupiter">
        <ModelBoundary
          fallback={
            <mesh>
              <cylinderGeometry args={[0.2, 0.2, 0.6, 6]} />
              <meshStandardMaterial color="#C8D2DE" metalness={0.8} roughness={0.2} />
            </mesh>
          }
        >
          <Suspense
            fallback={
              <mesh>
                <cylinderGeometry args={[0.2, 0.2, 0.6, 6]} />
                <meshStandardMaterial color="#C8D2DE" metalness={0.8} roughness={0.2} />
              </mesh>
            }
          >
            <GlbModelObject
              url="/assets/models/juno.glb"
              targetRadius={0.75}
            />
          </Suspense>
        </ModelBoundary>
      </group>
    </group>
  )
}
