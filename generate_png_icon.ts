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

function generateSplashScreen(width: number, height: number) {
  const png = new PNG({
    width,
    height,
    colorType: 6, // RGBA
  });

  const bgR = 17;
  const bgG = 24;
  const bgB = 39;

  const fgR = 255;
  const fgG = 255;
  const fgB = 255;

  const lines: Line[] = [
    { x1: 90, y1: 45, x2: 55, y2: 135, thickness: 4 },
    { x1: 90, y1: 45, x2: 125, y2: 135, thickness: 10 },
    { x1: 72, y1: 108, x2: 108, y2: 108, thickness: 3 },
    { x1: 78, y1: 45, x2: 102, y2: 45, thickness: 3.5 },
    { x1: 40, y1: 135, x2: 70, y2: 135, thickness: 3.5 },
    { x1: 110, y1: 135, x2: 140, y2: 135, thickness: 3.5 },
  ];

  // The centered logo size in the splash screen (proportional)
  const logoSize = Math.floor(Math.min(width, height) * 0.22);
  const logoLeft = Math.floor((width - logoSize) / 2);
  const logoTop = Math.floor((height - logoSize) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxAlpha = 0;

      if (x >= logoLeft && x < logoLeft + logoSize && y >= logoTop && y < logoTop + logoSize) {
        // Pixel is inside the centered logo boundary box
        const modelX = ((x - logoLeft) / logoSize) * 180;
        const modelY = ((y - logoTop) / logoSize) * 180;

        // Pixel size in model coordinates
        const modelPixelSize = 180 / logoSize;

        for (const line of lines) {
          const dist = distanceToSegment(modelX, modelY, line.x1, line.y1, line.x2, line.y2);
          
          const halfThick = line.thickness / 2;
          const distInScreenPixels = dist / modelPixelSize;
          const halfThickInScreenPixels = halfThick / modelPixelSize;

          let intensity = 0;
          if (distInScreenPixels <= halfThickInScreenPixels - 0.5) {
            intensity = 1.0;
          } else if (distInScreenPixels >= halfThickInScreenPixels + 0.5) {
            intensity = 0.0;
          } else {
            intensity = halfThickInScreenPixels + 0.5 - distInScreenPixels;
          }

          if (intensity > maxAlpha) {
            maxAlpha = intensity;
          }
        }
      }

      const r = Math.round(bgR + (fgR - bgR) * maxAlpha);
      const g = Math.round(bgG + (fgG - bgG) * maxAlpha);
      const b = Math.round(bgB + (fgB - bgB) * maxAlpha);
      
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  return png;
}

interface SplashConfig {
  width: number;
  height: number;
  deviceWidth: number;
  deviceHeight: number;
  ratio: number;
}

const splashScreens: SplashConfig[] = [
  // iPhone 16 Pro Max
  { width: 1320, height: 2868, deviceWidth: 440, deviceHeight: 956, ratio: 3 },
  // iPhone 16 Pro
  { width: 1206, height: 2622, deviceWidth: 402, deviceHeight: 874, ratio: 3 },
  // iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max
  { width: 1290, height: 2796, deviceWidth: 430, deviceHeight: 932, ratio: 3 },
  // iPhone 16, 15 Pro, 15, 14 Pro
  { width: 1179, height: 2556, deviceWidth: 393, deviceHeight: 852, ratio: 3 },
  // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
  { width: 1284, height: 2778, deviceWidth: 428, deviceHeight: 926, ratio: 3 },
  // iPhone 14, 13 Pro, 13, 12 Pro, 12
  { width: 1170, height: 2532, deviceWidth: 390, deviceHeight: 844, ratio: 3 },
  // iPhone XS Max, 11 Pro Max
  { width: 1242, height: 2688, deviceWidth: 414, deviceHeight: 896, ratio: 3 },
  // iPhone XR, 11
  { width: 828, height: 1792, deviceWidth: 414, deviceHeight: 896, ratio: 2 },
  // iPhone X, XS, 11 Pro
  { width: 1125, height: 2436, deviceWidth: 375, deviceHeight: 812, ratio: 3 },
  // iPhone 8 Plus, 7 Plus, 6s Plus
  { width: 1242, height: 2208, deviceWidth: 414, deviceHeight: 736, ratio: 3 },
  // iPhone 8, 7, 6s, 6, SE 2/3
  { width: 750, height: 1334, deviceWidth: 375, deviceHeight: 667, ratio: 2 },
  // iPad Pro 12.9"
  { width: 2048, height: 2732, deviceWidth: 1024, deviceHeight: 1366, ratio: 2 },
  // iPad Pro 11" / Air 10.9"
  { width: 1668, height: 2388, deviceWidth: 834, deviceHeight: 1194, ratio: 2 },
  // iPad Pro 10.5"
  { width: 1668, height: 2224, deviceWidth: 834, deviceHeight: 1112, ratio: 2 },
  // iPad 10.2"
  { width: 1620, height: 2160, deviceWidth: 810, deviceHeight: 1080, ratio: 2 },
  // iPad 9.7" / Mini
  { width: 1536, height: 2048, deviceWidth: 768, deviceHeight: 1024, ratio: 2 },
];

const publicDir = path.join(process.cwd(), 'public');

// Create multiple sizes to make sure Safari has perfect files
const standardSizes = [57, 72, 76, 114, 120, 144, 152, 180, 192, 512];

const distDir = path.join(process.cwd(), 'dist');
const hasDist = fs.existsSync(distDir);

for (const size of standardSizes) {
  const pngInstance = generateIcon(size, false);
  const buffer = PNG.sync.write(pngInstance);
  
  // Save to public/
  if (size === 192) {
    fs.writeFileSync(path.join(publicDir, 'logo_azevedo.png'), buffer);
    if (hasDist) fs.writeFileSync(path.join(distDir, 'logo_azevedo.png'), buffer);
    console.log(`Generated logo_azevedo.png (192x192)`);
  } else if (size === 512) {
    fs.writeFileSync(path.join(publicDir, 'logo_azevedo_512.png'), buffer);
    if (hasDist) fs.writeFileSync(path.join(distDir, 'logo_azevedo_512.png'), buffer);
    console.log(`Generated logo_azevedo_512.png (512x512)`);
  } else {
    // Generate specific size apple touch icons
    const namePng = `apple-touch-icon-${size}x${size}.png`;
    const namePre = `apple-touch-icon-${size}x${size}-precomposed.png`;
    
    fs.writeFileSync(path.join(publicDir, namePng), buffer);
    fs.writeFileSync(path.join(publicDir, namePre), buffer);
    
    if (hasDist) {
      fs.writeFileSync(path.join(distDir, namePng), buffer);
      fs.writeFileSync(path.join(distDir, namePre), buffer);
    }
    console.log(`Generated ${size}x${size} files`);
  }

  // If this is the main iOS standard desktop size (180), duplication as base apple-touch-icon
  if (size === 180) {
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), buffer);
    if (hasDist) {
      fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), buffer);
      fs.writeFileSync(path.join(distDir, 'apple-touch-icon-precomposed.png'), buffer);
    }
  }
}

console.log('Generating iOS Splash Screens (apple-touch-startup-image)...');
for (const config of splashScreens) {
  const pngInstance = generateSplashScreen(config.width, config.height);
  const buffer = PNG.sync.write(pngInstance);
  
  const name = `apple-splash-${config.width}x${config.height}.png`;
  fs.writeFileSync(path.join(publicDir, name), buffer);
  if (hasDist) {
    fs.writeFileSync(path.join(distDir, name), buffer);
  }
  console.log(`Generated splash screen: ${name} (${config.width}x${config.height})`);
}

console.log('All luxury iOS-compatible brand icons and splash screens generated successfully!');
