// frontend/src/components/showcase3d/WindTunnelChamber.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface WindTunnelChamberProps {
  floorColor?: string;
  turntableRotation?: number;
  lightIntensityMultiplier?: number;
}

export const WindTunnelChamber: React.FC<WindTunnelChamberProps> = () => {
  const cursorLightRef = useRef<THREE.PointLight>(null);

  // Build a seamless curved Photography Infinity Cyclorama (Floor curving smoothly into Back Wall)
  const cycGeometry = useMemo(() => {
    // Profile in (Y, Z): starts at front floor z = +12, curves smoothly up at z = -7.5 to height y = +14
    const pts: THREE.Vector2[] = [];
    for (let z = 12; z >= -4.5; z -= 0.5) {
      pts.push(new THREE.Vector2(z, -0.38));
    }
    // Smooth quarter-circle cove radius R = 4.5m from z = -4.5 to z = -9.0
    const r = 4.5;
    for (let angle = -Math.PI / 2; angle <= 0; angle += Math.PI / 32) {
      const z = -4.5 - Math.cos(angle) * r;
      const y = -0.38 + r + Math.sin(angle) * r;
      pts.push(new THREE.Vector2(z, y));
    }
    for (let y = 4.2; y <= 16; y += 1.0) {
      pts.push(new THREE.Vector2(-9.0, y));
    }

    // Extrude profile across X from -28m to +28m (56m wide seamless studio sweep)
    const width = 56;
    const widthSegs = 2;
    const lenSegs = pts.length - 1;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let ix = 0; ix <= widthSegs; ix++) {
      const x = -width / 2 + (ix / widthSegs) * width;
      for (let ip = 0; ip <= lenSegs; ip++) {
        const p = pts[ip];
        positions.push(x, p.y, p.x);
        uvs.push(ix / widthSegs, ip / lenSegs);
      }
    }

    const row = lenSegs + 1;
    for (let ix = 0; ix < widthSegs; ix++) {
      for (let ip = 0; ip < lenSegs; ip++) {
        const a = ix * row + ip;
        const b = (ix + 1) * row + ip;
        const c = (ix + 1) * row + (ip + 1);
        const d = ix * row + (ip + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Subtle interactive cursor spotlight that glides across the car bodywork as you move your mouse
  useFrame(({ pointer }) => {
    if (cursorLightRef.current) {
      const targetX = 2.4 + pointer.x * 2.8;
      const targetY = 1.4 + pointer.y * 1.2;
      cursorLightRef.current.position.x = THREE.MathUtils.lerp(cursorLightRef.current.position.x, targetX, 0.08);
      cursorLightRef.current.position.y = THREE.MathUtils.lerp(cursorLightRef.current.position.y, targetY, 0.08);
    }
  });

  return (
    <group>
      {/* 1. Studio Softbox HDRI Environment Baked into PMREM Reflections */}
      <Environment resolution={1024} frames={1}>
        <color attach="background" args={['#F4F2ED']} />
        {/* Main Overhead Diffused Softbox Bank (Creates liquid specular highlight down the nose & halo) */}
        <Lightformer
          form="rect"
          intensity={3.6}
          color="#FFFFFF"
          position={[2.4, 5.2, 0.5]}
          scale={[3.2, 11.0, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* Warm Key Studio Strip (Front-Left) */}
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#FFF8F0"
          position={[-2.5, 2.2, 3.5]}
          scale={[1.8, 8.5, 1]}
          rotation={[0, Math.PI / 3, 0]}
        />
        {/* Cool Rim Definition Strip (Rear-Right) */}
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#EBF3FF"
          position={[6.8, 2.5, -2.5]}
          scale={[2.0, 9.0, 1]}
          rotation={[0, -Math.PI / 2.2, 0]}
        />
        {/* Dark Contrast Arch Above Softbox (Gives metallic paint deep contrast edges!) */}
        <Lightformer
          form="rect"
          intensity={0.1}
          color="#181A1F"
          position={[2.4, 6.0, -3.5]}
          scale={[14, 4, 1]}
          rotation={[Math.PI / 2.5, 0, 0]}
        />
      </Environment>

      {/* 2. Studio Lighting Rig + Interactive Cursor Aero Highlight */}
      <ambientLight intensity={0.55} color="#FAF9F6" />
      <directionalLight
        position={[5.5, 9.5, 6.0]}
        intensity={1.85}
        color="#FFFDF9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <pointLight ref={cursorLightRef} position={[2.8, 1.6, 2.2]} intensity={1.8} distance={8} color="#FFF3E6" />

      {/* 3. Seamless Curved Photography Infinity Cyclorama (Zero Hard Corners or Boxes) */}
      <mesh geometry={cycGeometry} receiveShadow>
        <meshStandardMaterial color="#F2EFE9" roughness={0.88} metalness={0.02} />
      </mesh>

      {/* 4. Satin-Epoxy Reflective Turntable Pad Directly Under the Car */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.65, -0.372, 0]} receiveShadow>
        <circleGeometry args={[4.4, 96]} />
        <MeshReflectorMaterial
          blur={[420, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={0.32}
          roughness={0.62}
          depthScale={0.8}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.2}
          color="#ECE9E2"
          metalness={0.08}
          mirror={0.18}
        />
      </mesh>

      {/* 5. Flush Brushed-Titanium Turntable Bezel Ring (1mm thin, ultra-clean) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.65, -0.37, 0]}>
        <ringGeometry args={[4.38, 4.43, 128]} />
        <meshStandardMaterial color="#C8C4BC" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* 6. Deep Soft Under-Car Ambient Occlusion Contact Shadow */}
      <ContactShadows
        position={[2.65, -0.368, 0]}
        opacity={0.78}
        scale={11}
        blur={1.65}
        far={2.5}
        resolution={1024}
        color="#141518"
      />
    </group>
  );
};
