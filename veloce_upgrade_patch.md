# VELOCE V2 // MASTER UPGRADE ARCHITECTURE & 8-AGENT DEEP RESEARCH FLEET DIRECTIVE
## Non-Destructive V1-to-V2 Evolution: White Wind-Tunnel 3D Hero, Long-Scroll 2.5D GSAP Choreography, Separated ML Oracle vs. 20-Car Live/Historical (2018–2026+) Race Game & TTL Auto-Purge Storage Engine

**Target Execution Environment:** Antigravity (Multi-Agent Research & Engineering Mode)  
**External Lead Orchestrator:** Gemini (Stateless Architect via User Relay)  
**Document ID:** `VELOCE-V2-RESEARCH-FLEET-DIRECTIVE`  
**Current Execution Stage:** **STAGE 0 — 100% RESEARCH FLEET ONLY (ZERO APPLICATION CODE CHANGES PERMITTED IN THIS TURN)**  

---

## SECTION 0: ABSOLUTE RULE FOR ANTIGRAVITY right NOW — RESEARCH FLEET ONLY, ZERO CODING

### 0.1 Read This Command Before Doing Anything Else

1. **DO NOT MODIFY ANY APPLICATION CODE (`.tsx`, `.ts`, `.py`, `.css`) IN THIS TURN.**
2. **DO NOT REWRITE THE COMPLETED V1 SYSTEM FROM SCRATCH.** The initial 5-phase system is already built in this workspace. This document defines **VELOCE V2**—an architectural and experiential upgrade built *on top of* our existing V1 backend, ML models, and 3D assets.
3. **YOUR ONLY MISSION RIGHT NOW:** Deploy an **8-Agent Deep Research Fleet** to exhaustively research, audit, design, and architect every subsystem detailed in Sections 1 through 8 below, and compile their complete findings into a single master engineering dossier file in the project root named **`VELOCE_V2_DEEP_RESEARCH_DOSSIER.md`**, followed by outputting the **`[ANTIGRAVITY RESEARCH FLEET -> ORCHESTRATOR HANDOFF REPORT]`** at the end of your turn.
4. **Only after the User and Lead Orchestrator review and approve your `VELOCE_V2_DEEP_RESEARCH_DOSSIER.md` will you be cleared to begin V2 implementation.**

---

## SECTION 1: THE COMPLETE VELOCE V2 PRODUCT & EXPERIENTIAL VISION (WHAT WE ARE UPGRADING & WHY)

### 1.1 Diagnosing the Current V1 State vs. The V2 Target Experience

Right now, the existing V1 build suffers from five core UX and visual limitations that V2 will permanently solve without throwing away our working Python/FastF1/ML foundation:

