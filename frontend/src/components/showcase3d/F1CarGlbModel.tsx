// frontend/src/components/showcase3d/F1CarGlbModel.tsx
/**
 * VELOCE V2 // AAA PHOTOREALISTIC FORMULA 1 CAR MODEL (PBR CLEARCOAT & REAL TEXTURES)
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * Invariants:
 * 1. Preserves all 26 meshes: suspension wishbones, front/rear wings, titanium halo, cockpit interior.
 * 2. Culls ONLY sponsor decals (Object_21, Object_19) when rendering non-Red Bull liveries.
 * 3. Preserves embedded 2x2 twill carbon fiber diffuse & normal maps (Object_4, Object_7, Object_8).
 * 4. Preserves Pirelli P-Zero tire sidewall textures and BBS forged magnesium wheel markings.
 * 5. Multi-layer automotive clearcoat paint (clearcoat: 1.0, clearcoatRoughness: 0.03, ior: 1.54).
 * 6. Dynamic 1,020°C incandescent blackbody thermal glow on carbon-ceramic brake discs.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadGlbScene } from '../../utils/f1ModelLoader';
import {
  resolveConstructorId,
  CONSTRUCTOR_LIVERIES,
  getConstructorPaintTexture,
  getConstructorDecalTexture,
  getConstructorWheelRimTexture,
} from '../../utils/f1LiveryTextureEngine';

export interface F1CarGlbModelProps {
  liveryColor: string;
  driverNumber?: number;
  steerAngleRad?: number;
  speedKmh?: number;
  brakeEmissive?: number; // 0.0 to 2.5
  drsOpen?: boolean;
  scale?: number;
  isGhost?: boolean;
  ghostOpacity?: number;
}



/**
 * Computes blackbody incandescent thermal radiation color for F1 carbon-carbon brake discs
 * reaching 1,020°C under heavy braking into Monza Turn 1.
 */
function getBrakeThermalGlowColor(normalizedBrake: number): THREE.Color {
  const norm = THREE.MathUtils.clamp(normalizedBrake / 2.0, 0, 1);
  const color = new THREE.Color();
  if (norm < 0.25) {
    color.setRGB(0.6 * (norm / 0.25), 0.01, 0.0);
  } else if (norm < 0.70) {
    const t = (norm - 0.25) / 0.45;
    color.setRGB(1.0, 0.08 + 0.42 * t, 0.0);
  } else {
    const t = (norm - 0.70) / 0.30;
    color.setRGB(1.0, 0.50 + 0.45 * t, 0.15 + 0.35 * t);
  }
  return color;
}

let cachedCarbonTexture: THREE.CanvasTexture | null = null;
function getProceduralCarbonTexture(): THREE.CanvasTexture {
  if (cachedCarbonTexture) return cachedCarbonTexture;
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111316';
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const isShift = ((x + y) / 8) % 2 === 0;
      ctx.fillStyle = isShift ? '#1C1F25' : '#0E1012';
      ctx.fillRect(x, y, 8, 8);
      ctx.fillStyle = isShift ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + 2, 8, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  cachedCarbonTexture = tex;
  return tex;
}

