// frontend/src/components/showcase3d/SculptedF1Fallback.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SculptedF1FallbackProps {
  color?: string;
  steerAngle?: number;
  brakePct?: number;
  scale?: number;
  isGhost?: boolean;
  opacity?: number;
}

/**
 * Procedural open-wheel aerodynamic Formula 1 chassis fallback.
 * Strictly open-wheel aerodynamic geometry: Front wing planes, tapered nosecone,
 * cockpit monocoque, curved halo, sculpted sidepods, engine cover spine, rear wing,
 * and 4 rotating wheels with red brake calipers.
 * NEVER a sphere!
 */
export const SculptedF1Fallback: React.FC<SculptedF1FallbackProps> = ({
  color = '#FF8000',
  steerAngle = 0,
  brakePct = 0,
  scale = 1.0,
  isGhost = false,
  opacity = 0.65,
}) => {
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const rearWheelsRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const spin = delta * 18;
    if (frontLeftWheelRef.current) frontLeftWheelRef.current.rotation.x += spin;
    if (frontRightWheelRef.current) frontRightWheelRef.current.rotation.x += spin;
    if (rearWheelsRef.current) rearWheelsRef.current.rotation.x += spin;
  });

  return (
    <group scale={scale} position={[0, 0.32, 0]}>
      {/* 1. Main Monocoque Chassis */}
      <mesh position={[0, 0.15, 0.2]} castShadow={!isGhost} receiveShadow={!isGhost}>
        <boxGeometry args={[0.72, 0.38, 2.8]} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.25}
          transparent={isGhost}
          opacity={isGhost ? opacity : 1.0}
        />
      </mesh>

      {/* 2. Tapered Nose Cone */}
      <mesh position={[0, 0.08, 1.95]} rotation={[0.08, 0, 0]} castShadow={!isGhost} receiveShadow={!isGhost}>
        <coneGeometry args={[0.28, 1.1, 4]} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.25}
          transparent={isGhost}
          opacity={isGhost ? opacity : 1.0}
        />
      </mesh>

      {/* 3. Front Wing Main Plane & Endplates */}
      <group position={[0, -0.06, 2.45]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.04, 0.38]} />
          <meshStandardMaterial color="#111315" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Left Endplate */}
        <mesh position={[-0.95, 0.08, 0]} castShadow>
          <boxGeometry args={[0.03, 0.22, 0.42]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Right Endplate */}
        <mesh position={[0.95, 0.08, 0]} castShadow>
          <boxGeometry args={[0.03, 0.22, 0.42]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* 4. Sculpted Sidepods (Left & Right) */}
      <group position={[0, 0.08, -0.1]}>
        {/* Left Sidepod */}
        <mesh position={[-0.68, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.36, 1.6]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} />
        </mesh>
        {/* Right Sidepod */}
        <mesh position={[0.68, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.36, 1.6]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} />
        </mesh>
        {/* Carbon Floor Undertray */}
        <mesh position={[0, -0.18, 0]} receiveShadow>
          <boxGeometry args={[1.95, 0.04, 2.5]} />
          <meshStandardMaterial color="#0C0D0E" roughness={0.6} metalness={0.7} />
        </mesh>
      </group>

      {/* 5. Engine Airbox & Roll Hoop */}
      <mesh position={[0, 0.48, -0.32]} castShadow>
        <boxGeometry args={[0.32, 0.35, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} />
      </mesh>
      {/* Airbox Intake */}
      <mesh position={[0, 0.62, 0.05]} rotation={[-0.2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.15, 16]} />
        <meshStandardMaterial color="#0A0B0D" roughness={0.9} />
      </mesh>

      {/* 6. Cockpit Halo Safety Structure */}
      <group position={[0, 0.42, 0.45]}>
        {/* Center Strut */}
        <mesh position={[0, 0, 0.25]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.35, 12]} />
          <meshStandardMaterial color="#1C1E22" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Halo Arch */}
        <mesh position={[0, 0.12, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.025, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#1C1E22" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 7. Rear Wing Assembly & Diffuser */}
      <group position={[0, 0.6, -1.85]}>
        {/* Main Wing Plane */}
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.04, 0.32]} />
          <meshStandardMaterial color="#111315" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Upper DRS Flap */}
        <mesh position={[0, 0.12, -0.05]} castShadow>
          <boxGeometry args={[1.45, 0.03, 0.22]} />
          <meshStandardMaterial color="#111315" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Endplates */}
        <mesh position={[-0.75, 0.02, 0]} castShadow>
          <boxGeometry args={[0.03, 0.45, 0.45]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.75, 0.02, 0]} castShadow>
          <boxGeometry args={[0.03, 0.45, 0.45]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Rear Rain LED */}
        <mesh position={[0, -0.25, -0.05]}>
          <boxGeometry args={[0.12, 0.08, 0.04]} />
          <meshBasicMaterial color={brakePct > 10 ? '#FF1E44' : '#FF3B00'} />
        </mesh>
      </group>

      {/* 8. Front Left Steered Wheel */}
      <group position={[-0.95, -0.02, 1.4]} rotation={[0, steerAngle, 0]}>
        <group ref={frontLeftWheelRef}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.32, 24]} />
            <meshStandardMaterial color="#181A1D" roughness={0.8} />
          </mesh>
          {/* Wheel Rim & Brake Disc */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.33, 16]} />
            <meshStandardMaterial
              color="#3A3D44"
              metalness={0.9}
              emissive={brakePct > 20 ? '#FF3B00' : '#000000'}
              emissiveIntensity={brakePct > 20 ? 1.5 : 0}
            />
          </mesh>
        </group>
      </group>

      {/* 9. Front Right Steered Wheel */}
      <group position={[0.95, -0.02, 1.4]} rotation={[0, steerAngle, 0]}>
        <group ref={frontRightWheelRef}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.32, 24]} />
            <meshStandardMaterial color="#181A1D" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.33, 16]} />
            <meshStandardMaterial
              color="#3A3D44"
              metalness={0.9}
              emissive={brakePct > 20 ? '#FF3B00' : '#000000'}
              emissiveIntensity={brakePct > 20 ? 1.5 : 0}
            />
          </mesh>
        </group>
      </group>

      {/* 10. Rear Wheels (Left & Right) */}
      <group ref={rearWheelsRef} position={[0, -0.02, -1.35]}>
        {/* Rear Left */}
        <mesh position={[-0.98, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.42, 24]} />
          <meshStandardMaterial color="#181A1D" roughness={0.8} />
        </mesh>
        {/* Rear Right */}
        <mesh position={[0.98, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.42, 24]} />
          <meshStandardMaterial color="#181A1D" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};
