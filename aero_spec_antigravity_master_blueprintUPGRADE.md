# VELOCE // F1 3D SCROLLYTELLING, REALISTIC CIRCUIT SIMULATION & ML STRATEGY EXPERIENCE
## Master Agentic Research-First Mandate, Anti-AI-Slop Design System, 3D `.glb` Asset Pipeline & Orchestrator Protocol (`v6.0`)

**Target Execution Agent:** Antigravity (Autonomous Research & Coding Agent)  
**External Lead Architect / Orchestrator:** Gemini (Remote Orchestrator via User Relay)  
**Document ID:** `VELOCE-SCROLL-3D-MASTER-PROMPT-v6.0`  
**Visual & Experiential Benchmark:** `landonorris.com` (Studio Freight / Awwwards SOTY) + Porsche 911 GT3 RS Web Experience + Apple Pro Scrollytelling + Broadcast F1 TV 3D Simulation  

---

## SECTION 0: POST-MORTEM OF THE REJECTED UI (READ IMMEDIATELY — WHY v5.0 WAS REJECTED)

Antigravity: The previous `100vw × 100vh` locked dark terminal dashboard (`Aero-Spec v5.0`) has been **completely rejected by the user**. Look at what went wrong in the previous build and why you must tear that UI down completely:

1. **The "Giant Cyan Sphere on a Dotted Line" Disaster:** Rendering a `<sphereGeometry>` ("a cyan circle/dot") sliding along a thin dashed line in an empty black void is **not a racing simulation**. It looks like a 1990s screensaver.
2. **Cluttered Terminal "AI Slop":** Cramming 20 tiny rows, 50 micro-labels (`// Q1`, `[MODE: ...]`), CRT scanlines that striped the 3D viewport, neon cyan/purple boxes, and unreadable `9px` monospace text into a fixed `overflow: hidden` screen resulted in zero visual hierarchy, zero breathing room, and zero UX usability.
3. **Total Lack of Modern Web Craft:** Modern, likable, award-winning web experiences are **long, fluid, scroll-animated editorial journeys** (`600vh–800vh`) with massive typography, 2.5D parallax depth, generous negative space, and a **real 3D `.glb` Formula 1 car** that rotates, animates, and transitions smoothly as you scroll—culminating in a **realistic 3D race track simulation** with real asphalt, 3D red-and-white FIA kerbs, grass/gravel runoff, sunlit shadows, and actual 3D F1 cars racing wheel-to-wheel.

### HARD STOP RULE FOR ANTIGRAVITY: RESEARCH FIRST, CODE SECOND

**YOU ARE STRICTLY FORBIDDEN FROM WRITING ANY REACT OR THREE.JS UI CODE UNTIL YOU COMPLETE PHASE 0 (DEEP RESEARCH & REAL 3D ASSET ACQUISITION).**

You must first use your web search, browser/fetch tools, and terminal to research the reference repositories and design benchmarks below, download a real `.glb` 3D F1 car model and real circuit track data into `frontend/public/`, write `RESEARCH_AND_ASSET_REPORT.md` in the project root, and pause or output the Phase 0 Handoff Report before touching `frontend/src/`.

---

## SECTION 1: PHASE 0 — MANDATORY DEEP RESEARCH & 3D ASSET ACQUISITION PROTOCOL

Before writing a single line of frontend code, Antigravity MUST execute the following four research tracks using its terminal, Git, and web tools, documenting all findings inside `RESEARCH_AND_ASSET_REPORT.md`:

### Research Track 1: Real 3D F1 Car `.glb` Model & PBR Track Asset Acquisition

You must replace all `<sphereGeometry>` / `<cylinderGeometry>` car placeholders with **actual 3D `.glb` / `.gltf` Formula 1 car meshes** featuring a front wing, nose cone, cockpit halo, sculpted sidepods, airbox, rear wing, and 4 rotating wheels.

**Mandatory Asset Sources to Inspect & Pull From via Terminal (`git clone` / `curl`):**

