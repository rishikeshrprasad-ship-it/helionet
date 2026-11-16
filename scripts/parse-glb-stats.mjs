import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const modelsDir = 'public/assets/models'
const files = [
  'sun.glb',
  'earth.glb',
  'moon.glb',
  'Uranus_1_51118.glb',
  'satellite_body.glb',
  'satellite_wings.glb',
  'satellite_radio.glb',
  'Advanced Composition Explorer.glb',
  'rover.glb',
  'Juno.glb'
]

const budgets = {
  'earth.glb': 6.0,
  'rover.glb': 4.0,
  'Juno.glb': 3.0,
  'Advanced Composition Explorer.glb': 1.0,
  'sun.glb': 1.0,
  'moon.glb': 1.0,
  'Uranus_1_51118.glb': 1.0,
  'satellite_body.glb': 1.0,
  'satellite_wings.glb': 1.0,
  'satellite_radio.glb': 1.0,
}

const results = []

for (const file of files) {
  const filePath = path.join(modelsDir, file)
  if (!fs.existsSync(filePath)) continue
  const size = fs.statSync(filePath).size
  const sizeMB = size / (1024 * 1024)
  const budget = budgets[file] || 1.0
  const overBudget = sizeMB > budget

  const inspect = execSync(`npx --yes @gltf-transform/cli inspect "${filePath}"`, { encoding: 'utf-8' })
  
  // Parse bbox
  const bboxMatch = inspect.match(/bboxMin\s+│\s+bboxMax\s+│[\s\S]*?│\s*0\s*│[^│]*│[^│]*│\s*([^│]+)\s*│\s*([^│]+)\s*│/m)
  const bboxMin = bboxMatch ? bboxMatch[1].trim() : 'N/A'
  const bboxMax = bboxMatch ? bboxMatch[2].trim() : 'N/A'

  // Parse triangle count / glPrimitives
  let triangles = 0
  const meshLines = inspect.match(/TRIANGLES\s*│\s*\d+\s*│\s*([0-9,]+)/g)
  if (meshLines) {
    for (const m of meshLines) {
      const match = m.match(/TRIANGLES\s*│\s*\d+\s*│\s*([0-9,]+)/)
      if (match) triangles += parseInt(match[1].replace(/,/g, ''), 10)
    }
  }

  // Count meshes, materials, textures
  const meshesMatch = inspect.match(/MESHES\s*─+([\s\S]*?)MATERIALS/m)
  const meshesCount = meshesMatch ? (meshesMatch[1].match(/│\s*\d+\s*│/g) || []).length : 0

  const matMatch = inspect.match(/MATERIALS\s*─+([\s\S]*?)TEXTURES/m)
  const matCount = matMatch ? (matMatch[1].match(/│\s*\d+\s*│/g) || []).length : 0

  const texMatch = inspect.match(/TEXTURES\s*─+([\s\S]*?)ANIMATIONS/m)
  const texCount = texMatch ? (texMatch[1].match(/│\s*\d+\s*│/g) || []).length : 0

  results.push({
    file,
    sizeMB: sizeMB.toFixed(2),
    budgetMB: budget.toFixed(1),
    overBudget,
    meshesCount,
    matCount,
    texCount,
    triangles,
    bbox: `[${bboxMin}] to [${bboxMax}]`
  })
}

console.log(JSON.stringify(results, null, 2))
