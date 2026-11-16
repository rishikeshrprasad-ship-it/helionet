import { execSync } from 'child_process';
import fs from 'fs';

const BUDGETS = {
  'earth.glb': 6.0,
  'rover.glb': 4.0,
  'juno.glb': 3.0,
  'sun.glb': 1.0,
  'moon.glb': 1.0,
  'uranus.glb': 1.0,
  'satellite.glb': 1.0,
  'ace.glb': 1.0
};

const models = Object.keys(BUDGETS);
const rows = [];

for (const file of models) {
  const filePath = `public/assets/models/${file}`;
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  const stat = fs.statSync(filePath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  const budgetMB = BUDGETS[file] || 1.0;
  const overBudget = parseFloat(sizeMB) > budgetMB;

  try {
    const md = execSync(`npx @gltf-transform/cli inspect --format md "${filePath}"`, { encoding: 'utf-8' });
    
    // Parse tables from md
    const meshesMatch = md.match(/meshes\s*\|\s*(\d+)/i);
    const materialsMatch = md.match(/materials\s*\|\s*(\d+)/i);
    const texturesMatch = md.match(/textures\s*\|\s*(\d+)/i);
    
    // Triangle count from primitives
    let triangles = 0;
    const primMatches = md.matchAll(/\|\s*\d+\s*\|\s*(\d+)\s*\|\s*(\w+)\s*\|/g);
    for (const m of primMatches) {
      if (m[2] === 'TRIANGLES') {
        triangles += parseInt(m[1], 10);
      }
    }
    if (triangles === 0) {
      const gltfMatch = md.match(/glTF\.meshes\[\d+\]\s*\|\s*(\d+)/);
      if (gltfMatch) triangles = parseInt(gltfMatch[1], 10);
    }
    
    // Bounding box
    const bboxMatch = md.match(/bounds\s*\|\s*(\[[^\]]+\]\s*to\s*\[[^\]]+\])/i);
    const bbox = bboxMatch ? bboxMatch[1] : 'N/A';

    rows.push({
      file,
      size: `${sizeMB} MB`,
      budget: `${budgetMB.toFixed(1)} MB`,
      over: overBudget ? `⚠️ OVER (${sizeMB} MB)` : '✓ OK',
      meshes: meshesMatch ? meshesMatch[1] : '1',
      materials: materialsMatch ? materialsMatch[1] : '0',
      textures: texturesMatch ? texturesMatch[1] : '0',
      triangles: triangles ? triangles.toLocaleString() : 'N/A',
      bbox
    });
  } catch (err) {
    console.error(`Error inspecting ${file}:`, err.message);
  }
}

console.log('| Model File | File Size | Budget | Over Budget? | Meshes | Materials | Textures | Triangles | Bounding Box / Orientation |');
console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
for (const r of rows) {
  console.log(`| \`${r.file}\` | ${r.size} | ${r.budget} | ${r.over} | ${r.meshes} | ${r.materials} | ${r.textures} | ${r.triangles} | ${r.bbox} |`);
}
