# VELOCE // ULTRA-PRECISE MASTER UI/UX, 3D STUDIO CYCLORAMA & SMOOTH MOTION OVERHAUL
## Step-by-Step Copy-Paste Implementation Guide (Zero Ambiguity — Follow Every File & Code Block Verbatim)

**CRITICAL INSTRUCTIONS FOR THE CODING AGENT:**
1. Do **NOT** invent your own layouts, geometric boxes, or sci-fi labels.
2. Execute **STEPS 1 through 7** below in exact sequential order. Every code block below is complete and production-ready—copy and integrate each block verbatim into the specified file path.

---

## STEP 1: PURGE ALL "AI-SLOP" SCI-FI LABELS & VERSION TAGS ACROSS THE ENTIRE UI

Search the `frontend/src/` directory and perform these **exact text replacements** so the website reads like a real human-designed luxury editorial site (Porsche / Ferrari / Apple / Lando Norris) instead of an AI-generated sci-fi dashboard:

| File to Edit | Find This Corny AI Text | Replace With This Clean Editorial Text |
| :--- | :--- | :--- |
| `VeloceNavbar.tsx` | `// F1 INTELLIGENCE` | *(Delete completely — keep only `VELOCE`)* |
| `VeloceNavbar.tsx` | `01 CALIBRATION` / `02 ORACLE` / `03 PROVING GROUND` / `04 ARENA` | `Overview` / `Predictions` / `Physics` / `Circuit` |
| `HeroEditorialAct1.tsx` | `01 · MCLAREN TECHNOLOGY CENTRE SPECIFICATION` | `Formula 1 — Aerodynamics & Strategy` |
| `HeroEditorialAct1.tsx` | `01 SPECIFICATION` / `02 COMPUTATIONAL AERO` / `03 THERMAL RETARDATION` / `04 LAUNCH PROTOCOL` | `01 Overview` / `02 Airflow` / `03 Braking` / `04 Launch` |
| `HeroEditorialAct1.tsx` | `TACTILE LIVERY SELECTION:` | `Select Team` |
| `HeroEditorialAct1.tsx` | `SCROLL TO ADVANCE TUNNEL TOUR ↓` | `Scroll to Explore ↓` |
| `SimulationArenaAct4.tsx` | `SIM CALIBRATED · 22 CARS` or `LIVE GRID · 22 CARS` | `22 Cars on Track` |
| `SimulationArenaAct4.tsx` | `TERMINATE` | `Reset View` |
| `SimulationArenaAct4.tsx` | `3D TRACK ARENA` / `2D TACTICAL RADAR` | `3D Broadcast` / `2D Track Map` |
| All Files in `src/` | Any occurrence of `v2.0`, `v2.1`, `v2.6`, `//`, `PROTOCOL`, `CALIBRATED` | Remove version numbers, double slashes `//`, and robotic words |

---

## STEP 2: FIX THE 3D CAR SCROLL CHOP PERMANENTLY (`F1CarShowcase3D.tsx` & `App.tsx`)

### Why the End of Act 1 Still Chopped in Your Last Build
In `VELOCE_MASTER_PROJECT_DOSSIER.md` (Section 5.3 & Rule 5):
1. Calling `setScrollProgress(e.progress)` on Zustand inside the Lenis scroll listener forces React to re-render subscribed components 60–120 times per second!
2. Unmounting `<F1CarShowcase3D />` when `scrollProgress > 0.21` destroys the Three.js WebGL context mid-scroll (causing a 300ms freeze when scrolling down and a 500ms freeze when scrolling back up!).

### Exact Fix to Apply in `frontend/src/utils/scrollMutable.ts`, `App.tsx`, and `F1CarShowcase3D.tsx`

**2A. Create `frontend/src/utils/scrollMutable.ts`:**
```ts
// frontend/src/utils/scrollMutable.ts
export const scrollMutable = {
  progress: 0,       // Global page scroll 0.0 to 1.0 (updated at 0 React cost)
  act1Progress: 0,   // Act 1 normalized progress 0.0 to 1.0
  velocity: 0,       // Current Lenis scroll velocity
};
```