| Current V1 Limitation | The V2 Upgrade Requirement (Non-Negotiable) |
| :--- | :--- |
| **Static Tab-Switcher Layout With No Real Scroll Journey** | **Ultra-Long (`~1,000vh`) Decluttered Scrollytelling Webpage (`Lenis` + `GSAP ScrollTrigger`):** Starts with a breathtaking opening animation, flows through a 3D White Wind-Tunnel Hero that eventually **scrolls completely out of frame**, transitions into rich 2.5D multi-layer parallax storytelling sections, and leads into two cleanly separated interactive arenas. |
| **Hero 3D Car Floating in a Generic/Dark Background With Clay Lighting** | **Photorealistic "White Automotive Wind-Tunnel & Calibration Test Cell" Hero (`Act 1`):** Think Porsche / Mercedes-AMG / Ferrari white aerodynamic wind-tunnel testing chambers—clinical alabaster walls (`#F4F5F7`), overhead diffused LED light banks baked into a GPU `PMREM` studio environment map, baked underbody Ambient Occlusion floor shadows, volumetric wind-tunnel airflow streamlines passing over the car's clearcoat bodywork, and scroll-linked camera choreography. Once you scroll past Act 1 (`> 240vh`), the 3D Hero Car scrolls naturally out of the viewport and pauses its WebGL loop so the rest of the page runs at a locked 60 FPS. |
| **ML Prediction Simulator & Live/3D Race Simulation Mashed Together** | **Strict Architectural Separation of the Two Core Systems:**<br>1. **SYSTEM A — The ML Predictive Strategy & Monte Carlo Oracle:** A dedicated, spacious, magazine-grade interactive lab for pre-race/stint predictions, tire-cliff curves, and 5,000-run Monte Carlo undercut analysis.<br>2. **SYSTEM B — The 20-Car Full-Grid 3D Race & Live Grand Prix Game Arena:** A dedicated, full-screen photorealistic 3D motorsport simulation where **all 20 cars** are on the grid simultaneously and the user can click any of the 20 drivers to track them individually (`Chase Cam`, `Onboard T-Cam`, `Helicopter Cam`, `Apex TV Cam`). |
| **Only 2 Cars on Track & Limited Static Circuits** | **All 20 Cars on Grid + Any Race from `2018` to `2026+` (Plus Future & Live Ongoing Races):** Dynamically queries `FastF1` (`2018–2026+`) and `OpenF1` (real-time live ongoing races) to auto-generate any circuit's 3D photorealistic track mesh, load era-accurate car geometry (`2018–2021` wide flat-floor era, `2022–2025` ground-effect Venturi era, `2026+` active-aero compact era), and paint all 10 teams / 20 drivers accurately for that exact season. |
| **Blind Waiting During Loads & Unbounded Cache Storage** | **On-Demand Dynamic Downloader + Determinate Progress Bar + TTL/LRU Auto-Delete Daemon:** Downloads only the needed circuit/car/telemetry data on the fly with a sleek **`0% → 100%` Multi-Stage Progress Bar**, caches it locally for fast immediate use, and **automatically deletes cached tracks/models/sessions if they remain unused for a configurable TTL window (e.g., 30 minutes of inactivity or exceeding a storage cap)** to save disk space. |

---

## SECTION 2: THE END-TO-END V2 SCROLLYTELLING & UX ARCHITECTURE (`~1,050vh` CONTINUOUS JOURNEY)

Every pixel of the V2 webpage must obey **strict Swiss/Editorial Industrial Design Principles** (inspired by Dieter Rams, Porsche 911 GT3 RS Digital Experience, Apple Pro Scrollytelling, and `landonorris.com` by Studio Freight)—**65%+ open whitespace, zero AI-slop neon clutter, purposeful color transitions, and 2.5D depth**:

### Act 0: The Preloader & Opening Kinetic Typography Sequence (`0.0s – 2.2s` on Page Load)
* A clinical white calibration screen (`#F4F5F7`) displays a minimal precision tachometer counter (`000 → 352 KM/H`) while pre-baking the GPU `PMREM` wind-tunnel lighting cubemap and warming up `f1_car.glb`.
* At `100%`, a horizontal wind-tunnel louver shutter parts smoothly via `GSAP` (`expo.inOut`), revealing the photorealistic 3D F1 car inside the White Wind Tunnel as the giant `Syne` + *`Instrument Serif`* display headline masks upward line-by-line.

### Act 1: The White Wind-Tunnel 3D Hero & Scroll Choreography (`0vh – 250vh` — 3D Canvas Active, Then Scrolls Out of Frame)
* **Visual Theme:** **Clinical White Aerodynamic Wind Tunnel (`#F4F5F7` Alabaster Test Cell, `#E2E5EC` subtle architectural wind-tunnel grid panels, `#0F1115` razor-sharp ink typography, `#FF3B00` International Racing Orange aerodynamic pressure accents).**
* **Why a White Wind Tunnel Makes the 3D Car Look Photorealistic:**
  * Dark cars and carbon-fiber wings disappear against black backgrounds. Inside a bright, clinical **White Wind-Tunnel Test Room**, the dark carbon-fiber front wing, Venturi floor, Pirelli slick tires, and deep underbody Ambient Occlusion shadow pop with **10/10 contrast**, while the overhead studio light banks create long, liquid-like specular highlights across the clearcoat paint!
