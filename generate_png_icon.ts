import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

function distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function generateIcon(size: number, isPrecomposed: boolean) {
  const png = new PNG({
    width: size,
    height: size,
    colorType: 6, // RGBA
  });

  // Background color #111827 (RGB: 17, 24, 39)
  const bgR = 17;
  const bgG = 24;
  const bgB = 39;

  // Primary color (White) #FFFFFF
  const fgR = 255;
  const fgG = 255;
  const fgB = 255;

  // Scale vectors standard coordinates (0-180 scale) to the target size
  const scale = size / 180;

  // Define geometric elements of the serif "A" emblem
  const lines: Line[] = [
    // Left thin leg
    { x1: 90, y1: 45, x2: 55, y2: 135, thickness: 4 },
    // Right thick leg (Luxury high-contrast Didot/Playfair stem)
    { x1: 90, y1: 45, x2: 125, y2: 135, thickness: 10 },
    // Horizontal bar
    { x1: 72, y1: 108, x2: 108, y2: 108, thickness: 3 },
    // Top serif cap
    { x1: 78, y1: 45, x2: 102, y2: 45, thickness: 3.5 },
    // Left foot serif serif
    { x1: 40, y1: 135, x2: 70, y2: 135, thickness: 3.5 },
    // Right foot serif serif
    { x1: 110, y1: 135, x2: 140, y2: 135, thickness: 3.5 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Find the maximum intensity from any of the lines
      let maxAlpha = 0;

      for (const line of lines) {
        // Compute distance from pixel to current vector segment
        const dist = distanceToSegment(
          x, 
          y, 
          line.x1 * scale, 
          line.y1 * scale, 
          line.x2 * scale, 
          line.y2 * scale
        );

        const scaledThickness = line.thickness * scale;
        const halfThick = scaledThickness / 2;

        // Apply smooth anti-aliased rendering
        let intensity = 0;
        if (dist <= halfThick - 0.5) {
          intensity = 1.0;
        } else if (dist >= halfThick + 0.5) {
          intensity = 0.0;
        } else {
          intensity = halfThick + 0.5 - dist;
        }

        if (intensity > maxAlpha) {
          maxAlpha = intensity;
        }
      }

      // Blend background with logo color based on calculated anti-aliased value
      const r = Math.round(bgR + (fgR - bgR) * maxAlpha);
      const g = Math.round(bgG + (fgG - bgG) * maxAlpha);
      const b = Math.round(bgB + (fgB - bgB) * maxAlpha);
      const a = 255;

      const idx = (size * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

const publicDir = path.join(process.cwd(), 'public');

// Create multiple sizes to make sure Safari has perfect files
const sizes = [180, 192, 512];

for (const size of sizes) {
  const pngInstance = generateIcon(size, false);
  const buffer = PNG.sync.write(pngInstance);
  
  if (size === 180) {
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), buffer);
    // Also save in dist/ if dist already exists to update dynamically without full build
    const distApple = path.join(process.cwd(), 'dist', 'apple-touch-icon.png');
    if (fs.existsSync(path.dirname(distApple))) {
      fs.writeFileSync(distApple, buffer);
      fs.writeFileSync(path.join(process.cwd(), 'dist', 'apple-touch-icon-precomposed.png'), buffer);
    }
    console.log(`Generated 180x180 index icons...`);
  }
  
  if (size === 192) {
    fs.writeFileSync(path.join(publicDir, 'logo_azevedo.png'), buffer);
    // Also write directly to dist/
    const distLogo = path.join(process.cwd(), 'dist', 'logo_azevedo.png');
    if (fs.existsSync(path.dirname(distLogo))) {
      fs.writeFileSync(distLogo, buffer);
    }
    console.log(`Generated 192x192 primary icon...`);
  }
  
  if (size === 512) {
    fs.writeFileSync(path.join(publicDir, 'logo_azevedo_512.png'), buffer);
    const distLogo512 = path.join(process.cwd(), 'dist', 'logo_azevedo_512.png');
    if (fs.existsSync(path.dirname(distLogo512))) {
      fs.writeFileSync(distLogo512, buffer);
    }
    console.log(`Generated 512x512 fallback icon...`);
  }
}

console.log('All luxury iOS-compatible brand icons generated successfully!');
