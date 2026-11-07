// frontend/src/components/showcase3d/WindTunnelChamber.tsx
/**
 * VELOCE V2 // MCLAREN TECHNOLOGY CENTRE (MTC) HERO TESTING FACILITY
 * Architectural Design: Foster + Partners / Ron Dennis Pristine Aesthetic
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * Invariants & Architectural Specifications:
 * 1. High-Gloss Polished White Epoxy Floor at y = -0.42:
 *    - Real-time planar specular reflections using <MeshReflectorMaterial>
 *    - roughness: 0.12, metalness: 0.05, mirror: 0.65, mixStrength: 1.8
 *    - Subtle 4m x 4m micro-expansion joint lines
 * 2. Norman Foster Acoustic Frosted Glass Louver Array (Port Wall, x = -6.5):
 *    - 12 vertical frosted acoustic glass blades rotated at 38°
 *    - MeshPhysicalMaterial: transmission: 0.88, roughness: 0.22, ior: 1.52
 *    - Brushed stainless steel spider brackets & tension rods
 *    - Diffuse daylight back-illumination bank (6,500K)
 * 3. Micro-Chamfered Acoustic Wall Panels (Rear Wall, z = -14.0):
 *    - Sterile Alabaster (#FAF9F6) to Pale Putty (#F0EDE6)
 *    - Recessed 20mm negative reveal shadow joints
 *    - Aerodynamic wind-tunnel honeycomb air intake plenum
 * 4. Suspended Diffuse Softbox Ceiling Light Matrix (y = 5.4m):
 *    - Centerline Barrisol-style luminaire (12m x 2.4m) + transverse trusses
 * 5. Flush Aerodynamic Turntable at y = -0.418:
 *    - Radial brushed disc + laser-etched scale ticks + recessed LED trench halo
 */

import React, { useMemo, useRef } from 'react';
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface WindTunnelChamberProps {
  turntableRotation?: number; // radians
  lightIntensityMultiplier?: number;
  floorColor?: string; // transitions between #FAF9F6 (Act 1) and #0B0C0E (Act 2)
}