* **Scroll Choreography (`0vh → 250vh`):**
  * **`0vh – 80vh` (Three-Quarter Wind-Tunnel Hero):** The 3D car sits angled in the test chamber with subtle white/orange laminar airflow streamlines (`THREE.CatmullRomCurve3` ribbon tubes with animated opacity) flowing over the front wing, halo, and rear diffuser. Background `18vw` typography (`"AERO // VELOCE"`) moves at `0.35x` parallax speed behind the car.
  * **`80vh – 170vh` (Side-Profile Rake & Ground-Effect Inspection):** As the user scrolls, `GSAP ScrollTrigger` orbits the camera to a pure orthographic-style side profile, highlighting the Venturi floor throat and wheel wake while foreground 2.5D glass callouts float past at `1.2x` parallax speed.
  * **`170vh – 250vh` (Top-Down Planform & Natural Scroll-Out Exit):** The camera rises above the car as the car accelerates forward out of the wind tunnel, and **the entire Act 1 3D Wind-Tunnel container scrolls naturally upward and OFF THE SCREEN (`yPercent: -100`)**. Once off-screen, `IntersectionObserver` pauses the Act 1 WebGL render loop so `0%` GPU is wasted while scrolling the rest of the page!

### Act 2: Deep 2.5D Parallax Editorial Storytelling (`250vh – 580vh` — Zero Heavy 3D Canvas, Pure 60 FPS 2.5D GSAP Parallax & SVG/Canvas Micro-Visuals)
Once the 3D Hero Car scrolls out of frame, the webpage opens into a **long, deeply atmospheric 2.5D scrollytelling sequence** where the background environment morphs smoothly to match the foreground engineering narrative:

* **Chapter 2.1 (`250vh – 360vh` — "The Anatomy of a Millisecond" / Spatial Telemetry):**
  * **Background Parallax Layer:** Architectural blueprint contour lines of Monza, Silverstone, and Monaco shifting in 2.5D depth (`data-speed="0.4"`, `data-speed="0.7"`, `data-speed="1.1"`) over a Warm Stone (`#EFECE6`) canvas.
  * **Foreground Interactive:** A sleek, horizontal scrubbable **1-Meter Telemetry Micro-Comparator** where scrolling or dragging compares two drivers' braking points, minimum apex speeds, and throttle pickup with butter-smooth `GSAP` SVG/Canvas path drawing.
* **Chapter 2.2 (`360vh – 470vh` — "The Thermal Cliff" / Tire Degradation Physics):**
  * **Background Parallax Layer:** Smooth GSAP color transition to Deep Thermal Anthracite (`#121316`) with subtle 2.5D infrared thermal gradient waves that react to scroll velocity.
  * **Foreground Interactive:** Oversized, decluttered editorial typography explaining compound physics (`C1–C5`), paired with an interactive **Tire-Cliff & Fuel-Burn Curve Explorer** that dynamically warps a lap-time curve as you slide Tire Age (`0–40 laps`) and Track Temperature (`20–55°C`).
* **Chapter 2.3 (`470vh – 580vh` — "The Pit-Wall Chessboard" / Undercut vs. Overcut Theory):**
  * **Background Parallax Layer:** 2.5D layered pit-lane timing strips and animated vector track sectors that converge as you scroll toward System 1.