1. **Primary Open-Source 3D F1 Browser Simulator Repo (`https://github.com/AgentiLoop/F1`):**
   * Run a shallow clone or inspect `https://github.com/AgentiLoop/F1` in a temporary directory (`/tmp/agentiloop-f1`):
     ```bash
     git clone --depth 1 https://github.com/AgentiLoop/F1 /tmp/agentiloop-f1
     ```
   * **What to extract and study from `/tmp/agentiloop-f1`:**
     * **`models/` directory & `src/rb22.mjs`:** Contains the CC-BY 4.0 photorealistic `"2026 Redbull RB22"` `.glb` 3D F1 car model (by Tyler_Dave) and the exact Three.js loader code (`src/rb22.mjs`) that loads the `.glb` (with `meshopt_decoder` if compressed), separates the 4 wheels and steering wheel for live rotation, and dynamically re-paints the car livery materials at runtime so you can render Red Bull (`#1E41FF`), McLaren Papaya (`#FF8000`), Ferrari Rosso Corsa (`#E8002D`), and Mercedes Silver/Teal (`#00D2BE`) from a single `.glb` file!
     * **Asphalt PBR Texture & Scenery (`models/` & `src/world3d.mjs`, `src/trackpaint.mjs`):** Contains the CC0 `"Asphalt Track"` texture (from Poly Haven) and the exact Three.js mesh builders for realistic asphalt road ribbons, painted white edge lines, alternating red/white 3D kerbs, rubbered racing lines, gravel traps, and grass terrain!
     * **18 Real F1 Circuits (`src/tracks/<key>.json` & `src/circuits.mjs`):** Contains pre-processed 3D track coordinates, elevations, banking angles, and DRS zones for **Monza, Silverstone, Spa-Francorchamps, Monaco**, and 14 other real circuits!
2. **Secondary Open-Source F1 Replay Console (`https://github.com/misha-met/Delta`):**
   * Inspect `https://github.com/misha-met/Delta` for how it structures its Three.js circuit scene, weather-aware lighting, `.glb` car and safety-car models, and chase/POV/orbit camera rigs.
3. **Canonical FIA Circuit GeoJSON Repository (`https://github.com/bacinger/f1-circuits`):**
   * Clone or curl from `https://github.com/bacinger/f1-circuits/tree/master/circuits` (`it-1922.geojson` for Monza, `gb-1948.geojson` for Silverstone, `mc-1929.geojson` for Monaco) to cross-verify exact GPS track geometry.
4. **Asset Verification Requirement:**
   * Copy the verified `.glb` F1 car model into `frontend/public/models/f1_car.glb` (and any required decoder or texture into `frontend/public/models/`).
   * Verify with a Node/Python script or `gltf-pipeline` / file-size check that `frontend/public/models/f1_car.glb` is a valid binary glTF (`magic === "glTF"`, size `> 50 KB`) and list every mesh/material node name inside `RESEARCH_AND_ASSET_REPORT.md` so you know the exact node names for the chassis, front/rear wings, and 4 wheels (`FL`, `FR`, `RL`, `RR`).

### Research Track 2: Awwwards Scrollytelling & 2.5D Parallax Architecture Research

Study and document the exact architectural patterns used by **Awwwards Site of the Year** automotive/motorsport sites (`landonorris.com` by Studio Freight, Porsche 911 GT3 RS, and Apple Product Scrollytelling pages):

1. **The "Fixed Canvas + Scrolling HTML Editorial Layer" Pattern:**
   * How a single fixed full-viewport `<Canvas className="fixed inset-0 pointer-events-none z-10">` renders the 3D F1 car while a `650vh`-tall HTML `<main className="relative z-20">` scrolls smoothly over and behind it using **`lenis`** (`lenis/react`) and **`gsap/ScrollTrigger`**.
   * How **2.5D Parallax Depth** is achieved:
     * **Layer 0 (Deep Background, `z-index: 1`):** Giant oversized outline/solid display typography (e.g., `18vw` `"MCL38 // RB20"`) moving at `0.35x` scroll speed *behind* the 3D F1 car.
     * **Layer 1 (Midground 3D WebGL Canvas, `z-index: 10`):** The photorealistic `.glb` 3D F1 car casting soft `ContactShadows` onto the floor, rotating smoothly from side-profile $\rightarrow$ top-down aero view $\rightarrow$ rear diffuser angle as the user scrolls, while subtly tilting (`±4°` pitch/yaw) in response to mouse cursor `(clientX, clientY)` for a living 2.5D feel!
     * **Layer 2 (Foreground Editorial Story Cards, `z-index: 20`):** Crisp, ultra-clean floating editorial blocks with generous whitespace moving at `1.15x` scroll speed *in front of* the 3D car.

### Research Track 3: Realistic 3D Track & Broadcast Camera Engineering