export const WindTunnelChamber: React.FC<WindTunnelChamberProps> = ({
  turntableRotation = 0,
  lightIntensityMultiplier = 1.0,
  floorColor = '#FAF9F6',
}) => {
  const turntableGroupRef = useRef<THREE.Group>(null);
  const isWhiteRoom = floorColor === '#FAF9F6';

  useFrame(() => {
    if (turntableGroupRef.current) {
      turntableGroupRef.current.rotation.y = turntableRotation;
    }
  });

  // Procedural 360-degree precision wind-tunnel turntable calibration ticks
  const degreeTickMeshes = useMemo(() => {
    const ticks = [];
    const radius = 3.32;
    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 30 === 0;
      const isQuadrant = deg % 90 === 0;
      const length = isQuadrant ? 0.22 : isMajor ? 0.14 : 0.065;
      const width = isQuadrant ? 0.022 : isMajor ? 0.014 : 0.008;
      const x = Math.sin(rad) * radius;
      const z = Math.cos(rad) * radius;

      ticks.push({
        id: deg,
        position: [x, 0.002, z] as [number, number, number],
        rotation: [0, rad, 0] as [number, number, number],
        scale: [width, 0.002, length] as [number, number, number],
        color: isQuadrant ? '#FF3B00' : isMajor ? (isWhiteRoom ? '#1F242B' : '#FFFFFF') : (isWhiteRoom ? '#9AA0AA' : '#5A606A'),
      });
    }
    return ticks;
  }, [isWhiteRoom]);

  // Norman Foster Frosted Glass Acoustic Louver Blades (12 vertical structural blades)
  const louverBlades = useMemo(() => {
    const blades = [];
    const count = 12;
    const spacing = 1.25;
    const startZ = 7.0;

    for (let i = 0; i < count; i++) {
      const z = startZ - i * spacing;
      blades.push({
        id: i,
        position: [-6.4, 2.1, z] as [number, number, number],
        rotation: [0, (38 * Math.PI) / 180, 0] as [number, number, number],
      });
    }
    return blades;
  }, []);

  // Micro-chamfered modular rear acoustic wall panels (6 horizontal columns x 3 vertical tiers)
  const wallPanels = useMemo(() => {
    const panels = [];
    const cols = 7;
    const rows = 3;
    const panelW = 4.8;
    const panelH = 2.4;
    const gap = 0.06;

    const startX = -((cols - 1) * (panelW + gap)) / 2;
    const startY = 0.8 + panelH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        panels.push({
          id: `${r}-${c}`,
          position: [startX + c * (panelW + gap), startY + r * (panelH + gap), -13.95] as [number, number, number],
          size: [panelW, panelH, 0.08] as [number, number, number],
        });
      }
    }
    return panels;
  }, []);

  return (
    <group name="WindTunnelChamber">
      {/* ================================================================== */}
      {/* 1. BAKED PMREM CEILING LIGHTFORMER SOFTBOX & CONTRAST ARRAY        */}
      {/* ================================================================== */}
      <Environment resolution={1024} frames={1}>
        {/* Overhead Longitudinal Softbox Diffuser (Direct F1 Spine Reflection) */}
        <Lightformer
          form="rect"
          intensity={4.6 * lightIntensityMultiplier}
          color="#FFFFFF"
          position={[1.75, 5.2, 0.2]}
          scale={[2.6, 14.5, 1]}
          target={[1.75, 0, 0.2]}
        />

        {/* Port Wall Soft Diffuser Bank (Cool Daylight 6,500K through Glass Louvers) */}
        <Lightformer
          form="rect"
          intensity={3.2 * lightIntensityMultiplier}
          color="#EDF4FF"
          position={[-6.2, 2.2, 0.5]}
          scale={[2.2, 11.0, 1]}
          rotation={[0, Math.PI / 2, 0]}
        />

        {/* Starboard Wall Studio Rim (Warm Architectural Accent 3,800K) */}
        <Lightformer
          form="rect"
          intensity={2.4 * lightIntensityMultiplier}
          color="#FFF8F2"
          position={[7.5, 2.0, 0.5]}
          scale={[2.0, 10.0, 1]}
          rotation={[0, -Math.PI / 2, 0]}
        />

        {/* Front Wing Grazing High-Intensity Circular Kicker */}
        <Lightformer
          form="circle"
          intensity={5.4 * lightIntensityMultiplier}
          color="#FFFFFF"
          position={[1.75, 0.6, 5.4]}
          scale={[2.4, 2.4, 1]}
        />

        {/* Soft Ambient Room Bounce */}
        <Lightformer
          form="rect"
          intensity={1.2 * lightIntensityMultiplier}
          color="#FAF9F6"
          position={[1.75, 3.8, -4.5]}
          scale={[14.0, 1.8, 1]}
        />
      </Environment>

      {/* ================================================================== */}
      {/* 2. POLISHED WHITE EPOXY RESIN FLOOR WITH PLANAR REFLECTIONS        */}
      {/* ================================================================== */}
      {/* Main High-Gloss Planar Reflector Plane */}
      <mesh receiveShadow position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 36]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={0.85}
          mixStrength={1.8}
          roughness={0.12}
          metalness={0.05}
          mirror={0.65}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.5}
          depthScale={1.2}
          depthToBlurRatioBias={0.25}
          color={isWhiteRoom ? '#FAF9F6' : '#0B0C0E'}
        />
      </mesh>

      {/* Infinite Outer Studio Floor Falloff (Zero visible mesh boundaries) */}
      <mesh receiveShadow position={[0, -0.421, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial
          color={isWhiteRoom ? '#FAF9F6' : '#090B0D'}
          roughness={0.25}
          metalness={0.02}
        />
      </mesh>

      {/* Architectural Floor Expansion Joints (Subtle 4m x 4m cleanroom grid lines) */}
      {isWhiteRoom && (
        <group position={[0, -0.419, 0]}>
          {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
            <mesh key={`grid-x-${x}`} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.012, 32]} />
              <meshBasicMaterial color="#E6E2D8" opacity={0.6} transparent />
            </mesh>
          ))}
          {[-12, -8, -4, 0, 4, 8, 12].map((z) => (
            <mesh key={`grid-z-${z}`} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[32, 0.012]} />
              <meshBasicMaterial color="#E6E2D8" opacity={0.6} transparent />
            </mesh>
          ))}
        </group>
      )}

      {/* ================================================================== */}
      {/* 3. NORMAN FOSTER ACOUSTIC FROSTED GLASS LOUVERS (PORT WALL)        */}
      {/* ================================================================== */}
      <group name="FosterAcousticLouvers">
        {/* Soft daylight luminaire wall behind frosted glass */}
        <mesh position={[-6.85, 2.4, -0.2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[18, 5.2]} />
          <meshBasicMaterial
            color={isWhiteRoom ? '#EDF3FA' : '#0E131A'}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Array of angled structural glass blades */}
        {louverBlades.map((blade) => (
          <group key={blade.id} position={blade.position} rotation={blade.rotation}>
            {/* 4.2m Frosted Architectural Glass Blade */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.42, 4.2, 0.028]} />
              <meshPhysicalMaterial
                color={isWhiteRoom ? '#F0F5F8' : '#141A22'}
                transmission={0.88}
                opacity={1.0}
                transparent={true}
                roughness={0.22}
                ior={1.52}
                thickness={0.15}
                reflectivity={0.5}
                specularIntensity={1.0}
              />
            </mesh>

            {/* Bead-Blasted Stainless Steel Tension Stand-Off Brackets */}
            <mesh position={[0, 1.95, 0.025]}>
              <cylinderGeometry args={[0.018, 0.018, 0.08, 16]} />
              <meshStandardMaterial color="#8B919A" metalness={0.92} roughness={0.18} />
            </mesh>
            <mesh position={[0, -1.95, 0.025]}>
              <cylinderGeometry args={[0.018, 0.018, 0.08, 16]} />
              <meshStandardMaterial color="#8B919A" metalness={0.92} roughness={0.18} />
            </mesh>
          </group>
        ))}

        {/* Structural floor & ceiling continuous mounting channels */}
        <mesh position={[-6.4, -0.38, -0.2]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.18, 0.08, 18]} />
          <meshStandardMaterial color="#707680" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-6.4, 4.38, -0.2]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.18, 0.08, 18]} />
          <meshStandardMaterial color="#707680" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 4. MICRO-CHAMFERED ACOUSTIC REAR WALL & AIR INTAKE PLENUM          */}
      {/* ================================================================== */}
      <group name="AcousticBaffleWall" position={[0, 0, 0]}>
        {/* Recessed dark negative expansion background wall */}
        <mesh receiveShadow position={[0, 3.8, -14.05]}>
          <planeGeometry args={[38, 8.5]} />
          <meshStandardMaterial
            color={isWhiteRoom ? '#DDD7CC' : '#050709'}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>

        {/* Individual Chamfered Acoustic Wall Panels */}
        {wallPanels.map((panel) => (
          <mesh key={panel.id} position={panel.position} receiveShadow>
            <boxGeometry args={panel.size} />
            <meshStandardMaterial
              color={isWhiteRoom ? '#FAF9F6' : '#0D1014'}
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>
        ))}

        {/* Architectural Foster MTC Acoustic Wall Panel (Clean Alabaster Surface, Zero Dark Boxes) */}
        <mesh position={[1.75, 1.8, -13.9]}>
          <boxGeometry args={[4.2, 1.8, 0.02]} />
          <meshStandardMaterial
            color={isWhiteRoom ? '#FAF9F6' : '#14181F'}
            roughness={0.92}
            metalness={0.01}
          />
        </mesh>

        {/* Linear Floor Uplight Strip Washing the Rear Acoustic Wall */}
        <mesh position={[0, -0.41, -13.85]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[34, 0.08]} />
          <meshBasicMaterial
            color={isWhiteRoom ? '#FFFDF8' : '#00E5FF'}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 5. SUSPENDED DIFFUSE SOFTBOX CEILING MATRIX (y = 5.4m)             */}
      {/* ================================================================== */}
      <group name="CeilingMatrix" position={[1.75, 5.4, 0.2]}>
        {/* Main Centerline Longitudinal Softbox Diffuser Housing (12m x 2.4m) */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[2.5, 0.16, 13.5]} />
          <meshStandardMaterial color="#E8E5DD" metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Translucent Luminous Emissive Barrisol Diffuser Face */}
        <mesh position={[0, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 13.4]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>

        {/* Suspended Transverse Aluminum Trusses */}
        {[-5.0, -2.5, 0, 2.5, 5.0].map((zPos, idx) => (
          <group key={`truss-${idx}`} position={[0, 0.15, zPos]}>
            <mesh>
              <boxGeometry args={[9.5, 0.06, 0.06]} />
              <meshStandardMaterial color="#B0B5BD" metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Suspension hangar wires to ceiling slab */}
            <mesh position={[-4.5, 0.45, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.9]} />
              <meshStandardMaterial color="#6B7280" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[4.5, 0.45, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.9]} />
              <meshStandardMaterial color="#6B7280" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================== */}
      {/* 6. ROTARY AERODYNAMIC TURNTABLE FLUSH AT y = -0.418                */}
      {/* ================================================================== */}
      <group ref={turntableGroupRef} position={[1.75, -0.418, 0.2]}>
        {/* Recessed Circular Perimeter Trench with Glowing LED Halo Ring */}
        <mesh position={[0, 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.48, 3.54, 128]} />
          <meshBasicMaterial
            color={isWhiteRoom ? '#FFFFFF' : '#00F0FF'}
            toneMapped={false}
          />
        </mesh>

        {/* Center Turntable Disk (r = 3.25m): Radial Brushed Machined Finish */}
        <mesh receiveShadow position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.25, 128]} />
          <meshStandardMaterial
            color={isWhiteRoom ? '#E9ECEF' : '#14181F'}
            metalness={0.38}
            roughness={0.28}
          />
        </mesh>

        {/* Precision Chamfered Stainless Steel Outer Bezel Ring (3.25m to 3.48m) */}
        <mesh receiveShadow position={[0, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.25, 3.48, 128]} />
          <meshStandardMaterial
            color={isWhiteRoom ? '#D6D9E0' : '#222832'}
            metalness={0.78}
            roughness={0.18}
          />
        </mesh>

        {/* Precision Laser-Etched 360-Degree Calibration Ticks */}
        {degreeTickMeshes.map((tick) => (
          <mesh
            key={tick.id}
            position={tick.position}
            rotation={tick.rotation}
            scale={tick.scale}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={tick.color} toneMapped={false} />
          </mesh>
        ))}

        {/* Wind-Tunnel Ground-Plane Boundary Layer Suction Perforations */}
        <mesh position={[0, 0.0018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.28, 64]} />
          <meshStandardMaterial
            color={isWhiteRoom ? '#B8BDC7' : '#090B0E'}
            roughness={0.65}
            metalness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};