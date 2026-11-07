// frontend/src/components/showcase3d/F1CarShowcase3D.tsx
/**
 * VELOCE V2 // MCLAREN TECHNOLOGY CENTRE (MTC) 3D SHOWCASE CANVAS (0vh -> 650vh)
 * Architectural Design: Foster + Partners / Ron Dennis Pristine White Aesthetic
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * 2,100vh Master Timeline Choreography:
 * 1. Act 1 (0vh - 450vh, p: 0.0000 -> 0.2143):
 *    - MTC Sterile Pristine White Testing Bay (#FAF9F6)
 *    - Polished epoxy floor reflections via <MeshReflectorMaterial>
 *    - Norman Foster frosted glass acoustic louvers & Barrisol softbox ceiling array
 *    - Unobstructed 3D car in center-right foreground with soft contact shadows & streamlines
 * 2. Transition Zone (450vh - 650vh, p: 0.2143 -> 0.3095):
 *    - Slow, majestic 75° camera yaw sweep around the flank and diffuser
 *    - Kinematic forward acceleration and aerodynamic wake departure into horizon
 * 3. GPU Dormancy (Past 650vh, p >= 0.3150):
 *    - Unmounts cleanly (`return null`) for exact 0.0% GPU load across Acts 2, 3, and 4!
 */

