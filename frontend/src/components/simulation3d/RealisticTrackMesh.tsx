// frontend/src/components/simulation3d/RealisticTrackMesh.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RealisticTrackMeshProps {
  centerlinePoints: THREE.Vector3[];
  trackWidth?: number;
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
  ctx.fillStyle = '#1D2024';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt aggregate grain (20,000 multi-tone specks)
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 25 + Math.floor(Math.random() * 32);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Darker rubbered racing groove in center (where F1 slicks deposit hot rubber)
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.25, 'rgba(8,10,13,0.55)');
  grad.addColorStop(0.75, 'rgba(8,10,13,0.55)');
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

function createProceduralGravelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm sandy gravel base
  ctx.fillStyle = '#A3814D';
  ctx.fillRect(0, 0, 256, 256);

  // Granular pebble noise
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const s = 1 + Math.random() * 2;
    const tone = Math.random();
    if (tone < 0.4) {
      ctx.fillStyle = '#C29F66'; // lighter sand
    } else if (tone < 0.75) {
      ctx.fillStyle = '#7E5F34'; // medium pebble
    } else {
      ctx.fillStyle = '#543D1E'; // dark aggregate
    }
    ctx.fillRect(x, y, s, s);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 120);
  tex.anisotropy = 8;
  return tex;
}

function createStartFinishTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // 2-row black and white checkered line
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

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export const RealisticTrackMesh: React.FC<RealisticTrackMeshProps> = ({
  centerlinePoints,
  trackWidth = 14,
}) => {
  const {
    roadGeom,
    leftKerbGeom,
    rightKerbGeom,
    gravelGeom,
    startFinishGeom,
    asphaltTex,
    kerbTex,
    gravelTex,
    startFinishTex,
    normalMap,
    roughnessMap,
  } = useMemo(() => {
    // If fewer than 4 points, return empty dummy geometries to prevent Three.js crash
    if (!centerlinePoints || centerlinePoints.length < 4) {
      const dummy = new THREE.BufferGeometry();
      return {
        roadGeom: dummy,
        leftKerbGeom: dummy,
        rightKerbGeom: dummy,
        gravelGeom: dummy,
        startFinishGeom: dummy,
        asphaltTex: new THREE.CanvasTexture(document.createElement('canvas')),
        kerbTex: new THREE.CanvasTexture(document.createElement('canvas')),
        gravelTex: new THREE.CanvasTexture(document.createElement('canvas')),
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

    const gravelPos: number[] = [];
    const gravelUvs: number[] = [];
    const gravelIndices: number[] = [];

    const halfW = trackWidth / 2;
    const kerbW = 1.35;
    const gravelW = 12.0;

    for (let i = 0; i <= segments; i++) {
      const idx = i % segments;
      const nextIdx = (i + 1) % segments;
      const p = sampled[idx];
      const tangent = curve.getTangentAt(idx / segments).normalize();
      const nextTangent = curve.getTangentAt(nextIdx / segments).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Estimate local curvature from tangent change
      const crossY = tangent.x * nextTangent.z - tangent.z * nextTangent.x;
      const isCorner = Math.abs(crossY) > 0.0006;
      const isLeftTurn = crossY > 0; // Outer edge is to the right (+normal)

      const leftEdge = p.clone().addScaledVector(normal, -halfW);
      const rightEdge = p.clone().addScaledVector(normal, halfW);

      // Road surface vertices
      positions.push(leftEdge.x, leftEdge.y + 0.05, leftEdge.z);
      positions.push(rightEdge.x, rightEdge.y + 0.05, rightEdge.z);
      uvs.push(0, i / 10);
      uvs.push(1, i / 10);

      // Raised 3D FIA Kerbs along edges
      const leftOuter = leftEdge.clone().addScaledVector(normal, -kerbW);
      const rightOuter = rightEdge.clone().addScaledVector(normal, kerbW);

      lKerbPos.push(leftOuter.x, leftOuter.y + 0.08, leftOuter.z);
      lKerbPos.push(leftEdge.x, leftEdge.y + 0.12, leftEdge.z);
      rKerbPos.push(rightEdge.x, rightEdge.y + 0.12, rightEdge.z);
      rKerbPos.push(rightOuter.x, rightOuter.y + 0.08, rightOuter.z);
      kerbUvs.push(0, i / 4);
      kerbUvs.push(1, i / 4);

      // Gravel Trap Runoff Bed: Extruded along outer edge of corners
      if (isCorner) {
        if (isLeftTurn) {
          // Right side runoff
          const gOuter = rightOuter.clone().addScaledVector(normal, gravelW);
          gravelPos.push(rightOuter.x, rightOuter.y + 0.02, rightOuter.z);
          gravelPos.push(gOuter.x, gOuter.y + 0.01, gOuter.z);
        } else {
          // Left side runoff
          const gOuter = leftOuter.clone().addScaledVector(normal, -gravelW);
          gravelPos.push(gOuter.x, gOuter.y + 0.01, gOuter.z);
          gravelPos.push(leftOuter.x, leftOuter.y + 0.02, leftOuter.z);
        }
        gravelUvs.push(0, i / 6);
        gravelUvs.push(1, i / 6);
      } else {
        // Taper gravel to 0-width strip when straight
        gravelPos.push(rightOuter.x, rightOuter.y, rightOuter.z);
        gravelPos.push(rightOuter.x, rightOuter.y, rightOuter.z);
        gravelUvs.push(0, i / 6);
        gravelUvs.push(0, i / 6);
      }

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
        kerbIndices.push(base, base + 1, base + 2);
        kerbIndices.push(base + 1, base + 3, base + 2);
        gravelIndices.push(base, base + 1, base + 2);
        gravelIndices.push(base + 1, base + 3, base + 2);
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

    const gGeom = new THREE.BufferGeometry();
    gGeom.setAttribute('position', new THREE.Float32BufferAttribute(gravelPos, 3));
    gGeom.setAttribute('uv', new THREE.Float32BufferAttribute(gravelUvs, 2));
    gGeom.setIndex(gravelIndices);
    gGeom.computeVertexNormals();

    // Checkered Start / Finish Line Geometry at s = 0
    const startP = sampled[0];
    const startT = curve.getTangentAt(0).normalize();
    const startN = new THREE.Vector3().crossVectors(startT, up).normalize();
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

    const { normalMap, roughnessMap } = getPbrMaps();

    return {
      roadGeom: rGeom,
      leftKerbGeom: lkGeom,
      rightKerbGeom: rkGeom,
      gravelGeom: gGeom,
      startFinishGeom: sfGeom,
      asphaltTex: createProceduralAsphaltTexture(),
      kerbTex: createFiaKerbTexture(),
      gravelTex: createProceduralGravelTexture(),
      startFinishTex: createStartFinishTexture(),
      normalMap,
      roughnessMap,
    };
  }, [centerlinePoints, trackWidth]);

  return (
    <group>
      {/* 1. Surrounding Green Parkland / Grass Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[7000, 7000]} />
        <meshStandardMaterial color="#16271B" roughness={0.96} metalness={0.02} />
      </mesh>

      {/* 2. 14-Meter Extruded 3D Asphalt Road Ribbon with PBR Normals & Aggregate */}
      <mesh geometry={roadGeom} receiveShadow>
        <meshStandardMaterial
          map={asphaltTex}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.65, 0.65)}
          roughnessMap={roughnessMap}
          roughness={0.82}
          metalness={0.06}
        />
      </mesh>

      {/* 3. Left & Right 3D Red-and-White FIA Rumble Kerbs */}
      <mesh geometry={leftKerbGeom} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh geometry={rightKerbGeom} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.55} metalness={0.05} />
      </mesh>

      {/* 4. Sandy Gravel Runoff Traps around Corners */}
      <mesh geometry={gravelGeom} receiveShadow>
        <meshStandardMaterial map={gravelTex} roughness={0.98} metalness={0.02} />
      </mesh>

      {/* 5. Checkered Start / Finish Line */}
      <mesh geometry={startFinishGeom}>
        <meshBasicMaterial map={startFinishTex} />
      </mesh>
    </group>
  );
};
