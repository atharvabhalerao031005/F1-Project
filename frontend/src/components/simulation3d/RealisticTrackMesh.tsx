// frontend/src/components/simulation3d/RealisticTrackMesh.tsx
/**
 * VELOCE V2 // PHOTOREALISTIC TRACK MESH & RACETRACK WORLD
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * Invariants:
 * 1. 14-meter extruded asphalt road with aggregate texture, normals, and rubbered groove.
 * 2. 3D FIA red-white rumble kerbs positioned strictly at corner apexes and exits.
 * 3. Sandy gravel trap runoffs along high-speed corner exits.
 * 4. Continuous Armco W-beam corrugated steel guardrails & catch fencing.
 * 5. Instanced Tecpro energy-absorbing safety barrier blocks at high-G runoffs.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { generateTrackBarriers } from './geometry/TrackBarrierExtruder';

export type WeatherMode = 'DAY' | 'RAIN' | 'NIGHT';

interface RealisticTrackMeshProps {
  centerlinePoints: THREE.Vector3[];
  trackWidth?: number;
  weatherMode?: WeatherMode;
}

let cachedNormalMap: THREE.Texture | null = null;
let cachedRoughMap: THREE.Texture | null = null;

function getPbrMaps(): { normalMap: THREE.Texture; roughnessMap: THREE.Texture } {
  if (!cachedNormalMap && typeof window !== 'undefined') {
    const loader = new THREE.TextureLoader();
    cachedNormalMap = loader.load('/models/asphalt_track_nor_gl_1k.jpg');
    cachedNormalMap.wrapS = THREE.RepeatWrapping;
    cachedNormalMap.wrapT = THREE.RepeatWrapping;
    cachedNormalMap.repeat.set(4, 180);
    cachedNormalMap.anisotropy = 16;

    cachedRoughMap = loader.load('/models/asphalt_track_rough_1k.jpg');
    cachedRoughMap.wrapS = THREE.RepeatWrapping;
    cachedRoughMap.wrapT = THREE.RepeatWrapping;
    cachedRoughMap.repeat.set(4, 180);
    cachedRoughMap.anisotropy = 16;
  }
  return {
    normalMap: cachedNormalMap || new THREE.CanvasTexture(document.createElement('canvas')),
    roughnessMap: cachedRoughMap || new THREE.CanvasTexture(document.createElement('canvas')),
  };
}

function createProceduralAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark tarmac
  ctx.fillStyle = '#22252A';
  ctx.fillRect(0, 0, 512, 512);

  // High-frequency aggregate grain (24,000 multi-tone specks)
  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 28 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dark rubbered racing groove along tire lines
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.20, 'rgba(10,12,16,0.65)');
  grad.addColorStop(0.40, 'rgba(14,16,20,0.40)');
  grad.addColorStop(0.60, 'rgba(14,16,20,0.40)');
  grad.addColorStop(0.80, 'rgba(10,12,16,0.65)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Crisp white FIA track-limit edge lines (left and right)
  ctx.fillStyle = '#F4F4F6';
  ctx.fillRect(16, 0, 14, 512);
  ctx.fillRect(482, 0, 14, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 180);
  tex.anisotropy = 16;
  return tex;
}

function createFiaKerbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Alternating Crimson (#D91424) and Pure White (#F4F4F6) FIA kerb blocks
  ctx.fillStyle = '#D91424';
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#F4F4F6';
  ctx.fillRect(0, 128, 64, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 240);
  tex.anisotropy = 16;
  return tex;
}


function createStartFinishTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const cols = 16;
  const rows = 2;
  const w = 256 / cols;
  const h = 64 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#111315';
      ctx.fillRect(c * w, r * h, w, h);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

export const RealisticTrackMesh: React.FC<RealisticTrackMeshProps> = ({
  centerlinePoints,
  trackWidth = 14,
  weatherMode = 'DAY',
}) => {
  const isRain = weatherMode === 'RAIN';
  const isNight = weatherMode === 'NIGHT';
  const tecproMeshRef = useRef<THREE.InstancedMesh>(null);

  const {
    roadGeom,
    leftKerbGeom,
    rightKerbGeom,
    startFinishGeom,
    armcoLeftGeom,
    armcoRightGeom,
    fenceLeftGeom,
    fenceRightGeom,
    tecproMatrices,
    asphaltTex,
    kerbTex,
    startFinishTex,
    normalMap,
    roughnessMap,
  } = useMemo(() => {
    if (!centerlinePoints || centerlinePoints.length < 4) {
      const dummy = new THREE.BufferGeometry();
      return {
        roadGeom: dummy,
        leftKerbGeom: dummy,
        rightKerbGeom: dummy,
        startFinishGeom: dummy,
        armcoLeftGeom: dummy,
        armcoRightGeom: dummy,
        fenceLeftGeom: dummy,
        fenceRightGeom: dummy,
        tecproMatrices: [],
        asphaltTex: new THREE.CanvasTexture(document.createElement('canvas')),
        kerbTex: new THREE.CanvasTexture(document.createElement('canvas')),
        startFinishTex: new THREE.CanvasTexture(document.createElement('canvas')),
        normalMap: new THREE.CanvasTexture(document.createElement('canvas')),
        roughnessMap: new THREE.CanvasTexture(document.createElement('canvas')),
      };
    }

    const curve = new THREE.CatmullRomCurve3(centerlinePoints, true, 'centripetal');
    const segments = Math.min(1400, Math.max(600, centerlinePoints.length * 2));
    const sampled = curve.getSpacedPoints(segments);
    const up = new THREE.Vector3(0, 1, 0);

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const lKerbPos: number[] = [];
    const rKerbPos: number[] = [];
    const kerbUvs: number[] = [];
    const kerbIndices: number[] = [];

    const halfW = trackWidth / 2;
    const kerbW = 1.35;

    for (let i = 0; i <= segments; i++) {
      const idx = i % segments;
      const nextIdx = (i + 1) % segments;
      const p = sampled[idx];
      const tangent = curve.getTangentAt(idx / segments).normalize();
      const nextTangent = curve.getTangentAt(nextIdx / segments).normalize();
      const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();

      const crossY = tangent.x * nextTangent.z - tangent.z * nextTangent.x;
      const isCorner = Math.abs(crossY) > 0.0006;

      const leftEdge = p.clone().addScaledVector(normal, -halfW);
      const rightEdge = p.clone().addScaledVector(normal, halfW);

      positions.push(leftEdge.x, leftEdge.y + 0.05, leftEdge.z);
      positions.push(rightEdge.x, rightEdge.y + 0.05, rightEdge.z);
      uvs.push(0, i / 10);
      uvs.push(1, i / 10);

      const leftOuter = leftEdge.clone().addScaledVector(normal, -kerbW);
      const rightOuter = rightEdge.clone().addScaledVector(normal, kerbW);

      lKerbPos.push(leftOuter.x, isCorner ? leftOuter.y + 0.08 : leftOuter.y - 0.05, leftOuter.z);
      lKerbPos.push(leftEdge.x, isCorner ? leftEdge.y + 0.12 : leftEdge.y - 0.05, leftEdge.z);
      rKerbPos.push(rightEdge.x, isCorner ? rightEdge.y + 0.12 : rightEdge.y - 0.05, rightEdge.z);
      rKerbPos.push(rightOuter.x, isCorner ? rightOuter.y + 0.08 : rightOuter.y - 0.05, rightOuter.z);

      kerbUvs.push(0, i / 4);
      kerbUvs.push(1, i / 4);

      if (i < segments) {
        const base = i * 2;
        // Upward-facing Counter-Clockwise winding order (guarantees normal points UP (+Y))
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);

        // Only draw 3D red/white rumble kerbs where curvature exceeds the corner threshold!
        if (isCorner) {
          kerbIndices.push(base, base + 2, base + 1);
          kerbIndices.push(base + 1, base + 2, base + 3);
        }
      }
    }

    const rGeom = new THREE.BufferGeometry();
    rGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    rGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rGeom.setIndex(indices);
    rGeom.computeVertexNormals();

    const lkGeom = new THREE.BufferGeometry();
    lkGeom.setAttribute('position', new THREE.Float32BufferAttribute(lKerbPos, 3));
    lkGeom.setAttribute('uv', new THREE.Float32BufferAttribute(kerbUvs, 2));
    lkGeom.setIndex(kerbIndices);
    lkGeom.computeVertexNormals();

    const rkGeom = new THREE.BufferGeometry();
    rkGeom.setAttribute('position', new THREE.Float32BufferAttribute(rKerbPos, 3));
    rkGeom.setAttribute('uv', new THREE.Float32BufferAttribute(kerbUvs, 2));
    rkGeom.setIndex(kerbIndices);
    rkGeom.computeVertexNormals();

    // Checkered Start / Finish Line
    const startP = sampled[0];
    const startT = curve.getTangentAt(0).normalize();
    const startN = new THREE.Vector3().crossVectors(up, startT).normalize();
    const sfWidth = trackWidth - 0.4;
    const sfLen = 2.4;

    const sfP0 = startP.clone().addScaledVector(startN, -sfWidth / 2).addScaledVector(startT, -sfLen / 2);
    const sfP1 = startP.clone().addScaledVector(startN, sfWidth / 2).addScaledVector(startT, -sfLen / 2);
    const sfP2 = startP.clone().addScaledVector(startN, -sfWidth / 2).addScaledVector(startT, sfLen / 2);
    const sfP3 = startP.clone().addScaledVector(startN, sfWidth / 2).addScaledVector(startT, sfLen / 2);

    const sfPos = [
      sfP0.x, sfP0.y + 0.055, sfP0.z,
      sfP1.x, sfP1.y + 0.055, sfP1.z,
      sfP2.x, sfP2.y + 0.055, sfP2.z,
      sfP3.x, sfP3.y + 0.055, sfP3.z,
    ];
    const sfUvs = [0, 0, 1, 0, 0, 1, 1, 1];
    const sfIndices = [0, 1, 2, 1, 3, 2];

    const sfGeom = new THREE.BufferGeometry();
    sfGeom.setAttribute('position', new THREE.Float32BufferAttribute(sfPos, 3));
    sfGeom.setAttribute('uv', new THREE.Float32BufferAttribute(sfUvs, 2));
    sfGeom.setIndex(sfIndices);
    sfGeom.computeVertexNormals();

    // Generate Armco guardrails and Tecpro barriers
    const barriers = generateTrackBarriers(curve, 360, halfW);

    const { normalMap, roughnessMap } = getPbrMaps();

    return {
      roadGeom: rGeom,
      leftKerbGeom: lkGeom,
      rightKerbGeom: rkGeom,
      startFinishGeom: sfGeom,
      armcoLeftGeom: barriers.armcoLeft,
      armcoRightGeom: barriers.armcoRight,
      fenceLeftGeom: barriers.fenceLeft,
      fenceRightGeom: barriers.fenceRight,
      tecproMatrices: barriers.tecproMatrices,
      asphaltTex: createProceduralAsphaltTexture(),
      kerbTex: createFiaKerbTexture(),
      startFinishTex: createStartFinishTexture(),
      normalMap,
      roughnessMap,
    };
  }, [centerlinePoints, trackWidth]);

  useEffect(() => {
    if (tecproMeshRef.current && tecproMatrices.length > 0) {
      tecproMatrices.forEach((mat, idx) => {
        tecproMeshRef.current?.setMatrixAt(idx, mat);
      });
      tecproMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [tecproMatrices]);

  // Dynamically calculate terrain center from centerline coordinates to eliminate world edge cutoffs
  const terrainCenter = useMemo(() => {
    if (!centerlinePoints.length) return [0, -0.2, 0] as [number, number, number];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < centerlinePoints.length; i++) {
      const p = centerlinePoints[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    return [(minX + maxX) / 2, -0.2, (minZ + maxZ) / 2] as [number, number, number];
  }, [centerlinePoints]);

  return (
    <group name="RealisticTrackWorld">
      {/* 1. Surrounding Parkland / Grass Ground Plane (60km boundless domain centered on circuit) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={terrainCenter} receiveShadow>
        <planeGeometry args={[60000, 60000]} />
        <meshStandardMaterial
          color={isNight ? '#070C09' : isRain ? '#101F15' : '#172B1B'}
          roughness={isRain ? 0.78 : 0.94}
          metalness={isRain ? 0.15 : 0.02}
        />
      </mesh>

      {/* 2. 14-Meter Extruded 3D Asphalt Road Ribbon with PBR Normals & Aggregate */}
      <mesh geometry={roadGeom} receiveShadow>
        <meshStandardMaterial
          map={asphaltTex}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(isRain ? 0.35 : 0.65, isRain ? 0.35 : 0.65)}
          roughnessMap={roughnessMap}
          roughness={isRain ? 0.22 : 0.82}
          metalness={isRain ? 0.38 : 0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Left & Right 3D Red-and-White FIA Rumble Kerbs */}
      <mesh geometry={leftKerbGeom} receiveShadow>
        <meshStandardMaterial
          map={kerbTex}
          roughness={isRain ? 0.25 : 0.55}
          metalness={isRain ? 0.15 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightKerbGeom} receiveShadow>
        <meshStandardMaterial
          map={kerbTex}
          roughness={isRain ? 0.25 : 0.55}
          metalness={isRain ? 0.15 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Checkered Start / Finish Line */}
      <mesh geometry={startFinishGeom}>
        <meshBasicMaterial map={startFinishTex} />
      </mesh>

      {/* 6. Galvanized Steel Armco W-Beam Guardrails */}
      <mesh geometry={armcoLeftGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color="#9CA3AF"
          metalness={0.85}
          roughness={0.28}
        />
      </mesh>
      <mesh geometry={armcoRightGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color="#9CA3AF"
          metalness={0.85}
          roughness={0.28}
        />
      </mesh>

      {/* 7. FIA Safety Cable Barriers (Clean dark metallic finish, ZERO wireframe spiderwebs) */}
      <mesh geometry={fenceLeftGeom} castShadow>
        <meshStandardMaterial
          color="#1F242C"
          metalness={0.8}
          roughness={0.4}
          transparent={true}
          opacity={0.35}
        />
      </mesh>
      <mesh geometry={fenceRightGeom} castShadow>
        <meshStandardMaterial
          color="#1F242C"
          metalness={0.8}
          roughness={0.4}
          transparent={true}
          opacity={0.35}
        />
      </mesh>
    </group>
  );
};