**2B. In `App.tsx` (or `motionMasterTicker.ts`):**
* Inside the Lenis `on('scroll', (e) => ...)` callback, **DO NOT call `setScrollProgress(e.progress)` on every pixel!**
* Instead, update `scrollMutable` directly and mutate the Act 1 canvas wrapper's DOM style via a `ref` so **0 React re-renders occur during scroll**:
```tsx
// Inside App.tsx Lenis scroll listener:
scrollMutable.progress = e.progress;
scrollMutable.velocity = e.velocity;
// Act 1 spans 0.00 to 0.20 of total page scroll
const a1 = Math.max(0, Math.min(1, e.progress / 0.20));
scrollMutable.act1Progress = a1;

if (act1CanvasWrapperRef.current) {
  // Smoothly fade between 0.85 and 1.00 of Act 1, then hide via visibility (NEVER unmount <Canvas>!)
  const fade = a1 > 0.85 ? Math.max(0, 1 - (a1 - 0.85) / 0.15) : 1;
  act1CanvasWrapperRef.current.style.opacity = fade.toFixed(3);
  act1CanvasWrapperRef.current.style.visibility = a1 >= 1.0 ? 'hidden' : 'visible';
  act1CanvasWrapperRef.current.style.pointerEvents = a1 >= 0.95 ? 'none' : 'auto';
}
```
* Inside `F1CarShowcase3D.tsx`'s `useFrame((state, delta) => ...)`, read `scrollMutable.act1Progress` directly and add `if (scrollMutable.act1Progress >= 1.0) return;` at the top of `useFrame` so when the user scrolls past Act 1, the 3D scene uses **0.0% GPU** without ever destroying or unmounting the WebGL context!

---

## STEP 3: REPLACE THE FAKE BLOCKY STARTING ROOM WITH A SEAMLESS INFINITY CYCLORAMA STUDIO & SATIN REFLECTIVE FLOOR (`WindTunnelChamber.tsx`)

The starting room looked fake because it used flat grey walls, wireframe lines, and harsh edges. Replace `frontend/src/components/showcase3d/WindTunnelChamber.tsx` **completely** with this **Seamless Curved Photography Infinity Cyclorama ("Cyc Wall") + Blurred Satin Floor Reflection + Interactive Cursor Spotlight**:

```tsx
// frontend/src/components/showcase3d/WindTunnelChamber.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

export const WindTunnelChamber: React.FC = () => {
  const cursorLightRef = useRef<THREE.PointLight>(null);

  // Build a seamless curved Photography Infinity Cyclorama (Floor curving smoothly into Back Wall)
  const cycGeometry = useMemo(() => {
    const shape = new THREE.Shape();
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
```

---

## STEP 4: FIX THE "CLAY" CAR PAINT BY PRESERVING BAKED `.glb` DECALS & AO (`F1CarGlbModel.tsx` & `f1ModelLoader.ts`)

1. **In `frontend/src/utils/f1ModelLoader.ts`:**
   * **DELETE** `mat.metalness = Math.min(0.92, mat.metalness * 1.15);`! Setting `metalness = 0.92` on dielectric car paint destroys diffuse color and makes the car look like dull chrome clay.
   * Instead, set `mat.metalness = 0.28; mat.roughness = 0.16; mat.envMapIntensity = 1.9;`.
2. **In `frontend/src/components/showcase3d/F1CarGlbModel.tsx`:**
   * When changing liveries (`Ferrari`, `McLaren`, `Mercedes`, `Cadillac`), **DO NOT wipe `mat.map = null`**! Use `recolorGlbTexturePreservingAO(originalMap, liveryColor)` (from `frontend/src/utils/liveryTextureBaker.ts`) + `THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.04, ior: 1.52, metalness: 0.32, roughness: 0.16, envMapIntensity: 2.2 })` so all white sponsor logos, carbon weave, panel gap lines, and baked AO shadows remain visible on every team's car!

