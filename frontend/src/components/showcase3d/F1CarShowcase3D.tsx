// frontend/src/components/showcase3d/F1CarShowcase3D.tsx
/**
 * VELOCE PRO // MCLAREN TECHNOLOGY CENTRE (MTC) 3D SHOWCASE CANVAS (0vh -> 380vh)
 * Continuous 60/120 FPS Physically Damped Scrollytelling Engine.
 * 
 * Kinematic Invariants:
 * 1. ZERO frame snapping: Evaluates Hermite quintic kinematics continuously inside useFrame().
 * 2. Unquantized Sub-Millimeter Travel: Continuous damp integration on car position and camera lookAt.
 * 3. Pure Editorial Separation: Car positioned in right 55% (x: 2.85m), leaving left column 100% unobstructed.
 * 4. Launch Propulsion: Car accelerates cleanly forward into +z (from 0 to +16m) with camera tracking.
 * 5. Dynamic Aerodynamic Streamlines and 1,020°C Incandescent Brake Discs.
 */

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { F1CarGlbModel } from './F1CarGlbModel';
import { WindTunnelChamber } from './WindTunnelChamber';
import { WindTunnelStreamlines } from './WindTunnelStreamlines';
import { scrollMutable } from '../../utils/scrollMutable';

interface F1CarShowcase3DProps {
  liveryColor: string;
  scrollProgress: number; // 0.0 to 1.0 across full master timeline
  tyreAgeLaps?: number;
  fuelLoadKg?: number;
}

class ShowcaseErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.debug('F1CarShowcase3D caught render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface KinematicsState {
  camPos: [number, number, number];
  lookAt: [number, number, number];
  carPosX: number;
  carPosY: number;
  carPosZ: number;
  carRotY: number;
  speedKmh: number;
  brakeEmissive: number;
  drsOpen: boolean;
  streamlineOpacity: number;
  streamlineSpeed: number;
  fadeOpacity: number;
}

