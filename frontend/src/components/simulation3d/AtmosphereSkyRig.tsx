// frontend/src/components/simulation3d/AtmosphereSkyRig.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import * as THREE from 'three';

export const AtmosphereSkyRig: React.FC<{ weatherMode: 'DAY' | 'RAIN' | 'NIGHT' }> = ({
  weatherMode,
}) => {
  const rainPointsRef = useRef<THREE.Points>(null);

  // 1,800 falling diagonal rain streaks in a 120m box that follows the active camera in RAIN mode
  const rainGeom = useMemo(() => {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ camera }, delta) => {
    if (weatherMode !== 'RAIN' || !rainPointsRef.current) return;
    const pts = rainPointsRef.current;
    pts.position.set(camera.position.x, 0, camera.position.z);
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const fallSpeed = 38 * Math.min(delta, 0.05);
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= fallSpeed;
      if (arr[i] < 0) arr[i] = 45;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      {/* Baked 1-Frame PMREM Reflection Map so car paint reflects sky & stadium lights at 0 FPS cost */}
      <Environment resolution={512} frames={1}>
        <color
          attach="background"
          args={[
            weatherMode === 'NIGHT'
              ? '#05070B'
              : weatherMode === 'RAIN'
              ? '#334155'
              : '#7DD3FC',
          ]}
        />
        <Lightformer
          form="rect"
          intensity={weatherMode === 'NIGHT' ? 4.5 : 3.0}
          color={weatherMode === 'DAY' ? '#FFFBEB' : '#E2E8F0'}
          position={[0, 12, 0]}
          scale={[30, 30, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          color={weatherMode === 'NIGHT' ? '#38BDF8' : '#FDE68A'}
          position={[20, 4, 10]}
          scale={[40, 4, 1]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </Environment>

      {weatherMode === 'DAY' && (
        <>
          <Sky
            distance={60000}
            sunPosition={[220, 48, -140]}
            turbidity={2.2}
            rayleigh={1.2}
            mieCoefficient={0.004}
            mieDirectionalG={0.8}
          />
          <fogExp2 args={['#D8E6F2', 0.00007]} />
          <ambientLight intensity={0.65} color="#F8FAFC" />
          <directionalLight position={[220, 140, -140]} intensity={2.6} color="#FFF7ED" />
        </>
      )}

      {weatherMode === 'RAIN' && (
        <>
          <color attach="background" args={['#1E293B']} />
          <fogExp2 args={['#1E293B', 0.00045]} />
          <ambientLight intensity={0.5} color="#94A3B8" />
          <directionalLight position={[60, 120, 40]} intensity={1.1} color="#CBD5E1" />
          <points ref={rainPointsRef} geometry={rainGeom}>
            <pointsMaterial color="#CBD5E1" size={0.22} transparent opacity={0.55} />
          </points>
        </>
      )}

      {weatherMode === 'NIGHT' && (
        <>
          <color attach="background" args={['#04060A']} />
          <fogExp2 args={['#04060A', 0.00022]} />
          <ambientLight intensity={0.35} color="#38BDF8" />
          <directionalLight position={[0, 120, 0]} intensity={1.4} color="#E0F2FE" />
        </>
      )}
    </group>
  );
};
