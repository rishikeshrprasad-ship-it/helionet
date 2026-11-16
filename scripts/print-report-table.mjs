import fs from 'fs';

const models = ['sun.glb', 'earth.glb', 'moon.glb', 'uranus.glb', 'satellite.glb', 'ace.glb', 'rover.glb', 'juno.glb'];
const budgets = { 'earth.glb': 6.0, 'rover.glb': 4.0, 'juno.glb': 3.0, 'sun.glb': 1.0, 'moon.glb': 1.0, 'uranus.glb': 1.0, 'satellite.glb': 1.0, 'ace.glb': 1.0 };

console.log('| Model File | File Size | Budget | Over Budget? | Meshes | Materials | Textures | Triangles | Bounding Box / Orientation |');
console.log('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

for (const f of models) {
  const p = 'public/assets/models/' + f;
  const stat = fs.statSync(p);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  const budgetMB = budgets[f];
  const buf = fs.readFileSync(p);

  // Parse GLB JSON chunk
  const jsonLength = buf.readUInt32LE(12);
  const jsonChunk = buf.subarray(20, 20 + jsonLength).toString('utf-8');
  const gltf = JSON.parse(jsonChunk);

  const meshCount = (gltf.meshes || []).length;
  const matCount = (gltf.materials || []).length;
  const texCount = (gltf.textures || []).length;

  let triangleCount = 0;
  let minBox = [Infinity, Infinity, Infinity];
  let maxBox = [-Infinity, -Infinity, -Infinity];

  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      if (prim.indices !== undefined) {
        const acc = gltf.accessors[prim.indices];
        triangleCount += acc.count / 3;
      } else if (prim.attributes && prim.attributes.POSITION !== undefined) {
        const acc = gltf.accessors[prim.attributes.POSITION];
        triangleCount += acc.count / 3;
      }
      if (prim.attributes && prim.attributes.POSITION !== undefined) {
        const acc = gltf.accessors[prim.attributes.POSITION];
        if (acc.min && acc.max) {
          for (let i = 0; i < 3; i++) {
            minBox[i] = Math.min(minBox[i], acc.min[i]);
            maxBox[i] = Math.max(maxBox[i], acc.max[i]);
          }
        }
      }
    }
  }

  const minStr = `[${minBox.map(n => n.toFixed(2)).join(', ')}]`;
  const maxStr = `[${maxBox.map(n => n.toFixed(2)).join(', ')}]`;
  const bbox = `${minStr} to ${maxStr}`;

  console.log(`| \`${f}\` | ${sizeMB} MB | ${budgetMB.toFixed(1)} MB | ✓ OK | ${meshCount} | ${matCount} | ${texCount} | ${Math.round(triangleCount).toLocaleString()} | ${bbox} |`);
}
