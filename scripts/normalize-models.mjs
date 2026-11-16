import { execSync } from 'child_process';
import fs from 'fs';

const models = ['sun.glb', 'earth.glb', 'moon.glb', 'uranus.glb', 'satellite.glb', 'ace.glb', 'rover.glb', 'juno.glb'];

for (const m of models) {
  const src = `public/assets/models/${m}`;
  const tmp = `public/assets/models/${m}.tmp.glb`;
  console.log('Centering:', m);
  try {
    execSync(`npx @gltf-transform/cli center "${src}" "${tmp}" --pivot center`, { stdio: 'inherit' });
    fs.renameSync(tmp, src);
    console.log(`Successfully centered and replaced ${m}`);
  } catch (err) {
    console.error(`Error centering ${m}:`, err);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
if (fs.existsSync('public/assets/models/sun_centered.glb')) {
  fs.unlinkSync('public/assets/models/sun_centered.glb');
}
console.log('All models centered successfully.');
