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
  const w = 512; // 512x512 GPU composite = 4x faster upload, crisp with anisotropy=8
  const h = 512;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Fill base with team livery color
  ctx.fillStyle = targetHex;
  ctx.fillRect(0, 0, w, h);

  // 2. Multiply original .glb texture to preserve 100% of baked AO shadows, carbon weave & panel seams
  if (img) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);

    // 3. Soft-light pass to keep white sponsor decals & highlights crisp
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.65;
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = originalMap.flipY;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  liveryCache.set(key, tex);
  return tex;
}
