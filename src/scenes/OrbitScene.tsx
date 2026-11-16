import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import gsap from 'gsap'
import { Starfield } from '../three/Starfield'
import { Sun } from '../three/Sun'
import { Earth } from '../three/Earth'
import { Moon } from '../three/Moon'
import { Satellites } from '../three/Satellites'
import { Links } from '../three/Links'
import { StormShell } from '../three/StormShell'
import { computeSolarFlareState } from '../three/solarFlareMath'
import { FLARE_VISUAL_HOURS } from '../config/constants'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useHelioStore, type OrbitCameraPreset } from '../store/helioStore'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { WorkerSatellite } from '../workers/simulation.worker'
import { getVisualSatellitePosition } from '../three/satelliteVisuals'
import { satelliteSelection } from '../three/satelliteSelection'
import { mulberry32 } from '../engines/random'

const SolarSystem = React.lazy(() =>
  import('../three/SolarSystem').then((m) => ({ default: m.SolarSystem }))
)

const ORBIT_PRESET_VIEWS: Record<
  OrbitCameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [0, 12, 55], target: [0, 0, 0] },
  constellation: { pos: [12, 16, 26], target: [0, 0, 0] },
  storm: { pos: [-10, 18, 42], target: [-18, 4, -10] },
  solarSystem: { pos: [0, 125, 185], target: [0, 0, 0] },
}

const SUN_POSITION: [number, number, number] = [-48, 12, -26]
const SUN_RADIUS = 16
const MOON_POSITION: [number, number, number] = [46, 12, -75]
const MOON_RADIUS = 2.8

function MoonLabelTracker({
  lineRef,
  labelRef,
}: {
  lineRef: React.RefObject<SVGLineElement | null>
  labelRef: React.RefObject<HTMLDivElement | null>
}): null {
  const moonCenterVec = useMemo(() => new THREE.Vector3(...MOON_POSITION), [])
  const projVec = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    return () => {
      if (lineRef.current) lineRef.current.style.opacity = '0'
      if (labelRef.current) labelRef.current.style.opacity = '0'
    }
  }, [lineRef, labelRef])

  useFrame(({ camera, size }) => {
    const lineEl = lineRef.current
    const labelEl = labelRef.current
    if (!lineEl || !labelEl) return

    const store = useHelioStore.getState()
    if (store.orbitCameraPreset === 'solarSystem') {
      lineEl.style.opacity = '0'
      labelEl.style.opacity = '0'
      return
    }

    projVec.copy(moonCenterVec).project(camera)
    if (projVec.z > 1) {
      lineEl.style.opacity = '0'
      labelEl.style.opacity = '0'
      return
    }

    const mx = (projVec.x * 0.5 + 0.5) * size.width
    const my = (-projVec.y * 0.5 + 0.5) * size.height

    const labelW = labelEl.offsetWidth || 190
    const labelH = labelEl.offsetHeight || 18
    const padX = 16
    const topBound = 58
    const bottomBound = Math.max(topBound + labelH, size.height - 108 - labelH)

    const lx = THREE.MathUtils.clamp(mx - labelW * 0.5, padX, Math.max(padX, size.width - labelW - padX))
    const ly = THREE.MathUtils.clamp(my - 36 - labelH, topBound, bottomBound)

    labelEl.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
    labelEl.style.opacity = '1'

    const anchorX = THREE.MathUtils.clamp(mx, lx, lx + labelW)
    const anchorY = ly + labelH + 3

    lineEl.setAttribute('x1', mx.toFixed(1))
    lineEl.setAttribute('y1', my.toFixed(1))
    lineEl.setAttribute('x2', anchorX.toFixed(1))
    lineEl.setAttribute('y2', anchorY.toFixed(1))
    lineEl.style.opacity = '1'
  })

  return null
}

