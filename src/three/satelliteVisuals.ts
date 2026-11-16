import * as THREE from 'three'
import type { WorkerSatellite } from '../workers/simulation.worker'

/**
 * Computes exaggerated visual altitude for satellites losing orbit.
 * While real orbital decay is subtle relative to Earth's radius (10 units),
 * this scales the visual altitude drop so decaying satellites visibly plunge
 * toward Earth's thermosphere boundary, making trajectory loss unmistakable
 * from the default overview camera without manual zoom.
 */
export function getVisualSatellitePosition(
  sat: WorkerSatellite,
  target: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  target.set(sat.position[0], sat.position[1], sat.position[2])
  if (sat.altitudeKm < 540) {
    const fraction = Math.max(0, Math.min(1, (sat.altitudeKm - 120) / (550 - 120)))
    // Nominal altitude above Earth (radius 10) is ~0.862 units.
    // When decaying, it drops down to 0.16 units above the surface.
    const visualAlt = 0.16 + 0.702 * fraction
    const len = target.length()
    if (len > 0.001) {
      target.multiplyScalar((10.0 + visualAlt) / len)
    }
  }
  return target
}
