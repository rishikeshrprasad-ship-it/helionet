import fs from 'fs';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { execSync } from 'child_process';

async function convert() {
  const src = 'assets_originals/space/milkyway_2020_4k.exr';
  console.log('Reading EXR:', src);
  const buf = fs.readFileSync(src);
  const loader = new EXRLoader();
  const parsed = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const { width, height, data, type } = parsed;
  console.log(`Dimensions: ${width}x${height}, data length: ${data.length}, type: ${type}`);

  const isHalfFloat = type === THREE.HalfFloatType || data instanceof Uint16Array;
  console.log('isHalfFloat:', isHalfFloat);

  const channels = data.length / (width * height);
  console.log('Channels:', channels);

  // Sample some float values
  let maxFloat = 0;
  let minFloat = Infinity;
  let sumFloat = 0;
  for (let i = 0; i < Math.min(100000, data.length); i += channels) {
    const raw = data[i];
    const val = isHalfFloat ? THREE.DataUtils.fromHalfFloat(raw) : raw;
    if (val > maxFloat) maxFloat = val;
    if (val < minFloat) minFloat = val;
    sumFloat += val;
  }
  console.log(`Sample stats -> Min: ${minFloat}, Max: ${maxFloat}, Mean: ${sumFloat / (100000 / channels)}`);

  // Create 8-bit RGB buffer
  const rgb8 = Buffer.alloc(width * height * 3);
  let srcIdx = 0;
  let dstIdx = 0;

  // Exposure multiplier to tone-map to about 60% brightness for visible features
  const exposure = 2.8;

  for (let i = 0; i < width * height; i++) {
    const rawR = data[srcIdx];
    const rawG = data[srcIdx + 1];
    const rawB = data[srcIdx + 2];

    const r = isHalfFloat ? THREE.DataUtils.fromHalfFloat(rawR) : rawR;
    const g = isHalfFloat ? THREE.DataUtils.fromHalfFloat(rawG) : rawG;
    const b = isHalfFloat ? THREE.DataUtils.fromHalfFloat(rawB) : rawB;

    // Reinhard tone mapping: (x * exposure) / (1 + x * exposure)
    // Scaled so brightest stars/Milky Way core reach ~0.60 - 0.70 brightness,
    // and empty space is pitch black (0.01 - 0.03)
    const tmR = (r * exposure) / (1.0 + r * exposure) * 0.9;
    const tmG = (g * exposure) / (1.0 + g * exposure) * 0.9;
    const tmB = (b * exposure) / (1.0 + b * exposure) * 0.9;

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
  execSync(`python -c "from PIL import Image; im = Image.open('temp_milkyway.ppm'); im.save('public/assets/space/milkyway.jpg', quality=90)"`);
  fs.unlinkSync('temp_milkyway.ppm');

  console.log('Successfully wrote public/assets/space/milkyway.jpg! File size:', fs.statSync('public/assets/space/milkyway.jpg').size);
}

convert().catch(err => {
  console.error('Conversion failed:', err);
});