### Act 3 (SYSTEM 1): The Standalone ML Predictive Strategy & Monte Carlo Oracle Lab (`580vh – 780vh`)
* **Completely Separated From the 3D Race Game:** This is a dedicated, ultra-clean editorial analytical workbench (`#F4F2ED` Warm Stone theme with `#0F1115` ink and `#FF3B00` / `#1E41FF` accents).
* **Capabilities:**
  * Select any Season (`2018–2026+`), Circuit, and Rival Pair, or feed live race state.
  * Configure 1-stop or 2-stop compound sequences (`[S] → [H]`, `[M] → [H]`, `[S] → [M] → [S]`), drag target Pit Window Lap sliders, inject Safety Car / VSC probabilities, and run **5,000 Vectorized Monte Carlo Simulations in `< 100 ms`**.
  * Displays clean, magazine-grade Podium & Full-Grid Win Probability distributions, the exact **Optimal Undercut/Overcut Lap Verdict**, and the **Lap-by-Lap Cumulative Race Gap Fan Chart (`P10–P50–P90`)**.

### Act 4 (SYSTEM 2): The Full-Grid 20-Car 3D Live & Historical Race Simulation Game Arena (`780vh – 1,050vh`)
* **Completely Separated From the ML Oracle:** A dedicated full-viewport (`100vw × 100vh` pinned section at the bottom of the scroll journey, with a `"Launch Fullscreen Race Simulator"` toggle) **Photorealistic 3D F1 Broadcast & Live Race Game**:
  * **All 20 Cars on Track Simultaneously:** Every driver from the selected race (`2018–2026` historical race OR a **Live Ongoing Grand Prix via OpenF1**) is rendered on the 3D photorealistic circuit in their exact team livery and era-accurate car geometry.
  * **Click Any of the 20 Drivers to Track Individually:** A sleek, collapsible broadcast timing pill on the left lists all 20 cars (`P1` to `P20`) with live intervals, tire compound icons, and pit status. Clicking **any** of the 20 drivers immediately locks the 3D camera (`Chase Cam`, `Onboard Halo T-Cam`, `Helicopter TV Cam`, or `Trackside Curb Cam`) onto *that driver's 3D car* and binds the bottom minimal telemetry HUD (Speed, Gear, RPM LEDs, Throttle/Brake, DRS, ERS) to that driver!
  * **Dynamic On-Demand Download & TTL Auto-Purge Bar:** Selecting any new Year (`2018–2026+`) or Circuit triggers the **Determinate Download Progress Bar (`0% → 100%`)**, streams the track & 20-car telemetry on the fly, and schedules the cached data for automatic deletion once unused beyond the TTL window.

---

## SECTION 3: DEPLOYMENT OF THE 8-AGENT ANTIGRAVITY RESEARCH FLEET (MANDATORY TASKS)

Antigravity: You must now dispatch/execute **8 Deep Research Workstreams** and compile their findings into **`VELOCE_V2_DEEP_RESEARCH_DOSSIER.md`**. Each section of your dossier must contain concrete file paths, mathematical formulas, library API patterns, and exact architectural blueprints—**zero vague summaries**.

### AGENT 1 — Design Principles, Color Theory & "White Wind-Tunnel" Visual Direction
* **Research Mission:**
  1. Audit the existing frontend CSS and component tree in `frontend/src/` to identify every remaining trace of "AI slop" (cramped dark boxes, neon cyan/purple borders, static tab layouts, unstyled scrollbars).
  2. Define the exact mathematical color tokens, luminance ratios, and `GSAP ScrollTrigger` background interpolation stops across the 4 Acts:
     * **Act 1 (White Wind-Tunnel Test Cell):** `#F4F5F7` surface, `#FFFFFF` specular highlights, `#D8DCE3` wind-tunnel louver grid lines, `#0F1115` primary ink, `#FF3B00` aerodynamic flow accent.
     * **Act 2 (2.5D Parallax Storytelling):** Smooth background morphs (`#EFECE6` Warm Editorial Stone $\rightarrow$ `#121316` Carbon Thermal Studio $\rightarrow$ `#F4F2ED` Strategy Paper).
     * **Act 3 (System 1 — ML Oracle Workbench):** High-contrast Swiss editorial grid on `#F4F2ED` with zero visual clutter.
     * **Act 4 (System 2 — 20-Car 3D Race Arena):** Natural daylight / golden-hour / floodlit night 3D broadcast environment with ultra-clean translucent broadcast pills (`backdrop-filter: blur(20px)`, `rgba(12, 14, 18, 0.72)`).
  3. Define the exact typographic scale (`clamp()` fluid sizing, line-heights, kerning, and `GSAP` text-reveal mask mechanics) for `Syne`, `Instrument Serif`, `Plus Jakarta Sans`, and `Space Grotesk`.