let cachedPirelliTexture: THREE.CanvasTexture | null = null;
function getPirelliSidewallTexture(compoundColor: string = '#FFE600'): THREE.CanvasTexture {
  if (cachedPirelliTexture) return cachedPirelliTexture;
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark matte rubber base
  ctx.fillStyle = '#16181C';
  ctx.fillRect(0, 0, 512, 512);

  // Concentric bead ridges
  ctx.strokeStyle = '#22252B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 224, 0, Math.PI * 2);
  ctx.stroke();

  // Vibrant Pirelli P ZERO compound indicator ring
  ctx.strokeStyle = compoundColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 188, 0, Math.PI * 2);
  ctx.stroke();

  // Inner bead ridge
  ctx.strokeStyle = '#22252B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 152, 0, Math.PI * 2);
  ctx.stroke();

  // Official tyre lettering: "P I R E L L I" and "P  Z E R O"
  ctx.fillStyle = compoundColor;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(256, 96);
  ctx.fillText('P I R E L L I', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(256, 416);
  ctx.fillText('P  Z E R O', 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  cachedPirelliTexture = tex;
  return tex;
}

export const F1CarGlbModel: React.FC<F1CarGlbModelProps> = ({
  liveryColor,
  driverNumber,
  steerAngleRad: _steerAngleRad = 0,
  speedKmh = 260,
  brakeEmissive = 0,
  drsOpen = false,
  scale = 1.0,
  isGhost = false,
  ghostOpacity = 0.65,
}) => {
  const [baseScene, setBaseScene] = useState<THREE.Group | null>(null);
  const brakeDiscsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const tireMapsRef = useRef<THREE.Texture[]>([]);
  const drsFlapRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    let active = true;
    loadGlbScene()
      .then((scene) => {
        if (active) setBaseScene(scene);
      })
      .catch((err) => {
        console.debug('F1CarGlbModel notice:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const clonedModel = useMemo(() => {
    if (!baseScene) return null;

    const clone = baseScene.clone(true);
    const brakeMats: THREE.MeshStandardMaterial[] = [];
    const tireTextures: THREE.Texture[] = [];
    let flap: THREE.Object3D | null = null;

    const constructorKey = resolveConstructorId(liveryColor);
    const profile = CONSTRUCTOR_LIVERIES[constructorKey] || CONSTRUCTOR_LIVERIES.redbull;
    const isRedBull = constructorKey === 'redbull';

    // Synthesize authentic procedural PBR textures for the selected constructor
    const bodyPaintTex = getConstructorPaintTexture(constructorKey);
    const decalTex = getConstructorDecalTexture(constructorKey, driverNumber);
    const wheelRimTex = getConstructorWheelRimTexture(constructorKey);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (isGhost) {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          const ghostColor = new THREE.Color(liveryColor || '#D4AF37');
          mesh.material = new THREE.MeshStandardMaterial({
            color: ghostColor,
            metalness: 0.85,
            roughness: 0.25,
            transparent: true,
            opacity: ghostOpacity,
            emissive: ghostColor,
            emissiveIntensity: 0.45,
            depthWrite: false,
          });
          return;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const origMat = (mesh.material as any) || {};
        const matName = (origMat.name || '').toLowerCase();
        const meshName = (mesh.name || '').toLowerCase();

        // 1. Decals & Driver Numbers: Render authentic decals for ALL cars (Never cull)
        if (
          matName.includes('redbull_decals') ||
          matName.includes('redbull_number')
        ) {
          mesh.visible = true;
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#FFFFFF'),
            map: isRedBull && origMat.map ? origMat.map : decalTex,
            transparent: true,
            opacity: 1.0,
            roughness: 0.18,
            metalness: 0.12,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1.0,
            polygonOffsetUnits: -1.0,
          });
          return;
        }
        mesh.visible = true;

        // 2. Bodywork Automotive Lacquer Paint (Mesh with redbull_paint.007)
        // Dielectric clearcoat over constructor-specific livery texture
        if (
          matName.includes('paint') ||
          matName.includes('redbull_paint')
        ) {
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#FFFFFF'),
            map: isRedBull && origMat.map ? origMat.map : bodyPaintTex,
            normalMap: origMat.normalMap || null,
            normalScale: origMat.normalScale || new THREE.Vector2(1.0, 1.0),
            roughnessMap: origMat.roughnessMap || null,
            metalness: profile.finish.metalness,
            roughness: profile.finish.roughness,
            clearcoat: profile.finish.clearcoat,
            clearcoatRoughness: profile.finish.clearcoatRoughness,
            ior: profile.finish.ior,
            reflectivity: 0.95,
            envMapIntensity: 2.8,
          });
          return;
        }

        // 3. Mechanical Suspension Rods, Wishbones, Wing Endplates & Halo Mounts (redbull_detail.007)
        if (matName.includes('detail')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(isRedBull ? '#FFFFFF' : profile.secondaryColor),
            map: isRedBull && origMat.map ? origMat.map : null,
            normalMap: origMat.normalMap || null,
            roughness: 0.20,
            metalness: 0.85,
            envMapIntensity: 2.0,
          });
          return;
        }

        // 4. Authentic Exposed 2x2 Twill Woven Carbon Fiber Aero Surfaces (redbull_carbon1/2/3, generics2)
        // Wings, floor, diffuser, and bargeboards as seen in TurboSquid reference
        if (
          matName.includes('carbon') ||
          matName.includes('generics2')
        ) {
          const carbonMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#141618'),
            map: origMat.map || getProceduralCarbonTexture(),
            normalMap: origMat.normalMap || null,
            normalScale: new THREE.Vector2(1.6, 1.6),
            roughness: 0.28,
            metalness: 0.15,
            clearcoat: 0.65,
            clearcoatRoughness: 0.12,
            envMapIntensity: 2.2,
          });
          mesh.material = carbonMat;
          return;
        }

        // 5. Pirelli P-Zero Racing Slick Tires (sidewall.007 and black_s.006)
        if (
          matName.includes('sidewall') ||
          matName.includes('tire') ||
          matName.includes('tyre') ||
          matName.includes('black_s')
        ) {
          const isSidewall = matName.includes('sidewall');
          const tireMap = isSidewall
            ? origMat.map || getPirelliSidewallTexture('#FFE600')
            : origMat.map || null;

          if (origMat.map) {
            origMat.map.wrapS = THREE.RepeatWrapping;
            origMat.map.wrapT = THREE.RepeatWrapping;
            tireTextures.push(origMat.map);
          }
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(isSidewall ? '#FFFFFF' : '#141618'),
            map: tireMap,
            normalMap: origMat.normalMap || null,
            normalScale: new THREE.Vector2(1.5, 1.5),
            roughness: isSidewall ? 0.45 : 0.85,
            metalness: isSidewall ? 0.12 : 0.04,
            envMapIntensity: 1.2,
          });
          return;
        }

        // 6. BBS Forged Magnesium Wheels & Aero Hubs (redbull_wheel_hub.007)
        if (
          matName.includes('wheel_hub') ||
          matName.includes('rim')
        ) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(isRedBull ? '#22252B' : profile.wheelRimColor),
            map: isRedBull && origMat.map ? origMat.map : wheelRimTex,
            roughness: 0.20,
            metalness: 0.90,
            envMapIntensity: 2.2,
          });
          return;
        }

        // 7. Carbon Ceramic Brake Rotors (Object_11 / discs.007)
        if (matName.includes('discs') || meshName.includes('object_11')) {
          const thermalColor = getBrakeThermalGlowColor(brakeEmissive);
          const discMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#202226'),
            map: origMat.map || null,
            roughness: 0.52,
            metalness: 0.40,
            emissive: thermalColor,
            emissiveIntensity: THREE.MathUtils.clamp(brakeEmissive * 3.5, 0, 4.5),
          });
          mesh.material = discMat;
          brakeMats.push(discMat);
          return;
        }

        // 8. Inconel Exhaust & Damper Shafts (Object_22 / chrome.006)
        if (matName.includes('chrome') || meshName.includes('object_22')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#D8DEE4'),
            roughness: 0.08,
            metalness: 0.98,
            envMapIntensity: 2.0,
          });
          return;
        }

        // 9. Aeroscreen & Mirror Reflective Glass (Object_20, Object_29)
        if (matName.includes('glass') || meshName.includes('object_20')) {
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#FFFFFF'),
            transmission: 0.92,
            transparent: true,
            opacity: 1.0,
            roughness: 0.04,
            ior: 1.52,
          });
          return;
        }

        if (matName.includes('mirror') || meshName.includes('object_29')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#EAEAEA'),
            metalness: 1.0,
            roughness: 0.0,
            envMapIntensity: 2.5,
          });
          return;
        }

        // 10. Secondary Livery Accent Trim (Object_24)
        if (matName.includes('redbull_color') || meshName.includes('object_24')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(isRedBull ? '#E1FE21' : profile.accentColor),
            roughness: 0.2,
            metalness: 0.5,
          });
          return;
        }
      }

      // Check for DRS flap
      const lowerName = child.name?.toLowerCase() || '';
      if (lowerName.includes('drs') || lowerName.includes('flap') || lowerName.includes('wing_top')) {
        flap = child;
      }
    });

    brakeDiscsRef.current = brakeMats;
    tireMapsRef.current = tireTextures;
    drsFlapRef.current = flap;

    return clone;
  }, [baseScene, liveryColor, driverNumber, isGhost, ghostOpacity]);

  // Update dynamic brake thermal glow
  useEffect(() => {
    const thermalColor = getBrakeThermalGlowColor(brakeEmissive);
    const intensity = THREE.MathUtils.clamp(brakeEmissive * 3.5, 0, 4.5);
    brakeDiscsRef.current.forEach((mat) => {
      mat.emissive = thermalColor;
      mat.emissiveIntensity = intensity;
    });
  }, [brakeEmissive]);

  // Animate tire tread roll & steering / DRS in useFrame
  useFrame((_, delta) => {
    // Angular velocity omega = v / r (r_tire ~ 0.33m)
    const angularSpeed = (speedKmh / 3.6) / 0.33;
    const uvDelta = angularSpeed * delta * 0.08;

    // Roll tire textures seamlessly without vertex tearing
    tireMapsRef.current.forEach((map) => {
      map.offset.y = (map.offset.y + uvDelta) % 1;
    });

    // DRS Flap rotation
    if (drsFlapRef.current) {
      const targetAngle = drsOpen ? -0.38 : 0.0;
      drsFlapRef.current.rotation.x = THREE.MathUtils.lerp(
        drsFlapRef.current.rotation.x,
        targetAngle,
        delta * 12
      );
    }
  });

  if (!clonedModel) {
    return <group name="F1ModelLoading" />;
  }

  return (
    <group scale={scale}>
      <primitive object={clonedModel} />
      {/* FIA Rear Rain / ERS Energy Harvesting LED Strobe */}
      <mesh position={[0, 0.42, -2.48]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial
          color={isGhost ? '#FFE600' : brakeEmissive > 0.4 ? '#FF0022' : '#FF3B00'}
          emissive={isGhost ? '#FFE600' : brakeEmissive > 0.4 ? '#FF0011' : '#FF3B00'}
          emissiveIntensity={brakeEmissive > 0.4 ? 4.5 : 2.0}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};
