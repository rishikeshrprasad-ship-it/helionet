import React, { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useHelioStore } from '../store/helioStore'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface StormShellProps {
  sunPosition?: [number, number, number]
  earthPosition?: [number, number, number]
}

const stormVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const stormFragmentShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform vec3 uSunPosition;
uniform vec3 uEarthPosition;
uniform float uProgress;

void main() {
  // Direction from Sun towards Earth
  vec3 toEarth = normalize(uEarthPosition - uSunPosition);
  vec3 fromSun = normalize(vWorldPosition - uSunPosition);

  // Smooth CME shock cone opening towards Earth (no hard angular cutoff)
  float forwardDot = dot(fromSun, toEarth);
  if (forwardDot <= 0.05) discard;

  float coneFalloff = smoothstep(0.05, 0.75, forwardDot);

  // Shockwave leading edge glow (diaphanous plasma shell)
  float edgeGlow = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);

  // Fade in as CME launches, and fade out smoothly after reaching Earth
  float launchFade = smoothstep(0.0, 0.12, uProgress);
  float travelFade = smoothstep(1.0, 0.75, uProgress);
  float alpha = launchFade * travelFade * coneFalloff * (0.15 + 0.35 * edgeGlow) * 0.45;
  if (alpha <= 0.002) discard;

  // Luminous ionized plasma shockwave
  vec3 coreColor = vec3(1.0, 0.65, 0.28);
  vec3 edgeColor = vec3(0.92, 0.36, 0.18);
  vec3 col = mix(edgeColor, coreColor, edgeGlow);

  gl_FragColor = vec4(col * alpha, 1.0);
}
`

export function StormShell({
  sunPosition = [-48, 12, -26],
  earthPosition = [0, 0, 0],
}: StormShellProps): React.ReactElement {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const progressRef = useRef<number>(0)
  const playback = useHelioStore((s) => s.playback)
  const reducedMotion = useReducedMotion()

  const [uniforms] = React.useState(() => ({
    uSunPosition: { value: new THREE.Vector3(...sunPosition) },
    uEarthPosition: { value: new THREE.Vector3(...earthPosition) },
    uProgress: { value: 0.0 },
  }))

  const maxDist = useMemo(
    () =>
      new THREE.Vector3(...sunPosition).distanceTo(
        new THREE.Vector3(...earthPosition),
      ),
    [sunPosition, earthPosition],
  )

  useFrame((_, delta) => {
    // Hero animation driven strictly by the simulation timeline (no idle loop when paused)
    const duration = Math.max(1, playback.durationHours)
    const targetProgress = THREE.MathUtils.clamp(playback.currentTimeHours / duration, 0, 1)

    if (reducedMotion) {
      progressRef.current = targetProgress
    } else {
      const blend = 1 - Math.exp(-delta * 10)
      progressRef.current = THREE.MathUtils.lerp(
        progressRef.current,
        targetProgress,
        blend,
      )
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = progressRef.current
    }

    if (meshRef.current) {
      // Expand wave from outer solar corona across Earth orbit
      const startRadius = 18.0
      const endRadius = maxDist * 1.15
      const currentRadius = startRadius + progressRef.current * (endRadius - startRadius)
      meshRef.current.scale.set(currentRadius, currentRadius, currentRadius)
    }
  })

  return (
    <mesh ref={meshRef} position={sunPosition}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={stormVertexShader}
        fragmentShader={stormFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
