import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useHelioStore } from '../store/helioStore'
import { TOKENS } from '../tokens'
import type { WorkerSatellite } from '../workers/simulation.worker'
import { ModelBoundary } from './ModelBoundary'
import { useVerifiedAssetUrl } from './modelUtils'
import { satelliteSelection } from './satelliteSelection'
import { getVisualSatellitePosition } from './satelliteVisuals'

const MAX_SATELLITES = 120
const SATELLITE_SCALE_FACTOR = 0.85
const TARGET_GLB_SATELLITE_SIZE = 1.65
const COLOR_TRANSITION_DURATION_S = 0.4 // 400ms state color change

const COLOR_NOMINAL = new THREE.Color('#E2E6EE')
const COLOR_AT_RISK = new THREE.Color(TOKENS.color.amber)
const COLOR_LOST = new THREE.Color(TOKENS.color.redOrange)
const COLOR_SOLAR_PANEL = new THREE.Color('#141E30')
const COLOR_RADIO_METAL = new THREE.Color('#CCD2DC')

const dummy = new THREE.Object3D()
const scratchColor = new THREE.Color()
const orbitVelocity = new THREE.Vector3()
const orbitRadial = new THREE.Vector3()
const orbitNormal = new THREE.Vector3()
const orbitUp = new THREE.Vector3()
const orbitBasisMatrix = new THREE.Matrix4()
const scratchNextPos = new THREE.Vector3()

function getStatusCode(status: 'nominal' | 'atRisk' | 'lost'): number {
  if (status === 'atRisk') return 1
  if (status === 'lost') return 2
  return 0
}

function getStatusColor(code: number): THREE.Color {
  if (code === 1) return COLOR_AT_RISK
  if (code === 2) return COLOR_LOST
  return COLOR_NOMINAL
}

function tagPanelAttribute(geom: THREE.BufferGeometry, value: number): void {
  const count = geom.getAttribute('position').count
  const attr = new Float32Array(count)
  if (value !== 0) attr.fill(value)
  geom.setAttribute('aPanel', new THREE.BufferAttribute(attr, 1))
}

function createProceduralSatelliteGeometry(): THREE.BufferGeometry {
  const s = SATELLITE_SCALE_FACTOR

  const body = new THREE.BoxGeometry(0.3 * s, 0.3 * s, 0.45 * s)
  tagPanelAttribute(body, 0.0)

  const panelLeft = new THREE.BoxGeometry(0.9 * s, 0.02 * s, 0.35 * s)
  panelLeft.translate(-0.6 * s, 0, 0)
  tagPanelAttribute(panelLeft, 1.0)

  const panelRight = new THREE.BoxGeometry(0.9 * s, 0.02 * s, 0.35 * s)
  panelRight.translate(0.6 * s, 0, 0)
  tagPanelAttribute(panelRight, 1.0)

  const antenna = new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.25 * s, 8)
  antenna.translate(0, 0.25 * s, 0.1 * s)
  tagPanelAttribute(antenna, 0.0)

  const merged = BufferGeometryUtils.mergeGeometries([body, panelLeft, panelRight, antenna])
  body.dispose()
  panelLeft.dispose()
  panelRight.dispose()
  antenna.dispose()

  if (merged) {
    merged.computeVertexNormals()
    return merged
  }

  const fallback = new THREE.BoxGeometry(0.3 * s, 0.3 * s, 0.45 * s)
  tagPanelAttribute(fallback, 0.0)
  return fallback
}

function extractMergedPartGeometry(root: THREE.Object3D): THREE.BufferGeometry {
  root.updateMatrixWorld(true)
  const parts: THREE.BufferGeometry[] = []

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (!mesh.geometry) return
      const nonIndexed = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      nonIndexed.applyMatrix4(mesh.matrixWorld)

      // Keep only consistent attributes so multi-mesh GLBs merge without mismatch
      for (const attrName of Object.keys(nonIndexed.attributes)) {
        if (attrName !== 'position' && attrName !== 'normal') {
          nonIndexed.deleteAttribute(attrName)
        }
      }
      if (!nonIndexed.getAttribute('normal')) {
        nonIndexed.computeVertexNormals()
      }
      parts.push(nonIndexed)
    }
  })

  if (parts.length === 0) {
    return new THREE.BoxGeometry(0.18, 0.18, 0.18)
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts, false)
  for (const part of parts) {
    part.dispose()
  }
  if (!merged) {
    return new THREE.BoxGeometry(0.18, 0.18, 0.18)
  }
  merged.computeBoundingBox()
  merged.computeVertexNormals()
  return merged
}

