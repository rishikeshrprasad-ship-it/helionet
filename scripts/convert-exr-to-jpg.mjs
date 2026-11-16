import fs from 'fs';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { execSync } from 'child_process';

async function convert() {
  const exrPaths = [
    'public/assets/space/starmap_2020_4k.exr',
    'public/assets/space/milkyway_2020_4k.exr'
  ];
  let src = exrPaths.find(p => fs.existsSync(p));
  if (!src) {
    console.log('No EXR found in public/assets/space/');
    return;
  }
  console.log('Converting EXR:', src);
  const buf = fs.readFileSync(src);
  const loader = new EXRLoader();
  // EXRLoader parses Float32 or HalfFloat
  const parsed = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const { width, height, data } = parsed;
  console.log(`Parsed dimensions: ${width}x${height}, data length: ${data.length}`);

  // Calculate tone mapping (Reinhard + scale to ~60% brightness)
  // Let's find mean / max
  const channels = data.length / (width * height);
  console.log(`Channels: ${channels}`);

  // Create 8-bit RGB buffer
  const rgb8 = Buffer.alloc(width * height * 3);
  let srcIdx = 0;
  let dstIdx = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    // Reinhard tone mapping: x / (x + 1)
    // Scale to about 60% brightness
    const tmR = (r / (r + 0.6)) * 0.75;
    const tmG = (g / (g + 0.6)) * 0.75;
    const tmB = (b / (b + 0.6)) * 0.75;

    rgb8[dstIdx] = Math.min(255, Math.max(0, Math.round(tmR * 255)));
    rgb8[dstIdx + 1] = Math.min(255, Math.max(0, Math.round(tmG * 255)));
    rgb8[dstIdx + 2] = Math.min(255, Math.max(0, Math.round(tmB * 255)));

    srcIdx += channels;
    dstIdx += 3;
  }

  // Write temporary PPM (Netpbm binary format P6)
  const ppmHeader = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  const ppmData = Buffer.concat([ppmHeader, rgb8]);
  fs.writeFileSync('temp_milkyway.ppm', ppmData);

  // Use python PIL to save as JPEG (4096x2048)
  execSync(`python -c "from PIL import Image; im = Image.open('temp_milkyway.ppm'); im.save('public/assets/space/milkyway.jpg', quality=88)"`);
  fs.unlinkSync('temp_milkyway.ppm');

  console.log('Successfully created public/assets/space/milkyway.jpg! File size:', fs.statSync('public/assets/space/milkyway.jpg').size);
}

convert().catch(err => {
  console.error('Conversion failed:', err);
});
