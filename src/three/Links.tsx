import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { useHelioStore } from '../store/helioStore'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { TOKENS } from '../tokens'
import { isSatelliteHighlighted } from './satelliteSelection'
import { getVisualSatellitePosition } from './satelliteVisuals'

interface DissolvingLink {
  p1: [number, number, number]
  p2: [number, number, number]
  ageMs: number
}

const MAX_LINKS = 400
const MAX_REROUTE_SEGMENTS = 100
const LINK_DISSOLVE_DURATION_MS = 300
const REROUTE_DRAW_DURATION_S = 0.6
const SLATE_BLUE = new THREE.Color('#9AC0E6')
const REROUTE_BLUE = new THREE.Color(TOKENS.color.slateBlue).lerp(new THREE.Color('#D6EBFF'), 0.35)

const scratchPosU = new THREE.Vector3()
const scratchPosV = new THREE.Vector3()

function writeSegment(
  buffer: Float32Array,
  offset: number,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  buffer[offset] = x1
  buffer[offset + 1] = y1
  buffer[offset + 2] = z1
  buffer[offset + 3] = x2
  buffer[offset + 4] = y2
  buffer[offset + 5] = z2
  return offset + 6
}

function writeSegmentColor(
  buffer: Float32Array,
  offset: number,
  r: number,
  g: number,
  b: number
): void {
  buffer[offset] = r
  buffer[offset + 1] = g
  buffer[offset + 2] = b
  buffer[offset + 3] = r
  buffer[offset + 4] = g
  buffer[offset + 5] = b
}

