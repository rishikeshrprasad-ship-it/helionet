import React, { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import gsap from 'gsap'
import { LunarTerrain } from '../three/LunarTerrain'
import { LunarShelters } from '../three/LunarShelters'
import { LunarRover } from '../three/LunarRover'
import { RouteLine } from '../three/RouteLine'
import { Stars } from '../three/Stars'
import { useHelioStore } from '../store/helioStore'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { findParetoRoutes } from '../engines/shelterRouting'
import type { TerrainGrid } from '../engines/terrain'
import { stepRadiationDose } from '../engines/dose'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { TOKENS } from '../tokens'

// Midpoint between Rover start (-34.4, -1.86, -31.25) and Shelter A (-17.2, 1.80, -20.31)
const DEFAULT_TARGET: [number, number, number] = [-25.5, 0.2, -25.5]
const DEFAULT_CAMERA_POS: [number, number, number] = [-46, 26, -10]

/**
 * Manages the GSAP camera dive into the lunar south pole so rover, route, and shelter frame together.
 */
function SurfaceCameraRig({
  targetPos,
  controlsRef,
}: {
  targetPos: [number, number, number]
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}): null {
  const reducedMotion = useReducedMotion()
  const setHudOpacity = useHelioStore((s) => s.setHudOpacity)
  const hasAnimated = useRef(false)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    return () => {
      tweenRef.current?.kill()
    }
  }, [])

  useFrame(({ camera, size }) => {
    if (!hasAnimated.current) {
      hasAnimated.current = true
      const aspect = size.width / Math.max(1, size.height)
      const zoomFactor = aspect < 0.85 ? 1.38 : 1.0
      const endX = targetPos[0] + (DEFAULT_CAMERA_POS[0] - targetPos[0]) * zoomFactor
      const endY = targetPos[1] + (DEFAULT_CAMERA_POS[1] - targetPos[1]) * zoomFactor
      const endZ = targetPos[2] + (DEFAULT_CAMERA_POS[2] - targetPos[2]) * zoomFactor

      const syncTarget = () => {
        if (controlsRef.current) {
          controlsRef.current.target.set(targetPos[0], targetPos[1], targetPos[2])
          controlsRef.current.update()
        } else {
          camera.lookAt(targetPos[0], targetPos[1], targetPos[2])
        }
      }

      if (reducedMotion) {
        camera.position.set(endX, endY, endZ)
        syncTarget()
        setHudOpacity(1.0)
      } else {
        // Elevated approach keeping rover, route, and shelter framed during the dive
        camera.position.set(endX, endY + 28, endZ + 22)
        syncTarget()

        tweenRef.current = gsap.to(camera.position, {
          x: endX,
          y: endY,
          z: endZ,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate: syncTarget,
          onComplete: () => {
            syncTarget()
            setHudOpacity(1.0)
          },
        })
      }
    }
  })

  return null
}

/**
 * Projects Rover 01 position into clamped viewport coordinates for the 12px status label.
 */