function useSatelliteInteraction(satellites: WorkerSatellite[]) {
  const setHoveredEntity = useHelioStore((s) => s.setHoveredEntity)
  const setSelectedEntity = useHelioStore((s) => s.setSelectedEntity)
  const lastHoverPosRef = useRef<{ id: number; x: number; y: number } | null>(null)

  useEffect(() => {
    return () => {
      satelliteSelection.hoveredId = null
      satelliteSelection.selectedId = null
      lastHoverPosRef.current = null
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto'
      }
    }
  }, [])

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.instanceId !== undefined && e.instanceId < satellites.length) {
      const sat = satellites[e.instanceId]
      const satId = sat ? sat.id : e.instanceId
      satelliteSelection.hoveredId = e.instanceId
      document.body.style.cursor = 'pointer'
      const x = e.nativeEvent.clientX
      const y = e.nativeEvent.clientY
      const prev = lastHoverPosRef.current
      if (!prev || prev.id !== satId || Math.abs(prev.x - x) > 5 || Math.abs(prev.y - y) > 5) {
        lastHoverPosRef.current = { id: satId, x, y }
        setHoveredEntity({ kind: 'satellite', id: satId, x, y })
      }
    }
  }

  const handlePointerOut = () => {
    satelliteSelection.hoveredId = null
    lastHoverPosRef.current = null
    setHoveredEntity(null)
    document.body.style.cursor = 'auto'
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId !== undefined && e.instanceId < satellites.length) {
      const sat = satellites[e.instanceId]
      const satId = sat ? sat.id : e.instanceId
      const isDeselect = satelliteSelection.selectedId === e.instanceId
      satelliteSelection.selectedId = isDeselect ? null : e.instanceId
      setSelectedEntity(isDeselect ? null : { kind: 'satellite', id: satId })
    }
  }

  const handlePointerMissed = () => {
    satelliteSelection.selectedId = null
    setSelectedEntity(null)
  }

  return {
    handlePointerMove,
    handlePointerOut,
    handleClick,
    handlePointerMissed,
  }
}

interface InstanceUpdateRefs {
  lostFadeRef: React.MutableRefObject<Float32Array>
  statusCodeRef: React.MutableRefObject<Int8Array>
  colorFromRgbRef: React.MutableRefObject<Float32Array>
  colorCurRgbRef: React.MutableRefObject<Float32Array>
  colorProgressRef: React.MutableRefObject<Float32Array>
  opacityArrayRef: React.MutableRefObject<Float32Array>
  opacityAttrRef: React.MutableRefObject<THREE.InstancedBufferAttribute>
  safeModeAttitudeRef: React.MutableRefObject<number>
}

function useInstanceTrackingRefs(): InstanceUpdateRefs {
  const lostFadeRef = useRef<Float32Array>(new Float32Array(MAX_SATELLITES).fill(1.0))
  const statusCodeRef = useRef<Int8Array>(new Int8Array(MAX_SATELLITES).fill(-1))
  const colorFromRgbRef = useRef<Float32Array>(new Float32Array(MAX_SATELLITES * 3))
  const colorCurRgbRef = useRef<Float32Array>(new Float32Array(MAX_SATELLITES * 3))
  const colorProgressRef = useRef<Float32Array>(new Float32Array(MAX_SATELLITES).fill(1.0))
  const opacityArrayRef = useRef<Float32Array>(new Float32Array(MAX_SATELLITES).fill(1.0))
  const opacityAttrRef = useRef<THREE.InstancedBufferAttribute>(
    new THREE.InstancedBufferAttribute(opacityArrayRef.current, 1)
  )
  const safeModeAttitudeRef = useRef<number>(0.0)
  return {
    lostFadeRef,
    statusCodeRef,
    colorFromRgbRef,
    colorCurRgbRef,
    colorProgressRef,
    opacityArrayRef,
    opacityAttrRef,
    safeModeAttitudeRef,
  }
}

