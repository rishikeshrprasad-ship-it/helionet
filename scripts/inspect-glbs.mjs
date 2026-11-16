import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const modelsDir = 'public/assets/models'
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'))

console.log('Found GLB files:', files)

for (const file of files) {
  const filePath = path.join(modelsDir, file)
  const size = fs.statSync(filePath).size
  const sizeMB = (size / (1024 * 1024)).toFixed(2)
  console.log(`\n========================================`)
  console.log(`FILE: ${file} (${size} bytes, ${sizeMB} MB)`)
  try {
    const output = execSync(`npx --yes @gltf-transform/cli inspect "${filePath}"`, { encoding: 'utf-8' })
    console.log(output)
  } catch (err) {
    console.error(`Error inspecting ${file}:`, err.message)
  }
}