function RoverLabelTracker({
  roverRef,
  lineRef,
  labelRef,
}: {
  roverRef: React.RefObject<THREE.Group | null>
  lineRef: React.RefObject<SVGLineElement | null>
  labelRef: React.RefObject<HTMLDivElement | null>
}): null {
  const anchorRef = useRef(new THREE.Vector3())
  const roverProjRef = useRef(new THREE.Vector3())

  useFrame(({ camera, size }) => {
    const rover = roverRef.current
    const lineEl = lineRef.current
    const labelEl = labelRef.current
    if (!rover || !lineEl || !labelEl) return

    anchorRef.current.set(rover.position.x, rover.position.y + 0.9, rover.position.z)
    roverProjRef.current.copy(anchorRef.current).project(camera)

    if (roverProjRef.current.z > 1) {
      lineEl.style.opacity = '0'
      labelEl.style.opacity = '0'
      return
    }

    const rx = (roverProjRef.current.x * 0.5 + 0.5) * size.width
    const ry = (-roverProjRef.current.y * 0.5 + 0.5) * size.height

    const labelW = labelEl.offsetWidth || 120
    const labelH = labelEl.offsetHeight || 16
    const padX = 16
    const topBound = 56
    const bottomBound = Math.max(topBound + labelH, size.height - 108 - labelH)

    const lx = THREE.MathUtils.clamp(rx - labelW * 0.5, padX, Math.max(padX, size.width - labelW - padX))
    const ly = THREE.MathUtils.clamp(ry - 32 - labelH, topBound, bottomBound)

    labelEl.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
    labelEl.style.opacity = '1'

    const lineX2 = THREE.MathUtils.clamp(rx, lx, lx + labelW)
    const lineY2 = ly + labelH + 3

    lineEl.setAttribute('x1', rx.toFixed(1))
    lineEl.setAttribute('y1', ry.toFixed(1))
    lineEl.setAttribute('x2', lineX2.toFixed(1))
    lineEl.setAttribute('y2', lineY2.toFixed(1))
    lineEl.style.opacity = '1'
  })

  return null
}

/**
 * Keeps cumulative radiation dose smoothly synchronized with the simulation timeline.
 */
function SurfaceDoseIntegrator({ svfMap, grid }: { svfMap: Float32Array | null; grid: TerrainGrid | null }): null {
  const surface = useHelioStore((s) => s.surface)
  const setSurface = useHelioStore((s) => s.setSurface)
  const playback = useHelioStore((s) => s.playback)
  const replay = useHelioStore((s) => s.replay)
  const reducedMotion = useReducedMotion()
  const visualDoseRef = useRef<number>(surface.cumulativeDose)

  useFrame((_, delta) => {
    if (!grid || !svfMap) return

    const duration = Math.max(1, playback.durationHours)
    const clampedHours = THREE.MathUtils.clamp(playback.currentTimeHours, 0, duration)
    const steps = 48
    const stepHours = clampedHours / steps
    let dose = 0
    const rows = replay?.rows ?? []

    for (let i = 0; i < steps; i++) {
      const sampleHour = (i + 0.5) * stepHours
      const rowIdx = rows.length > 0 ? Math.min(Math.floor(sampleHour), rows.length - 1) : -1
      const p10 = rowIdx >= 0 ? rows[rowIdx].obs.p10 : 1.2
      const doseRate = 0.05 + p10 * 0.03
      const progress = sampleHour / duration
      const sheltered = progress >= 0.99

      const res = stepRadiationDose({
        currentDose: dose,
        radiationRate: doseRate,
        skyViewFactor: 0.82,
        shelterShieldingEfficacy: sheltered ? 0.98 : 0.0,
        dtSeconds: stepHours * 2.0,
        doseCap: surface.doseCap,
      })
      dose = res.dose
    }

    if (reducedMotion) {
      visualDoseRef.current = dose
    } else {
      visualDoseRef.current = THREE.MathUtils.lerp(
        visualDoseRef.current,
        dose,
        1 - Math.exp(-delta * 10),
      )
    }

    if (Math.abs(visualDoseRef.current - surface.cumulativeDose) > 0.02) {
      setSurface({ cumulativeDose: visualDoseRef.current })
    }
  })

  return null
}