Research and document how to build a **true 3D Motorsport Track Mesh** in Three.js so it looks like a real broadcast simulation (and NEVER a line with dots):

1. **Extruded 3D Road Ribbon (`THREE.BufferGeometry` from Centerline + Binormal):**
   * Given centerline points $\mathbf{P}_i \in \mathbb{R}^3$ and tangent $\mathbf{T}_i = \text{normalize}(\mathbf{P}_{i+1} - \mathbf{P}_{i-1})$, compute the horizontal road normal $\mathbf{N}_i = \text{normalize}(\mathbf{T}_i \times \mathbf{U})$ where $\mathbf{U} = (0, 1, 0)$.
   * Generate left and right road edges at width $W = 14\text{ meters}$ ($\mathbf{P}_i \pm \frac{W}{2}\mathbf{N}_i$) with UV coordinates `(u = 0..1 across width, v = cumulativeDistance / 10)` mapped to a high-res procedural or Poly Haven **PBR Asphalt Canvas Texture** (dark charcoal tarmac `#1C1E22` with fine aggregate grain, specular roughness map, painted crisp white `0.3m` sidelines, and a darker rubbered racing groove along the racing line).
2. **3D FIA Rumble Kerbs (`Red & White` / `Green & White` at High-Curvature Apexes & Exits):**
   * Wherever track curvature $|\kappa_i|$ exceeds the corner threshold, generate raised `1.2m`-wide 3D kerb strips along the inside apex and outside exit edge, textured with alternating crimson (`#D91424`) and pure white (`#F4F4F6`) blocks every `1.5 meters`.
3. **Surrounding Environment, Sky, Lighting & Shadows:**
   * Surrounding terrain plane with mowed grass stripes / sandy gravel traps around high-speed chicanes, grandstands/trees at key corners, `<Environment preset="sunset" />` or `"day"` HDRI reflections on the cars' glossy paint, and a directional sun light casting shadows.
4. **Realistic 3D Car Motion & Wheel/Steering Physics:**
   * Load two instances of the `.glb` F1 car (`Driver A` and `Driver B`) oriented along the spline tangent $\mathbf{T}(d)$ with pitch matching track elevation slope, slight body roll proportional to lateral $G_{\text{lat}}$, front wheels steering by $\theta_{\text{steer}}$, all 4 wheels spinning at angular velocity $\omega = v / r_{\text{wheel}}$, and a glowing red rear rain/ERS light when harvesting or braking!

---

## SECTION 2: THE ANTI-AI-SLOP DESIGN SYSTEM ("VELOCE EDITORIAL")

### 2.1 Explicit Ban List (Instant Failure If Present)

Antigravity MUST NEVER include any of the following in the new UI:
* **NO** `<sphereGeometry>` or circular dots representing cars on track.
* **NO** thin 1px dotted/dashed lines floating in a pitch-black void.
* **NO** CRT scanlines, fake military corner reticles, or `// Q1` terminal slash prefixes.
* **NO** locked `100vw × 100vh` `overflow: hidden` dashboard prison on the main page.
* **NO** neon cyan (`#00E5FF`) + neon purple (`#B000FF`) + neon green (`#00FF66`) cyberpunk vomit palette.
* **NO** cramped 20-row spreadsheets or walls of `9px` monospace text.

### 2.2 The "Veloce Editorial" Color Palette (Inspired by Porsche, Ferrari & Lando Norris Flagships)

We use a **High-Contrast Editorial Warm-Stone & Showroom Obsidian Palette** with a single signature **Racing Vermilion (`#FF3B00`)** accent:

| CSS Variable | Hex Code | Usage & Visual Role |
| :--- | :--- | :--- |
| `--bg-editorial-stone` | `#F4F2ED` | Act 1 & Act 3 warm editorial off-white background (luxury magazine feel, zero eye strain) |
| `--bg-showroom-obsidian` | `#0B0C0E` | Act 2 & Act 4 dark studio/circuit background (transitioned smoothly via GSAP ScrollTrigger) |
| `--surface-glass-light` | `rgba(255, 255, 255, 0.72)` | Frosted editorial cards on light sections (`backdrop-filter: blur(20px)`, `1px solid rgba(15,15,18,0.08)`) |
| `--surface-glass-dark` | `rgba(18, 20, 24, 0.75)` | Floating broadcast HUD pills on dark 3D simulation section (`backdrop-filter: blur(20px)`, `1px solid rgba(255,255,255,0.10)`) |
| `--text-ink-primary` | `#0F1012` | Primary headline & body ink on warm stone sections |
| `--text-alabaster` | `#F7F6F2` | Primary headline & readout text on dark showroom/simulation sections |
| `--text-titanium` | `#7A7E85` | Subtle editorial captions, section index numbers (`01 — AERODYNAMICS`), and units |
| `--accent-vermilion` | `#FF3B00` | Signature Racing Vermilion / Papaya accent for primary CTAs, active pit markers, and Driver A highlights |
| `--accent-champagne` | `#D4AF37` | Warm metallic gold accent for P1 / Optimal Strategy badges and rival comparison trace |

