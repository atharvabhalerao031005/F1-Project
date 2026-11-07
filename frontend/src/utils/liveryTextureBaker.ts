// frontend/src/utils/liveryTextureBaker.ts
import * as THREE from 'three';

const liveryCache = new Map<string, THREE.CanvasTexture>();

export function recolorGlbTexturePreservingAO(
  originalMap: THREE.Texture,
  targetHex: string
): THREE.CanvasTexture {
  const key = `${originalMap.uuid}_${targetHex}`;
  if (liveryCache.has(key)) return liveryCache.get(key)!;

  const img = originalMap.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = img?.width || 1024;
  const h = img?.height || 1024;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const col = new THREE.Color(targetHex);
  const tR = col.r * 255, tG = col.g * 255, tB = col.b * 255;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    // Preserve white sponsor logos and dark carbon/AO panel seams
    if ((luma > 0.82 && chroma < 0.18) || luma < 0.08) continue;
    const shade = Math.min(1.25, Math.max(0.18, luma * 1.65));
    data[i] = Math.min(255, tR * shade);
    data[i + 1] = Math.min(255, tG * shade);
    data[i + 2] = Math.min(255, tB * shade);
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = originalMap.flipY;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  liveryCache.set(key, tex);
  return tex;
}
