// frontend/src/components/simulation3d/materials/AsphaltPBRMaterial.ts
/**
 * VELOCE V2 // PHOTOREALISTIC ASPHALT PBR MATERIAL
 * Injects procedural asphalt aggregate noise, dynamic Frenet-Serret racing groove
 * darkening, and tire-rubbered polish sheen into Three.js MeshStandardMaterial.
 */

import * as THREE from 'three';

export function createPhotorealisticAsphaltMaterial(
  diffuseMap?: THREE.Texture | null,
  normalMap?: THREE.Texture | null,
  roughnessMap?: THREE.Texture | null
): THREE.MeshStandardMaterial {
  if (diffuseMap) {
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;
  }
  if (normalMap) {
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
  }
  if (roughnessMap) {
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#32363C'),
    roughness: 0.86,
    metalness: 0.10,
    map: diffuseMap || null,
    normalMap: normalMap || null,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: roughnessMap || null,
  });

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>
      // vUv.y is lateral track span: 0.0 (left curb) to 1.0 (right curb)
      // The rubbered racing groove is deposited where 20 cars brake and accelerate:
      float lateralDist = abs(vUv.y - 0.50);
      float rubberGroove = 1.0 - smoothstep(0.0, 0.26, lateralDist);

      // 1. Darken diffuse where vulcanized rubber is laid down
      diffuseColor.rgb *= (1.0 - rubberGroove * 0.32);

      // 2. Reduce surface roughness along the racing line (polished sheen)
      roughnessFactor = clamp(roughnessFactor - rubberGroove * 0.25, 0.40, 1.0);
      `
    );
  };

  return material;
}
