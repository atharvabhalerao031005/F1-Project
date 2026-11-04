// frontend/src/components/showcase3d/F1CarShowcase3D.tsx
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { F1CarGlbModel } from './F1CarGlbModel';
import { SculptedF1Fallback } from './SculptedF1Fallback';

interface F1CarShowcase3DProps {
  liveryColor: string;
  scrollProgress: number; // 0.0 to 1.0 (across entire page)
  tyreAgeLaps?: number;
  fuelLoadKg?: number;
}

// Camera choreography keyframe interpolation
interface CameraKeyframe {
  pos: [number, number, number];
  target: [number, number, number];
  steer: number;
  drs: boolean;
}

function getChoreographyAtProgress(p: number): CameraKeyframe {
  // Normalize progress p:
  // 0.00 - 0.22: Act 1 Hero Beauty Angle
  // 0.22 - 0.48: Act 2 Stop 2A (Front Wing & Carbon Brakes)
  // 0.48 - 0.74: Act 2 Stop 2B (Top-Down Aero Profile)
  // 0.74 - 0.95: Act 2 Stop 2C (Rear Wing DRS & Diffuser)
  // > 0.95: Fade out

  if (p <= 0.22) {
    // Act 1 Hero: 3/4 Side Profile
    const localP = p / 0.22;
    return {
      pos: [
        3.5 + Math.sin(localP * Math.PI) * 0.3,
        1.35 + localP * 0.1,
        4.0 - localP * 0.4,
      ],
      target: [0, 0.35, 0],
      steer: 0,
      drs: false,
    };
  } else if (p <= 0.48) {
    // Stop 2A: Front Wing & Carbon Ceramic Brakes Zoom
    const t = (p - 0.22) / 0.26;
    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
    return {
      pos: [
        THREE.MathUtils.lerp(3.5, 1.45, smoothT),
        THREE.MathUtils.lerp(1.4, 0.62, smoothT),
        THREE.MathUtils.lerp(3.6, 2.1, smoothT),
      ],
      target: [
        THREE.MathUtils.lerp(0, 0.45, smoothT),
        THREE.MathUtils.lerp(0.35, 0.35, smoothT),
        THREE.MathUtils.lerp(0, 1.45, smoothT),
      ],
      steer: THREE.MathUtils.lerp(0, 0.18, smoothT),
      drs: false,
    };
  } else if (p <= 0.74) {
    // Stop 2B: Top-Down Aero View
    const t = (p - 0.48) / 0.26;
    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
    return {
      pos: [
        THREE.MathUtils.lerp(1.45, 0.08, smoothT),
        THREE.MathUtils.lerp(0.62, 4.9, smoothT),
        THREE.MathUtils.lerp(2.1, 0.15, smoothT),
      ],
      target: [
        THREE.MathUtils.lerp(0.45, 0, smoothT),
        0.35,
        THREE.MathUtils.lerp(1.45, 0, smoothT),
      ],
      steer: 0,
      drs: false,
    };
  } else {
    // Stop 2C: Rear Wing DRS & Diffuser Angle
    const t = Math.min(1, (p - 0.74) / 0.21);
    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
    return {
      pos: [
        THREE.MathUtils.lerp(0.08, -1.35, smoothT),
        THREE.MathUtils.lerp(4.9, 0.95, smoothT),
        THREE.MathUtils.lerp(0.15, -2.95, smoothT),
      ],
      target: [
        0,
        THREE.MathUtils.lerp(0.35, 0.65, smoothT),
        THREE.MathUtils.lerp(0, -1.3, smoothT),
      ],
      steer: 0,
      drs: t > 0.45,
    };
  }
}

/**
 * Internal 3D Showcase Rig managing Mouse Tilt, Camera Lerping, and Kinematics.
 */