### AGENT 2 — Long-Scroll `Lenis` + `GSAP ScrollTrigger` & 2.5D Parallax Choreography
* **Research Mission:**
  1. Inspect why the current app is stuck as a non-scrolling tab layout (`overflow: hidden` on `body`/`#root` or tab state switching in `App.tsx`).
  2. Architect the exact `Lenis` + `GSAP ScrollTrigger` master scroll container (`~1,050vh` total scrollable height) where:
     * Act 1 pins the 3D White Wind-Tunnel Canvas for `180vh` while scrubbing the camera and airflow streamlines around the 3D F1 car, then **releases the pin so the 3D Hero Car scrolls naturally upward and out of the viewport between `180vh` and `250vh`**.
     * Once `<WindTunnelHeroCanvas />` exits the viewport, an `IntersectionObserver` sets `frameloop="never"` on the Act 1 `<Canvas>` so it consumes **0% GPU/CPU** during Acts 2, 3, and 4!
  3. Design at least **6 distinct 2.5D Parallax & Scroll-Driven Animations** for Act 2 (multi-plane depth layers moving at `0.3x`, `0.65x`, `1.0x`, and `1.35x` scroll speeds, SVG circuit path self-drawing via `strokeDashoffset`, horizontal pinned corner-comparison cards, and velocity-reactive typography skew).

### AGENT 3 — Photorealistic Baked Lighting: White Wind-Tunnel Hero Car + Outdoor 3D Track
* **Research Mission:**
  1. Inspect how `f1_car.glb` is currently loaded and lit in `frontend/src/`.
  2. Design the **White Wind-Tunnel Studio Environment Baker** for Act 1:
     * How to construct a procedural 3D Wind-Tunnel Test Chamber around the car (curved white test-section walls, ceiling LED light-strip panels using `@react-three/drei`'s `<Lightformer>` baked into a `PMREM` environment cubemap, a satin white wind-tunnel floor with a dark circular turntable pad, `<ContactShadows>` + baked radial underbody Ambient Occlusion decal, and animated 3D aerodynamic smoke/streamline ribbons flowing over the car's nose, sidepods, and rear wing).
     * How to configure `THREE.MeshPhysicalMaterial` (`clearcoat: 1.0`, `clearcoatRoughness: 0.04`, `ior: 1.52`, `envMapIntensity: 2.5`, carbon-fiber twill normal maps, and rubber tire sheen) so the car looks like an offline Blender Cycles render.
  3. Design the **Outdoor Photorealistic Circuit Lighting & Scenery Pipeline** for Act 4:
     * Physical Rayleigh/Mie `<Sky>` + `<Environment>` HDRI + cascaded directional sun shadows + PBR normal-mapped asphalt + corner-only 3D sawtooth FIA kerbs + Armco barriers + 3D grandstand tribunes + start/finish gantry.