function computeKinematics(p: number): KinematicsState {
  // 1. Chapter 1: Specification (0.00 -> 0.25)
  // Car positioned strictly in right column (x: 3.10), nosecone straight/away, 0% text overlap
  if (p <= 0.25) {
    const t = p / 0.25;
    return {
      camPos: [
        THREE.MathUtils.lerp(0.35, 1.25, t),
        THREE.MathUtils.lerp(0.95, 0.75, t),
        THREE.MathUtils.lerp(5.20, 4.20, t),
      ],
      lookAt: [
        THREE.MathUtils.lerp(1.45, 1.85, t),
        THREE.MathUtils.lerp(0.12, 0.12, t),
        THREE.MathUtils.lerp(-0.10, 0.10, t),
      ],
      carPosX: 3.10,
      carPosY: -0.36,
      carPosZ: -0.15,
      carRotY: THREE.MathUtils.lerp(-0.22, -0.12, t),
      speedKmh: 120,
      brakeEmissive: 0.05,
      drsOpen: false,
      streamlineOpacity: THREE.MathUtils.lerp(0.35, 0.65, t),
      streamlineSpeed: 1.2,
      fadeOpacity: 1.0,
    };
  }

  // 2. Chapter 2: Computational Aero (0.25 -> 0.55)
  if (p <= 0.55) {
    const t = (p - 0.25) / 0.30;
    return {
      camPos: [
        THREE.MathUtils.lerp(1.25, 2.20, t),
        THREE.MathUtils.lerp(0.75, 0.55, t),
        THREE.MathUtils.lerp(4.20, 2.90, t),
      ],
      lookAt: [
        THREE.MathUtils.lerp(1.85, 2.40, t),
        THREE.MathUtils.lerp(0.12, 0.08, t),
        THREE.MathUtils.lerp(0.10, 0.20, t),
      ],
      carPosX: 3.10,
      carPosY: -0.36,
      carPosZ: -0.15,
      carRotY: THREE.MathUtils.lerp(-0.12, 0.04, t),
      speedKmh: THREE.MathUtils.lerp(120, 260, t),
      brakeEmissive: 0.15,
      drsOpen: false,
      streamlineOpacity: 0.85,
      streamlineSpeed: THREE.MathUtils.lerp(1.2, 2.4, t),
      fadeOpacity: 1.0,
    };
  }

  // 3. Chapter 3: Thermal Retardation & DRS (0.55 -> 0.82)
  if (p <= 0.82) {
    const t = (p - 0.55) / 0.27;
    const thermalPulse = Math.sin(t * Math.PI) * 2.2;
    return {
      camPos: [
        THREE.MathUtils.lerp(2.20, 1.60, t),
        THREE.MathUtils.lerp(0.55, 0.65, t),
        THREE.MathUtils.lerp(2.90, -2.10, t),
      ],
      lookAt: [
        THREE.MathUtils.lerp(2.40, 2.20, t),
        THREE.MathUtils.lerp(0.08, 0.18, t),
        THREE.MathUtils.lerp(0.20, -0.30, t),
      ],
      carPosX: 3.10,
      carPosY: -0.36,
      carPosZ: -0.15,
      carRotY: THREE.MathUtils.lerp(0.04, 0.00, t),
      speedKmh: THREE.MathUtils.lerp(260, 70, Math.sin(t * Math.PI * 0.5)),
      brakeEmissive: Math.max(0.1, thermalPulse),
      drsOpen: t > 0.45,
      streamlineOpacity: 0.70,
      streamlineSpeed: 1.6,
      fadeOpacity: 1.0,
    };
  }

  // 4. Chapter 4: Warp Propulsion Launch (0.82 -> 1.00)
  // Continuous smooth quintic ease eliminates frame-by-frame snapping!
  const t = (p - 0.82) / 0.18;
  const smoothT = t * t * (3 - 2 * t);
  const launchDist = 16.0 * smoothT; // Smooth forward acceleration along +z
  const lateralSway = 0.35 * Math.sin(t * Math.PI);
  const squatY = -0.025 * Math.sin(t * Math.PI);
  const fadeOpacity = Math.max(0, 1.0 - t * 1.15);

  return {
    camPos: [
      THREE.MathUtils.lerp(1.60, 2.30, smoothT),
      THREE.MathUtils.lerp(0.65, 0.95, smoothT),
      THREE.MathUtils.lerp(-2.10, -1.20 + launchDist * 0.75, smoothT),
    ],
    lookAt: [
      THREE.MathUtils.lerp(2.20, 3.10 + lateralSway, smoothT),
      0.15,
      launchDist,
    ],
    carPosX: 3.10 + lateralSway,
    carPosY: -0.36 + squatY,
    carPosZ: launchDist - 0.15,
    carRotY: 0.0 - 0.05 * smoothT,
    speedKmh: THREE.MathUtils.lerp(70, 352, smoothT),
    brakeEmissive: 0.0,
    drsOpen: false,
    streamlineOpacity: fadeOpacity * 0.8,
    streamlineSpeed: 3.5,
    fadeOpacity,
  };
}