export function SurfaceScene(): React.ReactElement {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const roverGroupRef = useRef<THREE.Group>(null)
  const roverLineRef = useRef<SVGLineElement>(null)
  const roverLabelRef = useRef<HTMLDivElement>(null)

  const [terrainGrid, setTerrainGrid] = useState<TerrainGrid | null>(null)
  const [svfMap, setSvfMap] = useState<Float32Array | null>(null)

  const activeRoute = useHelioStore((s) => s.surface.activeRoute)
  const isSheltered = useHelioStore((s) => s.surface.isSheltered)
  const setSurface = useHelioStore((s) => s.setSurface)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)

  const handleHeightmapReady = useCallback(
    (grid: TerrainGrid, svf: Float32Array) => {
      setTerrainGrid(grid)
      setSvfMap(svf)

      if (activeRoute.length === 0) {
        const routes = findParetoRoutes({
          grid,
          startX: 20,
          startY: 24,
          goalX: 42,
          goalY: 38,
          svfMap: svf,
          radiationRate: 0.12,
          roverSpeedMps: 1.2,
          doseCap: 50.0,
        })

        if (routes.length > 0) {
          setSurface({ activeRoute: routes[0].path })
        }
      }
    },
    [activeRoute.length, setSurface],
  )

  return (
    <ErrorBoundary label="3D Surface Canvas">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: TOKENS.color.background,
        }}
      >
        <Canvas
          shadows
          camera={{ position: DEFAULT_CAMERA_POS, fov: 45, near: 0.2, far: 1000 }}
          dpr={[1, 2]}
          onPointerMissed={() => setSelectedEntity(null)}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.12,
          }}
        >
          {/* Subtle starry background visible on horizon */}
          <Stars count={900} radius={350} />

          {/* Hemisphere fill light so shadowed crater walls remain dark grey instead of black */}
          <hemisphereLight args={['#1A2230', '#0E0F12', 0.35]} />
          <ambientLight intensity={0.12} color="#7FA6C9" />

          {/* Low-angle grazing lunar sunlight casting crater slope shadows */}
          <directionalLight
            position={[-65, 34, -35]}
            intensity={2.5}
            color="#FFF2D6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-55}
            shadow-camera-right={55}
            shadow-camera-top={55}
            shadow-camera-bottom={-55}
            shadow-camera-near={10}
            shadow-camera-far={200}
          />

          {/* 128x128 Lunar South Pole Terrain with Subtle High-Exposure Tint */}
          <LunarTerrain onHeightmapReady={handleHeightmapReady} />

          {/* 3 Dome Shelters with Moss Perimeter Rings */}
          {terrainGrid && <LunarShelters grid={terrainGrid} />}

          {/* Ivory 3px Route Line with Dark Outline */}
          {terrainGrid && <RouteLine grid={terrainGrid} />}

          {/* Larger Readable Lunar Rover */}
          {terrainGrid && <LunarRover grid={terrainGrid} roverRef={roverGroupRef} />}

          {/* 12px Screen-Space Label Tracker for Rover 01 */}
          <RoverLabelTracker
            roverRef={roverGroupRef}
            lineRef={roverLineRef}
            labelRef={roverLabelRef}
          />

          {/* Camera Dive & Dose Integration */}
          <SurfaceCameraRig targetPos={DEFAULT_TARGET} controlsRef={controlsRef} />
          <SurfaceDoseIntegrator grid={terrainGrid} svfMap={svfMap} />

          {/* User Orbit Controls framed on rover, route, and Shelter A */}
          <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={6}
            maxDistance={85}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={DEFAULT_TARGET}
            makeDefault
          />
        </Canvas>

        {/* Crisp 12px Rover 01 + state overlay */}
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
            ref={roverLineRef}
            stroke={TOKENS.color.muted}
            strokeWidth={1}
            strokeOpacity={0.75}
            style={{ opacity: 0 }}
          />
        </svg>
        <div
          ref={roverLabelRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            fontSize: '12px',
            lineHeight: 1.3,
            fontFamily: TOKENS.font.sans,
            whiteSpace: 'nowrap',
            opacity: 0,
          }}
        >
          <span style={{ color: TOKENS.color.text, fontWeight: 500 }}>Rover 01</span>
          <span
            style={{
              color: isSheltered ? TOKENS.color.moss : TOKENS.color.redOrange,
              marginLeft: 6,
            }}
          >
            · {isSheltered ? '✓ Sheltered' : '→ Racing'}
          </span>
        </div>
      </div>
    </ErrorBoundary>
  )
}
