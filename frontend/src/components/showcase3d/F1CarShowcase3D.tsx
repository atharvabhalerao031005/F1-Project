// frontend/src/components/showcase3d/F1CarShowcase3D.tsx
/**
 * VELOCE PRO // MCLAREN TECHNOLOGY CENTRE (MTC) 3D SHOWCASE CANVAS (0vh -> 650vh)
 * Architectural Design: Foster + Partners / Ron Dennis Pristine White Aesthetic
 * 
 * Synchronized 4-Chapter 3D Camera Choreography:
 * 1. Chapter 1 (0.00 - 0.25, 0vh - 160vh): Low three-quarter front turntable reveal
 * 2. Chapter 2 (0.25 - 0.55, 160vh - 360vh): Close-in aerodynamic sidepod & front wing sweep
 * 3. Chapter 3 (0.55 - 0.82, 360vh - 520vh): Rear waistline, glowing brake discs & DRS flap actuation
 * 4. Chapter 4 (0.82 - 1.00, 520vh - 650vh): High tracking camera & warp velocity launch down runway
 * 5. GPU Dormancy (Past 650vh, p >= 0.3150): Complete unmount for 0.0% GPU load across Acts 2, 3, 4!
 */

import React, { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { F1CarGlbModel } from './F1CarGlbModel';
import { WindTunnelChamber } from './WindTunnelChamber';
import { WindTunnelStreamlines } from './WindTunnelStreamlines';

interface F1CarShowcase3DProps {
  liveryColor: string;
  scrollProgress: number; // 0.0 to 1.0 across full 2,100vh master runway
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
}: F1CarShowcase3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Normalize scrollProgress across the 0vh -> 650vh Act 1 domain (0.0 to 0.3095 of 2,100vh)
  const act1Progress = useMemo(() => {
    return Math.min(1.0, Math.max(0.0, scrollProgress / 0.3095));
  }, [scrollProgress]);

  // Dynamic physical parameters along the 4 chapters
  const kinematics = useMemo(() => {
    const p = act1Progress;

    // 1. Chapter 1: Specification (0.00 -> 0.25)
    // Car positioned strictly in right column (x >= 2.45), nosecone straight/away
    if (p <= 0.25) {
      const t = p / 0.25;
      return {
        camPos: [
          THREE.MathUtils.lerp(1.10, 1.85, t),
          THREE.MathUtils.lerp(0.95, 0.75, t),
          THREE.MathUtils.lerp(5.20, 4.10, t),
        ] as [number, number, number],
        lookAt: [
          THREE.MathUtils.lerp(2.20, 2.05, t),
          THREE.MathUtils.lerp(0.15, 0.10, t),
          THREE.MathUtils.lerp(0.00, 0.10, t),
        ] as [number, number, number],
        carRotY: THREE.MathUtils.lerp(-0.16, -0.08, t),
        speedKmh: 120,
        brakeEmissive: 0.05,
        drsOpen: false,
        streamlineOpacity: THREE.MathUtils.lerp(0.35, 0.65, t),
        streamlineSpeed: 1.2,
        exitDisp: { x: 0, y: 0, z: 0, opacity: 1.0 },
      };
    }

    // 2. Chapter 2: Computational Aero (0.25 -> 0.55)
    if (p <= 0.55) {
      const t = (p - 0.25) / 0.30;
      return {
        camPos: [
          THREE.MathUtils.lerp(1.85, 2.30, t),
          THREE.MathUtils.lerp(0.75, 0.55, t),
          THREE.MathUtils.lerp(4.10, 2.90, t),
        ] as [number, number, number],
        lookAt: [
          THREE.MathUtils.lerp(2.05, 1.80, t),
          THREE.MathUtils.lerp(0.10, 0.08, t),
          THREE.MathUtils.lerp(0.10, 0.20, t),
        ] as [number, number, number],
        carRotY: THREE.MathUtils.lerp(-0.08, 0.04, t),
        speedKmh: THREE.MathUtils.lerp(120, 260, t),
        brakeEmissive: 0.15,
        drsOpen: false,
        streamlineOpacity: 0.85,
        streamlineSpeed: THREE.MathUtils.lerp(1.2, 2.4, t),
        exitDisp: { x: 0, y: 0, z: 0, opacity: 1.0 },
      };
    }

    // 3. Chapter 3: Thermal Retardation & DRS (0.55 -> 0.82)
    if (p <= 0.82) {
      const t = (p - 0.55) / 0.27;
      const thermalPulse = Math.sin(t * Math.PI) * 2.2;
      return {
        camPos: [
          THREE.MathUtils.lerp(2.30, 1.20, t),
          THREE.MathUtils.lerp(0.55, 0.65, t),
          THREE.MathUtils.lerp(2.90, -2.20, t),
        ] as [number, number, number],
        lookAt: [
          THREE.MathUtils.lerp(1.80, 1.50, t),
          THREE.MathUtils.lerp(0.08, 0.22, t),
          THREE.MathUtils.lerp(0.20, -0.30, t),
        ] as [number, number, number],
        carRotY: THREE.MathUtils.lerp(0.04, 0.00, t),
        speedKmh: THREE.MathUtils.lerp(260, 70, Math.sin(t * Math.PI * 0.5)),
        brakeEmissive: Math.max(0.1, thermalPulse),
        drsOpen: t > 0.45,
        streamlineOpacity: 0.70,
        streamlineSpeed: 1.6,
        exitDisp: { x: 0, y: 0, z: 0, opacity: 1.0 },
      };
    }

    // 4. Chapter 4: Warp Propulsion Launch (0.82 -> 1.00)
    // Continuous smooth quintic ease eliminates frame-by-frame snapping
    const t = (p - 0.82) / 0.18;
    const smoothT = t * t * (3 - 2 * t);
    const launchDist = -28.0 * smoothT;
    const lateralSway = 1.2 * Math.sin(t * Math.PI);
    const squatY = -0.03 * Math.sin(t * Math.PI);
    const fadeOpacity = Math.max(0, 1.0 - t);

    return {
      camPos: [
        THREE.MathUtils.lerp(1.20, -0.20, smoothT),
        THREE.MathUtils.lerp(0.65, 1.15, smoothT),
        THREE.MathUtils.lerp(-2.20, 5.50, smoothT),
      ] as [number, number, number],
      lookAt: [
        1.50 + lateralSway * 0.3,
        0.15,
        launchDist * 0.4,
      ] as [number, number, number],
      carRotY: 0.00 - 0.12 * smoothT,
      speedKmh: 352,
      brakeEmissive: 0.0,
      drsOpen: false,
      streamlineOpacity: fadeOpacity * 0.8,
      streamlineSpeed: 3.5,
      exitDisp: {
        x: lateralSway,
        y: squatY,
        z: launchDist,
        opacity: fadeOpacity,
      },
    };
  }, [act1Progress]);

  // Persistent reference for smoothed camera target to eliminate orientation snapping
  const currentLookAtRef = useRef(new THREE.Vector3(2.20, 0.15, 0.0));

  useFrame((_, delta) => {
    if (!cameraRef.current) return;
    const mx = mousePosRef.current.x;
    const my = mousePosRef.current.y;

    const targetCamX = kinematics.camPos[0] + mx * 0.18;
    const targetCamY = kinematics.camPos[1] + my * 0.12;
    const targetCamZ = kinematics.camPos[2];

    const targetLookX = kinematics.lookAt[0];
    const targetLookY = kinematics.lookAt[1];
    const targetLookZ = kinematics.lookAt[2];

    cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamX, 4.0, delta);
    cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, targetCamY, 4.0, delta);
    cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamZ, 4.0, delta);

    // Smoothly damp camera lookAt to eliminate jerky frame-by-frame orientation snapping
    currentLookAtRef.current.x = THREE.MathUtils.damp(currentLookAtRef.current.x, targetLookX, 4.0, delta);
    currentLookAtRef.current.y = THREE.MathUtils.damp(currentLookAtRef.current.y, targetLookY, 4.0, delta);
    currentLookAtRef.current.z = THREE.MathUtils.damp(currentLookAtRef.current.z, targetLookZ, 4.0, delta);
    cameraRef.current.lookAt(currentLookAtRef.current);

    if (carGroupRef.current) {
      carGroupRef.current.rotation.y = THREE.MathUtils.damp(
        carGroupRef.current.rotation.y,
        kinematics.carRotY + mx * 0.04,
        4.0,
        delta
      );
    }
  });

  const steerAngle = act1Progress < 0.8 ? mousePosRef.current.x * 0.12 : 0;

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[1.10, 0.95, 5.2]} fov={38} />

      {/* Procedural Foster MTC Architectural Chamber Floor & Louvers */}
      <WindTunnelChamber floorColor="#FAF9F6" />

      {/* Automotive Studio Key & Rim Lights */}
      <ambientLight intensity={0.34} color="#FFFFFF" />

      {/* Primary Key Diffuse Softbox */}
      <directionalLight
        position={[4.8, 8.5, 3.8]}
        intensity={1.5}
        color="#FFFDF7"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Port Skylight Fill (Norman Foster Louver Bounce) */}
      <directionalLight position={[-5.5, 4.2, 1.8]} intensity={0.55} color="#E8F2FF" />

      {/* Starboard Warm Contour Rim */}
      <directionalLight position={[6.5, 3.5, -2.5]} intensity={0.75} color="#FFF5EB" />

      {/* 3D Car Model: Positioned in Right Column (x: 2.45m), zero overlap with left text column */}
      <group position={[2.45 + kinematics.exitDisp.x, -0.36 + kinematics.exitDisp.y, 0.0 + kinematics.exitDisp.z]}>
        <group ref={carGroupRef} rotation={[0, -0.16, 0]}>
          <ShowcaseErrorBoundary fallback={<group name="ErrorCleanGroup" />}>
            <Suspense fallback={<group name="SuspenseCleanGroup" />}>
              <F1CarGlbModel
                liveryColor={liveryColor}
                steerAngleRad={steerAngle}
                brakeEmissive={kinematics.brakeEmissive}
                drsOpen={kinematics.drsOpen}
                speedKmh={kinematics.speedKmh}
              />
            </Suspense>
          </ShowcaseErrorBoundary>

          {/* Dynamic Aerodynamic Velocity Streamlines */}
          <WindTunnelStreamlines
            visible={kinematics.exitDisp.opacity > 0.02}
            opacity={kinematics.streamlineOpacity}
            flowSpeed={kinematics.streamlineSpeed}
          />

          {/* Soft Physical Contact Ambient Occlusion */}
          <ContactShadows
            position={[0, -0.092, 0]}
            opacity={0.35 * kinematics.exitDisp.opacity}
            scale={10}
            blur={1.4}
            far={3.8}
            resolution={512}
            color="#0A0B0D"
          />
        </group>
      </group>
    </>
  );
}

export const F1CarShowcase3D: React.FC<F1CarShowcase3DProps> = (props) => {
  // Graceful quintic fade out between 0.28 and 0.33 before unmounting past 0.34
  if (props.scrollProgress > 0.34) {
    return null;
  }

  const canvasOpacity = props.scrollProgress > 0.28
    ? Math.max(0, 1 - (props.scrollProgress - 0.28) / 0.05)
    : 1.0;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 w-full h-full transition-opacity duration-300 ease-out"
      style={{ opacity: canvasOpacity }}
    >
      <Canvas
        shadows
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ position: [1.10, 0.95, 5.2], fov: 38 }}
      >
        <WindTunnelSceneRig {...props} />
      </Canvas>
    </div>
  );
};