function stepSatellitesFrame(
  satellites: WorkerSatellite[],
  camera: THREE.Camera,
  viewHeight: number,
  delta: number,
  reducedMotion: boolean,
  refs: InstanceUpdateRefs,
  bodyMesh: THREE.InstancedMesh,
  extraMeshes: (THREE.InstancedMesh | null)[]
): void {
  bodyMesh.count = satellites.length
  for (const extra of extraMeshes) {
    if (extra) extra.count = satellites.length
  }
  if (satellites.length === 0) return

  const persCamera = camera as THREE.PerspectiveCamera
  const fovRad = persCamera.fov ? (persCamera.fov * Math.PI) / 180 : 0.8
  const safeHeight = viewHeight || 800
  const fadeStep = delta * 0.7

  // Safe mode attitude & orbit boost:
  // Active when operator approved mitigation action (safe mode) and storm is not resolved,
  // or when storm is actively confirmed and operator hasn't rejected it.
  // Smoothly unwinds back to nominal nadir pointing when operator resets choice or when storm resolves.
  const alert = useHelioStore.getState().alert
  const isSafeModeTarget =
    (alert.userChoice === 'approved' || (alert.status === 'CONFIRMED' && alert.userChoice !== 'rejected')) &&
    alert.status !== 'RESOLVED'
  const targetAttitude = isSafeModeTarget ? 1.0 : 0.0
  const curAttitude = refs.safeModeAttitudeRef.current
  const nextAttitude = reducedMotion
    ? targetAttitude
    : THREE.MathUtils.damp(curAttitude, targetAttitude, 4.0, delta)
  refs.safeModeAttitudeRef.current = nextAttitude

  for (let i = 0; i < satellites.length; i += 1) {
    const sat = satellites[i]

    if (sat.status === 'lost') {
      refs.lostFadeRef.current[i] = reducedMotion
        ? 0.0
        : Math.max(0.0, refs.lostFadeRef.current[i] - fadeStep)
    } else {
      refs.lostFadeRef.current[i] = 1.0
    }
    const opacity = refs.lostFadeRef.current[i]
    refs.opacityArrayRef.current[i] = opacity

    getVisualSatellitePosition(sat, dummy.position)

    // Authentic orbital mechanics orientation:
    // Flight direction (velocity) along track, solar arrays along orbit normal, antenna pointing radially
    const nextIdx = sat.plane * 20 + ((sat.indexInPlane + 1) % 20)
    const nextSat = satellites[nextIdx]
    if (nextSat) {
      getVisualSatellitePosition(nextSat, scratchNextPos)

      orbitRadial.copy(dummy.position).normalize()

      // When mitigation action is active, boost operational satellites outward into safe corridor
      if (sat.status !== 'lost' && nextAttitude > 0.001) {
        dummy.position.addScaledVector(orbitRadial, nextAttitude * 0.35)
      }

      orbitVelocity.subVectors(scratchNextPos, dummy.position).normalize()
      orbitNormal.crossVectors(orbitRadial, orbitVelocity).normalize()
      orbitUp.crossVectors(orbitVelocity, orbitNormal).normalize()

      // Safe mode: pivot solar arrays 90 degrees into knife-edge orientation to minimize drag
      if (nextAttitude > 0.001) {
        orbitNormal.applyAxisAngle(orbitVelocity, nextAttitude * (Math.PI / 2))
        orbitUp.applyAxisAngle(orbitVelocity, nextAttitude * (Math.PI / 2))
      }

      orbitBasisMatrix.makeBasis(orbitNormal, orbitUp, orbitVelocity)
      dummy.quaternion.setFromRotationMatrix(orbitBasisMatrix)
    } else {
      dummy.lookAt(dummy.position.x * 2, dummy.position.y * 2, dummy.position.z * 2)
    }

    let baseScale = 1.0
    if (sat.status === 'lost') {
      baseScale = 0.55 + 0.35 * opacity
    } else if (sat.status === 'atRisk') {
      baseScale = 1.15
    }

    const dist = camera.position.distanceTo(dummy.position)
    const minWorldSize = (7 * 2 * dist * Math.tan(fovRad / 2)) / safeHeight
    const minScale = minWorldSize / TARGET_GLB_SATELLITE_SIZE
    const finalScale = Math.max(baseScale, minScale)

    dummy.scale.set(finalScale, finalScale, finalScale)
    dummy.updateMatrix()

    bodyMesh.setMatrixAt(i, dummy.matrix)
    for (const extra of extraMeshes) {
      if (extra) extra.setMatrixAt(i, dummy.matrix)
    }

    // 400ms smooth state color transition on satellite body
    const nextCode = getStatusCode(sat.status)
    const prevCode = refs.statusCodeRef.current[i]
    const targetColor = getStatusColor(nextCode)
    const rgbBase = i * 3

    if (prevCode === -1 || reducedMotion) {
      refs.statusCodeRef.current[i] = nextCode
      refs.colorProgressRef.current[i] = 1.0
      refs.colorFromRgbRef.current[rgbBase] = targetColor.r
      refs.colorFromRgbRef.current[rgbBase + 1] = targetColor.g
      refs.colorFromRgbRef.current[rgbBase + 2] = targetColor.b
      refs.colorCurRgbRef.current[rgbBase] = targetColor.r
      refs.colorCurRgbRef.current[rgbBase + 1] = targetColor.g
      refs.colorCurRgbRef.current[rgbBase + 2] = targetColor.b
      bodyMesh.setColorAt(i, targetColor)
    } else {
      if (prevCode !== nextCode) {
        refs.statusCodeRef.current[i] = nextCode
        refs.colorFromRgbRef.current[rgbBase] = refs.colorCurRgbRef.current[rgbBase]
        refs.colorFromRgbRef.current[rgbBase + 1] = refs.colorCurRgbRef.current[rgbBase + 1]
        refs.colorFromRgbRef.current[rgbBase + 2] = refs.colorCurRgbRef.current[rgbBase + 2]
        refs.colorProgressRef.current[i] = 0.0
      }

      if (refs.colorProgressRef.current[i] < 1.0) {
        refs.colorProgressRef.current[i] = Math.min(
          1.0,
          refs.colorProgressRef.current[i] + delta / COLOR_TRANSITION_DURATION_S
        )
      }

      const t = refs.colorProgressRef.current[i]
      const eased = 1 - Math.pow(1 - t, 3)
      const r =
        refs.colorFromRgbRef.current[rgbBase] +
        (targetColor.r - refs.colorFromRgbRef.current[rgbBase]) * eased
      const g =
        refs.colorFromRgbRef.current[rgbBase + 1] +
        (targetColor.g - refs.colorFromRgbRef.current[rgbBase + 1]) * eased
      const b =
        refs.colorFromRgbRef.current[rgbBase + 2] +
        (targetColor.b - refs.colorFromRgbRef.current[rgbBase + 2]) * eased

      refs.colorCurRgbRef.current[rgbBase] = r
      refs.colorCurRgbRef.current[rgbBase + 1] = g
      refs.colorCurRgbRef.current[rgbBase + 2] = b
      scratchColor.setRGB(r, g, b)
      bodyMesh.setColorAt(i, scratchColor)
    }
  }

  bodyMesh.instanceMatrix.needsUpdate = true
  if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true
  for (const extra of extraMeshes) {
    if (extra) extra.instanceMatrix.needsUpdate = true
  }
  refs.opacityAttrRef.current.needsUpdate = true
}