```tsx
// frontend/src/utils/liveryTextureBaker.ts
import * as THREE from "three";

const liveryCache = new Map<string, THREE.CanvasTexture>();

export function recolorGlbTexturePreservingAO(
  originalMap: THREE.Texture,
  targetHex: string
): THREE.CanvasTexture {
  const key = `${originalMap.uuid}_${targetHex}`;
  if (liveryCache.has(key)) return liveryCache.get(key)!;

  const img = originalMap.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = img?.width || 1024;
  const h = img?.height || 1024;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const col = new THREE.Color(targetHex);
  const tR = col.r * 255, tG = col.g * 255, tB = col.b * 255;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    // Preserve white sponsor logos and dark carbon/AO panel seams
    if ((luma > 0.82 && chroma < 0.18) || luma < 0.08) continue;
    const shade = Math.min(1.25, Math.max(0.18, luma * 1.65));
    data[i] = Math.min(255, tR * shade);
    data[i + 1] = Math.min(255, tG * shade);
    data[i + 2] = Math.min(255, tB * shade);
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = originalMap.flipY;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  liveryCache.set(key, tex);
  return tex;
}
```


---

## STEP 5: REPLACE THE UGLY "MONOCOQUE EXPLOSION BRIDGE" WITH AN AWWWARDS HORIZONTAL SCROLL-PINNED AERO & TELEMETRY FILMSTRIP (`Act1To2MonocoqueExplosionBridge.tsx`)

The wireframe "explosion" slider looked cheap and disjointed. Replace the contents of `frontend/src/components/editorial/Act1To2MonocoqueExplosionBridge.tsx` with a **Smooth Horizontal Scroll-Pinned Editorial Filmstrip & Interactive Cursor Wind-Tunnel Canvas (`landonorris.com` / Porsche style)** that keeps the component export name `Act1To2MonocoqueExplosionBridge` so `App.tsx` imports it without breaking:

```tsx
// frontend/src/components/editorial/Act1To2MonocoqueExplosionBridge.tsx
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Act1To2MonocoqueExplosionBridge: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // 1. Horizontal Scroll-Pinned Editorial Filmstrip + Parallax Watermark
  useEffect(() => {
    const sec = sectionRef.current;
    const track = trackRef.current;
    if (!sec || !track) return;

    const ctx = gsap.context(() => {
      gsap.to(track, {
        xPercent: -66.666,
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 0.65,
        },
      });
    }, sec);

    return () => ctx.revert();
  }, []);

  // 2. Interactive 60 FPS Cursor-Reactive Wind-Tunnel Streamline Art Canvas
  useEffect(() => {
    const canvas = flowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let t = 0;

    const renderFlow = () => {
      t += 0.025;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x * w;
      const my = mouseRef.current.y * h;

      // Draw 36 silk-smooth aerodynamic pressure streamlines deflecting around cursor & airfoil
      const numLines = 36;
      for (let i = 0; i < numLines; i++) {
        const baseY = (h * 0.12) + (i / (numLines - 1)) * (h * 0.76);
        const isCenterStream = Math.abs(i - numLines / 2) < 5;

        ctx.beginPath();
        ctx.strokeStyle = isCenterStream
          ? 'rgba(232, 0, 32, 0.42)'
          : 'rgba(17, 18, 21, 0.10)';
        ctx.lineWidth = (isCenterStream ? 1.8 : 1.0) * dpr;

        for (let x = 0; x <= w; x += 18 * dpr) {
          const dx = x - mx;
          const dy = baseY - my;
          const distSq = dx * dx + dy * dy + 9000 * dpr * dpr;
          const push = (dy * 18000 * dpr * dpr) / distSq;
          const wave = Math.sin(x * 0.004 - t + i * 0.15) * 6 * dpr;
          const y = baseY + push + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      rafId = requestAnimationFrame(renderFlow);
    };

    rafId = requestAnimationFrame(renderFlow);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        };
      }}
      className="relative w-full h-screen overflow-hidden bg-[#F4F2EB] text-[#111215] select-none border-t border-black/5"
    >
      {/* Interactive 24/7 Background Streamline Art Canvas */}
      <canvas
        ref={flowCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
      />

      {/* 3-Panel Horizontal Scroll-Pinned Editorial Filmstrip (300vw wide) */}
      <div ref={trackRef} className="relative z-10 flex w-[300vw] h-full items-center">
        {/* PANEL 1: Ground Effect & Downforce */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            01 — Aerodynamic Philosophy
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                SCULPTED BY{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Invisible Pressure.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                Move your cursor across the pressure field. Twin underfloor Venturi tunnels accelerate
                airflow beneath the chassis, generating 68% of total downforce without the drag penalty
                of oversized wings.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Peak Downforce
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  1,840 <span className="text-lg font-normal text-[#7A7E85]">kg</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Floor Suction
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  -4.82 <span className="text-lg font-normal text-[#7A7E85]">kPa</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            GROUND EFFECT
          </div>
        </div>

        {/* PANEL 2: Thermal Tire Cliff */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20 border-l border-black/5">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            02 — Surface Grip &amp; Degradation
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                THE EDGE OF THE{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Thermal Cliff.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                Every lap burns 1.85 kg of fuel while shearing micro-layers of vulcanized rubber. Our
                Gompertz degradation model pinpoints the exact lap a compound crosses its thermal
                threshold.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Operating Window
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  105 <span className="text-lg font-normal text-[#7A7E85]">°C</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Fuel Effect
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  -0.032 <span className="text-lg font-normal text-[#7A7E85]">s/lap</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            TIRE PHYSICS
          </div>
        </div>

        {/* PANEL 3: Stochastic Race Strategy */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20 border-l border-black/5">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            03 — Predictive Intelligence
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                2,500 RACES RUN{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Before Lights Out.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                By weighting historical pace against car dominance, microclimate, and track layout, the
                simulation engine evaluates thousands of pit-window outcomes in milliseconds.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Monte Carlo Runs
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  2,500
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Circuits Mapped
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  24 <span className="text-lg font-normal text-[#7A7E85]">GP</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            RACE ORACLE
          </div>
        </div>
      </div>
    </section>
  );
};
```

