import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const modelsDir = 'public/assets/models'
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'))

async function inspectWithThree() {
  const loader = new GLTFLoader()
  const rows = []

  for (const file of files) {
    const filePath = path.join(modelsDir, file)
    const buffer = fs.readFileSync(filePath)
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const size = buffer.length
    const sizeMB = (size / (1024 * 1024)).toFixed(2)

    await new Promise((resolve) => {
      loader.parse(
        arrayBuffer,
        '',
        (gltf) => {
          let meshCount = 0
          let triCount = 0
          const materials = new Set()
          const textures = new Set()

          gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
              meshCount++
              const geom = obj.geometry
              if (geom) {
                if (geom.index) {
                  triCount += geom.index.count / 3
                } else if (geom.attributes.position) {
                  triCount += geom.attributes.position.count / 3
                }
              }
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
              for (const m of mats) {
                if (m) {
                  materials.add(m.name || m.uuid)
                  if (m.map) textures.add(m.map.name || 'map')
                  if (m.normalMap) textures.add(m.normalMap.name || 'normalMap')
                  if (m.roughnessMap) textures.add(m.roughnessMap.name || 'roughnessMap')
                  if (m.metalnessMap) textures.add(m.metalnessMap.name || 'metalnessMap')
                  if (m.emissiveMap) textures.add(m.emissiveMap.name || 'emissiveMap')
                }
              }
            }
          })

          const bbox = new THREE.Box3().setFromObject(gltf.scene)
          const sizeVec = new THREE.Vector3()
          bbox.getSize(sizeVec)
          const centerVec = new THREE.Vector3()
          bbox.getCenter(centerVec)

          // Budget checks
          let budget = 1.0
          if (file.toLowerCase().includes('earth')) budget = 6.0
          else if (file.toLowerCase().includes('rover')) budget = 4.0
          else if (file.toLowerCase().includes('juno')) budget = 3.0

          rows.push({
            file,
            sizeMB: `${sizeMB} MB`,
            budgetMB: `${budget.toFixed(1)} MB`,
            status: Number(sizeMB) > budget ? 'OVER BUDGET' : 'OK',
            meshes: meshCount,
            materials: materials.size,
            textures: textures.size,
            triangles: Math.round(triCount),
            dimensions: `${sizeVec.x.toFixed(2)} x ${sizeVec.y.toFixed(2)} x ${sizeVec.z.toFixed(2)}`,
            center: `${centerVec.x.toFixed(2)}, ${centerVec.y.toFixed(2)}, ${centerVec.z.toFixed(2)}`
          })
          resolve()
        },
        (err) => {
          console.error('Error loading', file, err)
          resolve()
        }
      )
    })
  }

  console.table(rows)
  fs.writeFileSync('scripts/inspection_report.json', JSON.stringify(rows, null, 2))
}

inspectWithThree().catch(console.error)