export function Links(): React.ReactElement {
  const baseGroupRef = useRef<THREE.Group>(null)
  const rerouteGroupRef = useRef<THREE.Group>(null)
  const { size } = useThree()
  const reducedMotion = useReducedMotion()

  const activeLinks = useHelioStore((s) => s.constellation.activeLinks)
  const satellites = useHelioStore((s) => s.constellation.satellites)
  const reroutedPath = useHelioStore((s) => s.constellation.reroutedPath)

  // Track dissolving broken links for 300ms fadeout
  const prevLinksKeySet = useRef<Set<string>>(new Set())
  const dissolvingLinks = useRef<DissolvingLink[]>([])

  // Rerouted path draw-in progress (0 to 1 over 600ms)
  const reroutedProgress = useRef<number>(1.0)
  const prevReroutedKey = useRef<string>('')

  const baseRef = useRef<{
    positions: Float32Array
    colors: Float32Array
    geometry: LineSegmentsGeometry
    material: LineMaterial
    line: LineSegments2
  } | null>(null)

  const rerouteRef = useRef<{
    positions: Float32Array
    geometry: LineSegmentsGeometry
    material: LineMaterial
    line: LineSegments2
  } | null>(null)

  useEffect(() => {
    const resX = size.width || 1280
    const resY = size.height || 720

    // 1. Crisp 1.65px anti-aliased base orbital & cross-plane links (1 instanced draw call)
    const bPos = new Float32Array(MAX_LINKS * 6)
    const bCol = new Float32Array(MAX_LINKS * 6)
    const bGeom = new LineSegmentsGeometry()
    bGeom.setPositions(bPos)
    bGeom.setColors(bCol)
    bGeom.instanceCount = 0

    const bMat = new LineMaterial({
      color: 0xffffff,
      vertexColors: true,
      linewidth: 1.65,
      worldUnits: false,
      transparent: true,
      opacity: 0.62,
      depthTest: true,
      depthWrite: false,
      resolution: new THREE.Vector2(resX, resY),
    })

    const bLine = new LineSegments2(bGeom, bMat)
    bLine.frustumCulled = false
    const baseHost = baseGroupRef.current
    baseHost?.add(bLine)

    baseRef.current = {
      positions: bPos,
      colors: bCol,
      geometry: bGeom,
      material: bMat,
      line: bLine,
    }

    // 2. Crisp 2.5px slate-blue rerouted path (1 instanced draw call)
    const rPos = new Float32Array(MAX_REROUTE_SEGMENTS * 6)
    const rGeom = new LineSegmentsGeometry()
    rGeom.setPositions(rPos)
    rGeom.instanceCount = 0

    const rMat = new LineMaterial({
      color: REROUTE_BLUE.getHex(),
      linewidth: 2.5,
      worldUnits: false,
      transparent: false,
      opacity: 1.0,
      depthTest: true,
      depthWrite: true,
      resolution: new THREE.Vector2(resX, resY),
    })

    const rLine = new LineSegments2(rGeom, rMat)
    rLine.frustumCulled = false
    const rerouteHost = rerouteGroupRef.current
    rerouteHost?.add(rLine)

    rerouteRef.current = {
      positions: rPos,
      geometry: rGeom,
      material: rMat,
      line: rLine,
    }

    return () => {
      baseHost?.remove(bLine)
      baseRef.current = null
      bGeom.dispose()
      bMat.dispose()

      rerouteHost?.remove(rLine)
      rerouteRef.current = null
      rGeom.dispose()
      rMat.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track newly broken visible links for 300ms dissolve
  useEffect(() => {
    const currentKeys = new Set(activeLinks.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`))

    if (!reducedMotion) {
      for (const key of prevLinksKeySet.current) {
        if (!currentKeys.has(key)) {
          const [aStr, bStr] = key.split('-')
          const a = parseInt(aStr, 10)
          const b = parseInt(bStr, 10)
          const satA = satellites[a]
          const satB = satellites[b]
          if (satA && satB) {
            const isVisible =
              satA.plane === satB.plane ||
              isSatelliteHighlighted(a) ||
              isSatelliteHighlighted(b)
            if (isVisible) {
              dissolvingLinks.current.push({
                p1: [...satA.position],
                p2: [...satB.position],
                ageMs: 0,
              })
            }
          }
        }
      }
    } else {
      dissolvingLinks.current = []
    }
    prevLinksKeySet.current = currentKeys
  }, [activeLinks, satellites, reducedMotion])

  // Reset reroute draw animation on path change
  useEffect(() => {
    const key = reroutedPath.join('-')
    if (reroutedPath.length <= 1) {
      prevReroutedKey.current = ''
      reroutedProgress.current = 1.0
      return
    }
    if (key !== prevReroutedKey.current) {
      prevReroutedKey.current = key
      reroutedProgress.current = reducedMotion ? 1.0 : 0.0
    }
  }, [reroutedPath, reducedMotion])

  useFrame(({ size: frameSize }, delta) => {
    if (satellites.length === 0) return

    const resW = frameSize.width || 1280
    const resH = frameSize.height || 720

    // 1. Advance reroute draw-in over 600ms (or instant on reduced motion)
    if (reroutedProgress.current < 1.0) {
      reroutedProgress.current = reducedMotion
        ? 1.0
        : Math.min(1.0, reroutedProgress.current + delta / REROUTE_DRAW_DURATION_S)
    }

    // 2. Advance dissolving links over 300ms
    for (let i = dissolvingLinks.current.length - 1; i >= 0; i -= 1) {
      dissolvingLinks.current[i].ageMs += delta * 1000
      if (dissolvingLinks.current[i].ageMs >= LINK_DISSOLVE_DURATION_MS) {
        dissolvingLinks.current.splice(i, 1)
      }
    }

    // 3. Update orbital plane & highlighted cross-plane links
    const base = baseRef.current
    if (base) {
      base.material.resolution.set(resW, resH)
      const positions = base.positions
      const colors = base.colors

      let ptr = 0
      for (let i = 0; i < activeLinks.length && ptr + 6 <= positions.length; i += 1) {
        const [u, v] = activeLinks[i]
        const satU = satellites[u]
        const satV = satellites[v]
        if (!satU || !satV) continue

        const isSamePlane = satU.plane === satV.plane
        const isHighlightedCross =
          !isSamePlane && (isSatelliteHighlighted(u) || isSatelliteHighlighted(v))

        if (!isSamePlane && !isHighlightedCross) continue

        getVisualSatellitePosition(satU, scratchPosU)
        getVisualSatellitePosition(satV, scratchPosV)

        writeSegmentColor(colors, ptr, SLATE_BLUE.r, SLATE_BLUE.g, SLATE_BLUE.b)
        ptr = writeSegment(
          positions,
          ptr,
          scratchPosU.x,
          scratchPosU.y,
          scratchPosU.z,
          scratchPosV.x,
          scratchPosV.y,
          scratchPosV.z
        )
      }

      for (const d of dissolvingLinks.current) {
        if (ptr + 6 <= positions.length) {
          const fade = Math.max(0, 1 - d.ageMs / LINK_DISSOLVE_DURATION_MS)
          writeSegmentColor(
            colors,
            ptr,
            SLATE_BLUE.r * fade,
            SLATE_BLUE.g * fade,
            SLATE_BLUE.b * fade
          )
          ptr = writeSegment(
            positions,
            ptr,
            d.p1[0],
            d.p1[1],
            d.p1[2],
            d.p2[0],
            d.p2[1],
            d.p2[2]
          )
        }
      }

      const startAttr = base.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute
      const colorStartAttr = base.geometry.attributes.instanceColorStart as THREE.InterleavedBufferAttribute
      if (startAttr?.data) startAttr.data.needsUpdate = true
      if (colorStartAttr?.data) colorStartAttr.data.needsUpdate = true
      base.geometry.instanceCount = ptr / 6
    }

    // 4. Update 2.5px slate-blue rerouted path (drawn continuously over 600ms)
    const reroute = rerouteRef.current
    if (!reroute) return
    reroute.material.resolution.set(resW, resH)

    if (reroutedPath.length > 1) {
      let rPtr = 0
      const reroutePositions = reroute.positions
      const totalEdges = Math.min(reroutedPath.length - 1, MAX_REROUTE_SEGMENTS)
      const exactEdges = totalEdges * reroutedProgress.current
      const fullEdges = Math.floor(exactEdges)
      const frac = exactEdges - fullEdges

      for (let i = 0; i < fullEdges && rPtr + 6 <= reroutePositions.length; i += 1) {
        const satU = satellites[reroutedPath[i]]
        const satV = satellites[reroutedPath[i + 1]]
        if (satU && satV) {
          getVisualSatellitePosition(satU, scratchPosU)
          getVisualSatellitePosition(satV, scratchPosV)
          rPtr = writeSegment(
            reroutePositions,
            rPtr,
            scratchPosU.x,
            scratchPosU.y,
            scratchPosU.z,
            scratchPosV.x,
            scratchPosV.y,
            scratchPosV.z
          )
        }
      }

      if (fullEdges < totalEdges && frac > 0 && rPtr + 6 <= reroutePositions.length) {
        const satU = satellites[reroutedPath[fullEdges]]
        const satV = satellites[reroutedPath[fullEdges + 1]]
        if (satU && satV) {
          getVisualSatellitePosition(satU, scratchPosU)
          getVisualSatellitePosition(satV, scratchPosV)
          rPtr = writeSegment(
            reroutePositions,
            rPtr,
            scratchPosU.x,
            scratchPosU.y,
            scratchPosU.z,
            scratchPosU.x + (scratchPosV.x - scratchPosU.x) * frac,
            scratchPosU.y + (scratchPosV.y - scratchPosU.y) * frac,
            scratchPosU.z + (scratchPosV.z - scratchPosU.z) * frac
          )
        }
      }

      const startAttr = reroute.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute
      if (startAttr?.data) startAttr.data.needsUpdate = true
      reroute.geometry.instanceCount = rPtr / 6
    } else {
      reroute.geometry.instanceCount = 0
    }
  })

  return (
    <group>
      {/* Same-plane orbital links (+ highlighted cross-plane links, 1 instanced draw call) */}
      <group ref={baseGroupRef} />

      {/* Rerouted path (1 instanced draw call) */}
      <group ref={rerouteGroupRef} />
    </group>
  )
}
