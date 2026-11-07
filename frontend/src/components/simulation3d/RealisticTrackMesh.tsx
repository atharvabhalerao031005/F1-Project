// frontend/src/components/simulation3d/RealisticTrackMesh.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export type WeatherMode = 'DAY' | 'RAIN' | 'NIGHT';

export interface RealisticTrackMeshProps {
  centerlinePoints: THREE.Vector3[];
  trackWidth?: number;
  weatherMode?: WeatherMode;
}

function createAsphaltCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep charcoal motorsport tarmac
  ctx.fillStyle = '#181A1F';
  ctx.fillRect(0, 0, 512, 512);

  // Micro-stone aggregate grain
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 22 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Polished dark rubbered racing groove
  const groove = ctx.createLinearGradient(0, 0, 512, 0);
  groove.addColorStop(0, 'rgba(0,0,0,0)');
  groove.addColorStop(0.28, 'rgba(6,8,10,0.55)');
  groove.addColorStop(0.72, 'rgba(6,8,10,0.55)');
  groove.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = groove;
  ctx.fillRect(0, 0, 512, 512);

  // Crisp FIA white sidelines
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(16, 0, 10, 512);
  ctx.fillRect(486, 0, 10, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 180);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRunoffApronTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#202630';
  ctx.fillRect(0, 0, 512, 256);

  // Paul Ricard / Modern FIA Blue & White Runoff Stripes on outer edges
  ctx.fillStyle = '#005AFF';
  ctx.fillRect(10, 0, 32, 256);
  ctx.fillRect(470, 0, 32, 256);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(46, 0, 8, 256);
  ctx.fillRect(458, 0, 8, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 140);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKerbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#D91424';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 64, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 220);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const RealisticTrackMesh: React.FC<RealisticTrackMeshProps> = ({
  centerlinePoints,
  trackWidth = 14,
  weatherMode = 'DAY',
}) => {
  const fencePostsRef = useRef<THREE.InstancedMesh>(null);
  const grandstandsRef = useRef<THREE.InstancedMesh>(null);
  const standRoofsRef = useRef<THREE.InstancedMesh>(null);
  const floodlightPolesRef = useRef<THREE.InstancedMesh>(null);
  const floodlightHeadsRef = useRef<THREE.InstancedMesh>(null);

  const {
    roadGeom,
    apronGeom,
    kerbGeom,
    barrierGeom,
    fencePostMatrices,
    grandstandMatrices,
    roofMatrices,
    poleMatrices,
    lampMatrices,
    bridges,
    asphaltTex,
    apronTex,
    kerbTex,
  } = useMemo(() => {
    if (!centerlinePoints || centerlinePoints.length < 4) {
      const dummy = new THREE.BufferGeometry();
      return {
        roadGeom: dummy,
        apronGeom: dummy,
        kerbGeom: dummy,
        barrierGeom: dummy,
        fencePostMatrices: [],
        grandstandMatrices: [],
        roofMatrices: [],
        poleMatrices: [],
        lampMatrices: [],
        bridges: [],
        asphaltTex: new THREE.CanvasTexture(document.createElement('canvas')),
        apronTex: new THREE.CanvasTexture(document.createElement('canvas')),
        kerbTex: new THREE.CanvasTexture(document.createElement('canvas')),
      };
    }

    const curve = new THREE.CatmullRomCurve3(centerlinePoints, true, 'centripetal');
    const segments = 1400;
    const sampled = curve.getSpacedPoints(segments);
    const up = new THREE.Vector3(0, 1, 0);

    const roadPos: number[] = [];
    const roadUvs: number[] = [];
    const roadIdx: number[] = [];

    const apronPos: number[] = [];
    const apronUvs: number[] = [];
    const apronIdx: number[] = [];

    const kerbPos: number[] = [];
    const kerbUvs: number[] = [];
    const kerbIdx: number[] = [];
    let kVert = 0;

    const barPos: number[] = [];
    const barIdx: number[] = [];
    let bVert = 0;

    const fPosts: THREE.Matrix4[] = [];
    const stands: THREE.Matrix4[] = [];
    const roofs: THREE.Matrix4[] = [];
    const poles: THREE.Matrix4[] = [];
    const lamps: THREE.Matrix4[] = [];
    const bridgeList: { pos: THREE.Vector3; rotY: number }[] = [];

    const halfW = trackWidth / 2;
    const apronHalfW = halfW + 5.5;
    const barrierDist = halfW + 5.8;

    for (let i = 0; i <= segments; i++) {
      const p = sampled[i % segments];
      const uPrev = ((i - 2 + segments) % segments) / segments;
      const uCur = (i % segments) / segments;
      const uNext = ((i + 2) % segments) / segments;

      const tPrev = curve.getTangentAt(uPrev).normalize();
      const tCur = curve.getTangentAt(uCur).normalize();
      const tNext = curve.getTangentAt(uNext).normalize();
      const normal = new THREE.Vector3().crossVectors(tCur, up).normalize();
      const yaw = Math.atan2(tCur.x, tCur.z);

      const curvature = tNext.clone().sub(tPrev).length();
      const isCorner = curvature > 0.038;

      // 1. 14m Main Asphalt Ribbon
      const lEdge = p.clone().addScaledVector(normal, -halfW);
      const rEdge = p.clone().addScaledVector(normal, halfW);
      roadPos.push(lEdge.x, lEdge.y + 0.06, lEdge.z, rEdge.x, rEdge.y + 0.06, rEdge.z);
      roadUvs.push(0, i / 8, 1, i / 8);

      // 2. 25m Paved FIA Runoff Apron underneath
      const lApron = p.clone().addScaledVector(normal, -apronHalfW);
      const rApron = p.clone().addScaledVector(normal, apronHalfW);
      apronPos.push(lApron.x, lApron.y + 0.03, lApron.z, rApron.x, rApron.y + 0.03, rApron.z);
      apronUvs.push(0, i / 10, 1, i / 10);

      if (i < segments) {
        const b = i * 2;
        roadIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        apronIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }

      // 3. Corner-Only 3D Sawtooth FIA Kerbs
      if (isCorner && i < segments) {
        const pNext = sampled[(i + 1) % segments];
        const t2 = curve.getTangentAt(((i + 1) % segments) / segments).normalize();
        const n2 = new THREE.Vector3().crossVectors(t2, up).normalize();

        for (const side of [-1, 1]) {
          const in0 = p.clone().addScaledVector(normal, side * (halfW - 0.15));
          const out0 = p.clone().addScaledVector(normal, side * (halfW + 1.35));
          const in1 = pNext.clone().addScaledVector(n2, side * (halfW - 0.15));
          const out1 = pNext.clone().addScaledVector(n2, side * (halfW + 1.35));

          kerbPos.push(
            in0.x, in0.y + 0.10, in0.z,
            out0.x, out0.y + 0.06, out0.z,
            in1.x, in1.y + 0.10, in1.z,
            out1.x, out1.y + 0.06, out1.z
          );
          kerbUvs.push(0, i / 3, 1, i / 3, 0, (i + 1) / 3, 1, (i + 1) / 3);
          kerbIdx.push(kVert, kVert + 1, kVert + 2, kVert + 1, kVert + 3, kVert + 2);
          kVert += 4;
        }
      }

      // 4. Continuous Trackside Steel Armco / Tecpro Barriers
      for (const side of [-1, 1]) {
        const bBase = p.clone().addScaledVector(normal, side * barrierDist);
        barPos.push(bBase.x, bBase.y, bBase.z, bBase.x, bBase.y + 1.15, bBase.z);
      }
      if (i < segments) {
        barIdx.push(bVert, bVert + 1, bVert + 4, bVert + 1, bVert + 5, bVert + 4);
        barIdx.push(bVert + 2, bVert + 3, bVert + 6, bVert + 3, bVert + 7, bVert + 6);
      }
      bVert += 4;

      // 5. Instanced Catch-Fence Steel Stanchions every 4 segments (~16m)
      if (i % 4 === 0 && i < segments) {
        for (const side of [-1, 1]) {
          const fPos = p.clone().addScaledVector(normal, side * (barrierDist + 0.15));
          const m = new THREE.Matrix4();
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
          m.compose(new THREE.Vector3(fPos.x, fPos.y + 1.8, fPos.z), q, new THREE.Vector3(0.12, 3.6, 0.12));
          fPosts.push(m);
        }
      }

      // 6. Instanced Stadium Floodlight Towers every 18 segments (~72m)
      if (i % 18 === 0 && i < segments) {
        const side = (i / 18) % 2 === 0 ? 1 : -1;
        const lPos = p.clone().addScaledVector(normal, side * (barrierDist + 4.5));
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + (side === 1 ? -Math.PI / 2 : Math.PI / 2), 0));

        const mPole = new THREE.Matrix4();
        mPole.compose(new THREE.Vector3(lPos.x, lPos.y + 8.0, lPos.z), q, new THREE.Vector3(0.35, 16.0, 0.35));
        poles.push(mPole);

        const mLamp = new THREE.Matrix4();
        mLamp.compose(new THREE.Vector3(lPos.x - side * normal.x * 1.2, lPos.y + 15.8, lPos.z - side * normal.z * 1.2), q, new THREE.Vector3(3.2, 0.6, 1.2));
        lamps.push(mLamp);
      }

      // 7. Instanced Grandstand Tribunes with Cantilevered Roofs every 36 segments (~145m)
      if (i % 36 === 0 && i < segments) {
        for (const side of [-1, 1]) {
          if (side === -1 && i % 72 !== 0) continue;
          const sPos = p.clone().addScaledVector(normal, side * (barrierDist + 16.0));
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));

          const mStand = new THREE.Matrix4();
          mStand.compose(new THREE.Vector3(sPos.x, sPos.y + 3.5, sPos.z), q, new THREE.Vector3(10.0, 7.0, 38.0));
          stands.push(mStand);

          const mRoof = new THREE.Matrix4();
          mRoof.compose(new THREE.Vector3(sPos.x - side * normal.x * 1.5, sPos.y + 8.2, sPos.z - side * normal.z * 1.5), q, new THREE.Vector3(12.5, 0.45, 39.0));
          roofs.push(mRoof);
        }
      }

      // 8. Overhead FIA / Pirelli Sponsor Arch Bridges every 220 segments (~880m)
      if (i % 220 === 0 && i < segments) {
        bridgeList.push({ pos: p.clone(), rotY: yaw });
      }
    }

    const buildGeom = (pos: number[], uvs: number[] | null, idx: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    return {
      roadGeom: buildGeom(roadPos, roadUvs, roadIdx),
      apronGeom: buildGeom(apronPos, apronUvs, apronIdx),
      kerbGeom: buildGeom(kerbPos, kerbUvs, kerbIdx),
      barrierGeom: buildGeom(barPos, null, barIdx),
      fencePostMatrices: fPosts,
      grandstandMatrices: stands,
      roofMatrices: roofs,
      poleMatrices: poles,
      lampMatrices: lamps,
      bridges: bridgeList,
      asphaltTex: createAsphaltCanvasTexture(),
      apronTex: createRunoffApronTexture(),
      kerbTex: createKerbTexture(),
    };
  }, [centerlinePoints, trackWidth]);

  useEffect(() => {
    const applyInst = (ref: React.RefObject<THREE.InstancedMesh | null>, mats: THREE.Matrix4[]) => {
      if (!ref.current) return;
      mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
      ref.current.instanceMatrix.needsUpdate = true;
    };
    applyInst(fencePostsRef, fencePostMatrices);
    applyInst(grandstandsRef, grandstandMatrices);
    applyInst(standRoofsRef, roofMatrices);
    applyInst(floodlightPolesRef, poleMatrices);
    applyInst(floodlightHeadsRef, lampMatrices);
  }, [fencePostMatrices, grandstandMatrices, roofMatrices, poleMatrices, lampMatrices]);

  const isRain = weatherMode === 'RAIN';
  const isNight = weatherMode === 'NIGHT';

  return (
    <group>
      {/* 60km Parkland Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[60000, 60000]} />
        <meshStandardMaterial color={isNight ? '#0B1310' : '#1E2D22'} roughness={0.95} />
      </mesh>

      {/* 25m Paved FIA Runoff Apron */}
      <mesh geometry={apronGeom}>
        <meshStandardMaterial
          map={apronTex}
          roughness={isRain ? 0.14 : 0.72}
          metalness={isRain ? 0.45 : 0.08}
        />
      </mesh>

      {/* 14m Main Asphalt Roadway (Wet-Mirror in Rain, Crisp Charcoal Tarmac in Sun) */}
      <mesh geometry={roadGeom}>
        <meshStandardMaterial
          map={asphaltTex}
          roughness={isRain ? 0.08 : 0.52}
          metalness={isRain ? 0.62 : 0.14}
          envMapIntensity={isRain ? 2.4 : 1.4}
        />
      </mesh>

      {/* Corner-Only 3D Sawtooth Kerbs */}
      <mesh geometry={kerbGeom}>
        <meshStandardMaterial map={kerbTex} roughness={isRain ? 0.2 : 0.5} />
      </mesh>

      {/* Continuous Trackside Steel Armco Barriers */}
      <mesh geometry={barrierGeom}>
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.32} side={THREE.DoubleSide} />
      </mesh>

      {/* Instanced Catch-Fence Stanchions (1 Draw Call) */}
      <instancedMesh ref={fencePostsRef} args={[undefined, undefined, fencePostMatrices.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </instancedMesh>

      {/* Instanced Grandstand Tribune Tiers (1 Draw Call) */}
      <instancedMesh ref={grandstandsRef} args={[undefined, undefined, grandstandMatrices.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1E293B" metalness={0.4} roughness={0.6} />
      </instancedMesh>

      {/* Instanced White Cantilevered Grandstand Canopy Roofs (1 Draw Call) */}
      <instancedMesh ref={standRoofsRef} args={[undefined, undefined, roofMatrices.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#F1F5F9" metalness={0.2} roughness={0.3} />
      </instancedMesh>

      {/* Instanced Stadium Floodlight Poles (1 Draw Call) */}
      <instancedMesh ref={floodlightPolesRef} args={[undefined, undefined, poleMatrices.length]}>
        <cylinderGeometry args={[0.4, 0.5, 1, 8]} />
        <meshStandardMaterial color="#64748B" metalness={0.75} roughness={0.3} />
      </instancedMesh>

      {/* Instanced Glowing LED Floodlight Banks (1 Draw Call) */}
      <instancedMesh ref={floodlightHeadsRef} args={[undefined, undefined, lampMatrices.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={isNight || isRain ? '#FFFFFF' : '#CBD5E1'} />
      </instancedMesh>

      {/* Overhead FIA / Sponsor Arch Bridges */}
      {bridges.map((b, idx) => (
        <group key={idx} position={[b.pos.x, b.pos.y, b.pos.z]} rotation={[0, b.rotY, 0]}>
          <mesh position={[-13, 4.0, 0]}>
            <boxGeometry args={[1.2, 8.0, 1.8]} />
            <meshStandardMaterial color="#0F172A" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[13, 4.0, 0]}>
            <boxGeometry args={[1.2, 8.0, 1.8]} />
            <meshStandardMaterial color="#0F172A" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 7.6, 0]}>
            <boxGeometry args={[27.2, 1.4, 2.0]} />
            <meshStandardMaterial color={idx === 0 ? '#111318' : '#E80020'} metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