function FlareLabelTracker({
  labelRef,
}: {
  labelRef: React.RefObject<HTMLDivElement | null>
}): null {
  const limbPos = useMemo(() => {
    const sunVec = new THREE.Vector3(...SUN_POSITION)
    const toEarth = new THREE.Vector3(0, 0, 0).sub(sunVec).normalize()
    return sunVec.addScaledVector(toEarth, SUN_RADIUS * 1.18)
  }, [])
  const projVec = useMemo(() => new THREE.Vector3(), [])
  const lastTextRef = useRef<string>('')

  useEffect(() => {
    return () => {
      if (labelRef.current) labelRef.current.style.opacity = '0'
    }
  }, [labelRef])

  useFrame(({ camera, size }) => {
    const labelEl = labelRef.current
    if (!labelEl) return

    const store = useHelioStore.getState()
    if (store.orbitCameraPreset === 'solarSystem') {
      labelEl.style.opacity = '0'
      return
    }

    const rows = store.replay?.rows ?? []
    const flare = computeSolarFlareState(
      rows,
      store.playback.currentTimeHours,
      FLARE_VISUAL_HOURS.value
    )

    if (!flare.active || !flare.flareClass) {
      labelEl.style.opacity = '0'
      return
    }

    const nextText = `Flare ${flare.flareClass.label}`
    if (lastTextRef.current !== nextText) {
      lastTextRef.current = nextText
      labelEl.textContent = nextText
    }

    projVec.copy(limbPos).project(camera)
    if (projVec.z > 1) {
      labelEl.style.opacity = '0'
      return
    }

    const sx = (projVec.x * 0.5 + 0.5) * size.width
    const sy = (-projVec.y * 0.5 + 0.5) * size.height

    const labelW = labelEl.offsetWidth || 88
    const labelH = labelEl.offsetHeight || 22
    const padX = 16
    const topBound = 58
    const bottomBound = Math.max(topBound + labelH, size.height - 108 - labelH)

    const lx = THREE.MathUtils.clamp(sx + 12, padX, Math.max(padX, size.width - labelW - padX))
    const ly = THREE.MathUtils.clamp(sy - labelH * 0.5, topBound, bottomBound)

    labelEl.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
    labelEl.style.opacity = '1'
  })

  return null
}

function AceLabelTracker({
  lineRef,
  labelRef,
}: {
  lineRef: React.RefObject<SVGLineElement | null>
  labelRef: React.RefObject<HTMLDivElement | null>
}): null {
  const initialEarthPhase = useMemo(() => {
    const rng = mulberry32(20261114)
    rng() // Mercury
    rng() // Venus
    return rng() * Math.PI * 2 // Earth
  }, [])
  const projVec = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    return () => {
      if (lineRef.current) lineRef.current.style.opacity = '0'
      if (labelRef.current) labelRef.current.style.opacity = '0'
    }
  }, [lineRef, labelRef])

  useFrame(({ camera, size }) => {
    const lineEl = lineRef.current
    const labelEl = labelRef.current
    if (!lineEl || !labelEl) return

    const store = useHelioStore.getState()
    if (store.orbitCameraPreset !== 'solarSystem') {
      lineEl.style.opacity = '0'
      labelEl.style.opacity = '0'
      return
    }

    const timeHours = store.playback.currentTimeHours
    const speedFactor = 120
    const orbitalSpeed = (2 * Math.PI) / ((365 * 24) / speedFactor)
    const currentAngle = initialEarthPhase + timeHours * orbitalSpeed

    const earthDistance = 38
    const l1DistanceFraction = 0.88
    const aceX = Math.cos(currentAngle) * earthDistance * l1DistanceFraction
    const aceZ = Math.sin(currentAngle) * earthDistance * l1DistanceFraction

    projVec.set(aceX, 0, aceZ).project(camera)
    if (projVec.z > 1) {
      lineEl.style.opacity = '0'
      labelEl.style.opacity = '0'
      return
    }

    const mx = (projVec.x * 0.5 + 0.5) * size.width
    const my = (-projVec.y * 0.5 + 0.5) * size.height

    const labelW = labelEl.offsetWidth || 180
    const labelH = labelEl.offsetHeight || 22
    const padX = 16
    const topBound = 58
    const bottomBound = Math.max(topBound + labelH, size.height - 108 - labelH)

    const lx = THREE.MathUtils.clamp(
      mx - labelW * 0.5,
      padX,
      Math.max(padX, size.width - labelW - padX)
    )
    const ly = THREE.MathUtils.clamp(my - 36 - labelH, topBound, bottomBound)

    labelEl.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
    labelEl.style.opacity = '1'

    const anchorX = THREE.MathUtils.clamp(mx, lx, lx + labelW)
    const anchorY = ly + labelH + 3

    lineEl.setAttribute('x1', mx.toFixed(1))
    lineEl.setAttribute('y1', my.toFixed(1))
    lineEl.setAttribute('x2', anchorX.toFixed(1))
    lineEl.setAttribute('y2', anchorY.toFixed(1))
    lineEl.style.opacity = '0.75'
  })

  return null
}

const MAX_DECAY_BADGES = 3