### AGENT 4 — Full-Grid 20-Car 3D Race Simulation & Individual Driver Camera Tracking
* **Research Mission:**
  1. Solve the core engineering challenge of upgrading Act 4 from a 2-car comparison into a **20-Car Full-Grid Mini F1 Game running at a locked 60.0 FPS**:
     * **Memory & GPU Instancing / Cloning Strategy:** How to clone `f1_car.glb` 20 times (sharing the underlying `BufferGeometry` and carbon/tire materials while binding 10 distinct team livery material instances—2 cars per constructor!) so all 20 cars render in `< 3 ms` per frame.
     * **20-Car Spatial Position & Racing-Line Offset Engine:** How to store all 20 drivers' lap/race trajectories in compact flat typed arrays (`Float32Array`) and compute **lateral racing-line offsets (`-4.5m` to `+4.5m` across the `14m`-wide asphalt)** when two cars are within `< 12 meters` longitudinally so cars pull alongside each other to overtake rather than ghosting through each other on the exact same centerline!
     * **Individual Driver Tracking State Machine (`trackedDriverCode: string`):** How clicking any of the 20 drivers on the leaderboard smoothly transitions the 3D camera (`Vector3.lerp` + `Quaternion.slerp`) onto that specific car (supporting `Chase Cam`, `Onboard Halo T-Cam`, `Helicopter Cam`, and `Free Orbit`) and binds the live telemetry HUD to that driver's telemetry stream.

### AGENT 5 — Live Ongoing Race Engine (`2026 & Future Seasons`) & Historical (`2018–2026`) Multi-Car Data Pipeline
* **Research Mission:**
  1. Research the exact **OpenF1 Real-Time REST/Polling & WebSocket Architecture (`https://api.openf1.org/v1/`)** for live ongoing sessions:
     * How to query `/v1/sessions?session_key=latest`, `/v1/drivers?session_key=latest`, `/v1/location` (`x, y, z` at ~3.7 Hz), `/v1/car_data` (`speed, rpm, n_gear, throttle, brake, drs` at ~3.7 Hz), `/v1/position`, `/v1/intervals`, `/v1/stints`, and `/v1/race_control`.
     * **The 60 FPS Live Jitter-Buffer Interpolator:** Because live OpenF1 packets arrive every ~270ms–1000ms, design a client-side **Hermite / Linear Ring-Buffer Interpolator (with a `1.5-second` broadcast buffer delay)** that smoothly interpolates all 20 cars' `(x, y, z)` positions and speeds at 60 FPS so live cars never stutter or teleport between network packets!
  2. Research the **Historical Full-Race & Qualifying Multi-Car Extractor (`2018–2026+` via `FastF1`)**:
     * How `fastf1.get_event_schedule(year)` discovers all circuits for any year (`2018` to `2026` and future seasons automatically), and how to extract all 20 drivers' telemetry/lap progressions for full-grid simulation.

### AGENT 6 — Dynamic On-Demand Asset Downloader, TTL/LRU Storage Eviction Daemon & Progress Bar
* **Research Mission:**
  1. Design the **Dynamic Track & Era-Accurate Car Downloader**:
     * How selecting any Year (`2018–2026+`) and Circuit dynamically fetches only that circuit's 3D spline/scenery and that season's era car spec (`2018–2021` 13-inch wide flat-floor era, `2022–2025` 18-inch ground-effect era, `2026+` active-aero compact era) + 10 team liveries.
  2. Design the **TTL / LRU Storage Eviction Daemon (`backend/storage/ttl_cache_manager.py`)**:
     * Instead of deleting files while the user is still actively using the session OR letting gigabytes pile up forever, maintain a lightweight `cache_manifest.json` tracking `{ resource_id, path, size_bytes, last_accessed_timestamp }`.
     * Background async task runs every 60 seconds and **automatically deletes any cached session/track/model file that has been unused for `> 20 minutes` (TTL) OR evicts Least-Recently-Used (LRU) items if total cache exceeds `200 MB`**, plus provides an instant `"Purge Cache Now (0 MB)"` button in the UI!
  3. Design the **Determinate Multi-Stage Download Progress Bar (`0% → 100%`)**:
     * Server-Sent Events (`/api/v1/stream-race-load`) reporting exact percentage, downloaded kilobytes/megabytes, transfer rate (`MB/s`), and current pipeline stage.

