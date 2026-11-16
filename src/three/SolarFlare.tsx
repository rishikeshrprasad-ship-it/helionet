import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLARE_VISUAL_HOURS } from '../config/constants'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useHelioStore } from '../store/helioStore'
import {
  computeSolarFlareState,
  findFirstM1CrossingHours,
  generateSeededArcParams,
  seedFromFlareTime,
  type ArcLoopParams,
} from './solarFlareMath'

const MAX_POOLED_ARCS = 5

const ARC_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const ARC_FRAGMENT_SHADER = /* glsl */ `
  uniform float uGrowth;
  uniform float uOpacity;
  uniform float uSimTime;
  uniform float uPhase;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  void main() {
    float head = clamp(uGrowth, 0.0, 1.0);
    // Smooth growth of the magnetic loop from footpoint to footpoint
    float growthMask = (1.0 - smoothstep(max(0.0, head - 0.16), head + 0.02, vUv.x)) * step(0.001, head);
    // Tapered footpoints anchored into the photosphere
    float endsFade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));

    // Filamentary magnetic flux lines (plasma trapped in magnetic loop field)
    float strand1 = sin(vUv.y * 37.699 + sin(vUv.x * 24.0 + uSimTime * 14.0) * 1.8);
    float strand2 = cos(vUv.y * 50.265 - uSimTime * 18.0);
    float filaments = 0.72 + 0.28 * (strand1 * 0.6 + strand2 * 0.4);

    // View-dependent plasma limb brightening: core shines white-gold
    float coreAlign = clamp(abs(dot(normalize(vViewNormal), normalize(vViewDir))), 0.0, 1.0);
    float hotCore = pow(coreAlign, 1.5);

    // Million-kelvin coronal loop plasma colors:
    // Core: searing white-hot (#FFFFFF)
    // Mantle: brilliant ionized helium/hydrogen gold (#FFAE19)
    // Envelope: deep extreme-UV red-amber (#FF4800)
    vec3 whiteHot = vec3(1.0, 1.0, 0.95);
    vec3 goldPlasma = vec3(1.0, 0.76, 0.20);
    vec3 outerEUV = vec3(1.0, 0.35, 0.04);

    vec3 col = mix(outerEUV, goldPlasma, coreAlign);
    col = mix(col, whiteHot, hotCore * 0.92);

    // Plasma pulse along the magnetic loops driven strictly by timeline hours
    float pulse = 0.88 + 0.12 * sin(uSimTime * 12.0 + uPhase);

    float alpha = growthMask * endsFade * uOpacity * filaments * (0.65 + 0.85 * hotCore) * pulse;
    if (alpha <= 0.002) discard;

    // Premultiply by alpha for AdditiveBlending with HDR plasma bloom
    float loopIntensity = (2.6 + hotCore * 2.2);
    gl_FragColor = vec4(col * loopIntensity * alpha, 1.0);
  }
`

const FLASH_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FLASH_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float d = length(centered);
    if (d > 1.0) discard;

    // Searing white diamond core at reconnection site
    float core = exp(-d * d * 28.0) * 2.2;
    float innerHalo = exp(-d * 4.5) * 0.8;

    // 4-point optical diffraction cross spikes (telescope aperture glare)
    float spikeH = exp(-abs(centered.y) * 42.0) * exp(-abs(centered.x) * 3.5) * 1.1;
    float spikeV = exp(-abs(centered.x) * 42.0) * exp(-abs(centered.y) * 3.5) * 1.1;
    float diag1 = exp(-abs(centered.x + centered.y) * 32.0) * exp(-d * 5.0) * 0.6;
    float diag2 = exp(-abs(centered.x - centered.y) * 32.0) * exp(-d * 5.0) * 0.6;
    float starSpikes = spikeH + spikeV + diag1 + diag2;

    float totalFlash = (core + innerHalo + starSpikes) * uIntensity;
    if (totalFlash <= 0.002) discard;

    // Searing incandescent white-hot center fading into brilliant solar gold
    vec3 whiteHot = vec3(1.0, 1.0, 0.98);
    vec3 gold = vec3(1.0, 0.85, 0.45);
    vec3 flareCol = mix(uColor, gold, core);
    flareCol = mix(flareCol, whiteHot, clamp(core * 1.4 + starSpikes * 0.6, 0.0, 1.0));

    // Premultiply flash color by intensity for AdditiveBlending (zero black box artifacts)
    gl_FragColor = vec4(flareCol * (2.2 + core * 1.5) * totalFlash, 1.0);
  }