import React, { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { F1CarGlbModel } from './F1CarGlbModel';
import { SculptedF1Fallback } from './SculptedF1Fallback';
import { WindTunnelChamber } from './WindTunnelChamber';
import { WindTunnelStreamlines } from './WindTunnelStreamlines';

interface F1CarShowcase3DProps {
  liveryColor: string;
  scrollProgress: number; // 0.0 to 1.0 across full 2,100vh
  tyreAgeLaps?: number;
  fuelLoadKg?: number;
}

class ShowcaseErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function WindTunnelSceneRig({
  liveryColor,
  scrollProgress,
  tyreAgeLaps = 12,
  fuelLoadKg = 40,
}: F1CarShowcase3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  // CRITICAL FIX: Use ref for mouse tracking to completely eliminate 120 FPS React re-renders!
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const brakeEmissive = THREE.MathUtils.clamp(
    (tyreAgeLaps / 38) * 1.8 + (fuelLoadKg / 105) * 0.7,
    0.0,
    2.5
  );

  // Normalize scrollProgress across the 2,100vh timeline:
  // p: 0.0000 to 0.2143 (0vh - 450vh) = Act 1 MTC Testing Chamber (#FAF9F6)
  // p: 0.2143 to 0.3095 (450vh - 650vh) = Slow Camera Yaw Sweep & Kinematic Departure
  // p >= 0.3150 (past 650vh) = Canvas completely unmounted
  const isAct1 = scrollProgress <= 0.2143;
  const isDeparture = scrollProgress > 0.2143 && scrollProgress <= 0.3095;

  const floorColor = isAct1 ? '#FAF9F6' : '#0B0C0E';

  // Departure kinematics calculation (450vh - 650vh)
  const departureProgress = useMemo(() => {
    if (!isDeparture) return { p: 0, isYawSweep: false, isLaunch: false };
    const norm = Math.min(1.0, Math.max(0.0, (scrollProgress - 0.2143) / (0.3095 - 0.2143)));
    return {
      p: norm,
      isYawSweep: norm <= 0.55,
      isLaunch: norm > 0.55,
    };
  }, [isDeparture, scrollProgress]);

  const exitDisp = useMemo(() => {
    if (!isDeparture) return { x: 0, y: 0, z: 0, rotY: 0, opacity: 1.0 };
    const norm = departureProgress.p;
    if (norm <= 0.55) {
      // Sub-phase A: Slow yaw sweep around flank (stationary car, active camera yaw)
      return { x: 0, y: 0, z: 0, rotY: -0.15 * (norm / 0.55), opacity: 1.0 };
    }
    // Sub-phase B: Kinematic forward warp departure
    const tExit = (norm - 0.55) / 0.45;
    return {
      x: 22.0 * Math.pow(tExit, 2.2),
      y: 0.18 * Math.sin(tExit * Math.PI),
      z: -18.0 * Math.pow(tExit, 1.8),
      rotY: -0.15 - 0.35 * tExit,
      opacity: Math.max(0, 1.0 - Math.pow(tExit, 1.4)),
    };
  }, [isDeparture, departureProgress]);

  useFrame((_, delta) => {
    if (!cameraRef.current) return;
    const mx = mousePosRef.current.x;
    const my = mousePosRef.current.y;

    let targetCamX = 0.25;
    let targetCamY = 1.05;
    let targetCamZ = 5.9;

    let targetLookX = 1.45;
    let targetLookY = 0.20;
    let targetLookZ = 0;

    if (isAct1) {
      // Act 1 (0vh - 450vh): Unhurried editorial showcase in right 60% with soft parallax
      const p1 = Math.min(1.0, scrollProgress / 0.2143);
      targetCamX = THREE.MathUtils.lerp(0.25, 0.65, p1) + mx * 0.25;
      targetCamY = THREE.MathUtils.lerp(1.05, 0.85, p1) + my * 0.15;
      targetCamZ = THREE.MathUtils.lerp(5.9, 4.8, p1);

      targetLookX = THREE.MathUtils.lerp(1.45, 1.35, p1);
      targetLookY = THREE.MathUtils.lerp(0.20, 0.15, p1);
      targetLookZ = 0;
    } else if (isDeparture) {
      const norm = departureProgress.p;
      if (norm <= 0.55) {
        // Slow, luxurious 3D camera yaw sweep around the flank (450vh - 560vh)
        const tYaw = norm / 0.55;
        targetCamX = THREE.MathUtils.lerp(0.65, 2.45, Math.sin(tYaw * Math.PI * 0.5)) + mx * 0.1;
        targetCamY = THREE.MathUtils.lerp(0.85, 0.45, tYaw);
        targetCamZ = THREE.MathUtils.lerp(4.8, 2.6, tYaw);

        targetLookX = THREE.MathUtils.lerp(1.35, 1.10, tYaw);
        targetLookY = THREE.MathUtils.lerp(0.15, 0.08, tYaw);
        targetLookZ = THREE.MathUtils.lerp(0.0, 0.25, tYaw);
      } else {
        // Kinematic launch tracking (560vh - 650vh)
        const tExit = (norm - 0.55) / 0.45;
        targetCamX = THREE.MathUtils.lerp(2.45, 0.50, tExit);
        targetCamY = THREE.MathUtils.lerp(0.45, 1.10, tExit);
        targetCamZ = THREE.MathUtils.lerp(2.6, 6.2, tExit);

        targetLookX = 1.10 + exitDisp.x * 0.4;
        targetLookY = 0.15;
        targetLookZ = exitDisp.z * 0.5;
      }
    }

    cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamX, 3.5, delta);
    cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, targetCamY, 3.5, delta);
    cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamZ, 3.5, delta);
    cameraRef.current.lookAt(targetLookX, targetLookY, targetLookZ);

    if (carGroupRef.current) {
      if (isAct1) {
        const p1 = Math.min(1.0, scrollProgress / 0.2143);
        carGroupRef.current.rotation.y = THREE.MathUtils.lerp(-0.52, -0.42, p1) + mx * 0.04;
        carGroupRef.current.rotation.x = THREE.MathUtils.lerp(0.02, 0.01, p1) - my * 0.02;
      } else if (isDeparture) {
        carGroupRef.current.rotation.y = -0.42 + exitDisp.rotY;
        carGroupRef.current.rotation.x = 0;
      }
    }
  });

  const steerAngle = isAct1 ? mousePosRef.current.x * 0.12 : 0;
  const isDrsOpen = isDeparture && departureProgress.p > 0.4;

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0.25, 1.05, 5.9]} fov={38} />

      {/* Procedural MTC Architectural Chamber & Ceiling Softbox Array */}
      <WindTunnelChamber floorColor={floorColor} />

      {/* Calibrated Automotive Studio Key & Rim Lights */}
      <ambientLight intensity={isAct1 ? 0.32 : 0.20} color="#FFFFFF" />
      
      {/* Primary Key Diffuse Softbox Sun */}
      <directionalLight
        position={[4.8, 8.5, 3.8]}
        intensity={isAct1 ? 1.45 : 1.25}
        color="#FFFDF7"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Port Skylight Fill (Cool 6,500K Sky Bounce through Foster Louvers) */}
      <directionalLight position={[-5.5, 4.2, 1.8]} intensity={0.55} color="#E8F2FF" />

      {/* Starboard Warm Contour Rim Light */}
      <directionalLight position={[6.5, 3.5, -2.5]} intensity={0.75} color="#FFF5EB" />

      {/* Dynamic Car Model: Center-Right Foreground (1.75, -0.32, 0.2) */}
      <group position={[1.75 + exitDisp.x, -0.32 + exitDisp.y, 0.2 + exitDisp.z]}>
        <group ref={carGroupRef} rotation={[0.02, -0.52, 0]}>
          <ShowcaseErrorBoundary fallback={<SculptedF1Fallback color={liveryColor} brakePct={brakeEmissive * 40} />}>
            <Suspense fallback={<SculptedF1Fallback color={liveryColor} brakePct={brakeEmissive * 40} />}>
              <F1CarGlbModel
                liveryColor={liveryColor}
                steerAngleRad={steerAngle}
                brakeEmissive={brakeEmissive}
                drsOpen={isDrsOpen}
                speedKmh={isDeparture ? 342 : 260}
              />
            </Suspense>
          </ShowcaseErrorBoundary>

          {/* Laminar Airflow Streamline Ribbons */}
          <WindTunnelStreamlines
            visible={isAct1 && exitDisp.opacity > 0.02}
            opacity={exitDisp.opacity}
            flowSpeed={1.2}
          />

          {/* Soft Physical Contact Ambient Occlusion directly beneath Tires and Floor */}
          <ContactShadows
            position={[0, -0.092, 0]}
            opacity={isAct1 ? 0.62 : 0.82}
            scale={12.5}
            blur={1.6}
            far={3.2}
            resolution={1024}
            color="#06080A"
          />
        </group>
      </group>
    </>
  );
}

export const WindTunnelHeroCanvas: React.FC<F1CarShowcase3DProps> = ({
  liveryColor,
  scrollProgress,
  tyreAgeLaps = 12,
  fuelLoadKg = 40,
}) => {
  // CRITICAL FIX: Unmount completely past 650vh (p >= 0.315) for exact 0.0% GPU load across Acts 2, 3, and 4!
  const isPastHeroDomain = scrollProgress >= 0.315;

  if (isPastHeroDomain) {
    return null;
  }

  const opacity =
    scrollProgress > 0.28 ? Math.max(0, 1.0 - (scrollProgress - 0.28) / 0.035) : 1.0;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-300"
      style={{ opacity }}
      aria-hidden="true"
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
        // CRITICAL DPR CLAMP: Limits max rasterization to 1.5x on 4K/Retina to save 45%+ GPU fill-rate!
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
      >
        <WindTunnelSceneRig
          liveryColor={liveryColor}
          scrollProgress={scrollProgress}
          tyreAgeLaps={tyreAgeLaps}
          fuelLoadKg={fuelLoadKg}
        />
      </Canvas>
    </div>
  );
};

export const F1CarShowcase3D = WindTunnelHeroCanvas;