function ProceduralSatellites({ satellites }: { satellites: WorkerSatellite[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const reducedMotion = useReducedMotion()
  const refs = useInstanceTrackingRefs()
  const interactions = useSatelliteInteraction(satellites)

  const geometry = useMemo(() => {
    const geom = createProceduralSatelliteGeometry()
    geom.setAttribute('aOpacity', refs.opacityAttrRef.current)
    return geom
  }, [refs.opacityAttrRef])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < MAX_SATELLITES; i += 1) {
      mesh.setColorAt(i, COLOR_NOMINAL)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
  }, [geometry])

  const handleBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uPanelColor = { value: COLOR_SOLAR_PANEL }

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aPanel;
          attribute float aOpacity;
          varying float vIsPanel;
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_vertex>',
          `#include <color_vertex>
          vIsPanel = aPanel;
          vInstanceOpacity = aOpacity;`
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uPanelColor;
          varying float vIsPanel;
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          if (vIsPanel > 0.5) {
            diffuseColor.rgb = uPanelColor;
          }
          diffuseColor.a *= vInstanceOpacity;
          if (diffuseColor.a <= 0.01) discard;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * 0.08;`
        )
    },
    []
  )

  useFrame(({ camera, size }, delta) => {
    if (!meshRef.current) return
    stepSatellitesFrame(
      satellites,
      camera,
      size.height,
      delta,
      reducedMotion,
      refs,
      meshRef.current,
      []
    )
  })

  const instancedArgs = useMemo(
    () => [geometry, undefined, MAX_SATELLITES] as [THREE.BufferGeometry, undefined, number],
    [geometry]
  )
  const cacheKey = useMemo(() => () => 'helionet-sat-proc-v2', [])

  return (
    <instancedMesh
      ref={meshRef}
      args={instancedArgs}
      frustumCulled={false}
      onPointerMove={interactions.handlePointerMove}
      onPointerOut={interactions.handlePointerOut}
      onClick={interactions.handleClick}
      onPointerMissed={interactions.handlePointerMissed}
    >
      <meshStandardMaterial
        metalness={0.75}
        roughness={0.28}
        transparent={true}
        depthWrite={true}
        onBeforeCompile={handleBeforeCompile}
        customProgramCacheKey={cacheKey}
      />
    </instancedMesh>
  )
}

function SingleGlbSatellites({
  url,
  satellites,
}: {
  url: string
  satellites: WorkerSatellite[]
}) {
  const gltf = useGLTF(url, '/draco/', true)

  const bodyMeshRef = useRef<THREE.InstancedMesh>(null)
  const wingsMeshRef = useRef<THREE.InstancedMesh>(null)
  const radioMeshRef = useRef<THREE.InstancedMesh>(null)

  const reducedMotion = useReducedMotion()
  const refs = useInstanceTrackingRefs()
  const interactions = useSatelliteInteraction(satellites)

  const geometries = useMemo(() => {
    const bodyParts: THREE.BufferGeometry[] = []
    const wingsParts: THREE.BufferGeometry[] = []
    const radioParts: THREE.BufferGeometry[] = []

    gltf.scene.updateMatrixWorld(true)
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (!mesh.geometry) return
        const nonIndexed = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
        nonIndexed.applyMatrix4(mesh.matrixWorld)
        for (const attrName of Object.keys(nonIndexed.attributes)) {
          if (attrName !== 'position' && attrName !== 'normal') {
            nonIndexed.deleteAttribute(attrName)
          }
        }
        if (!nonIndexed.getAttribute('normal')) {
          nonIndexed.computeVertexNormals()
        }

        const matName = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.name.toLowerCase()).join(' ')
          : (mesh.material?.name ?? '').toLowerCase()
        const nodeName = mesh.name.toLowerCase()

        if (
          matName.includes('solar') ||
          matName.includes('panel') ||
          nodeName.includes('wing') ||
          nodeName.includes('mesh017') ||
          nodeName.includes('mesh018')
        ) {
          wingsParts.push(nonIndexed)
        } else if (
          matName.includes('antenna') ||
          matName.includes('comm') ||
          nodeName.includes('radio') ||
          nodeName.includes('cube1') ||
          (nodeName.includes('cylinder') && !nodeName.includes('cylinder2'))
        ) {
          radioParts.push(nonIndexed)
        } else {
          bodyParts.push(nonIndexed)
        }
      }
    })

    const body =
      BufferGeometryUtils.mergeGeometries(
        bodyParts.length ? bodyParts : [new THREE.BoxGeometry(0.3, 0.3, 0.45)],
        false
      ) || new THREE.BoxGeometry(0.3, 0.3, 0.45)
    const wings =
      BufferGeometryUtils.mergeGeometries(
        wingsParts.length ? wingsParts : [new THREE.BoxGeometry(0.9, 0.02, 0.35)],
        false
      ) || new THREE.BoxGeometry(0.9, 0.02, 0.35)
    const radio =
      BufferGeometryUtils.mergeGeometries(
        radioParts.length ? radioParts : [new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8)],
        false
      ) || new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8)

    bodyParts.forEach((p) => p.dispose())
    wingsParts.forEach((p) => p.dispose())
    radioParts.forEach((p) => p.dispose())

    body.computeBoundingBox()
    wings.computeBoundingBox()
    radio.computeBoundingBox()

    const combinedBox = new THREE.Box3()
    if (body.boundingBox) combinedBox.union(body.boundingBox)
    if (wings.boundingBox) combinedBox.union(wings.boundingBox)
    if (radio.boundingBox) combinedBox.union(radio.boundingBox)

    const totalCenter = new THREE.Vector3()
    const totalSize = new THREE.Vector3()
    combinedBox.getCenter(totalCenter)
    combinedBox.getSize(totalSize)
    const maxDim = Math.max(totalSize.x, totalSize.y, totalSize.z) || 1
    const normScale = TARGET_GLB_SATELLITE_SIZE / maxDim

    for (const part of [body, wings, radio]) {
      part.translate(-totalCenter.x, -totalCenter.y, -totalCenter.z)
      part.scale(normScale, normScale, normScale)
      part.computeBoundingSphere()
      part.setAttribute('aOpacity', refs.opacityAttrRef.current)
    }

    return { body, wings, radio }
  }, [gltf.scene, refs.opacityAttrRef])

  useEffect(() => {
    return () => {
      geometries.body.dispose()
      geometries.wings.dispose()
      geometries.radio.dispose()
    }
  }, [geometries])

  useEffect(() => {
    const bodyMesh = bodyMeshRef.current
    if (!bodyMesh) return
    for (let i = 0; i < MAX_SATELLITES; i += 1) {
      bodyMesh.setColorAt(i, COLOR_NOMINAL)
    }
    if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true
    bodyMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    if (wingsMeshRef.current) {
      wingsMeshRef.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    }
    if (radioMeshRef.current) {
      radioMeshRef.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    }
  }, [geometries])

  const handleOpacityCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aOpacity;
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_vertex>',
          `#include <color_vertex>
          vInstanceOpacity = aOpacity;`
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          diffuseColor.a *= vInstanceOpacity;
          if (diffuseColor.a <= 0.01) discard;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * 0.08;`
        )
    },
    []
  )

  useFrame(({ camera, size }, delta) => {
    if (!bodyMeshRef.current) return
    stepSatellitesFrame(
      satellites,
      camera,
      size.height,
      delta,
      reducedMotion,
      refs,
      bodyMeshRef.current,
      [wingsMeshRef.current, radioMeshRef.current]
    )
  })

  const cacheKey = useMemo(() => () => 'helionet-sat-single-glb-v1', [])

  return (
    <>
      <instancedMesh
        ref={bodyMeshRef}
        args={[geometries.body, undefined, MAX_SATELLITES]}
        frustumCulled={false}
        onPointerMove={interactions.handlePointerMove}
        onPointerOut={interactions.handlePointerOut}
        onClick={interactions.handleClick}
        onPointerMissed={interactions.handlePointerMissed}
      >
        <meshStandardMaterial
          metalness={0.82}
          roughness={0.24}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>

      <instancedMesh
        ref={wingsMeshRef}
        args={[geometries.wings, undefined, MAX_SATELLITES]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={COLOR_SOLAR_PANEL}
          metalness={0.65}
          roughness={0.16}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>

      <instancedMesh
        ref={radioMeshRef}
        args={[geometries.radio, undefined, MAX_SATELLITES]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={COLOR_RADIO_METAL}
          metalness={0.88}
          roughness={0.20}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>
    </>
  )
}

function AssembledGlbSatellites({
  bodyUrl,
  wingsUrl,
  radioUrl,
  satellites,
}: {
  bodyUrl: string
  wingsUrl: string
  radioUrl: string
  satellites: WorkerSatellite[]
}) {
  const bodyGltf = useGLTF(bodyUrl, '/draco/', true)
  const wingsGltf = useGLTF(wingsUrl, '/draco/', true)
  const radioGltf = useGLTF(radioUrl, '/draco/', true)

  const bodyMeshRef = useRef<THREE.InstancedMesh>(null)
  const wingsMeshRef = useRef<THREE.InstancedMesh>(null)
  const radioMeshRef = useRef<THREE.InstancedMesh>(null)

  const reducedMotion = useReducedMotion()
  const refs = useInstanceTrackingRefs()
  const interactions = useSatelliteInteraction(satellites)

  const geometries = useMemo(() => {
    const body = extractMergedPartGeometry(bodyGltf.scene)
    const wings = extractMergedPartGeometry(wingsGltf.scene)
    const radio = extractMergedPartGeometry(radioGltf.scene)

    body.computeBoundingBox()
    wings.computeBoundingBox()
    radio.computeBoundingBox()

    const bodyBox = body.boundingBox ?? new THREE.Box3()
    const wingsBox = wings.boundingBox ?? new THREE.Box3()
    const radioBox = radio.boundingBox ?? new THREE.Box3()

    const bodyCenter = new THREE.Vector3()
    bodyBox.getCenter(bodyCenter)
    body.translate(-bodyCenter.x, -bodyCenter.y, -bodyCenter.z)
    body.computeBoundingBox()
    const centeredBodyBox = body.boundingBox ?? new THREE.Box3()

    // Center wings around body core so panels protrude symmetrically left and right
    const wingsCenter = new THREE.Vector3()
    wingsBox.getCenter(wingsCenter)
    wings.translate(-wingsCenter.x, -wingsCenter.y, -wingsCenter.z)
    wings.computeBoundingBox()

    // Mount radio assembly centered in XZ and seated cleanly onto top of body
    const radioCenter = new THREE.Vector3()
    radioBox.getCenter(radioCenter)
    const radioShiftY = centeredBodyBox.max.y - radioBox.min.y - 0.004
    radio.translate(-radioCenter.x, radioShiftY, -radioCenter.z)
    radio.computeBoundingBox()

    // Compute unified assembly bounds -> center & normalize uniformly to unit size * 0.6
    const combinedBox = new THREE.Box3()
    combinedBox.union(body.boundingBox!)
    combinedBox.union(wings.boundingBox!)
    combinedBox.union(radio.boundingBox!)

    const totalCenter = new THREE.Vector3()
    const totalSize = new THREE.Vector3()
    combinedBox.getCenter(totalCenter)
    combinedBox.getSize(totalSize)
    const maxDim = Math.max(totalSize.x, totalSize.y, totalSize.z) || 1
    const normScale = TARGET_GLB_SATELLITE_SIZE / maxDim

    for (const part of [body, wings, radio]) {
      part.translate(-totalCenter.x, -totalCenter.y, -totalCenter.z)
      part.scale(normScale, normScale, normScale)
      part.computeBoundingSphere()
      part.setAttribute('aOpacity', refs.opacityAttrRef.current)
    }

    return { body, wings, radio }
  }, [bodyGltf.scene, wingsGltf.scene, radioGltf.scene, refs.opacityAttrRef])

  useEffect(() => {
    return () => {
      geometries.body.dispose()
      geometries.wings.dispose()
      geometries.radio.dispose()
    }
  }, [geometries])

  useEffect(() => {
    const bodyMesh = bodyMeshRef.current
    if (!bodyMesh) return
    for (let i = 0; i < MAX_SATELLITES; i += 1) {
      bodyMesh.setColorAt(i, COLOR_NOMINAL)
    }
    if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true
    bodyMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    if (wingsMeshRef.current) {
      wingsMeshRef.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    }
    if (radioMeshRef.current) {
      radioMeshRef.current.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 28)
    }
  }, [geometries])

  const handleOpacityCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aOpacity;
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_vertex>',
          `#include <color_vertex>
          vInstanceOpacity = aOpacity;`
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying float vInstanceOpacity;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          diffuseColor.a *= vInstanceOpacity;
          if (diffuseColor.a <= 0.01) discard;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * 0.08;`
        )
    },
    []
  )

  useFrame(({ camera, size }, delta) => {
    if (!bodyMeshRef.current) return
    stepSatellitesFrame(
      satellites,
      camera,
      size.height,
      delta,
      reducedMotion,
      refs,
      bodyMeshRef.current,
      [wingsMeshRef.current, radioMeshRef.current]
    )
  })

  const cacheKey = useMemo(() => () => 'helionet-sat-opacity-v3', [])

  return (
    <>
      {/* 1. Instanced satellite bus body (aerospace aluminum with state tinting) */}
      <instancedMesh
        ref={bodyMeshRef}
        args={[geometries.body, undefined, MAX_SATELLITES]}
        frustumCulled={false}
        onPointerMove={interactions.handlePointerMove}
        onPointerOut={interactions.handlePointerOut}
        onClick={interactions.handleClick}
        onPointerMissed={interactions.handlePointerMissed}
      >
        <meshStandardMaterial
          metalness={0.82}
          roughness={0.24}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>

      {/* 2. Instanced solar arrays (glossy photovoltaic blue-black) */}
      <instancedMesh
        ref={wingsMeshRef}
        args={[geometries.wings, undefined, MAX_SATELLITES]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={COLOR_SOLAR_PANEL}
          metalness={0.65}
          roughness={0.16}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>

      {/* 3. Instanced radio antenna/dish (gleaming aerospace alloy) */}
      <instancedMesh
        ref={radioMeshRef}
        args={[geometries.radio, undefined, MAX_SATELLITES]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={COLOR_RADIO_METAL}
          metalness={0.88}
          roughness={0.20}
          transparent={true}
          depthWrite={true}
          onBeforeCompile={handleOpacityCompile}
          customProgramCacheKey={cacheKey}
        />
      </instancedMesh>
    </>
  )
}

const stemSatPos = new THREE.Vector3()
const stemGroundPos = new THREE.Vector3()
const stemTanU = new THREE.Vector3()
const stemTanV = new THREE.Vector3()
const stemUp = new THREE.Vector3(0, 1, 0)

function AltitudeDropStems({ satellites }: { satellites: WorkerSatellite[] }): React.ReactElement {
  const posArray = useMemo(() => new Float32Array(MAX_SATELLITES * 6 * 3), [])
  const colArray = useMemo(() => new Float32Array(MAX_SATELLITES * 6 * 3), [])

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colArray, 3))
    geom.setDrawRange(0, 0)
    return geom
  }, [posArray, colArray])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useFrame(() => {
    let ptr = 0

    for (let i = 0; i < satellites.length; i += 1) {
      const sat = satellites[i]
      if (sat.status !== 'atRisk' && sat.status !== 'lost' && sat.altitudeKm >= 520) continue

      getVisualSatellitePosition(sat, stemSatPos)
      stemGroundPos.copy(stemSatPos).normalize().multiplyScalar(10.01)

      const isLost = sat.status === 'lost'
      const r = 1.0
      const g = isLost ? 0.27 : 0.69
      const b = isLost ? 0.23 : 0.12

      // 1. Vertical drop stem (satPos -> groundPos)
      posArray[ptr] = stemSatPos.x
      posArray[ptr + 1] = stemSatPos.y
      posArray[ptr + 2] = stemSatPos.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3
      posArray[ptr] = stemGroundPos.x
      posArray[ptr + 1] = stemGroundPos.y
      posArray[ptr + 2] = stemGroundPos.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3

      // 2. Crosshair reticle on surface
      if (Math.abs(stemGroundPos.y) > 9.5) {
        stemTanU.crossVectors(stemGroundPos, new THREE.Vector3(1, 0, 0)).normalize().multiplyScalar(0.22)
      } else {
        stemTanU.crossVectors(stemGroundPos, stemUp).normalize().multiplyScalar(0.22)
      }
      stemTanV.crossVectors(stemGroundPos, stemTanU).normalize().multiplyScalar(0.22)

      // Segment A
      posArray[ptr] = stemGroundPos.x - stemTanU.x
      posArray[ptr + 1] = stemGroundPos.y - stemTanU.y
      posArray[ptr + 2] = stemGroundPos.z - stemTanU.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3
      posArray[ptr] = stemGroundPos.x + stemTanU.x
      posArray[ptr + 1] = stemGroundPos.y + stemTanU.y
      posArray[ptr + 2] = stemGroundPos.z + stemTanU.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3

      // Segment B
      posArray[ptr] = stemGroundPos.x - stemTanV.x
      posArray[ptr + 1] = stemGroundPos.y - stemTanV.y
      posArray[ptr + 2] = stemGroundPos.z - stemTanV.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3
      posArray[ptr] = stemGroundPos.x + stemTanV.x
      posArray[ptr + 1] = stemGroundPos.y + stemTanV.y
      posArray[ptr + 2] = stemGroundPos.z + stemTanV.z
      colArray[ptr] = r
      colArray[ptr + 1] = g
      colArray[ptr + 2] = b
      ptr += 3
    }

    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geometry.setDrawRange(0, ptr / 3)
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors={true} transparent={true} opacity={0.82} depthWrite={false} />
    </lineSegments>
  )
}

export function Satellites(): React.ReactElement {
  const satellites = useHelioStore((s) => s.constellation.satellites)
  const manifest = useHelioStore((s) => s.manifest)

  const satGlbAsset = useVerifiedAssetUrl('satellite_glb', manifest)
  const bodyAsset = useVerifiedAssetUrl('satellite_body', manifest)
  const wingsAsset = useVerifiedAssetUrl('satellite_wings', manifest)
  const radioAsset = useVerifiedAssetUrl('satellite_radio', manifest)

  const singleGlbAvailable = Boolean(satGlbAsset.checked && satGlbAsset.url)
  const allPartsAvailable = Boolean(
    bodyAsset.checked &&
      wingsAsset.checked &&
      radioAsset.checked &&
      bodyAsset.url &&
      wingsAsset.url &&
      radioAsset.url
  )

  return (
    <group>
      {singleGlbAvailable ? (
        <ModelBoundary fallback={<ProceduralSatellites satellites={satellites} />}>
          <Suspense fallback={<ProceduralSatellites satellites={satellites} />}>
            <SingleGlbSatellites url={satGlbAsset.url!} satellites={satellites} />
          </Suspense>
        </ModelBoundary>
      ) : allPartsAvailable ? (
        <ModelBoundary fallback={<ProceduralSatellites satellites={satellites} />}>
          <Suspense fallback={<ProceduralSatellites satellites={satellites} />}>
            <AssembledGlbSatellites
              bodyUrl={bodyAsset.url!}
              wingsUrl={wingsAsset.url!}
              radioUrl={radioAsset.url!}
              satellites={satellites}
            />
          </Suspense>
        </ModelBoundary>
      ) : (
        <ProceduralSatellites satellites={satellites} />
      )}

      {/* Altitude drop stems and ground impact reticles for decaying satellites */}
      <AltitudeDropStems satellites={satellites} />
    </group>
  )
}
