// frontend/src/utils/f1ModelLoader.ts
/**
 * VELOCE V2 // THREE.JS GLTF LOAD & MESHOPT DECODER CACHE ENGINE
 * Module: frontend/src/utils/f1ModelLoader.ts
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let gltfCachePromise: Promise<THREE.Group> | null = null;

export async function preloadGlbScene(onProgress?: (pct: number) => void): Promise<THREE.Group> {
  if (gltfCachePromise) return gltfCachePromise;

  gltfCachePromise = (async () => {
    try {
      if (MeshoptDecoder && (MeshoptDecoder as any).ready) {
        await (MeshoptDecoder as any).ready;
      }
      return await new Promise<THREE.Group>((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(
          '/models/f1_car.glb',
          (gltf) => {
            resolve(gltf.scene);
          },
          (xhr) => {
            if (xhr.lengthComputable && onProgress) {
              const pct = Math.round((xhr.loaded / xhr.total) * 100);
              onProgress(pct);
            }
          },
          (err) => {
            console.warn('Failed to load /models/f1_car.glb:', err);
            reject(err);
          }
        );
      });
    } catch (err) {
      gltfCachePromise = null;
      throw err;
    }
  })();

  return gltfCachePromise;
}

export async function loadGlbScene(): Promise<THREE.Group> {
  return preloadGlbScene();
}
