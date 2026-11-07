// frontend/src/components/simulation3d/DynamicSunShadowRig.tsx
/**
 * VELOCE V2 // ACTIVE-CAR TRACKING DYNAMIC SUN SHADOW RIG
 * Solves the Monza 5.79km shadow collapse problem by actively anchoring
 * a razor-sharp 44m orthographic shadow frustum to the active car in real time.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DynamicSunShadowRigProps {
  targetPosition: THREE.Vector3;
  weatherMode?: 'DAY' | 'RAIN' | 'NIGHT';
}

export const DynamicSunShadowRig: React.FC<DynamicSunShadowRigProps> = ({
  targetPosition,
  weatherMode = 'DAY',
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetObjRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    if (!lightRef.current || !targetObjRef.current) return;

    // Anchor the light's target to the active car's position
    targetObjRef.current.position.copy(targetPosition);

    // Directional light offset depending on weather
    if (weatherMode === 'DAY') {
      lightRef.current.position.set(
        targetPosition.x + 55,
        targetPosition.y + 110,
        targetPosition.z + 45
      );
    } else if (weatherMode === 'RAIN') {
      lightRef.current.position.set(
        targetPosition.x + 40,
        targetPosition.y + 80,
        targetPosition.z + 35
      );
    } else {
      // NIGHT: Stadium floodlight angle
      lightRef.current.position.set(
        targetPosition.x + 35,
        targetPosition.y + 50,
        targetPosition.z + 25
      );
    }

    lightRef.current.target = targetObjRef.current;
  });

  if (weatherMode === 'NIGHT') {
    return (
      <>
        <object3D ref={targetObjRef} />
        {/* Dynamic Stadium Floodlight Bank: Direct Overcast Halogen Arrays */}
        <directionalLight
          ref={lightRef}
          intensity={4.2}
          color="#F8FAFC"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={5}
          shadow-camera-far={220}
          shadow-camera-left={-36}
          shadow-camera-right={36}
          shadow-camera-top={36}
          shadow-camera-bottom={-36}
          shadow-bias={-0.00015}
          shadow-normalBias={0.035}
        />
        {/* Opposing Stadium Rim Kicker Light */}
        <directionalLight
          position={[targetPosition.x - 30, targetPosition.y + 45, targetPosition.z - 25]}
          intensity={2.2}
          color="#38BDF8"
        />
        {/* Vibrant Night Stadium Ambient & Sky Bounce */}
        <ambientLight intensity={0.65} color="#94A3B8" />
        <hemisphereLight args={['#64748B', '#0F172A', 0.55]} />
      </>
    );
  }

  if (weatherMode === 'RAIN') {
    return (
      <>
        <object3D ref={targetObjRef} />
        <directionalLight
          ref={lightRef}
          intensity={1.3}
          color="#CBD5E1"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={10}
          shadow-camera-far={240}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
          shadow-bias={-0.00012}
          shadow-normalBias={0.035}
        />
        <ambientLight intensity={0.45} color="#94A3B8" />
        <hemisphereLight args={['#64748B', '#1E293B', 0.55]} />
      </>
    );
  }

  // DAY: Brilliant Italian Summer Sun
  return (
    <>
      <object3D ref={targetObjRef} />
      <directionalLight
        ref={lightRef}
        intensity={2.6}
        color="#FFF9EC"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.00012}
        shadow-normalBias={0.035}
      />
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <hemisphereLight args={['#87CEEB', '#3D5A40', 0.70]} />
    </>
  );
};