interface DecayBadgeRefs {
  divRefs: React.RefObject<HTMLDivElement | null>[]
  lineRefs: React.RefObject<SVGLineElement | null>[]
}

function DecayBadgesTracker({
  badgeRefs,
}: {
  badgeRefs: DecayBadgeRefs
}): null {
  const projVec = useMemo(() => new THREE.Vector3(), [])
  const satPos = useMemo(() => new THREE.Vector3(), [])
  const lastHtmlRefs = useRef<string[]>(['', '', ''])
  const candidatesRef = useRef<WorkerSatellite[]>([])

  useEffect(() => {
    return () => {
      badgeRefs.divRefs.forEach((r) => {
        if (r.current) r.current.style.opacity = '0'
      })
      badgeRefs.lineRefs.forEach((r) => {
        if (r.current) r.current.style.opacity = '0'
      })
    }
  }, [badgeRefs])

  useFrame(({ camera, size }) => {
    const store = useHelioStore.getState()
    if (store.presentationMode || store.orbitCameraPreset === 'solarSystem') {
      for (let s = 0; s < MAX_DECAY_BADGES; s += 1) {
        if (badgeRefs.divRefs[s].current) badgeRefs.divRefs[s].current!.style.opacity = '0'
        if (badgeRefs.lineRefs[s].current) badgeRefs.lineRefs[s].current!.style.opacity = '0'
      }
      return
    }

    const sats = store.constellation.satellites
    const selectedId = satelliteSelection.selectedId

    // Find decaying or selected satellites
    const candidates = candidatesRef.current
    candidates.length = 0
    if (selectedId !== null && sats[selectedId]) {
      candidates.push(sats[selectedId])
    }
    for (let i = 0; i < sats.length; i += 1) {
      const s = sats[i]
      if (s.id !== selectedId && (s.status === 'atRisk' || s.status === 'lost' || s.altitudeKm < 500)) {
        candidates.push(s)
      }
    }

    // Sort by lowest altitude so the most degraded ones are prioritized
    candidates.sort((a, b) => a.altitudeKm - b.altitudeKm)

    for (let slot = 0; slot < MAX_DECAY_BADGES; slot += 1) {
      const divEl = badgeRefs.divRefs[slot].current
      const lineEl = badgeRefs.lineRefs[slot].current
      const sat = candidates[slot]

      if (!divEl || !lineEl || !sat) {
        if (divEl) divEl.style.opacity = '0'
        if (lineEl) lineEl.style.opacity = '0'
        continue
      }

      getVisualSatellitePosition(sat, satPos)
      projVec.copy(satPos).project(camera)

      if (projVec.z > 1) {
        divEl.style.opacity = '0'
        lineEl.style.opacity = '0'
        continue
      }

      const sx = (projVec.x * 0.5 + 0.5) * size.width
      const sy = (-projVec.y * 0.5 + 0.5) * size.height

      const isLost = sat.status === 'lost'
      const deltaAlt = Math.max(0, Math.round(550 - sat.altitudeKm))
      const statusColor = isLost ? '#FF453A' : '#FFB020'

      const htmlContent = `
        <span style="font-weight:600;color:${statusColor};margin-right:6px">SAT-${sat.id}</span>
        <span style="color:#C9CDD4">${Math.round(sat.altitudeKm)} km</span>
        <span style="color:${statusColor};font-weight:600;margin-left:6px">▼-${deltaAlt} km</span>
      `

      if (lastHtmlRefs.current[slot] !== htmlContent) {
        lastHtmlRefs.current[slot] = htmlContent
        divEl.innerHTML = htmlContent
        divEl.style.borderColor = isLost ? 'rgba(255, 69, 58, 0.7)' : 'rgba(255, 176, 32, 0.7)'
      }

      const bw = divEl.offsetWidth || 140
      const bh = divEl.offsetHeight || 22
      const padX = 16
      const topBound = 60
      const bottomBound = Math.max(topBound + bh, size.height - 110 - bh)

      const bx = THREE.MathUtils.clamp(sx + 14, padX, Math.max(padX, size.width - bw - padX))
      const by = THREE.MathUtils.clamp(sy - bh - 16, topBound, bottomBound)

      divEl.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`
      divEl.style.opacity = '1'

      lineEl.setAttribute('x1', sx.toFixed(1))
      lineEl.setAttribute('y1', sy.toFixed(1))
      lineEl.setAttribute('x2', bx.toFixed(1))
      lineEl.setAttribute('y2', (by + bh).toFixed(1))
      lineEl.setAttribute('stroke', statusColor)
      lineEl.style.opacity = '0.65'
    }
  })

  return null
}

/**
 * Handles slow cinematic camera orbit in landing mode and smooth preset transitions
 * in orbit mode, respecting prefers-reduced-motion.
 */
function CameraRig({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}): null {
  const scene = useHelioStore((s) => s.scene)
  const orbitCameraPreset = useHelioStore((s) => s.orbitCameraPreset)
  const orbitCameraSeq = useHelioStore((s) => s.orbitCameraSeq)
  const selectedEntity = useHelioStore((s) => s.selectedEntity)
  const reducedMotion = useReducedMotion()
  const { camera } = useThree()
  const timeRef = useRef(0)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const targetTweenRef = useRef<gsap.core.Tween | null>(null)

  // Track focused satellite perspective when selected
  useEffect(() => {
    if (scene !== 'orbit') return

    if (selectedEntity?.kind === 'satellite') {
      const satellites = useHelioStore.getState().constellation.satellites
      const sat = satellites.find((s) => s.id === selectedEntity.id)
      if (!sat) return

      const satPos = new THREE.Vector3()
      getVisualSatellitePosition(sat, satPos)

      // Perspective offset: position camera slightly behind and above satellite
      const normal = satPos.clone().normalize()
      const camTargetPos = satPos.clone().add(normal.clone().multiplyScalar(3.2)).add(new THREE.Vector3(0, 1.2, 1.5))

      tweenRef.current?.kill()
      targetTweenRef.current?.kill()

      if (reducedMotion) {
        camera.position.copy(camTargetPos)
        if (controlsRef.current) {
          controlsRef.current.target.copy(satPos)
          controlsRef.current.update()
        } else {
          camera.lookAt(satPos)
        }
        return
      }

      // Smooth flight animation to satellite perspective (0.85s)
      tweenRef.current = gsap.to(camera.position, {
        x: camTargetPos.x,
        y: camTargetPos.y,
        z: camTargetPos.z,
        duration: 0.85,
        ease: 'power2.out',
        onUpdate: () => {
          controlsRef.current?.update()
        },
      })

      if (controlsRef.current) {
        targetTweenRef.current = gsap.to(controlsRef.current.target, {
          x: satPos.x,
          y: satPos.y,
          z: satPos.z,
          duration: 0.85,
          ease: 'power2.out',
          onUpdate: () => {
            controlsRef.current?.update()
          },
        })
      }
    }
  }, [scene, selectedEntity, reducedMotion, camera, controlsRef])

  useEffect(() => {
    if (scene !== 'orbit' || orbitCameraSeq === 0) return

    const view = ORBIT_PRESET_VIEWS[orbitCameraPreset]
    tweenRef.current?.kill()
    targetTweenRef.current?.kill()

    if (reducedMotion) {
      camera.position.set(...view.pos)
      if (controlsRef.current) {
        controlsRef.current.target.set(...view.target)
        controlsRef.current.update()
      } else {
        camera.lookAt(...view.target)
      }
      return
    }

    const flightDuration = orbitCameraPreset === 'solarSystem' ? 1.8 : 0.85

    tweenRef.current = gsap.to(camera.position, {
      x: view.pos[0],
      y: view.pos[1],
      z: view.pos[2],
      duration: flightDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        controlsRef.current?.update()
      },
    })

    if (controlsRef.current) {
      targetTweenRef.current = gsap.to(controlsRef.current.target, {
        x: view.target[0],
        y: view.target[1],
        z: view.target[2],
        duration: flightDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          controlsRef.current?.update()
        },
      })
    }

    return () => {
      tweenRef.current?.kill()
      targetTweenRef.current?.kill()
    }
  }, [scene, orbitCameraPreset, orbitCameraSeq, reducedMotion, camera, controlsRef])

  useFrame(({ camera: frameCamera }, delta) => {
    if (scene === 'landing' && !reducedMotion) {
      timeRef.current += delta * 0.05
      const t = timeRef.current
      const radius = 55
      frameCamera.position.x = Math.sin(t) * radius
      frameCamera.position.z = Math.cos(t) * radius
      frameCamera.position.y = 12 + Math.sin(t * 0.5) * 4
      frameCamera.lookAt(0, 0, 0)
    } else if (scene === 'orbit' && selectedEntity?.kind === 'satellite' && controlsRef.current) {
      // Keep orbit controls target tracking the orbiting satellite
      const satellites = useHelioStore.getState().constellation.satellites
      const sat = satellites.find((s) => s.id === selectedEntity.id)
      if (sat && !tweenRef.current?.isActive()) {
        const satPos = getVisualSatellitePosition(sat)
        controlsRef.current.target.lerp(satPos, 0.12)
        controlsRef.current.update()
      }
    }
  })

  return null
}

interface OrbitSceneProps {
  interactive?: boolean
}

export function OrbitScene({ interactive = true }: OrbitSceneProps): React.ReactElement {
  const scene = useHelioStore((s) => s.scene)
  const presentationMode = useHelioStore((s) => s.presentationMode)
  const orbitCameraPreset = useHelioStore((s) => s.orbitCameraPreset)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const moonLineRef = useRef<SVGLineElement>(null)
  const moonLabelRef = useRef<HTMLDivElement>(null)
  const flareLabelRef = useRef<HTMLDivElement>(null)
  const aceLineRef = useRef<SVGLineElement>(null)
  const aceLabelRef = useRef<HTMLDivElement>(null)

  const decayDivRef0 = useRef<HTMLDivElement>(null)
  const decayDivRef1 = useRef<HTMLDivElement>(null)
  const decayDivRef2 = useRef<HTMLDivElement>(null)
  const decayLineRef0 = useRef<SVGLineElement>(null)
  const decayLineRef1 = useRef<SVGLineElement>(null)
  const decayLineRef2 = useRef<SVGLineElement>(null)

  const badgeRefs = useMemo(
    () => ({
      divRefs: [decayDivRef0, decayDivRef1, decayDivRef2],
      lineRefs: [decayLineRef0, decayLineRef1, decayLineRef2],
    }),
    []
  )

  useEffect(() => {
    if (orbitCameraPreset === 'solarSystem') {
      if (moonLineRef.current) moonLineRef.current.style.opacity = '0'
      if (moonLabelRef.current) moonLabelRef.current.style.opacity = '0'
      if (flareLabelRef.current) flareLabelRef.current.style.opacity = '0'
      if (decayLineRef0.current) decayLineRef0.current.style.opacity = '0'
      if (decayLineRef1.current) decayLineRef1.current.style.opacity = '0'
      if (decayLineRef2.current) decayLineRef2.current.style.opacity = '0'
      if (decayDivRef0.current) decayDivRef0.current.style.opacity = '0'
      if (decayDivRef1.current) decayDivRef1.current.style.opacity = '0'
      if (decayDivRef2.current) decayDivRef2.current.style.opacity = '0'
    } else {
      if (aceLineRef.current) aceLineRef.current.style.opacity = '0'
      if (aceLabelRef.current) aceLabelRef.current.style.opacity = '0'
    }
  }, [orbitCameraPreset])

  return (
    <ErrorBoundary label="3D Orbit Canvas">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#0E0F12',
        }}
      >
        <Canvas
          camera={{ position: [0, 12, 55], fov: 45, near: 0.5, far: 2000 }}
          dpr={[1, 1.5]} // Capped at 1.5 for silky 60 FPS without high-DPI GPU fill-rate throttling
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
        >
          {/* Ambient fill (~0.35) so night side, continents and city lights stay clearly visible instead of pure black */}
          <ambientLight intensity={0.35} color="#8CA5C8" />

          {/* Deep space starfield (milkyway inside-out sphere or procedural stars) */}
          <Starfield radius={700} />

          {orbitCameraPreset === 'solarSystem' ? (
            <React.Suspense fallback={null}>
              <SolarSystem />
              <AceLabelTracker lineRef={aceLineRef} labelRef={aceLabelRef} />
            </React.Suspense>
          ) : (
            <>
              {/* Primary direct sunlight from the Sun */}
              <directionalLight position={SUN_POSITION} intensity={2.6} color="#FFF3E0" />

              {/* Soft space fill light from camera angle so Earth continents, oceans and satellites are clearly visible from front */}
              <directionalLight position={[15, 20, 50]} intensity={0.85} color="#A8C4E0" />

              {/* Sun: only glowing object in the scene, partly visible in initial frame */}
              <Sun position={SUN_POSITION} radius={SUN_RADIUS} />

              {/* CME plasma shockwave expanding towards Earth */}
              <StormShell sunPosition={SUN_POSITION} earthPosition={[0, 0, 0]} />

              {/* Earth with Day/Night and procedural/textured continents */}
              <Earth position={[0, 0, 0]} radius={10} sunPosition={SUN_POSITION} />

              {/* 120 Instanced Satellites in 6 Orbital Planes */}
              <Satellites />

              {/* Dynamic Intersatellite Links & Dijkstra Rerouted Path */}
              <Links />

              {/* Moon in the distance */}
              <Moon position={MOON_POSITION} radius={MOON_RADIUS} sunPosition={SUN_POSITION} />

              {/* Keep screen-space Moon & Flare labels inside viewport */}
              <MoonLabelTracker lineRef={moonLineRef} labelRef={moonLabelRef} />
              <FlareLabelTracker labelRef={flareLabelRef} />
              <DecayBadgesTracker badgeRefs={badgeRefs} />
            </>
          )}

          {/* Smooth camera animation */}
          <CameraRig controlsRef={controlsRef} />

          {/* Interactive controls when in orbit mode */}
          {scene === 'orbit' && interactive && (
            <OrbitControls
              ref={controlsRef}
              enableDamping={true}
              dampingFactor={0.05}
              minDistance={16}
              maxDistance={320}
              rotateSpeed={0.8}
              zoomSpeed={0.9}
              makeDefault
            />
          )}
        </Canvas>

        {/* Soft vignette over the canvas (radial gradient from transparent to 35% black at the corners, no glow) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            background: 'radial-gradient(circle at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.35) 100%)',
          }}
        />

        {/* Viewport-clamped 12px Moon label + thin leader line */}
        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <line
            ref={moonLineRef}
            stroke="#8B8F98"
            strokeWidth={1}
            strokeOpacity={0.65}
            style={{ opacity: 0 }}
          />
          <line
            ref={aceLineRef}
            stroke="#C8D2DE"
            strokeWidth={1}
            strokeOpacity={0.65}
            style={{ opacity: 0 }}
          />
          <line ref={decayLineRef0} stroke="#FFB020" strokeWidth={1} strokeDasharray="3 3" style={{ opacity: 0 }} />
          <line ref={decayLineRef1} stroke="#FFB020" strokeWidth={1} strokeDasharray="3 3" style={{ opacity: 0 }} />
          <line ref={decayLineRef2} stroke="#FFB020" strokeWidth={1} strokeDasharray="3 3" style={{ opacity: 0 }} />
        </svg>

        {orbitCameraPreset === 'solarSystem' && (
          <div
            style={{
              position: 'absolute',
              top: '104px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '12px',
              fontFamily: "'IBM Plex Sans', sans-serif",
              color: '#C8D2DE',
              backgroundColor: 'rgba(14, 15, 18, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '2px 8px',
              letterSpacing: '0.02em',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            Schematic, not to scale
          </div>
        )}

        <div
          ref={aceLabelRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            fontSize: '12px',
            lineHeight: 1.3,
            fontFamily: "'IBM Plex Sans', sans-serif",
            whiteSpace: 'nowrap',
            color: '#E8E6E1',
            backgroundColor: 'rgba(14, 15, 18, 0.78)',
            border: '1px solid rgba(200, 210, 222, 0.45)',
            borderRadius: '4px',
            padding: '2px 7px',
            opacity: 0,
          }}
        >
          ACE (solar wind monitor)
        </div>
        <div
          ref={moonLabelRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            fontSize: '12px',
            lineHeight: 1.3,
            fontFamily: "'IBM Plex Sans', sans-serif",
            whiteSpace: 'nowrap',
            opacity: 0,
          }}
        >
          <span style={{ color: '#E8E6E1', fontWeight: 500 }}>Moon</span>
          {!presentationMode && (
            <span style={{ color: '#8B8F98', marginLeft: 6 }}>· Schematic, not to scale</span>
          )}
        </div>
        <div
          ref={flareLabelRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            fontSize: '14px',
            lineHeight: 1.3,
            fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            color: '#FFF4D2',
            backgroundColor: 'rgba(14, 15, 18, 0.78)',
            border: '1px solid rgba(242, 163, 58, 0.45)',
            borderRadius: '4px',
            padding: '2px 7px',
            whiteSpace: 'nowrap',
            opacity: 0,
          }}
        />

        {/* Floating Delta-h telemetry badges for decaying satellites */}
        {[decayDivRef0, decayDivRef1, decayDivRef2].map((ref, idx) => (
          <div
            key={idx}
            ref={ref}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '11px',
              lineHeight: 1.3,
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: 'rgba(14, 15, 18, 0.88)',
              border: '1px solid rgba(255, 176, 32, 0.6)',
              borderRadius: '4px',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
              opacity: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          />
        ))}
      </div>
    </ErrorBoundary>
  )
}