### 2.3 The Sexy Font Stack (Load via Google Fonts in `index.html`)

Load these exact four Google Fonts in `frontend/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
```

* **Hero & Section Display Font (`font-display`):** `'Syne', sans-serif` (`font-weight: 800`, `letter-spacing: -0.04em`, `line-height: 0.92`, sizes from `clamp(3.2rem, 8.5vw, 9.5rem)`).
* **Editorial Luxury Italic Accent (`font-editorial`):** `'Instrument Serif', serif` (`font-style: italic`, `font-weight: 400`) — used inside giant `Syne` headlines to accent key emotional words (e.g., `ENGINEERED FOR` *`the Apex.`*).
* **Clean Modern UI & Narrative Body (`font-sans`):** `'Plus Jakarta Sans', sans-serif` (`font-weight: 400/500/600`, `font-size: 1.05rem`, `line-height: 1.65`, generous max-width `52ch`).
* **Precision Numeric & Lap-Time Display (`font-numeric`):** `'Space Grotesk', sans-serif` (`font-weight: 700`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.03em`) — used for oversized speed readouts (`342 KM/H`), lap times (`1:19.327`), and win probabilities (`68.4%`).

### 2.4 Required Animation & 3D Libraries (`frontend/package.json`)

Install and use these exact libraries:
* **`lenis`**: Smooth inertial scrolling across the entire multi-act webpage.
* **`gsap` + `@gsap/react` (`ScrollTrigger`)**: Scrubs the 3D F1 car camera position, car rotation, section background color morphing (`#F4F2ED` $\leftrightarrow$ `#0B0C0E`), and 2.5D typography parallax.
* **`framer-motion`**: Magnetic hover buttons, smooth tab indicator pills, and staggered card reveals.
* **`three` + `@react-three/fiber` + `@react-three/drei`**: `useGLTF` for loading `f1_car.glb`, `Environment` for realistic studio/sky reflections, `ContactShadows` for ground grounding, and `PerspectiveCamera`.

---

## SECTION 3: THE 4-ACT LONG-SCROLL PAGE ARCHITECTURE (~650vh TOTAL HEIGHT)

Instead of a crammed dashboard, the webpage is a **living, breathing 4-Act Scrollytelling & Simulation Experience**:

### Act 1: The Editorial Hero & 2.5D Interactive 3D F1 Showcase (`0vh – 140vh`, Background: Warm Stone `#F4F2ED`)

* **Minimal Floating Top Navbar (`height: 64px`, transparent):**
  * Left: `VELOCE // F1 INTELLIGENCE` in `Syne` bold.
  * Center: 4 clean anchor links (`01. The Machine`, `02. Physics & Wear`, `03. Strategy Oracle`, `04. Live 3D Circuit`).
  * Right: Rounded pill button `Jump to 3D Race Simulation ↓` (`bg-[#0F1012] text-[#F4F2ED] hover:bg-[#FF3B00]`).
* **2.5D Layered Hero Composition:**
  * **Background Parallax Layer (`z-index: 1`):** Massive `16vw` uppercase `Syne` watermark text (`"MONZA // 352 KM/H"`) in `#E6E3DC` that drifts upward at `0.4x` scroll speed.
  * **Centerpiece 3D F1 Car (`z-index: 10`):** The real `.glb` 3D F1 car rendered at high resolution with glossy metallic paint, carbon-fiber weave wings, Pirelli P-Zero tires, and soft `ContactShadows` on the `#F4F2ED` studio floor. Moving your cursor gently tilts the camera in 2.5D (`±5°`), and the front wheels subtly steer toward your cursor!
  * **Foreground Editorial Title (`z-index: 20`):**
    * Kicker: `01 — FORMULA 1 TELEMETRY & PREDICTIVE AI`
    * Giant Display Headline: `WHERE MILLISECONDS` *`Become Inevitable.`* (`Syne` 800 + *`Instrument Serif`* italic in `#FF3B00`).
    * Subtitle (`max-width: 46ch`, `Plus Jakarta Sans`): A concise, compelling 2-sentence introduction explaining how real FIA telemetry and 5,000-run Monte Carlo machine learning predict every braking point, tire cliff, and pit-lane undercut before it happens.

### Act 2: Scroll-Driven 3D Aero & Tire Physics Choreography (`140vh – 320vh`, Smooth Transition to Obsidian `#0B0C0E`)

As the user scrolls into Act 2, `GSAP ScrollTrigger` smoothly transitions the page background from `#F4F2ED` to `#0B0C0E` (Showroom Obsidian) while flying the 3D camera around three key zones of the `.glb` F1 car. Only **ONE spacious, decluttered editorial card** is on screen at a time (on the left or right third of the screen, leaving 65% of the viewport open for the 3D car!):

* **Stop 2A (`140vh – 200vh` — Camera focuses on Front Wing & Carbon Brakes):**
  * **Interactive "Tire Age & Fuel Load" Physics-Warp Card:** Instead of a cluttered table, the user gets two sleek, oversized sliders (**Tire Age: `0 to 38 Laps`** and **Fuel Load: `8 to 105 kg`**) plus 3 compound pills (`Soft`, `Medium`, `Hard`).
  * Dragging the Tire Age slider visually heats the 3D car's front brake discs to glowing orange-red (`emissive: #FF3B00`) and updates three large `Space Grotesk` numbers:
    * **Predicted Lap Time:** `1:20.412 (+1.085s)`
    * **Mechanical Grip Remaining:** `93.4%`
    * **Turn 1 Braking Shift:** `+11.4m Earlier`
* **Stop 2B (`200vh – 260vh` — Camera sweeps to Top-Down Aero Profile):**
  * **Clean Corner-by-Corner Telemetry Comparison:** A sleek, minimal horizontal card comparing **Verstappen (`#1`)** vs **Norris (`#4`)** across Monza's iconic corners (`T1 Rettifilo`, `T4 Roggia`, `T8 Ascari`, `T11 Parabolica`) with a single smooth dual-line velocity ribbon chart (`height: 160px`, generous padding, zero grid clutter).
* **Stop 2C (`260vh – 320vh` — Camera sweeps to Rear Wing / DRS & Diffuser):**
  * Animates the 3D car's DRS flap opening while illustrating how straight-line slipstream + DRS changes overtaking probability in the Monte Carlo simulator.

### Act 3: The Editorial ML Strategy & Monte Carlo Oracle (`320vh – 470vh`, Warm Editorial Stone `#F4F2ED`)

The page transitions back to crisp Editorial Stone (`#F4F2ED`) for a clean, magazine-style interactive **Race Strategy & Undercut Simulator**:

* **Section Header:** `03 — THE PIT-WALL ORACLE` / `5,000 Races.` *`Simulated in 80 Milliseconds.`*
* **Decluttered 2-Column Interactive Layout (`max-width: 1320px`, centered with `64px` padding):**
  * **Left Column (Tactile Strategy Controls):**
    * **Circuit Selector Pills:** `Monza (53 Laps)` | `Silverstone (52 Laps)` | `Monaco (78 Laps)`
    * **Driver A (`VER`) vs Driver B (`NOR`) Pit Window Timeline:** Two clean horizontal track bars where you drag the pit-stop lap (`Lap 19` vs `Lap 24`), click to swap compound icons (`Soft` $\rightarrow$ `Hard`), and toggle a single `Deploy Safety Car` switch.
  * **Right Column (3 Big Editorial Outcome Cards + Clean Stint Gap Curve):**
    * **Hero Verdict Banner:** Oversized `Space Grotesk` callout: `+1.84s UNDERCUT GAIN` with a 1-sentence plain-English explanation (*"Boxing on Lap 19 for Hard tires clears Norris by 11.5 meters at the Turn 1 pit exit merge."*).
    * **Top 3 Podium Probability Cards:** Three clean cards showing `VER (64.2% Win)`, `NOR (28.5% Win)`, and `LEC (5.1% Win)` with P10–P90 finish bars (expandable via a `"View Full 20-Driver Classification"` modal/drawer so it never clutters the page!).
    * **Smooth Stint Gap Fan Curve:** A single, spacious canvas chart showing the cumulative gap across all 53 laps with the shaded P10–P90 Monte Carlo confidence fan.

### Act 4: The Full-Screen Realistic 3D Circuit Race Simulation Arena (`470vh – 650vh`)

At the climax of the page, the user scrolls into a **100vw × 100vh pinned 3D Motorsport Broadcast Simulation Arena**:

* **What the 3D Scene Looks Like (Zero Dots, 100% Realistic Track & Cars):**
  * **Real 3D Circuit Asphalt Ribbon:** A `14m`-wide extruded 3D road mesh built from real Monza / Silverstone / Monaco coordinates (`AgentiLoop/F1` + `bacinger/f1-circuits`), complete with dark granular PBR asphalt, painted white track-limit lines, **3D red-and-white FIA rumble kerbs** on every corner apex/exit, surrounding green grass parkland and sandy gravel traps, and daylight/sunset sky lighting casting real car shadows on the track.
  * **Real 3D `.glb` F1 Cars Racing Wheel-to-Wheel:** Two full `.glb` F1 cars (painted in Red Bull Navy/Red/Yellow and McLaren Papaya/Anthracite) with spinning Pirelli wheels, front-wheel steering angles into chicanes, body roll, and DRS wing animation racing along the asphalt!
  * When you adjust the **ML Strategy or Tire Wear** settings, a third translucent gold/amber **ML Ghost F1 Car** races alongside them to show the exact physical on-track effect of your strategy!
* **Ultra-Clean Broadcast TV Floating Overlay (Maximum 3 Minimal Glass Pills):**
  1. **Top-Left Broadcast Timing Pill (`backdrop-blur-xl bg-black/70 rounded-2xl px-5 py-3`):** Shows only the active battle (`P1 VER` vs `P2 NOR`, live interval `-0.084s`, live speed `338 km/h`, current gear `G8`, and simple throttle/brake progress bars).
  2. **Top-Right Camera & Circuit Switcher Pill:**
     * `[Chase Cam]` (Low behind the rear wing of the 3D `.glb` F1 car!)
     * `[Onboard T-Cam]` (Mounted above the cockpit halo looking over the front wing and spinning front tires!)
     * `[Helicopter TV Cam]` (Sweeping broadcast perspective)
     * `[Satellite Overview]`
  3. **Bottom Minimal Scrubber & Playback Bar:** Play/Pause, `0.5x / 1x / 2x` speed, corner jump pills (`T1 Rettifilo`, `T4 Roggia`, `T8 Ascari`, `T11 Parabolica`), and a sleek timeline scrubber bar.

---

## SECTION 4: TECHNICAL IMPLEMENTATION GUIDE FOR REAL 3D `.glb` CARS & REALISTIC 3D TRACKS

### 4.1 How to Build the Realistic 3D Asphalt Track & 3D FIA Kerbs (`frontend/src/components/simulation3d/RealisticTrackMesh.tsx`)

Never use `<Line>` to draw a track. Build an extruded 3D road ribbon with procedural PBR asphalt and 3D red/white FIA kerbs using this exact geometry generator:

```tsx
// frontend/src/components/simulation3d/RealisticTrackMesh.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RealisticTrackMeshProps {
  centerlinePoints: THREE.Vector3[];
  trackWidth?: number;
}

function createProceduralAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark tarmac
  ctx.fillStyle = '#23262B';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt aggregate grain
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 28 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Darker rubbered racing groove in center
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.3, 'rgba(10,12,15,0.45)');
  grad.addColorStop(0.7, 'rgba(10,12,15,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Crisp white FIA track-limit edge lines (left and right)
  ctx.fillStyle = '#F4F4F6';
  ctx.fillRect(14, 0, 12, 512);
  ctx.fillRect(486, 0, 12, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 140);
  tex.anisotropy = 16;
  return tex;
}

function createFiaKerbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  // Alternating Red (#D91424) and White (#F4F4F6) FIA kerb blocks
  ctx.fillStyle = '#D91424';
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#F4F4F6';
  ctx.fillRect(0, 128, 64, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 220);
  tex.anisotropy = 16;
  return tex;
}

export const RealisticTrackMesh: React.FC<RealisticTrackMeshProps> = ({
  centerlinePoints,
  trackWidth = 14,
}) => {
  const { roadGeom, leftKerbGeom, rightKerbGeom, asphaltTex, kerbTex } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(centerlinePoints, true, 'centripetal');
    const segments = 1200;
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
      const p = sampled[i % segments];
      const tangent = curve.getTangentAt((i % segments) / segments).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const leftEdge = p.clone().addScaledVector(normal, -halfW);
      const rightEdge = p.clone().addScaledVector(normal, halfW);

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

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
        kerbIndices.push(base, base + 1, base + 2);
        kerbIndices.push(base + 1, base + 3, base + 2);
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

    return {
      roadGeom: rGeom,
      leftKerbGeom: lkGeom,
      rightKerbGeom: rkGeom,
      asphaltTex: createProceduralAsphaltTexture(),
      kerbTex: createFiaKerbTexture(),
    };
  }, [centerlinePoints, trackWidth]);

  return (
    <group>
      {/* Green Parkland / Grass Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color="#1E2F23" roughness={0.95} />
      </mesh>

      {/* 14-Meter Extruded 3D Asphalt Road Ribbon */}
      <mesh geometry={roadGeom} receiveShadow>
        <meshStandardMaterial map={asphaltTex} roughness={0.78} metalness={0.08} />
      </mesh>

      {/* Left & Right 3D Red-and-White FIA Rumble Kerbs */}
      <mesh geometry={leftKerbGeom} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.6} />
      </mesh>
      <mesh geometry={rightKerbGeom} receiveShadow>
        <meshStandardMaterial map={kerbTex} roughness={0.6} />
      </mesh>
    </group>
  );
};
```

### 4.2 Loading & Animating the Real `.glb` F1 Car (`frontend/src/components/simulation3d/F1CarModel3D.tsx`)

Loads `/models/f1_car.glb` cloned from `AgentiLoop/F1` (with dynamic team livery tinting, spinning wheel meshes, steering angle lock, and glowing rear rain/ERS LED), and includes a multi-mesh sculpted open-wheel F1 chassis fallback ONLY while the `.glb` is loading—NEVER a sphere!

```tsx
// frontend/src/components/simulation3d/F1CarModel3D.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface F1CarModel3DProps {
  liveryColor: string;
  accentColor?: string;
  speedKmh?: number;
  steerAngleRad?: number;
  brakePct?: number;
  scale?: number;
}

export const F1CarModel3D: React.FC<F1CarModel3DProps> = ({
  liveryColor,
  accentColor = '#FF3B00',
  speedKmh = 260,
  steerAngleRad = 0,
  brakePct = 0,
  scale = 1.0,
}) => {
  const { scene } = useGLTF('/models/f1_car.glb');
  const wheelRefs = useRef<THREE.Object3D[]>([]);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const wheels: THREE.Object3D[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const matName = (mesh.material as THREE.Material)?.name?.toLowerCase() || '';
        const meshName = mesh.name.toLowerCase();
        // Re-tint primary bodywork to team livery color
        if (matName.includes('body') || matName.includes('paint') || meshName.includes('body') || meshName.includes('chassis')) {
          const stdMat = (mesh.material as THREE.MeshStandardMaterial).clone();
          stdMat.color.set(liveryColor);
          stdMat.metalness = 0.55;
          stdMat.roughness = 0.22;
          mesh.material = stdMat;
        }
      }
      if (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire') || child.name.toLowerCase().includes('tyre')) {
        wheels.push(child);
      }
    });
    wheelRefs.current = wheels;
    return clone;
  }, [scene, liveryColor]);

  useFrame((_, delta) => {
    const angularVel = (speedKmh / 3.6) / 0.33; // rad/s for 660mm F1 tire
    wheelRefs.current.forEach((w) => {
      w.rotation.x += angularVel * delta;
    });
  });

  return (
    <group scale={scale}>
      <primitive object={clonedScene} />
      {/* Rear FIA Rain / ERS Harvesting Strobe LED */}
      <mesh position={[0, 0.55, -2.45]}>
        <boxGeometry args={[0.12, 0.18, 0.06]} />
        <meshBasicMaterial color={brakePct > 10 ? '#FF1E44' : accentColor} />
      </mesh>
    </group>
  );
};
```

---

## SECTION 5: PHASE-BY-PHASE EXECUTION PLAN & ORCHESTRATOR HANDSHAKE

Antigravity MUST execute these phases strictly in order and emit the **`[ANTIGRAVITY -> ORCHESTRATOR HANDOFF REPORT]`** at the end of every phase:

### PHASE 0 (MANDATORY FIRST TURN — ZERO UI CODE ALLOWED): Deep Research & 3D `.glb` Asset Extraction
1. Clone `https://github.com/AgentiLoop/F1` into `/tmp/agentiloop-f1` and `https://github.com/bacinger/f1-circuits` into `/tmp/f1-circuits`.
2. Inspect `/tmp/agentiloop-f1/models/`, `/tmp/agentiloop-f1/src/rb22.mjs`, and `/tmp/agentiloop-f1/src/tracks/`.
3. Copy the `.glb` F1 car model into `frontend/public/models/f1_car.glb` (plus any required decoder/textures) and extract the real circuit coordinates for Monza, Silverstone, and Monaco.
4. Write `RESEARCH_AND_ASSET_REPORT.md` in the project root detailing:
   * Exact file size and internal mesh/material hierarchy of `frontend/public/models/f1_car.glb`.
   * How `src/rb22.mjs` loads, scales, and animates the car and wheels.
   * Exact scroll choreography plan for Acts 1–4 using `lenis` + `gsap/ScrollTrigger`.
5. **STOP and output the Phase 0 Handoff Report** so the user and Lead Orchestrator can verify the research and assets before Phase 1 begins.

### PHASE 1: Smooth Scroll Engine (`Lenis` + `GSAP`), "Veloce Editorial" Typography & Act 1–2 3D Car Showcase
1. Install `lenis`, `gsap`, `@gsap/react`, `framer-motion`, `@react-three/fiber`, `@react-three/drei`.
2. Load `Syne`, `Instrument Serif`, `Plus Jakarta Sans`, and `Space Grotesk` in `index.html`.
3. Build the 4-Act long-scroll layout (`App.tsx`) with the fixed 3D F1 `.glb` Showcase Canvas, 2.5D parallax `16vw` background typography, mouse-tilt parallax, and scroll-scrubbed camera stops around the Front Wing, Tires/Brakes (with the interactive ML Tire-Wear & Fuel-Load Physics-Warp sliders), and DRS Rear Wing.

### PHASE 2: Act 3 — Decluttered Editorial ML Strategy & Monte Carlo Oracle Section
1. Build the warm stone (`#F4F2ED`) Editorial Strategy Section with spacious typography, tactile Stint Timeline sliders, the oversized Undercut Verdict banner, the Top-3 Podium Probability cards, and the clean 53-lap cumulative gap fan curve.

### PHASE 3: Act 4 — Photorealistic 3D Circuit Race Simulation Arena
1. Implement `RealisticTrackMesh.tsx` (14m extruded asphalt ribbon, white track-limit lines, 3D red/white FIA rumble kerbs, grass/gravel environment, and sunlit shadows).
2. Place Driver A, Driver B, and the optional ML Ghost Car on the asphalt ribbon using `F1CarModel3D.tsx` (`.glb` F1 cars with spinning wheels, proper elevation pitch, and cornering tangent alignment).
3. Add the 3 minimal floating broadcast glass pills (`Top-Left Battle Pill`, `Top-Right Chase/Onboard T-Cam/Helicopter Switcher`, and `Bottom Minimal Scrubber Bar`).
4. Run `tsc --noEmit` and `vite build`, verify 60 FPS performance, update `ORCHESTRATOR_STATE.md`, and output the final Handoff Report.

```text
=== [ANTIGRAVITY -> ORCHESTRATOR HANDOFF REPORT] ===
CURRENT PHASE COMPLETED: [PHASE 0 (RESEARCH & ASSETS) | PHASE 1 | PHASE 2 | PHASE 3]
3D ASSET & CIRCUIT VERIFICATION:
  - `frontend/public/models/f1_car.glb` Size & Meshes: [e.g., 1.8 MB, verified chassis + 4 wheel nodes]
  - Real Circuit Geometry Loaded: [Monza, Silverstone, Monaco verified]
  - Zero Sphere/Dot Placeholders Remaining: [CONFIRMED]
FILES CREATED / MODIFIED:
  - [exact/relative/path.ext] ([COMPLETE | PARTIAL], [summary])
BUILD & UX VERIFICATION:
  - `RESEARCH_AND_ASSET_REPORT.md` Written: [YES | NO]
  - TypeScript & Vite Build: [PASS | FAIL]
  - Smooth Scroll (`Lenis` + `GSAP ScrollTrigger`) & 60 FPS Check: [PASS | NOT YET APPLICABLE]
QUESTIONS / NEXT STEP FOR ORCHESTRATOR: [Ready for approval to proceed to next phase]
====================================================
```