`

function rotateDirection(base: THREE.Vector3, tangent: THREE.Vector3, angleRad: number): THREE.Vector3 {
  return base
    .clone()
    .multiplyScalar(Math.cos(angleRad))
    .addScaledVector(tangent, Math.sin(angleRad))
    .normalize()
}

function computeLimbAnchor(
  sunPosition: readonly [number, number, number],
  earthPosition: readonly [number, number, number],
  tFlare: number
): THREE.Vector3 {
  const dirToEarth = new THREE.Vector3(
    earthPosition[0] - sunPosition[0],
    earthPosition[1] - sunPosition[1],
    earthPosition[2] - sunPosition[2]
  ).normalize()

  // Direction to camera at [0, 12, 55] from sun at [-48, 12, -26]
  const toCamera = new THREE.Vector3(-sunPosition[0], 0, 55 - sunPosition[2]).normalize()
  const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toCamera).normalize()

  const rngSeed = seedFromFlareTime(tFlare)
  const jitterY = (((rngSeed >>> 8) & 0xff) / 255 - 0.5) * 0.16

  // Anchor right along the Sun's visible right limb facing toward Earth
  return screenRight
    .clone()
    .multiplyScalar(0.86)
    .addScaledVector(dirToEarth, 0.35)
    .add(new THREE.Vector3(0, jitterY - 0.06, 0))
    .normalize()
}

function buildArcTubeGeometry(
  siteNormal: THREE.Vector3,
  sunRadius: number,
  arc: ArcLoopParams
): THREE.TubeGeometry {
  const refUp = Math.abs(siteNormal.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const tanA = new THREE.Vector3().crossVectors(refUp, siteNormal).normalize()
  const tanB = new THREE.Vector3().crossVectors(siteNormal, tanA).normalize()

  // Footpoint span aligned along solar limb circumference (tanB) with gentle natural tilt
  const spanTilt = (arc.angleRad % 0.8) - 0.4
  const spanAxis = tanB
    .clone()
    .multiplyScalar(Math.cos(spanTilt))
    .addScaledVector(tanA, Math.sin(spanTilt))
    .normalize()

  // Local arc center slightly offset around active region
  const localCenter = siteNormal
    .clone()
    .addScaledVector(tanA, THREE.MathUtils.degToRad(arc.footStartLonOffsetDeg * 0.25))
    .addScaledVector(tanB, THREE.MathUtils.degToRad(arc.footStartLatDeg * 0.25))
    .normalize()

  const halfSpan = THREE.MathUtils.degToRad(arc.spanDeg * 0.5)
  const p0 = rotateDirection(localCenter, spanAxis, -halfSpan).multiplyScalar(sunRadius * 0.985)
  const p2 = rotateDirection(localCenter, spanAxis, halfSpan).multiplyScalar(sunRadius * 0.985)

  // Midpoint arches outward into space
  const midDir = siteNormal
    .clone()
    .addScaledVector(tanA, 0.18 * Math.sin(arc.phaseOffset))
    .normalize()

  const desiredApex = midDir.multiplyScalar(sunRadius * (1 + arc.apexFactor))
  const control = desiredApex.multiplyScalar(2).addScaledVector(p0, -0.5).addScaledVector(p2, -0.5)

  const curve = new THREE.QuadraticBezierCurve3(p0, control, p2)
  return new THREE.TubeGeometry(curve, 48, Math.max(0.12, sunRadius * arc.tubeRadiusFactor), 10, false)
}

export interface SolarFlareProps {
  sunRadius: number
  sunPosition: readonly [number, number, number]
  earthPosition?: readonly [number, number, number]
}

export function SolarFlare({
  sunRadius,
  sunPosition,
  earthPosition = [0, 0, 0],
}: SolarFlareProps) {
  const reducedMotion = useReducedMotion()
  const replay = useHelioStore((s) => s.replay)

  const flareSiteRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0))
  const flashMeshRef = useRef<THREE.Mesh>(null)
  const patchMeshRef = useRef<THREE.Mesh>(null)
  const arcMeshRefs = useRef<(THREE.Mesh | null)[]>([])

  const tFlare = useMemo(() => {
    const rows = replay?.rows ?? []
    return findFirstM1CrossingHours(rows)
  }, [replay])

  // Pre-allocated pool of 5 arc ShaderMaterials (never allocated inside useFrame)
  const arcMaterials = useMemo(() => {
    return Array.from({ length: MAX_POOLED_ARCS }, (_, idx) => {
      return new THREE.ShaderMaterial({
        vertexShader: ARC_VERTEX_SHADER,
        fragmentShader: ARC_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uGrowth: { value: 0 },
          uOpacity: { value: 0 },
          uSimTime: { value: 0 },
          uPhase: { value: idx * 1.15 },
        },
      })
    })
  }, [])

  // Camera-facing additive flash sprite material & geometry
  const flashGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const flashMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLASH_VERTEX_SHADER,
        fragmentShader: FLASH_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uIntensity: { value: 0 },
          uColor: { value: new THREE.Color('#F2A33A') },
        },
      }),
    []
  )

  // Surface active-region brightening patch (always usable for C-class and reduced-motion)
  const patchGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const patchMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLASH_VERTEX_SHADER,
        fragmentShader: FLASH_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uIntensity: { value: 0 },
          uColor: { value: new THREE.Color('#FFD17A') },
        },
      }),
    []
  )

  const [sunX, sunY, sunZ] = sunPosition
  const [earthX, earthY, earthZ] = earthPosition

  // Compute seeded site normal & regenerate pooled TubeGeometries only when tFlare / radius changes
  const { siteAnchor, pooledGeometries } = useMemo(() => {
    const seedTime = tFlare ?? 4
    const anchor = computeLimbAnchor([sunX, sunY, sunZ], [earthX, earthY, earthZ], seedTime)
    const params = generateSeededArcParams(seedTime, MAX_POOLED_ARCS)
    return {
      siteAnchor: anchor,
      pooledGeometries: params.map((arc) => buildArcTubeGeometry(anchor, sunRadius, arc)),
    }
  }, [tFlare, sunRadius, sunX, sunY, sunZ, earthX, earthY, earthZ])

  useEffect(() => {
    flareSiteRef.current.copy(siteAnchor)
  }, [siteAnchor])

  // Dispose replaced TubeGeometries and all shared GPU resources on unmount
  useEffect(() => {
    return () => {
      for (const geom of pooledGeometries) {
        geom.dispose()
      }
    }
  }, [pooledGeometries])

  useEffect(() => {
    return () => {
      for (const mat of arcMaterials) {
        mat.dispose()
      }
      flashGeometry.dispose()
      flashMaterial.dispose()
      patchGeometry.dispose()
      patchMaterial.dispose()
    }
  }, [arcMaterials, flashGeometry, flashMaterial, patchGeometry, patchMaterial])

  useFrame(({ camera }) => {
    const store = useHelioStore.getState()
    const rows = store.replay?.rows ?? []
    const simTime = store.playback.currentTimeHours
    const state = computeSolarFlareState(rows, simTime, FLARE_VISUAL_HOURS.value)

    const sitePos = flareSiteRef.current
    if (flashMeshRef.current) {
      flashMeshRef.current.position.copy(sitePos).multiplyScalar(sunRadius * 1.03)
      flashMeshRef.current.quaternion.copy(camera.quaternion)
    }
    if (patchMeshRef.current) {
      patchMeshRef.current.position.copy(sitePos).multiplyScalar(sunRadius * 1.015)
      patchMeshRef.current.quaternion.copy(camera.quaternion)
    }

    const flashMat = flashMeshRef.current?.material as THREE.ShaderMaterial | undefined
    const patchMat = patchMeshRef.current?.material as THREE.ShaderMaterial | undefined

    if (!state.active) {
      if (flashMat) flashMat.uniforms.uIntensity.value = 0
      if (patchMat) patchMat.uniforms.uIntensity.value = 0
      if (flashMeshRef.current) flashMeshRef.current.visible = false
      if (patchMeshRef.current) patchMeshRef.current.visible = false
      for (let i = 0; i < MAX_POOLED_ARCS; i += 1) {
        const mesh = arcMeshRefs.current[i]
        if (mesh) {
          mesh.visible = false
          const mat = mesh.material as THREE.ShaderMaterial
          mat.uniforms.uOpacity.value = 0
        }
      }
      return
    }

    const p = state.progress

    // Flash rise over p <= 0.1, smooth ease-out decay afterward
    const flashEnvelope =
      p <= 0.1 ? p / 0.1 : Math.pow(Math.max(0, 1 - (p - 0.1) / 0.9), 1.75)

    // Brightening patch on active site
    const patchStrength = reducedMotion
      ? Math.max(0.55, flashEnvelope * Math.max(0.65, state.flashIntensity)) * 1.15
      : state.patchOnly
        ? 0.55 * flashEnvelope
        : (0.28 + 0.45 * state.flashIntensity) * flashEnvelope

    if (patchMeshRef.current) {
      patchMeshRef.current.visible = patchStrength > 0.005
      const patchScale = sunRadius * (reducedMotion ? 0.35 : 0.25)
      patchMeshRef.current.scale.setScalar(patchScale)
    }
    if (patchMat) patchMat.uniforms.uIntensity.value = patchStrength

    // Flash sprite (optical diamond starburst at reconnection site)
    const effectiveFlash = state.patchOnly || reducedMotion ? 0 : state.flashIntensity * flashEnvelope
    if (flashMeshRef.current) {
      flashMeshRef.current.visible = effectiveFlash > 0.005
      const flashScale = sunRadius * (0.24 + 0.22 * state.flashIntensity * flashEnvelope)
      flashMeshRef.current.scale.setScalar(flashScale)
    }
    if (flashMat) flashMat.uniforms.uIntensity.value = effectiveFlash

    // Coronal loop arcs (hidden when reducedMotion or C-class patch-only)
    const activeArcCount = reducedMotion || state.patchOnly ? 0 : state.arcCount
    const arcGrowth = Math.min(1, p / 0.32)
    const arcFade = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3)
    const arcRise = Math.min(1, p / 0.08)
    const arcOpacity = arcRise * arcFade

    for (let i = 0; i < MAX_POOLED_ARCS; i += 1) {
      const mesh = arcMeshRefs.current[i]
      if (!mesh) continue
      const mat = mesh.material as THREE.ShaderMaterial
      const isActiveArc = i < activeArcCount && arcOpacity > 0.005

      mesh.visible = isActiveArc
      if (isActiveArc) {
        const stagger = Math.max(0, arcGrowth - i * 0.06)
        mat.uniforms.uGrowth.value = Math.min(1, stagger * 1.2)
        mat.uniforms.uOpacity.value = arcOpacity * (0.98 - i * 0.06)
        mat.uniforms.uSimTime.value = simTime
      } else {
        mat.uniforms.uOpacity.value = 0
      }
    }
  })

  return (
    <group name="SolarFlareGroup">
      {pooledGeometries.map((geometry, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            arcMeshRefs.current[idx] = el
          }}
          geometry={geometry}
          material={arcMaterials[idx]}
          visible={false}
          frustumCulled={false}
        />
      ))}

      <mesh
        ref={patchMeshRef}
        geometry={patchGeometry}
        material={patchMaterial}
        visible={false}
        frustumCulled={false}
      />

      <mesh
        ref={flashMeshRef}
        geometry={flashGeometry}
        material={flashMaterial}
        visible={false}
        frustumCulled={false}
      />
    </group>
  )
}