function WindTunnelSceneRig({
  liveryColor,
  scrollProgress: _scrollProgress,
}: F1CarShowcase3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const carOuterGroupRef = useRef<THREE.Group>(null);
  const carGroupRef = useRef<THREE.Group>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Persistent reference for smoothed camera target to eliminate orientation snapping
  const currentLookAtRef = useRef(new THREE.Vector3(2.35, 0.15, 0.0));
  // Continuous frame-by-frame progress damping (eliminates discrete react state jumps)
  const currentProgressRef = useRef<number>(0);

  // Dynamic reactive states for GLB shader uniforms
  const [dynBrakeEmissive, setDynBrakeEmissive] = useState(0.05);
  const [dynDrsOpen, setDynDrsOpen] = useState(false);
  const [dynSpeedKmh, setDynSpeedKmh] = useState(120);
  const [dynStreamOpacity, setDynStreamOpacity] = useState(0.35);
  const [dynStreamSpeed, setDynStreamSpeed] = useState(1.2);
  const [dynFadeOpacity, setDynFadeOpacity] = useState(1.0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    // Zero GPU cost when scrolled past Act 1 without unmounting WebGL Canvas
    if (scrollMutable.act1Progress >= 1.0) return;

    // Read unquantized act1 progress from scrollMutable
    const targetNormalized = scrollMutable.act1Progress;

    // 2. Smooth continuous 60/120 FPS progress damping
    currentProgressRef.current = THREE.MathUtils.damp(
      currentProgressRef.current,
      targetNormalized,
      7.0,
      delta
    );

    const k = computeKinematics(currentProgressRef.current);
    const mx = mousePosRef.current.x;
    const my = mousePosRef.current.y;

    // 3. Smooth Camera Translation
    if (cameraRef.current) {
      const targetCamX = k.camPos[0] + mx * 0.14;
      const targetCamY = k.camPos[1] + my * 0.08;
      const targetCamZ = k.camPos[2];

      cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamX, 5.0, delta);
      cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, targetCamY, 5.0, delta);
      cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamZ, 5.0, delta);

      // Smooth Camera Orientation (lookAt)
      currentLookAtRef.current.x = THREE.MathUtils.damp(currentLookAtRef.current.x, k.lookAt[0], 5.0, delta);
      currentLookAtRef.current.y = THREE.MathUtils.damp(currentLookAtRef.current.y, k.lookAt[1], 5.0, delta);
      currentLookAtRef.current.z = THREE.MathUtils.damp(currentLookAtRef.current.z, k.lookAt[2], 5.0, delta);
      cameraRef.current.lookAt(currentLookAtRef.current);
    }

    // 4. Smooth Car Position & Rotation Damping
    if (carOuterGroupRef.current) {
      carOuterGroupRef.current.position.x = THREE.MathUtils.damp(
        carOuterGroupRef.current.position.x,
        k.carPosX,
        6.0,
        delta
      );
      carOuterGroupRef.current.position.y = THREE.MathUtils.damp(
        carOuterGroupRef.current.position.y,
        k.carPosY,
        6.0,
        delta
      );
      carOuterGroupRef.current.position.z = THREE.MathUtils.damp(
        carOuterGroupRef.current.position.z,
        k.carPosZ,
        6.0,
        delta
      );
    }

    if (carGroupRef.current) {
      carGroupRef.current.rotation.y = THREE.MathUtils.damp(
        carGroupRef.current.rotation.y,
        k.carRotY + mx * 0.035,
        5.0,
        delta
      );
    }

    // Sync shader parameters
    setDynBrakeEmissive(k.brakeEmissive);
    setDynDrsOpen(k.drsOpen);
    setDynSpeedKmh(k.speedKmh);
    setDynStreamOpacity(k.streamlineOpacity);
    setDynStreamSpeed(k.streamlineSpeed);
    setDynFadeOpacity(k.fadeOpacity);
  });

  const steerAngle = currentProgressRef.current < 0.8 ? mousePosRef.current.x * 0.10 : 0;

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0.75, 0.90, 5.0]} fov={38} />

      {/* Procedural Foster MTC Architectural Chamber Floor & Louvers */}
      <WindTunnelChamber floorColor="#FAF9F6" />

      {/* Automotive Studio Key & Rim Lights */}
      <ambientLight intensity={0.42} color="#FFFFFF" />

      {/* Primary Key Diffuse Softbox */}
      <directionalLight
        position={[4.8, 8.5, 3.8]}
        intensity={1.6}
        color="#FFFDF7"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Port Skylight Fill (Norman Foster Louver Bounce) */}
      <directionalLight position={[-5.5, 4.2, 1.8]} intensity={0.55} color="#E8F2FF" />

      {/* Starboard Warm Contour Rim */}
      <directionalLight position={[6.5, 3.5, -2.5]} intensity={0.75} color="#FFF5EB" />

      {/* 3D Car Model: Positioned strictly in Right Column (x: 3.10m), 0% overlap with left text */}
      <group ref={carOuterGroupRef} position={[3.10, -0.36, -0.15]}>
        <group ref={carGroupRef} rotation={[0, -0.16, 0]}>
          <ShowcaseErrorBoundary fallback={<group name="ErrorCleanGroup" />}>
            <Suspense fallback={<group name="SuspenseCleanGroup" />}>
              <F1CarGlbModel
                liveryColor={liveryColor}
                steerAngleRad={steerAngle}
                brakeEmissive={dynBrakeEmissive}
                drsOpen={dynDrsOpen}
                speedKmh={dynSpeedKmh}
              />
            </Suspense>
          </ShowcaseErrorBoundary>

          {/* Dynamic Aerodynamic Velocity Streamlines */}
          <WindTunnelStreamlines
            visible={dynFadeOpacity > 0.02}
            opacity={dynStreamOpacity}
            flowSpeed={dynStreamSpeed}
          />

          {/* Soft Physical Contact Ambient Occlusion */}
          <ContactShadows
            position={[0, -0.092, 0]}
            opacity={0.35 * dynFadeOpacity}
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
  return (
    <div className="fixed inset-0 pointer-events-none z-10 w-full h-full">
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
        camera={{ position: [0.75, 0.90, 5.0], fov: 38 }}
      >
        <WindTunnelSceneRig {...props} />
      </Canvas>
    </div>
  );
};
