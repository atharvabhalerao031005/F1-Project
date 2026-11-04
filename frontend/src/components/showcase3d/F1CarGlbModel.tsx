// frontend/src/components/showcase3d/F1CarGlbModel.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface F1CarGlbModelProps {
  liveryColor: string;
  steerAngleRad?: number;
  speedKmh?: number;
  brakeEmissive?: number; // 0.0 to 2.5
  drsOpen?: boolean;
  scale?: number;
  isGhost?: boolean;
  ghostOpacity?: number;
}

// Global cached GLTF scene promise
let gltfCachePromise: Promise<THREE.Group> | null = null;

function loadGlbScene(): Promise<THREE.Group> {
  if (gltfCachePromise) return gltfCachePromise;

  gltfCachePromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      '/models/f1_car.glb',
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        console.error('Failed to load /models/f1_car.glb:', err);
        gltfCachePromise = null;
        reject(err);
      }
    );
  });

  return gltfCachePromise;
}

export const F1CarGlbModel: React.FC<F1CarGlbModelProps> = ({
  liveryColor,
  steerAngleRad = 0,
  speedKmh = 260,
  brakeEmissive = 0,
  drsOpen = false,
  scale = 1.0,
  isGhost = false,
  ghostOpacity = 0.65,
}) => {
  const [baseScene, setBaseScene] = useState<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Object3D[]>([]);
  const brakeDiscsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const drsFlapRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    let active = true;
    loadGlbScene()
      .then((scene) => {
        if (active) setBaseScene(scene);
      })
      .catch((err) => {
        console.warn('Fallback will remain active:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const clonedModel = useMemo(() => {
    if (!baseScene) return null;

    const clone = baseScene.clone(true);
    const wheels: THREE.Object3D[] = [];
    const brakeMats: THREE.MeshStandardMaterial[] = [];
    let flap: THREE.Object3D | null = null;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (isGhost) {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          const ghostColor = new THREE.Color(liveryColor || '#D4AF37');
          const ghostMat = new THREE.MeshStandardMaterial({
            color: ghostColor,
            metalness: 0.85,
            roughness: 0.25,
            transparent: true,
            opacity: ghostOpacity,
            emissive: ghostColor,
            emissiveIntensity: 0.45,
            depthWrite: false,
          });
          mesh.material = ghostMat;
        } else {
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const mat = mesh.material as THREE.Material;
          const matName = mat?.name?.toLowerCase() || '';
          const meshName = mesh.name?.toLowerCase() || '';

          // Dynamic Team Livery Tinting
          if (
            matName.includes('paint') ||
            matName.includes('redbull_paint') ||
            meshName.includes('paint') ||
            meshName.includes('chassis')
          ) {
            const liveryMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(liveryColor),
              metalness: 0.55,
              roughness: 0.22,
            });
            mesh.material = liveryMat;
          }

          // Carbon Ceramic Brake Discs (Thermal Emissive Glow)
          if (matName.includes('discs') || meshName.includes('disc')) {
            const discMat = (mat as THREE.MeshStandardMaterial).clone();
            discMat.color.set('#22252A');
            discMat.metalness = 0.9;
            discMat.roughness = 0.35;
            discMat.emissive = new THREE.Color('#FF3B00');
            discMat.emissiveIntensity = brakeEmissive;
            mesh.material = discMat;
            brakeMats.push(discMat);
          }

          // Carbon Fiber Aero Elements
          if (matName.includes('carbon')) {
            const carbonMat = (mat as THREE.MeshStandardMaterial).clone();
            carbonMat.color.set('#111315');
            carbonMat.roughness = 0.55;
            carbonMat.metalness = 0.8;
            mesh.material = carbonMat;
          }
        }
      }

      // Collect Wheels & Tires for Live Rotation
      const lowerName = child.name?.toLowerCase() || '';
      if (
        lowerName.includes('wheel') ||
        lowerName.includes('tire') ||
        lowerName.includes('tyre') ||
        lowerName.includes('hub')
      ) {
        wheels.push(child);
      }

      // DRS Flap
      if (lowerName.includes('drs') || lowerName.includes('flap') || lowerName.includes('wing_top')) {
        flap = child;
      }
    });

    wheelsRef.current = wheels;
    brakeDiscsRef.current = brakeMats;
    drsFlapRef.current = flap;

    return clone;
  }, [baseScene, liveryColor, isGhost, ghostOpacity]);

  // Update brake emissive glow
  useEffect(() => {
    brakeDiscsRef.current.forEach((mat) => {
      mat.emissiveIntensity = brakeEmissive;
    });
  }, [brakeEmissive]);

  // Animate live wheel spin and steering lock in useFrame
  useFrame((_, delta) => {
    // Angular velocity omega = v / r (r_tire ~ 0.33m for 660mm F1 wheel)
    const angularVelocity = (speedKmh / 3.6) / 0.33;
    wheelsRef.current.forEach((wheel) => {
      wheel.rotation.x += angularVelocity * delta;
      if (wheel.name.toLowerCase().includes('front') || wheel.position.z > 0.5) {
        wheel.rotation.y = steerAngleRad;
      }
    });

    // DRS Flap rotation
    if (drsFlapRef.current) {
      const targetAngle = drsOpen ? -0.38 : 0.0;
      drsFlapRef.current.rotation.x = THREE.MathUtils.lerp(
        drsFlapRef.current.rotation.x,
        targetAngle,
        delta * 12
      );
    }
  });

  if (!clonedModel) return null;

  return (
    <group scale={scale}>
      <primitive object={clonedModel} />
      {/* Rear FIA Rain / ERS Harvesting LED Strobe */}
      <mesh position={[0, 0.42, -2.48]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshBasicMaterial
          color={isGhost ? '#FFE600' : brakeEmissive > 0.5 ? '#FF1E44' : '#FF3B00'}
          transparent={isGhost}
          opacity={isGhost ? 0.8 : 1.0}
        />
      </mesh>
    </group>
  );
};