### AGENT 7 — System Separation UX Architect (System 1: ML Prediction Oracle vs. System 2: 3D Race Game)
* **Research Mission:**
  1. Design the exact information architecture and visual boundary between:
     * **System 1 (The ML Predictive Strategy & Monte Carlo Oracle Arena in Act 3):** Focused 100% on machine learning lap-time predictions, tire-cliff degradation modeling, pit-window optimization, and 5,000-run Monte Carlo probability distributions.
     * **System 2 (The 20-Car 3D Live & Historical Race Simulation Game in Act 4):** Focused 100% on watching/controlling the 20-car 3D race, switching camera angles across all 20 drivers, scrubbing or streaming live laps, and viewing live broadcast telemetry.
  2. Specify how the two systems stay cleanly decoupled in code and UI while sharing the underlying season/circuit catalog.

### AGENT 8 — Existing Codebase Audit & Non-Destructive V1-to-V2 Upgrade Blueprint
* **Research Mission:**
  1. Inspect every existing file in `backend/` and `frontend/` right now.
  2. Document in `VELOCE_V2_DEEP_RESEARCH_DOSSIER.md`:
     * Every existing file we will **KEEP & REUSE AS-IS** (e.g., `backend/ml/lap_time_model.py`, `backend/ml/monte_carlo_engine.py`, `frontend/public/models/f1_car.glb`).
     * Every existing file we will **UPGRADE IN-PLACE**.
     * Every **NEW V2 MODULE** we will add in the subsequent implementation phases.

---

## SECTION 4: REQUIRED DELIVERABLE FOR THIS TURN (`VELOCE_V2_DEEP_RESEARCH_DOSSIER.md` + HANDOFF BLOCK)

Antigravity: Execute all 8 Research Agent workstreams now, write the complete, exhaustive **`VELOCE_V2_DEEP_RESEARCH_DOSSIER.md`** file in the project root, and end your response with this exact handoff block so the user can relay it to the Lead Orchestrator:

```text
=== [ANTIGRAVITY RESEARCH FLEET -> ORCHESTRATOR HANDOFF REPORT] ===
EXECUTION RULE VERIFIED: [CONFIRMED — ZERO APPLICATION CODE MODIFIED IN THIS TURN; 100% RESEARCH FLEET EXECUTION]
MASTER DOSSIER CREATED: `VELOCE_V2_DEEP_RESEARCH_DOSSIER.md` ([Total Lines / Size])

SUMMARY OF 8 RESEARCH AGENT FINDINGS:
  1. AGENT 1 (Editorial Design Principles & White Wind-Tunnel Theme): [Key findings & color/type tokens locked]
  2. AGENT 2 (1,050vh Lenis + GSAP ScrollTrigger & Act 1 Car Scroll-Out Architecture): [Key findings & scroll pin/unmount mechanics]
  3. AGENT 3 (Baked White Wind-Tunnel Lighting + Photorealistic Outdoor Track Scenery): [Key findings & PBR/PMREM pipeline]
  4. AGENT 4 (20-Car Full-Grid 3D Simulation & Individual Driver Camera Tracking): [Key findings & 60 FPS instancing/cloning plan]
  5. AGENT 5 (Live Ongoing Race OpenF1 Jitter-Buffer + 2018-2026+ Historical Pipeline): [Key findings & live interpolation math]
  6. AGENT 6 (Dynamic Downloader, TTL/LRU Storage Eviction Daemon & Progress Bar): [Key findings & TTL cache architecture]
  7. AGENT 7 (System 1 ML Oracle vs. System 2 3D Race Game Separation): [Key findings & UX boundary]
  8. AGENT 8 (Existing V1 Codebase Audit & Non-Destructive V2 Upgrade Map): [List of V1 files reused vs. upgraded vs. new V2 files]

READY FOR ORCHESTRATOR APPROVAL TO START V2 IMPLEMENTATION PHASE 1: [YES]
===================================================================
```