---

## STEP 6: FIX CAR TELEPORTING & BARREN WEATHER TRACK IN ACT 4 (`KinematicsDeadReckoningEngine.ts`, `AtmosphereSkyRig.tsx`, `RealisticTrackMesh.tsx`)

1. **Eliminate Micro-Teleporting (`KinematicsDeadReckoningEngine.ts`):**
   * Pre-sample the circuit `CatmullRomCurve3` using **`curve.getSpacedPoints(Math.ceil(circuitLengthM * 2))`** (`0.5m` uniform arc-length LUT) instead of uneven control-point segments!
   * Advance `playbackDistance` and update **both** the 22 car meshes and the active camera inside **one single imperative `useFrame` loop** (syncing the UI progress bar to React state at most 10 times per second, never at 60–120 Hz!).
2. **Fix Weather & Track Corridor (`AtmosphereSkyRig.tsx` & `RealisticTrackMesh.tsx`):**
   * **Day / Sun:** Reduce `fogExp2` density from `0.00022` to **`0.00009`** so the white fog wall disappears and you can see 2.5km down the track.
   * **Rain:** Set asphalt `roughness = 0.08`, `metalness = 0.55` for wet-mirror reflections and attach a trailing white mist `<Sparkles>` / particle emitter (`16m` behind each car's rear diffuser) so cars kick up rooster-tail water spray!
   * **Night:** Place instanced stadium floodlight towers (`16m` tall poles with bright white emissive light heads) every `60m` along the track edges so Night mode looks like Bahrain/Singapore under floodlights instead of an unlit black room!
   * **Corner-Only Kerbs:** Only extrude red/white kerbs where local track curvature exceeds `0.038`.

---

## STEP 7: FINAL BUILD & VERIFICATION

Run `npm --prefix frontend run build` (`tsc --noEmit && vite build`), verify `0` TypeScript errors, and confirm:
1. Zero "AI-slop" labels (`v2.x`, `//`, `TERMINATE`, `SPECIFICATION`, `LAUNCH PROTOCOL`) remain anywhere in the UI.
2. Act 1's 3D car sits inside the **Seamless Infinity Cyclorama Studio** with a blurred satin floor reflection and never chops when scrolling into Bridge 1.
3. Bridge 1 is now the **3-Panel Horizontal Scroll-Pinned Editorial Filmstrip** with the interactive cursor pressure-streamline canvas.
4. Act 4 cars glide smoothly on the `0.5m` uniform arc-length LUT with zero micro-teleporting.