function ShowcaseSceneRig({
  liveryColor,
  scrollProgress,
  tyreAgeLaps = 12,
  fuelLoadKg = 40,
}: F1CarShowcase3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to [-1, 1]
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePos({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Compute thermal emissive glow from Tire Age (0 - 38 laps) and Fuel Load (8 - 105 kg)
  const brakeEmissive = THREE.MathUtils.clamp(
    (tyreAgeLaps / 38) * 1.8 + (fuelLoadKg / 105) * 0.7,
    0.0,
    2.5
  );

  useFrame((_, delta) => {
    const kf = getChoreographyAtProgress(scrollProgress);

    // 1. Smooth Camera Glide
    if (cameraRef.current) {
      const curPos = cameraRef.current.position;
      curPos.x = THREE.MathUtils.damp(curPos.x, kf.pos[0], 5, delta);
      curPos.y = THREE.MathUtils.damp(curPos.y, kf.pos[1], 5, delta);
      curPos.z = THREE.MathUtils.damp(curPos.z, kf.pos[2], 5, delta);

      const targetVec = new THREE.Vector3(...kf.target);
      cameraRef.current.lookAt(targetVec);
    }

    // 2. 2.5D Living Mouse Tilt Parallax (Most pronounced in Act 1 Hero)
    if (carGroupRef.current) {
      const heroInfluence = Math.max(0, 1 - scrollProgress / 0.35);
      const targetRotY = mousePos.x * 0.12 * heroInfluence;
      const targetRotX = -mousePos.y * 0.06 * heroInfluence;

      carGroupRef.current.rotation.y = THREE.MathUtils.damp(
        carGroupRef.current.rotation.y,
        targetRotY,
        4,
        delta
      );
      carGroupRef.current.rotation.x = THREE.MathUtils.damp(
        carGroupRef.current.rotation.x,
        targetRotX,
        4,
        delta
      );
    }
  });

  const kf = getChoreographyAtProgress(scrollProgress);
  const steerWithMouse =
    scrollProgress <= 0.22 ? mousePos.x * 0.25 : kf.steer;

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[3.5, 1.35, 4.0]} fov={38} />

      {/* Three-Point Automotive Studio Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 9, 5]} intensity={1.5} color="#FFF4DE" castShadow />
      <directionalLight position={[-5, 4, -4]} intensity={0.55} color="#9EC4FF" />
      <directionalLight position={[0, 6, -8]} intensity={0.8} color="#CFE2FF" />
      <hemisphereLight args={['#BCD4FF', '#121620', 0.5]} />

      {/* Centered Showcase F1 Car */}
      <group ref={carGroupRef}>
        <Suspense fallback={<SculptedF1Fallback color={liveryColor} brakePct={brakeEmissive * 40} />}>
          <F1CarGlbModel
            liveryColor={liveryColor}
            steerAngleRad={steerWithMouse}
            brakeEmissive={brakeEmissive}
            drsOpen={kf.drs}
            speedKmh={scrollProgress > 0.7 ? 315 : 240}
          />
        </Suspense>

        {/* Soft Floor Shadow Plane */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.65}
          scale={14}
          blur={1.6}
          far={4.5}
          resolution={512}
        />
      </group>
    </>
  );
}

/**
 * Fixed 3D F1 Showcase Canvas across Act 1 and Act 2.
 * Smoothly fades out as the user reaches Act 3 and Act 4.
 */
export const F1CarShowcase3D: React.FC<F1CarShowcase3DProps> = ({
  liveryColor,
  scrollProgress,
  tyreAgeLaps = 12,
  fuelLoadKg = 40,
}) => {
  // Fade out when entering Act 3 & 4 (scrollProgress > 0.95)
  const isVisible = scrollProgress < 0.96;
  const opacity = isVisible ? THREE.MathUtils.clamp((0.96 - scrollProgress) / 0.08, 0, 1) : 0;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-300"
      style={{ opacity, display: opacity <= 0.01 ? 'none' : 'block' }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <ShowcaseSceneRig
          liveryColor={liveryColor}
          scrollProgress={scrollProgress}
          tyreAgeLaps={tyreAgeLaps}
          fuelLoadKg={fuelLoadKg}
        />
      </Canvas>
    </div>
  );
};
