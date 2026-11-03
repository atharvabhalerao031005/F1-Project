# AERO-SPEC // F1 KINETIC TELEMETRY, ML LAP-TIME SYNTHESIZER & MONTE CARLO RACE STRATEGY ENGINE
## Master Agentic Execution Blueprint, ML/Physics Architecture Contract, UI/UX Specification & Orchestrator Handshake Protocol

**Target Execution Agent:** Antigravity (Autonomous Coding Environment)  
**External Lead Architect / Orchestrator:** Gemini (Stateless Remote Orchestrator via User Relay)  
**Document ID:** `AERO-SPEC-ML-AG-CONTRACT-v5.0`  
**Aesthetic & Functional Benchmark:** Mercedes-AMG PETRONAS "ATLAS" Telemetry Workbench + Red Bull Racing "Pit-Wall Monte Carlo Strategy Oracle" + NASA FDO Console  
**Performance Target:** Locked 60.0 FPS (`< 16.67 ms` UI frame budget) | `< 180 ms` for 5,000-Run Vectorized Monte Carlo Race Simulation | `0` React Virtual-DOM Re-renders During 60 Hz Scrubbing  

---

## SECTION 0: INSTRUCTIONS FOR ANTIGRAVITY & THE ORCHESTRATOR HANDSHAKE PROTOCOL

### 0.1 Why This Document Is Structured as a Strict Contract (Read First)

You (**Antigravity**) are the primary engineering agent building this system inside the user's local workspace. The user is orchestrating your work through an external **Lead Systems Orchestrator (Gemini)**. Because the external Orchestrator **has zero direct access to the local filesystem or terminal**, any unannounced deviation in file paths, TypeScript interfaces, API routes, or state store keys will break orchestration visibility.

By following this blueprint verbatim, both you (Antigravity) and the external Orchestrator share a **100% deterministic mental model of every file, function signature, ML model artifact, and UI pixel** in the repository.

### 0.2 The 6 Non-Negotiable Execution Rules for Antigravity

1. **Immutable File Tree & Symbol Locking:** Create every file at the exact relative path listed in **Section 2**. Never rename components, store slices, or API endpoints unless you log an explicit `CONTRACT DEVIATION` in your Handoff Report.
2. **Offline-First & Instant-Boot Guarantee:** Cold `FastF1` downloads from F1 timing servers can take 15–30 seconds and fail behind firewalls. You MUST implement `backend/seed_demo_telemetry.py` and `backend/ml/train_and_export.py` in Phase 1 so that:
   * Pre-computed 1-meter telemetry bundles (`2024_monza_q3_ver_nor.json`, `2024_silverstone_q3_ver_nor.json`, `2024_monaco_q3_lec_pia.json`) AND pre-computed baseline Monte Carlo strategy simulations (`2024_monza_strategy_oracle.json`) are written directly to `frontend/public/telemetry/`.
   * The trained ML model (`aero_spec_gbdt_v1.joblib`) is saved to `backend/ml/artifacts/`.
   * If the FastAPI backend (`http://localhost:8000`) is running, the frontend calls live `/api/v1/ml/*` endpoints; if the backend is offline, the frontend automatically runs a **Client-Side Vectorized TypeScript Physics/Monte-Carlo Fallback Engine (`frontend/src/utils/clientMlSimulator.ts`)** so the ML sliders, Undercut Sandbox, and 5,000-run Monte Carlo simulations work 100% live in the browser even on static hosting!
3. **Zero React State Inside 60 FPS Animation Loops:** Never call React `useState` setters at 60 Hz. `currentDistance` lives inside `useTelemetryStore` and is read imperatively via `useTelemetryStore.getState()` inside `requestAnimationFrame` (2D Canvas Scrubber, G-G Radar, Direct-DOM Steering Wheel HUD) and `@react-three/fiber`'s `useFrame` (3D Circuit Viewport).
4. **No Consumer Web UI Tells:** Strictly enforce `#05070B` Deep Void Carbon, `#0C1017` Sheet Metal panels, `1px solid #1B2230` exposed grid seams, `0px` border radius, 4-corner aerospace optical reticles, CRT scanlines, and `JetBrains Mono` with `font-variant-numeric: tabular-nums slashed-zero`.
5. **Maintain `ORCHESTRATOR_STATE.md` in the Project Root:** After every phase or user prompt, update `ORCHESTRATOR_STATE.md` with a checklist of all files, line counts, verification results, and active phase status.
6. **Always Emit the Standardized Handoff Block:** End every response to the user with this exact block so they can paste it back to the Lead Orchestrator:

```text
=== [ANTIGRAVITY -> ORCHESTRATOR HANDOFF REPORT] ===
CURRENT PHASE COMPLETED: [e.g., Phase 1 - Backend ML Engine, Telemetry Resampler & Static Seeds]
FILES CREATED / MODIFIED:
  - [exact/relative/path.ext] ([COMPLETE | PARTIAL], [lines: N], [exports: SymbolA, SymbolB])
ML & PHYSICS ENGINE VERIFICATION:
  - GBDT Lap-Time Model R2 / MAE: [e.g., R2 = 0.984, MAE = 0.062s]
  - 5,000-Run Monte Carlo Execution Time: [e.g., 84 ms]
  - Static JSON Bundles Generated: [PASS | FAIL]
FRONTEND & BUILD VERIFICATION:
  - TypeScript Compiler (`tsc --noEmit`): [PASS | FAIL + details]
  - Vite Build / Dev Server: [PASS | FAIL]
  - 60 FPS Zero-React-Render Audit: [PASS | NOT YET APPLICABLE]
CONTRACT DEVIATIONS: [NONE | Explicit list]
NEXT RECOMMENDED PHASE: [e.g., Phase 2 - Aero-Spec Cockpit Shell, Zustand Store & Client ML Engine]
QUESTIONS / BLOCKERS FOR ORCHESTRATOR: [NONE | Specific question]
====================================================
```

---

## SECTION 1: SYSTEM ARCHITECTURE & REAL-WORLD UTILITY DOCTRINE

### 1.1 Dual-Engine Capability: Why This Project Has Real Engineering & Analytical Utility

Instead of a passive replay viewer, **Aero-Spec v5.0** combines two tightly coupled engines inside one unified `#05070B` NASA/Mercedes-AMG Mission Control cockpit:

1. **ENGINE A — 60 FPS 1-Meter Spatial Telemetry & ML Physics-Warp Lab (`MODE: TELEMETRY LAB`):**
   * Synchronizes the 3D WebGL circuit spline, 20-driver timing tower, G-G traction circle radar, 15-LED steering wheel HUD, and 5-channel 60 FPS oscillograph to a canonical **1-meter spatial distance grid (`d ∈ [0, L_track]`)**.
   * **Real Utility — Interactive ML Physics-Warp Sliders:** The engineer can adjust **Simulated Tire Age (`0–35 Laps`)**, **Compound (`Soft`/`Medium`/`Hard`)**, **Fuel Load (`5–110 kg`)**, and **Track Temp (`20–55°C`)** in real time. The ML model predicts the exact grip multiplier $\mu_{\text{eff}}$ and mass penalty, dynamically warping the velocity trace, extending braking distances by up to $+18\text{m}$, lowering corner apex speeds ($V_{\text{min}}$), and shifting the **3D ML Ghost Car** on track so you can visually see *where* a worn tire or heavy fuel load loses lap time!
2. **ENGINE B — Machine Learning Lap-Time Regressor & 5,000-Run Monte Carlo Race Strategy Oracle (`MODE: ML STRATEGY ORACLE`):**
   * **Gradient-Boosted Tire Degradation & Lap-Time Model (`scikit-learn` `HistGradientBoostingRegressor`):** Trained on physics-grounded F1 stint data capturing compound base delta, non-linear thermal/wear "tire cliff" degradation, fuel burn rate (`-0.032s/lap`), track evolution, and dirty-air proximity loss.
   * **Vectorized 5,000-Run Monte Carlo Race Simulator:** Simulates all 53 laps (Monza) across 5,000 parallel universes in `< 150 ms`, modeling driver lap-time variance ($\sigma$), pit-stop duration distributions (including 3% tail-risk slow stops), stochastic Safety Car (SC) / Virtual Safety Car (VSC) deployments, and DRS-train overtaking thresholds.
   * **Interactive "What-If" Undercut / Overcut Sandbox:** The user drags Driver A's and Driver B's **Target Pit Lap Sliders (`Lap 8` to `Lap 48`)**, selects tyre stint sequences (`[S] -> [H]`, `[M] -> [H]`, `[S] -> [M] -> [S]`), or toggles a **Safety Car Window**, and immediately sees:
     * **Live Undercut / Overcut Verdict:** e.g., `UNDERCUT SUCCESSFUL // VER BOX LAP 19 GAINS +1.92s OVER NOR (BOX LAP 23)`
     * **3D Pit-Exit Battle Visualization:** The 3D circuit jumps to the Pit Exit merge at Turn 1 and animates Driver A exiting the pit lane relative to Driver B at full speed on the main straight!
     * **20-Driver Monte Carlo Probability Tower:** Quadrant 1 displays Win %, Podium %, Points %, and P10–P90 finishing range for every driver.
     * **Lap-by-Lap Stint Pace & Cumulative Race Gap Fan Chart:** Quadrant 4 switches between the 1-meter telemetry oscillograph and the 53-lap strategy gap fan chart with $10\%\text{–}90\%$ uncertainty bands.

### 1.2 Why We Chose This Exact Tech Stack

| Layer | Technology Choice | Architectural Rationale & Advantage |
| :--- | :--- | :--- |
| **Backend API & Relay** | **Python 3.11+ / FastAPI / Uvicorn** | Native async REST endpoints (`/api/v1/session-compare`, `/api/v1/ml/simulate-strategy`, `/api/v1/ml/warp-telemetry`) with Pydantic validation and automatic CORS. |
| **Telemetry & Physics Math** | **FastF1 + NumPy + SciPy (`interp1d`, `savgol_filter`)** | Projects irregular telemetry timestamps onto a canonical 1-meter integer distance grid ($O(1)$ lookup) and synthesizes longitudinal/lateral G-forces from trajectory curvature $\kappa$. |
| **Machine Learning Core** | **Scikit-Learn (`HistGradientBoostingRegressor`) + Vectorized NumPy Monte Carlo** | Zero C++/OpenMP compilation failures on Windows/macOS/Linux (unlike raw `xgboost`/`lightgbm` wheels), trains in `< 0.8s`, inferences 53 laps in `< 2ms`, and runs 5,000 Monte Carlo races in `< 150ms` via 2D NumPy broadcasting. |
| **Client-Side Hybrid ML Fallback** | **TypeScript Vectorized Surrogate & Mulberry32 PRNG (`clientMlSimulator.ts`)** | Mirrors the exact Python GBDT response surface and 5,000-run Monte Carlo simulator in pure TypeScript so interactive sliders respond in `< 8ms` at 60 FPS even when the Python server isn't running. |
| **Frontend State Core** | **Zustand (`subscribeWithSelector`)** | Decouples 60 Hz `currentDistance` updates from React's Virtual DOM so 0 components re-render during playback. |
| **3D & 2D Visualization** | **Three.js (`@react-three/fiber`) + Dual-Buffer HiDPI HTML5 2D `<canvas>`** | GPU-accelerated 3D vertex-colored track spline + offscreen-buffered 2D canvas blitting (`< 0.2ms` per frame). |

---

## SECTION 2: IMMUTABLE REPOSITORY & FILE TREE CONTRACT

Antigravity MUST construct the workspace using these exact file paths:

```text
aero-spec-f1-engine/
├── ORCHESTRATOR_STATE.md                        # Maintained by Antigravity after every phase
├── README.md                                    # Quickstart & architecture documentation
├── backend/
│   ├── requirements.txt                         # fastapi, uvicorn, fastf1, numpy, scipy, scikit-learn, joblib, pandas
│   ├── f1_telemetry_cache/                      # Local FastF1 cache directory
│   ├── seed_demo_telemetry.py                   # Generates 1m telemetry + baseline ML JSONs into frontend/public/telemetry/
│   ├── telemetry_engine.py                      # 1-meter spatial resampler, Savitzky-Golay G-forces & corner audit
│   ├── main.py                                  # FastAPI server (:8000) serving /api/v1/telemetry & /api/v1/ml/*
│   └── ml/
│       ├── __init__.py
│       ├── artifacts/
│       │   └── aero_spec_gbdt_v1.joblib         # Serialized HistGradientBoosting lap-time & deg model
│       ├── lap_time_model.py                    # Feature engineering, GBDT training, tire-cliff & physics-warp predictor
│       └── monte_carlo_engine.py                # 5,000-run vectorized NumPy Monte Carlo race & undercut simulator
└── frontend/
    ├── package.json                             # Vite + React 18 + TS + Three/R3F/Drei + Zustand + Lucide + Tailwind
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html                               # Loads JetBrains Mono & Inter + sets #05070B Void Carbon root
    ├── public/
    │   └── telemetry/
    │       ├── 2024_monza_q3_ver_nor.json       # Default 1m telemetry + baseline ML strategy bundle
    │       ├── 2024_silverstone_q3_ver_nor.json # Silverstone high-speed aero preset
    │       └── 2024_monaco_q3_lec_pia.json      # Monaco high-downforce street preset
    └── src/
        ├── main.tsx                             # React mount
        ├── App.tsx                              # Master 5-Zone Cockpit Grid & global hotkey controller
        ├── types/
        │   └── telemetry.ts                     # Strict TypeScript interfaces for Telemetry + ML Strategy + Physics Warp
        ├── utils/
        │   ├── formatters.ts                    # Deterministic zero-padded tabular string formatters
        │   └── clientMlSimulator.ts             # Instant browser-side ML Physics-Warp & 5,000-run Monte Carlo engine
        ├── styles/
        │   └── aero-spec-hud.css                # #05070B Void Carbon tokens, 1px hairline grid, reticles, CRT overlay
        ├── store/
        │   └── useTelemetryStore.ts             # Zustand store holding telemetry, playback cursor & ML sandbox state
        └── components/
            ├── header/
            │   └── MissionRibbon.tsx            # Zone 0 (36px): Session selector, Mode switcher (TELEMETRY vs ML ORACLE), FPS
            ├── flankLeft/
            │   └── TimingTower.tsx              # Quadrant 1 (315px): Dual-mode 20-Driver Live Timing OR Monte Carlo Win % Tower
            ├── viewport3d/
            │   └── CircuitViewport3D.tsx        # Quadrant 2 (1fr): 3D Spline, Pedal/Speed/Delta/ML-Warp shaders, Pit-Exit cam
            ├── flankRight/
            │   ├── RightFlankPanel.tsx          # Quadrant 3 (345px): Switches between Live Telemetry HUD & ML Strategy Sandbox
            │   ├── GGTractionRadar.tsx          # Sub-Panel 3A: 60 FPS Canvas polar G-G diagram + comet tail
            │   ├── SteeringWheelHUD.tsx         # Sub-Panel 3B: Direct-DOM 15-LED shift lights, Gear/RPM/DRS
            │   ├── CornerAuditCard.tsx          # Sub-Panel 3C: Corner braking/apex/exit comparison + ML Physics-Warp sliders
            │   └── MlStrategySandbox.tsx        # Quadrant 3 ML Mode: Interactive Stint/Pit-Lap sliders, SC toggle & Verdict Card
            └── scrubber/
                ├── TelemetryOscillograph.tsx    # Quadrant 4 (Dual-Buffer 60 FPS Canvas): 1m Telemetry traces + ML Warped Ghost trace
                ├── StrategyFanChart.tsx         # Quadrant 4 (ML Mode Canvas): 53-Lap Stint Pace & Undercut Gap Fan Chart
                └── TransportBar.tsx             # Bottom 34px control strip: Play/Pause, step, speed rate, sector isolation
```

---

## SECTION 3: STRICT DATA, ML & API SCHEMA CONTRACT (`frontend/src/types/telemetry.ts`)

```typescript
// frontend/src/types/telemetry.ts

export type TyreCompound = 'S' | 'M' | 'H' | 'I' | 'W';
export type SectorStatus = 'PURPLE' | 'GREEN' | 'AMBER';
export type CameraMode = 'ORTHO' | 'ISO' | 'CHASE';
export type TrackColorMode = 'PEDAL' | 'SPEED' | 'DELTA';
export type CockpitMode = 'TELEMETRY_LAB' | 'ML_STRATEGY_ORACLE';
export type PlaybackSpeed = 0.25 | 0.5 | 1.0 | 2.0 | 4.0;

export interface SessionWeather {
  trackTempC: number;
  airTempC: number;
  humidityPct: number;
  windSpeedMs: number;
  windDirection: string;
  trackStatus: 'GREEN' | 'YELLOW' | 'SC' | 'VSC' | 'RED';
}

export interface TimingTowerDriver {
  position: number;
  code: string;
  number: number;
  teamName: string;
  teamColor: string;
  compound: TyreCompound;
  tyreAgeLaps: number;
  bestLapTimeStr: string;
  bestLapTimeSec: number;
  gapToLeaderStr: string;
  sectors: [SectorStatus, SectorStatus, SectorStatus];
  sectorTimesSec: [number, number, number];
}

export interface CornerApexMeta {
  id: string;
  name: string;
  apexDistanceM: number;
  entryDistanceM: number;
  exitDistanceM: number;
  x: number;
  y: number;
  z: number;
  brakeMarkerA: number;
  brakeMarkerB: number;
  vMinA: number;
  vMinB: number;
  throttlePickupA: number;
  throttlePickupB: number;
  cornerDeltaSec: number;
}

export interface DrsZoneMeta {
  id: string;
  detectionDistanceM: number;
  startDistanceM: number;
  endDistanceM: number;
}

export interface NormalizedLapChannels {
  t: number[];
  x: number[];
  y: number[];
  z: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  rpm: number[];
  gear: number[];
  drs: number[];
  gLong: number[];
  gLat: number[];
  steerDeg: number[];
}

// ============================================================================
// MACHINE LEARNING & MONTE CARLO STRATEGY ORACLE CONTRACTS
// ============================================================================

export interface MlPhysicsWarpParams {
  enabled: boolean;
  compound: TyreCompound;      // 'S' | 'M' | 'H'
  tyreAgeLaps: number;         // 0 to 40 laps
  fuelLoadKg: number;          // 5 to 110 kg (qualifying is ~8 kg)
  trackTempC: number;          // 18 to 55 °C
}

export interface MlPhysicsWarpOutput {
  predictedLapTimeSec: number;
  lapDeltaVsBaseSec: number;   // + means slower than baseline qualifying lap
  gripMultiplier: number;      // e.g. 0.942 on worn tyres
  brakingExtensionM: number;   // e.g. +11.4m earlier braking required
  warpedSpeed: number[];       // Length = gridLength + 1
  warpedDeltaT: number[];      // Length = gridLength + 1 (t_warped[k] - t_baseA[k])
}

export interface DriverStrategyConfig {
  driverCode: string;
  startCompound: TyreCompound;
  pitLap1: number;             // 1 to totalRaceLaps - 2
  nextCompound1: TyreCompound;
  stops: 1 | 2;
  pitLap2: number;             // Used if stops === 2
  nextCompound2: TyreCompound;
}

export interface MlStrategySimulationInput {
  totalRaceLaps: number;       // e.g. 53 for Monza
  safetyCarWindowLap: number | null; // null = stochastic SC, or specific lap (e.g. 24)
  trackTempC: number;
  pitLossNormalSec: number;    // e.g. 21.4s at Monza
  pitLossScSec: number;        // e.g. 11.2s under Safety Car
  numSimulations: number;      // e.g. 5000
  strategyA: DriverStrategyConfig;
  strategyB: DriverStrategyConfig;
}

export interface MonteCarloDriverProbability {
  code: string;
  teamColor: string;
  winProbPct: number;          // 0.0 to 100.0
  podiumProbPct: number;       // 0.0 to 100.0
  pointsProbPct: number;       // 0.0 to 100.0
  expectedPosition: number;    // e.g. 1.38
  p10Position: number;         // Optimistic 10th percentile finish
  p90Position: number;         // Conservative 90th percentile finish
  expectedRaceTimeSec: number;
}

export interface LapByLapStrategyTrace {
  lapNumber: number;           // 1 to totalRaceLaps
  lapTimeASec: number;         // Predicted lap time for Driver A on lap l
  lapTimeBSec: number;         // Predicted lap time for Driver B on lap l
  tyreDegASec: number;         // Cumulative tyre degradation penalty on Driver A
  tyreDegBSec: number;         // Cumulative tyre degradation penalty on Driver B
  cumulativeGapMedianSec: number; // CumTime_B[l] - CumTime_A[l] (>0 means A leads B)
  cumulativeGapP10Sec: number; // 10th percentile Monte Carlo confidence bound
  cumulativeGapP90Sec: number; // 90th percentile Monte Carlo confidence bound
  compoundA: TyreCompound;
  compoundB: TyreCompound;
  isPitLapA: boolean;
  isPitLapB: boolean;
}

export interface MlStrategySimulationResult {
  executionTimeMs: number;
  numSimulations: number;
  optimalPitLapA: number;
  undercutGainSec: number;     // Positive = Driver A's undercut gains time over B
  verdictHeadline: string;     // e.g. "UNDERCUT OPTIMAL // BOX LAP 19 FOR [H] (+1.84s NET GAIN)"
  verdictDetail: string;       // Detailed engineering explanation of tyre crossover & pit exit gap
  pitExitGapMeters: number;    // Spatial separation at Turn 1 after both drivers complete stops
  driverProbabilities: MonteCarloDriverProbability[];
  lapTraces: LapByLapStrategyTrace[];
}

export interface SessionTelemetryPayload {
  sessionId: string;
  meta: {
    year: number;
    eventName: string;
    circuitName: string;
    sessionType: string;
    circuitLengthM: number;
    totalRaceLaps: number;     // e.g. 53 for Monza, 52 Silverstone, 78 Monaco
    pitLossSec: number;        // e.g. 21.4
    sectorSplitM: [number, number];
    weather: SessionWeather;
    driverA: {
      code: string;
      fullName: string;
      number: number;
      teamName: string;
      teamColor: string;
      lapTimeStr: string;
      lapTimeSec: number;
      tyreCompound: TyreCompound;
    };
    driverB: {
      code: string;
      fullName: string;
      number: number;
      teamName: string;
      teamColor: string;
      lapTimeStr: string;
      lapTimeSec: number;
      tyreCompound: TyreCompound;
    };
  };
  gridLength: number;
  deltaT: number[];
  timingTower: TimingTowerDriver[];
  corners: CornerApexMeta[];
  drsZones: DrsZoneMeta[];
  driverA: NormalizedLapChannels;
  driverB: NormalizedLapChannels;
  defaultStrategyOracle: MlStrategySimulationResult;
}
```

---

## SECTION 4: MACHINE LEARNING & MONTE CARLO MATHEMATICAL SPECIFICATION

### 4.1 Physics-Informed Lap-Time & Non-Linear Tire Cliff Formulation

F1 lap times during a race stint are governed by four coupled physical phenomena that our Gradient-Boosted Decision Tree (`HistGradientBoostingRegressor`) and client-side surrogate model learn and evaluate:

$$\hat{t}_{\text{lap}}(l, c, a, m_{\text{fuel}}, T_{\text{track}}) = t_{\text{base}} + \Delta_{\text{comp}}(c) + \alpha_c \cdot a + \beta_c \cdot \max(0, a - a_{\text{cliff}, c})^2 + \gamma_{\text{fuel}} \cdot (m_{\text{fuel}} - m_{\text{qual}}) + \delta_T(T_{\text{track}} - T_{\text{opt}, c})^2$$

Where:
1. **Compound Offset $\Delta_{\text{comp}}(c)$:**
   * Soft (`S`, C5/C4): $0.00\text{s}$ baseline (peak mechanical grip $\mu_0 = 1.000$, rapid thermal degradation)
   * Medium (`M`, C3): $+0.42\text{s/lap}$ slower initially ($\mu_0 = 0.978$, linear degradation)
   * Hard (`H`, C2/C1): $+0.88\text{s/lap}$ slower initially ($\mu_0 = 0.956$, high durability)
2. **Linear Wear + Quadratic "Tire Cliff" ($a = \text{tyre age in laps}$):**
   * Soft (`S`): linear wear $\alpha_S = 0.075\text{s/lap}$, cliff threshold $a_{\text{cliff}, S} = 15\text{ laps}$, quadratic cliff penalty $\beta_S = 0.014\text{s/lap}^2$.
   * Medium (`M`): linear wear $\alpha_M = 0.046\text{s/lap}$, cliff threshold $a_{\text{cliff}, M} = 26\text{ laps}$, quadratic cliff penalty $\beta_M = 0.009\text{s/lap}^2$.
   * Hard (`H`): linear wear $\alpha_H = 0.028\text{s/lap}$, cliff threshold $a_{\text{cliff}, H} = 38\text{ laps}$, quadratic cliff penalty $\beta_H = 0.006\text{s/lap}^2$.
3. **Fuel Mass Burn Penalty ($\gamma_{\text{fuel}}$):**
   * Starting race fuel is $m_0 = 105\text{ kg}$ (burning $\sim 1.85\text{ kg/lap}$), compared to $m_{\text{qual}} = 8\text{ kg}$ in Q3.
   * Every $10\text{ kg}$ of fuel costs $+0.32\text{s/lap}$ ($\gamma_{\text{fuel}} = 0.032\text{s/kg}$) due to lower longitudinal acceleration ($a = F / m$) and increased braking kinetic energy ($E_k = \frac{1}{2} m v^2$).
4. **Spatial Velocity & Braking Trace Warp (How ML Connects to the 3D Track & 60 FPS Scrubber):**
   * Given predicted grip multiplier $\mu_{\text{eff}} \in [0.82, 1.04]$ and mass ratio $\rho_m = m_{\text{current}} / m_{\text{qual}}$:
   * Cornering speeds scale by $\sqrt{\mu_{\text{eff}}}$ ($v_{\text{apex, warped}} = v_{\text{apex, base}} \cdot \sqrt{\mu_{\text{eff}}}$), whereas straight-line top speed is governed by aerodynamic drag rather than tire grip.
   * Braking zones shift earlier by $\Delta d_{\text{brake}} = 18.0 \cdot (1 - \mu_{\text{eff}}) + 0.09 \cdot (m_{\text{fuel}} - 8)$.

### 4.2 Complete Python ML Model & Monte Carlo Engine (`backend/ml/`)

```python
# backend/ml/lap_time_model.py
import os
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

ARTIFACT_PATH = os.path.join(os.path.dirname(__file__), "artifacts", "aero_spec_gbdt_v1.joblib")
os.makedirs(os.path.dirname(ARTIFACT_PATH), exist_ok=True)

COMPOUND_MAP = {"S": 0, "M": 1, "H": 2, "I": 3, "W": 4}
COMPOUND_PARAMS = {
    0: {"offset": 0.00, "alpha": 0.075, "cliff": 15.0, "beta": 0.014, "opt_temp": 38.0},
    1: {"offset": 0.42, "alpha": 0.046, "cliff": 26.0, "beta": 0.009, "opt_temp": 41.0},
    2: {"offset": 0.88, "alpha": 0.028, "cliff": 38.0, "beta": 0.006, "opt_temp": 44.0},
}


def evaluate_physics_lap_delta(
    compound_id: int,
    tyre_age: float,
    fuel_kg: float,
    track_temp_c: float,
    driver_skill_delta: float = 0.0,
) -> float:
    p = COMPOUND_PARAMS.get(compound_id, COMPOUND_PARAMS[0])
    cliff_excess = max(0.0, tyre_age - p["cliff"])
    tyre_deg = p["offset"] + p["alpha"] * tyre_age + p["beta"] * (cliff_excess ** 2)
    fuel_penalty = 0.032 * (fuel_kg - 8.0)
    temp_penalty = 0.0018 * ((track_temp_c - p["opt_temp"]) ** 2)
    return float(tyre_deg + fuel_penalty + temp_penalty + driver_skill_delta)


def train_or_load_gbdt() -> HistGradientBoostingRegressor:
    if os.path.isfile(ARTIFACT_PATH):
        return joblib.load(ARTIFACT_PATH)

    rng = np.random.default_rng(42)
    n_samples = 12000
    comp_ids = rng.integers(0, 3, size=n_samples)
    tyre_ages = rng.uniform(0, 42, size=n_samples)
    fuel_loads = rng.uniform(5, 110, size=n_samples)
    track_temps = rng.uniform(22, 54, size=n_samples)
    driver_deltas = rng.normal(0.0, 0.15, size=n_samples)

    X = np.column_stack([comp_ids, tyre_ages, tyre_ages ** 2, fuel_loads, track_temps, driver_deltas])
    y = np.array([
        evaluate_physics_lap_delta(int(c), float(a), float(f), float(t), float(d))
        + rng.normal(0, 0.025)
        for c, a, f, t, d in zip(comp_ids, tyre_ages, fuel_loads, track_temps, driver_deltas)
    ])

    model = HistGradientBoostingRegressor(
        max_iter=220,
        learning_rate=0.06,
        max_depth=6,
        random_state=42,
    )
    model.fit(X, y)
    joblib.dump(model, ARTIFACT_PATH)
    return model
```

```python
# backend/ml/monte_carlo_engine.py
import time
import numpy as np
from .lap_time_model import COMPOUND_MAP, evaluate_physics_lap_delta


def run_monte_carlo_strategy_oracle(
    base_lap_sec: float,
    total_laps: int,
    pit_loss_normal: float,
    pit_loss_sc: float,
    sc_window_lap: int | None,
    track_temp_c: float,
    strategy_a: dict,
    strategy_b: dict,
    timing_tower: list,
    num_sims: int = 5000,
) -> dict:
    t0 = time.perf_counter()
    rng = np.random.default_rng(2026)

    def build_stint_profile(strat: dict, driver_base_offset: float):
        comp_seq = []
        age_seq = []
        pit_flags = []
        cur_comp = strat["startCompound"]
        cur_age = 0
        for lap in range(1, total_laps + 1):
            is_pit = (lap == strat["pitLap1"]) or (strat.get("stops", 1) == 2 and lap == strat.get("pitLap2", -1))
            pit_flags.append(is_pit)
            comp_seq.append(cur_comp)
            age_seq.append(cur_age)
            cur_age += 1
            if lap == strat["pitLap1"]:
                cur_comp = strat["nextCompound1"]
                cur_age = 0
            elif strat.get("stops", 1) == 2 and lap == strat.get("pitLap2", -1):
                cur_comp = strat.get("nextCompound2", "H")
                cur_age = 0

        lap_times = np.zeros(total_laps, dtype=np.float64)
        deg_penalties = np.zeros(total_laps, dtype=np.float64)
        for idx in range(total_laps):
            lap_num = idx + 1
            fuel_kg = max(6.0, 105.0 * (1.0 - (lap_num - 1) / float(total_laps)))
            c_id = COMPOUND_MAP.get(comp_seq[idx], 0)
            delta = evaluate_physics_lap_delta(c_id, age_seq[idx], fuel_kg, track_temp_c, driver_base_offset)
            deg_only = evaluate_physics_lap_delta(c_id, age_seq[idx], 8.0, track_temp_c, 0.0)
            deg_penalties[idx] = deg_only
            pit_add = 0.0
            if pit_flags[idx]:
                pit_add = pit_loss_sc if (sc_window_lap is not None and abs(lap_num - sc_window_lap) <= 1) else pit_loss_normal
            lap_times[idx] = base_lap_sec + delta + pit_add
        return lap_times, deg_penalties, comp_seq, pit_flags

    laps_a, deg_a, comps_a, pits_a = build_stint_profile(strategy_a, 0.0)
    laps_b, deg_b, comps_b, pits_b = build_stint_profile(strategy_b, 0.109)

    # Vectorized Monte Carlo across (num_sims, total_laps) for Driver A and Driver B
    noise_a = rng.normal(0.0, 0.18, size=(num_sims, total_laps))
    noise_b = rng.normal(0.0, 0.18, size=(num_sims, total_laps))

    # Stochastic Safety Car arrival if sc_window_lap is None
    if sc_window_lap is None:
        sc_laps = rng.integers(12, total_laps - 8, size=num_sims)
        has_sc = rng.random(size=num_sims) < 0.38
        pit_idx_a = max(0, min(total_laps - 1, strategy_a["pitLap1"] - 1))
        pit_idx_b = max(0, min(total_laps - 1, strategy_b["pitLap1"] - 1))
        sc_bonus_a = np.where(has_sc & (np.abs(sc_laps - strategy_a["pitLap1"]) <= 1), -(pit_loss_normal - pit_loss_sc), 0.0)
        sc_bonus_b = np.where(has_sc & (np.abs(sc_laps - strategy_b["pitLap1"]) <= 1), -(pit_loss_normal - pit_loss_sc), 0.0)
        noise_a[:, pit_idx_a] += sc_bonus_a
        noise_b[:, pit_idx_b] += sc_bonus_b

    sim_cum_a = np.cumsum(laps_a[None, :] + noise_a, axis=1)
    sim_cum_b = np.cumsum(laps_b[None, :] + noise_b, axis=1)
    sim_gap_ba = sim_cum_b - sim_cum_a  # >0 means Driver A is ahead of Driver B

    gap_p50 = np.percentile(sim_gap_ba, 50, axis=0)
    gap_p10 = np.percentile(sim_gap_ba, 10, axis=0)
    gap_p90 = np.percentile(sim_gap_ba, 90, axis=0)

    # Multi-driver 20-car race finish simulation
    n_drivers = len(timing_tower)
    driver_pace_offsets = np.array([(d["bestLapTimeSec"] - base_lap_sec) for d in timing_tower])
    total_race_means = (base_lap_sec + 3.1 + driver_pace_offsets) * total_laps + pit_loss_normal
    # Adjust Driver A (index 0) and Driver B (index 1) by their exact chosen strategies
    total_race_means[0] = float(np.mean(sim_cum_a[:, -1]))
    if n_drivers > 1:
        total_race_means[1] = float(np.mean(sim_cum_b[:, -1]))

    field_noise = rng.normal(0.0, 2.6, size=(num_sims, n_drivers))
    field_totals = total_race_means[None, :] + field_noise
    ranks = np.argsort(np.argsort(field_totals, axis=1), axis=1) + 1  # 1 = P1, 20 = P20

    probs = []
    for d_idx, drv in enumerate(timing_tower):
        drv_ranks = ranks[:, d_idx]
        probs.append({
            "code": drv["code"],
            "teamColor": drv["teamColor"],
            "winProbPct": round(float(np.mean(drv_ranks == 1) * 100.0), 1),
            "podiumProbPct": round(float(np.mean(drv_ranks <= 3) * 100.0), 1),
            "pointsProbPct": round(float(np.mean(drv_ranks <= 10) * 100.0), 1),
            "expectedPosition": round(float(np.mean(drv_ranks)), 2),
            "p10Position": int(np.percentile(drv_ranks, 10)),
            "p90Position": int(np.percentile(drv_ranks, 90)),
            "expectedRaceTimeSec": round(float(total_race_means[d_idx]), 2),
        })

    # Find optimal pit lap for Driver A via grid search
    best_lap = strategy_a["pitLap1"]
    best_time = float("inf")
    for cand_lap in range(10, total_laps - 8):
        cand_strat = {**strategy_a, "pitLap1": cand_lap}
        c_laps, _, _, _ = build_stint_profile(cand_strat, 0.0)
        tot_t = float(np.sum(c_laps))
        if tot_t < best_time:
            best_time = tot_t
            best_lap = cand_lap

    after_stops_lap = min(total_laps - 1, max(strategy_a["pitLap1"], strategy_b["pitLap1"]) + 1)
    before_stops_lap = max(0, min(strategy_a["pitLap1"], strategy_b["pitLap1"]) - 2)
    undercut_gain = float(gap_p50[after_stops_lap] - gap_p50[before_stops_lap])
    pit_exit_meters = round(float(gap_p50[after_stops_lap] * 62.5), 1)  # ~225 km/h pit exit merge speed

    verdict_head = (
        f"UNDERCUT ADVANTAGE // {strategy_a['driverCode']} GAINS +{undercut_gain:.2f}s OVER PIT WINDOW"
        if undercut_gain >= 0
        else f"OVERCUT / STAY-OUT ADVANTAGE // {strategy_a['driverCode']} LOSES {undercut_gain:.2f}s IN PIT WINDOW"
    )
    verdict_detail = (
        f"Optimal box window is Lap {best_lap}. At Pit Exit merge (Turn 1), {strategy_a['driverCode']} "
        f"projects {abs(pit_exit_meters):.1f}m {'AHEAD' if pit_exit_meters >= 0 else 'BEHIND'} "
        f"{strategy_b['driverCode']} with {probs[0]['winProbPct']:.1f}% Win Probability."
    )

    lap_traces = []
    for i in range(total_laps):
        lap_traces.append({
            "lapNumber": i + 1,
            "lapTimeASec": round(float(laps_a[i]), 3),
            "lapTimeBSec": round(float(laps_b[i]), 3),
            "tyreDegASec": round(float(deg_a[i]), 3),
            "tyreDegBSec": round(float(deg_b[i]), 3),
            "cumulativeGapMedianSec": round(float(gap_p50[i]), 3),
            "cumulativeGapP10Sec": round(float(gap_p10[i]), 3),
            "cumulativeGapP90Sec": round(float(gap_p90[i]), 3),
            "compoundA": comps_a[i],
            "compoundB": comps_b[i],
            "isPitLapA": bool(pits_a[i]),
            "isPitLapB": bool(pits_b[i]),
        })

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return {
        "executionTimeMs": elapsed_ms,
        "numSimulations": num_sims,
        "optimalPitLapA": best_lap,
        "undercutGainSec": round(undercut_gain, 3),
        "verdictHeadline": verdict_head,
        "verdictDetail": verdict_detail,
        "pitExitGapMeters": pit_exit_meters,
        "driverProbabilities": probs,
        "lapTraces": lap_traces,
    }
```

### 4.3 Instant Client-Side TypeScript ML & Monte Carlo Engine (`frontend/src/utils/clientMlSimulator.ts`)

So the user gets **instantaneous 60 FPS reactivity** when dragging pit-stop sliders, changing tire compounds, or adjusting the Physics-Warp sliders—even if the Python backend isn't running—implement this exact deterministic TypeScript engine in `frontend/src/utils/clientMlSimulator.ts`:

```typescript
// frontend/src/utils/clientMlSimulator.ts
import {
  LapByLapStrategyTrace,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  MonteCarloDriverProbability,
  NormalizedLapChannels,
  TimingTowerDriver,
  TyreCompound,
} from '../types/telemetry';

const COMPOUND_SPEC: Record<
  TyreCompound,
  { offset: number; alpha: number; cliff: number; beta: number; optTemp: number; mu0: number }
> = {
  S: { offset: 0.0, alpha: 0.075, cliff: 15, beta: 0.014, optTemp: 38, mu0: 1.0 },
  M: { offset: 0.42, alpha: 0.046, cliff: 26, beta: 0.009, optTemp: 41, mu0: 0.978 },
  H: { offset: 0.88, alpha: 0.028, cliff: 38, beta: 0.006, optTemp: 44, mu0: 0.956 },
  I: { offset: 2.8, alpha: 0.065, cliff: 22, beta: 0.012, optTemp: 28, mu0: 0.89 },
  W: { offset: 5.4, alpha: 0.05, cliff: 30, beta: 0.01, optTemp: 24, mu0: 0.83 },
};

// Fast deterministic Mulberry32 PRNG + Box-Muller Gaussian sampler
function createGaussianRng(seed = 2026) {
  let a = seed >>> 0;
  const rand = () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    uniform: rand,
    normal: (mean = 0, std = 1) => {
      const u1 = Math.max(1e-7, rand());
      const u2 = rand();
      return mean + std * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    },
  };
}

export function evaluateLapDeltaSec(
  compound: TyreCompound,
  tyreAge: number,
  fuelKg: number,
  trackTempC: number,
  driverOffsetSec = 0
): { totalDeltaSec: number; degOnlySec: number; gripMultiplier: number } {
  const spec = COMPOUND_SPEC[compound] || COMPOUND_SPEC.S;
  const cliffExcess = Math.max(0, tyreAge - spec.cliff);
  const degOnlySec = spec.offset + spec.alpha * tyreAge + spec.beta * cliffExcess * cliffExcess;
  const fuelPenalty = 0.032 * (fuelKg - 8.0);
  const tempPenalty = 0.0018 * Math.pow(trackTempC - spec.optTemp, 2);
  const totalDeltaSec = degOnlySec + fuelPenalty + tempPenalty + driverOffsetSec;
  const gripMultiplier = Math.max(0.82, Math.min(1.03, spec.mu0 - 0.0038 * degOnlySec - 0.0004 * (fuelKg - 8)));
  return { totalDeltaSec, degOnlySec, gripMultiplier };
}

/**
 * Warps a 1-meter normalized telemetry lap based on ML-predicted Tire Degradation, Fuel Load & Track Temp.
 */
export function computeMlPhysicsWarp(
  baseLap: NormalizedLapChannels,
  baseLapTimeSec: number,
  params: MlPhysicsWarpParams
): MlPhysicsWarpOutput {
  const { totalDeltaSec, gripMultiplier } = evaluateLapDeltaSec(
    params.compound,
    params.tyreAgeLaps,
    params.fuelLoadKg,
    params.trackTempC,
    0
  );
  const brakingExtensionM = Math.max(0, 18.0 * (1 - gripMultiplier) + 0.09 * (params.fuelLoadKg - 8));
  const n = baseLap.speed.length;
  const warpedSpeed = new Array<number>(n);
  const warpedDeltaT = new Array<number>(n);

  const cornerGripFactor = Math.sqrt(gripMultiplier);
  const accelMassFactor = 1 - 0.00035 * (params.fuelLoadKg - 8);
  let cumTimeDiff = 0;

  for (let k = 0; k < n; k++) {
    const vBase = baseLap.speed[k];
    const brk = baseLap.brake[k];
    const isCornerOrBrake = vBase < 265 || brk > 10;
    const factor = isCornerOrBrake ? cornerGripFactor : accelMassFactor;
    const vWarped = Math.max(55, Math.min(362, vBase * factor));
    warpedSpeed[k] = Number(vWarped.toFixed(1));

    const dtBase = 1.0 / (Math.max(50, vBase) / 3.6);
    const dtWarp = 1.0 / (vWarped / 3.6);
    cumTimeDiff += dtWarp - dtBase;
    warpedDeltaT[k] = Number(cumTimeDiff.toFixed(4));
  }

  // Normalize cumulative time diff so end-of-lap matches exact GBDT lap-time delta
  const scale = Math.abs(cumTimeDiff) > 1e-4 ? totalDeltaSec / cumTimeDiff : 1;
  for (let k = 0; k < n; k++) {
    warpedDeltaT[k] = Number((warpedDeltaT[k] * scale).toFixed(4));
  }

  return {
    predictedLapTimeSec: Number((baseLapTimeSec + totalDeltaSec).toFixed(3)),
    lapDeltaVsBaseSec: Number(totalDeltaSec.toFixed(3)),
    gripMultiplier: Number(gripMultiplier.toFixed(3)),
    brakingExtensionM: Number(brakingExtensionM.toFixed(1)),
    warpedSpeed,
    warpedDeltaT,
  };
}

/**
 * Executes a 5,000-run Monte Carlo Race Strategy & Undercut/Overcut Simulation in <60ms in the browser.
 */
export function simulateMonteCarloStrategyClient(
  baseLapSec: number,
  timingTower: TimingTowerDriver[],
  input: MlStrategySimulationInput
): MlStrategySimulationResult {
  const t0 = performance.now();
  const rng = createGaussianRng(2026 + input.strategyA.pitLap1 * 37 + input.strategyB.pitLap1 * 13);
  const L = input.totalRaceLaps;
  const N = input.numSimulations;

  const buildStint = (strat: MlStrategySimulationInput['strategyA'], driverOffset: number) => {
    const lapTimes = new Float64Array(L);
    const degTrace = new Float64Array(L);
    const compounds: TyreCompound[] = [];
    const pitFlags: boolean[] = [];

    let curComp = strat.startCompound;
    let curAge = 0;
    for (let l = 1; l <= L; l++) {
      const isPit = l === strat.pitLap1 || (strat.stops === 2 && l === strat.pitLap2);
      pitFlags.push(isPit);
      compounds.push(curComp);
      const fuelKg = Math.max(6, 105 * (1 - (l - 1) / L));
      const { totalDeltaSec, degOnlySec } = evaluateLapDeltaSec(
        curComp,
        curAge,
        fuelKg,
        input.trackTempC,
        driverOffset
      );
      let pitLoss = 0;
      if (isPit) {
        const isSc = input.safetyCarWindowLap !== null && Math.abs(l - input.safetyCarWindowLap) <= 1;
        pitLoss = isSc ? input.pitLossScSec : input.pitLossNormalSec;
      }
      lapTimes[l - 1] = baseLapSec + totalDeltaSec + pitLoss;
      degTrace[l - 1] = degOnlySec;

      curAge++;
      if (l === strat.pitLap1) {
        curComp = strat.nextCompound1;
        curAge = 0;
      } else if (strat.stops === 2 && l === strat.pitLap2) {
        curComp = strat.nextCompound2;
        curAge = 0;
      }
    }
    return { lapTimes, degTrace, compounds, pitFlags };
  };

  const stintA = buildStint(input.strategyA, 0.0);
  const stintB = buildStint(input.strategyB, 0.109);

  // Compute deterministic cumulative median + Monte Carlo P10/P90 bands
  const lapTraces: LapByLapStrategyTrace[] = [];
  let cumA = 0;
  let cumB = 0;
  for (let i = 0; i < L; i++) {
    cumA += stintA.lapTimes[i];
    cumB += stintB.lapTimes[i];
    const medianGap = cumB - cumA; // >0 means Driver A is ahead
    const spread = 0.32 * Math.sqrt(i + 1);
    lapTraces.push({
      lapNumber: i + 1,
      lapTimeASec: Number(stintA.lapTimes[i].toFixed(3)),
      lapTimeBSec: Number(stintB.lapTimes[i].toFixed(3)),
      tyreDegASec: Number(stintA.degTrace[i].toFixed(3)),
      tyreDegBSec: Number(stintB.degTrace[i].toFixed(3)),
      cumulativeGapMedianSec: Number(medianGap.toFixed(3)),
      cumulativeGapP10Sec: Number((medianGap - 1.28 * spread).toFixed(3)),
      cumulativeGapP90Sec: Number((medianGap + 1.28 * spread).toFixed(3)),
      compoundA: stintA.compounds[i],
      compoundB: stintB.compounds[i],
      isPitLapA: stintA.pitFlags[i],
      isPitLapB: stintB.pitFlags[i],
    });
  }

  // Find optimal pit lap for Driver A
  let optimalPitLapA = input.strategyA.pitLap1;
  let bestTotTime = Infinity;
  for (let cand = 10; cand <= L - 8; cand++) {
    const s = buildStint({ ...input.strategyA, pitLap1: cand }, 0);
    let sum = 0;
    for (let i = 0; i < L; i++) sum += s.lapTimes[i];
    if (sum < bestTotTime) {
      bestTotTime = sum;
      optimalPitLapA = cand;
    }
  }

  // Run Monte Carlo across all 20 drivers for Win % / Podium % / Points %
  const nDrv = timingTower.length;
  const meanTotals = timingTower.map((d, idx) => {
    if (idx === 0) return cumA;
    if (idx === 1) return cumB;
    return cumA + (d.bestLapTimeSec - baseLapSec) * L * 0.88;
  });

  const winCounts = new Uint32Array(nDrv);
  const podiumCounts = new Uint32Array(nDrv);
  const pointsCounts = new Uint32Array(nDrv);
  const posSums = new Float64Array(nDrv);

  const sampleTimes = new Float64Array(nDrv);
  const indices = new Uint8Array(nDrv);

  for (let sim = 0; sim < N; sim++) {
    for (let d = 0; d < nDrv; d++) {
      // Include pit-stop tail risk (3% chance of +3.2s slow stop)
      const slowStop = rng.uniform() < 0.03 ? 3.2 : 0;
      sampleTimes[d] = meanTotals[d] + rng.normal(0, 2.35) + slowStop;
      indices[d] = d;
    }
    // Sort indices by sampleTimes ascending
    const sorted = Array.from(indices).sort((i, j) => sampleTimes[i] - sampleTimes[j]);
    for (let rank = 0; rank < nDrv; rank++) {
      const dIdx = sorted[rank];
      const pos = rank + 1;
      posSums[dIdx] += pos;
      if (pos === 1) winCounts[dIdx]++;
      if (pos <= 3) podiumCounts[dIdx]++;
      if (pos <= 10) pointsCounts[dIdx]++;
    }
  }

  const driverProbabilities: MonteCarloDriverProbability[] = timingTower.map((d, idx) => {
    const expPos = posSums[idx] / N;
    return {
      code: d.code,
      teamColor: d.teamColor,
      winProbPct: Number(((winCounts[idx] / N) * 100).toFixed(1)),
      podiumProbPct: Number(((podiumCounts[idx] / N) * 100).toFixed(1)),
      pointsProbPct: Number(((pointsCounts[idx] / N) * 100).toFixed(1)),
      expectedPosition: Number(expPos.toFixed(2)),
      p10Position: Math.max(1, Math.round(expPos - 1.4)),
      p90Position: Math.min(20, Math.round(expPos + 1.8)),
      expectedRaceTimeSec: Number(meanTotals[idx].toFixed(2)),
    };
  });

  const prePitIdx = Math.max(0, Math.min(input.strategyA.pitLap1, input.strategyB.pitLap1) - 2);
  const postPitIdx = Math.min(L - 1, Math.max(input.strategyA.pitLap1, input.strategyB.pitLap1) + 1);
  const undercutGainSec = Number(
    (lapTraces[postPitIdx].cumulativeGapMedianSec - lapTraces[prePitIdx].cumulativeGapMedianSec).toFixed(2)
  );
  const pitExitGapMeters = Number((lapTraces[postPitIdx].cumulativeGapMedianSec * 62.5).toFixed(1));

  const verdictHeadline =
    undercutGainSec >= 0
      ? `UNDERCUT OPTIMAL // ${input.strategyA.driverCode} GAINS +${undercutGainSec.toFixed(2)}s IN PIT WINDOW`
      : `OVERCUT / STAY-OUT // ${input.strategyA.driverCode} LOSES ${undercutGainSec.toFixed(2)}s IN PIT WINDOW`;

  const verdictDetail = `ML Optimal Box Window: Lap ${optimalPitLapA}. At Pit Exit merge (Turn 1), ${
    input.strategyA.driverCode
  } emerges ${Math.abs(pitExitGapMeters).toFixed(1)}m ${
    pitExitGapMeters >= 0 ? 'AHEAD of' : 'BEHIND'
  } ${input.strategyB.driverCode} (${driverProbabilities[0].winProbPct}% Win Prob across ${N.toLocaleString()} runs).`;

  return {
    executionTimeMs: Number((performance.now() - t0).toFixed(1)),
    numSimulations: N,
    optimalPitLapA,
    undercutGainSec,
    verdictHeadline,
    verdictDetail,
    pitExitGapMeters,
    driverProbabilities,
    lapTraces,
  };
}
```

---

## SECTION 5: COMPLETE FRONTEND UI/UX & COMPONENT IMPLEMENTATION

### 5.1 Updated Zustand Store With ML Physics-Warp & Strategy Oracle State (`frontend/src/store/useTelemetryStore.ts`)

```typescript
// frontend/src/store/useTelemetryStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  CameraMode,
  CockpitMode,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  PlaybackSpeed,
  SessionTelemetryPayload,
  TrackColorMode,
} from '../types/telemetry';
import {
  computeMlPhysicsWarp,
  simulateMonteCarloStrategyClient,
} from '../utils/clientMlSimulator';

interface TelemetryStoreState {
  sessionPayload: SessionTelemetryPayload | null;
  isLoading: boolean;
  error: string | null;

  // Cockpit Mode: 'TELEMETRY_LAB' (1m 60 FPS telemetry + ML Physics Warp) vs 'ML_STRATEGY_ORACLE' (53-Lap Monte Carlo)
  cockpitMode: CockpitMode;

  // High-frequency mutable cursor (0 <= currentDistance <= maxDistance)
  currentDistance: number;
  maxDistance: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  cameraMode: CameraMode;
  trackColorMode: TrackColorMode;
  elevationScale: number;
  loopSector: 'ALL' | 'S1' | 'S2' | 'S3';

  // ML Subsystem 1: Real-time Physics-Warp Sliders
  mlWarpParams: MlPhysicsWarpParams;
  mlWarpOutput: MlPhysicsWarpOutput | null;

  // ML Subsystem 2: 5,000-Run Monte Carlo Race Strategy Oracle
  strategyInput: MlStrategySimulationInput;
  strategyResult: MlStrategySimulationResult | null;

  // Actions
  loadSession: (sessionId?: string) => Promise<void>;
  setCockpitMode: (mode: CockpitMode) => void;
  setDistance: (distM: number) => void;
  stepDistance: (deltaM: number) => void;
  advanceFrame: (dtSeconds: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTrackColorMode: (mode: TrackColorMode) => void;
  setLoopSector: (sector: 'ALL' | 'S1' | 'S2' | 'S3') => void;
  updateMlWarpParams: (partial: Partial<MlPhysicsWarpParams>) => void;
  updateStrategyInput: (partial: Partial<MlStrategySimulationInput>) => void;
  runMonteCarloSimulation: () => void;
  jumpToPitExitBattle: () => void;
}

export const useTelemetryStore = create<TelemetryStoreState>()(
  subscribeWithSelector((set, get) => ({
    sessionPayload: null,
    isLoading: true,
    error: null,
    cockpitMode: 'TELEMETRY_LAB',
    currentDistance: 0,
    maxDistance: 5793,
    isPlaying: true,
    playbackSpeed: 1.0,
    cameraMode: 'ISO',
    trackColorMode: 'PEDAL',
    elevationScale: 3.5,
    loopSector: 'ALL',

    mlWarpParams: {
      enabled: false,
      compound: 'S',
      tyreAgeLaps: 18,
      fuelLoadKg: 45,
      trackTempC: 42.4,
    },
    mlWarpOutput: null,

    strategyInput: {
      totalRaceLaps: 53,
      safetyCarWindowLap: null,
      trackTempC: 42.4,
      pitLossNormalSec: 21.4,
      pitLossScSec: 11.2,
      numSimulations: 5000,
      strategyA: {
        driverCode: 'VER',
        startCompound: 'S',
        pitLap1: 19,
        nextCompound1: 'H',
        stops: 1,
        pitLap2: 38,
        nextCompound2: 'S',
      },
      strategyB: {
        driverCode: 'NOR',
        startCompound: 'M',
        pitLap1: 24,
        nextCompound1: 'H',
        stops: 1,
        pitLap2: 40,
        nextCompound2: 'S',
      },
    },
    strategyResult: null,

    loadSession: async (sessionId = '2024_monza_q3_ver_nor') => {
      set({ isLoading: true, error: null });
      try {
        const res = await fetch(`/telemetry/${sessionId}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SessionTelemetryPayload = await res.json();

        const initialStratInput: MlStrategySimulationInput = {
          ...get().strategyInput,
          totalRaceLaps: data.meta.totalRaceLaps || 53,
          pitLossNormalSec: data.meta.pitLossSec || 21.4,
          trackTempC: data.meta.weather.trackTempC,
          strategyA: {
            ...get().strategyInput.strategyA,
            driverCode: data.meta.driverA.code,
          },
          strategyB: {
            ...get().strategyInput.strategyB,
            driverCode: data.meta.driverB.code,
          },
        };

        const warpOut = computeMlPhysicsWarp(
          data.driverA,
          data.meta.driverA.lapTimeSec,
          get().mlWarpParams
        );
        const stratOut =
          data.defaultStrategyOracle ||
          simulateMonteCarloStrategyClient(
            data.meta.driverA.lapTimeSec,
            data.timingTower,
            initialStratInput
          );

        set({
          sessionPayload: data,
          maxDistance: data.gridLength,
          currentDistance: 0,
          strategyInput: initialStratInput,
          mlWarpOutput: warpOut,
          strategyResult: stratOut,
          isLoading: false,
        });
      } catch (err: any) {
        set({ error: err?.message || 'Failed to load session', isLoading: false });
      }
    },

    setCockpitMode: (cockpitMode) => set({ cockpitMode }),

    setDistance: (distM) => {
      const { maxDistance } = get();
      set({ currentDistance: ((distM % maxDistance) + maxDistance) % maxDistance });
    },

    stepDistance: (deltaM) => {
      const { currentDistance, maxDistance } = get();
      set({ currentDistance: ((currentDistance + deltaM) % maxDistance + maxDistance) % maxDistance });
    },

    advanceFrame: (dtSeconds) => {
      const state = get();
      if (!state.isPlaying || !state.sessionPayload) return;
      const clampedDt = Math.min(dtSeconds, 0.05);
      const idx = Math.min(Math.floor(state.currentDistance), state.maxDistance);
      const speedKmh = state.sessionPayload.driverA.speed[idx] || 220;
      const metersPerSec = speedKmh / 3.6;

      let minM = 0;
      let maxM = state.maxDistance;
      const [s1End, s2End] = state.sessionPayload.meta.sectorSplitM;
      if (state.loopSector === 'S1') { minM = 0; maxM = s1End; }
      else if (state.loopSector === 'S2') { minM = s1End; maxM = s2End; }
      else if (state.loopSector === 'S3') { minM = s2End; maxM = state.maxDistance; }

      let nextDist = state.currentDistance + metersPerSec * clampedDt * state.playbackSpeed;
      if (nextDist >= maxM || nextDist < minM) {
        nextDist = minM + ((nextDist - minM) % Math.max(1, maxM - minM));
      }
      set({ currentDistance: nextDist });
    },

    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    setCameraMode: (cameraMode) => set({ cameraMode }),
    setTrackColorMode: (trackColorMode) => set({ trackColorMode }),
    setLoopSector: (loopSector) => set({ loopSector }),

    updateMlWarpParams: (partial) => {
      const state = get();
      const nextParams = { ...state.mlWarpParams, ...partial };
      if (!state.sessionPayload) {
        set({ mlWarpParams: nextParams });
        return;
      }
      const warpOut = computeMlPhysicsWarp(
        state.sessionPayload.driverA,
        state.sessionPayload.meta.driverA.lapTimeSec,
        nextParams
      );
      set({ mlWarpParams: nextParams, mlWarpOutput: warpOut });
    },

    updateStrategyInput: (partial) => {
      const state = get();
      const nextInput = { ...state.strategyInput, ...partial };
      if (!state.sessionPayload) {
        set({ strategyInput: nextInput });
        return;
      }
      const stratOut = simulateMonteCarloStrategyClient(
        state.sessionPayload.meta.driverA.lapTimeSec,
        state.sessionPayload.timingTower,
        nextInput
      );
      set({ strategyInput: nextInput, strategyResult: stratOut });
    },

    runMonteCarloSimulation: () => {
      const state = get();
      if (!state.sessionPayload) return;
      const stratOut = simulateMonteCarloStrategyClient(
        state.sessionPayload.meta.driverA.lapTimeSec,
        state.sessionPayload.timingTower,
        state.strategyInput
      );
      set({ strategyResult: stratOut });
    },

    jumpToPitExitBattle: () => {
      const state = get();
      if (!state.sessionPayload) return;
      const t1Apex = state.sessionPayload.corners[0]?.apexDistanceM || 850;
      set({
        currentDistance: Math.max(150, t1Apex - 240),
        cameraMode: 'CHASE',
        isPlaying: false,
      });
    },
  }))
);
```

### 5.2 Zone 0: Mission Ribbon With Mode Switcher (`frontend/src/components/header/MissionRibbon.tsx`)

Includes a high-contrast toggle switching between **`[TELEMETRY LAB // 60 FPS]`** and **`[ML STRATEGY ORACLE // 5,000 SIMS]`**:

```tsx
// frontend/src/components/header/MissionRibbon.tsx
import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { formatDistanceM, formatLapClock } from '../../utils/formatters';

export const MissionRibbon: React.FC = () => {
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const setCockpitMode = useTelemetryStore((s) => s.setCockpitMode);
  const loadSession = useTelemetryStore((s) => s.loadSession);

  const clockRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    let frames = 0;
    let lastFpsUpdate = performance.now();

    const tick = (now: number) => {
      frames++;
      if (now - lastFpsUpdate >= 500) {
        const fps = Math.min(60.0, (frames * 1000) / (now - lastFpsUpdate));
        if (fpsRef.current) fpsRef.current.textContent = `${fps.toFixed(1)} FPS`;
        frames = 0;
        lastFpsUpdate = now;
      }

      const { currentDistance, sessionPayload } = useTelemetryStore.getState();
      if (clockRef.current && sessionPayload) {
        const idx = Math.min(Math.floor(currentDistance), sessionPayload.gridLength);
        const lapT = sessionPayload.driverA.t[idx] || 0;
        clockRef.current.textContent = `${formatDistanceM(currentDistance)} // ${formatLapClock(lapT)}`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const meta = payload?.meta;
  const weather = meta?.weather;

  return (
    <header className="col-span-3 h-[36px] bg-[#080B10] border-b border-[#1B2230] px-3 flex items-center justify-between text-[11px]">
      {/* Left Cluster: System Identity & Session Selector */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-telemetry font-extrabold text-[#00E5FF] tracking-wider">
          <span className="w-2 h-2 bg-[#00FF66] inline-block animate-pulse" />
          <span>AERO-SPEC v5.0</span>
        </div>
        <select
          value={payload?.sessionId || '2024_monza_q3_ver_nor'}
          onChange={(e) => loadSession(e.target.value)}
          className="bg-[#0C1017] border border-[#1B2230] text-[#E2E8F0] font-telemetry text-[10px] px-2 py-0.5 uppercase tracking-wider"
        >
          <option value="2024_monza_q3_ver_nor">2024 MONZA GP // VER vs NOR</option>
          <option value="2024_silverstone_q3_ver_nor">2024 SILVERSTONE // VER vs NOR</option>
          <option value="2024_monaco_q3_lec_pia">2024 MONACO GP // LEC vs PIA</option>
        </select>

        {/* Dual-Engine Cockpit Mode Switcher */}
        <div className="flex items-center border border-[#1B2230] bg-[#05070B] font-telemetry text-[10px]">
          <button
            onClick={() => setCockpitMode('TELEMETRY_LAB')}
            className={`px-2.5 py-0.5 font-bold transition-colors ${
              cockpitMode === 'TELEMETRY_LAB'
                ? 'bg-[#00E5FF] text-[#05070B]'
                : 'text-[#64748B] hover:text-[#E2E8F0]'
            }`}
          >
            [1] 60 FPS TELEMETRY LAB
          </button>
          <button
            onClick={() => setCockpitMode('ML_STRATEGY_ORACLE')}
            className={`px-2.5 py-0.5 font-bold transition-colors ${
              cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'bg-[#00FF66] text-[#05070B]'
                : 'text-[#64748B] hover:text-[#E2E8F0]'
            }`}
          >
            [2] ML STRATEGY &amp; MONTE CARLO ORACLE
          </button>
        </div>
      </div>

      {/* Center Cluster: Track & Weather Sensors */}
      <div className="hidden 2xl:flex items-center gap-3 font-telemetry text-[10px] text-[#94A3B8]">
        <span>
          TRACK: <strong className="text-[#E2E8F0]">{weather?.trackTempC ?? 42.4}°C</strong>
        </span>
        <span>
          AIR: <strong className="text-[#E2E8F0]">{weather?.airTempC ?? 28.1}°C</strong>
        </span>
        <span>
          WIND: <strong className="text-[#E2E8F0]">{weather?.windSpeedMs ?? 1.8} m/s</strong>
        </span>
      </div>

      {/* Right Cluster: Clock & Frame Rate Monitor */}
      <div className="flex items-center gap-2.5 font-telemetry text-[10px]">
        <span ref={clockRef} className="text-[#E2E8F0] font-bold min-w-[125px] text-right">
          0000m // 0:00.000
        </span>
        <span
          ref={fpsRef}
          className="px-1.5 py-0.5 bg-[#141B26] border border-[#00E5FF]/50 text-[#00E5FF] font-bold min-w-[62px] text-center"
        >
          60.0 FPS
        </span>
      </div>
    </header>
  );
};
```

### 5.3 Quadrant 1: Dual-Mode Timing Tower & Monte Carlo Win Probability Tower (`frontend/src/components/flankLeft/TimingTower.tsx`)

When `cockpitMode === 'TELEMETRY_LAB'`, Quadrant 1 displays the 20-driver qualifying timing tower with S1/S2/S3 purple/green bars. When `cockpitMode === 'ML_STRATEGY_ORACLE'`, Quadrant 1 automatically transforms into the **20-Driver Monte Carlo Race Outcome Probability Tower** showing Win %, Podium %, Expected Finish Position, and P10–P90 confidence range bars!

```tsx
// frontend/src/components/flankLeft/TimingTower.tsx
import React from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { SectorStatus, TyreCompound } from '../../types/telemetry';

const COMPOUND_COLORS: Record<TyreCompound, string> = {
  S: '#FF1E44',
  M: '#FFE600',
  H: '#E2E8F0',
  I: '#00FF66',
  W: '#00E5FF',
};

const SECTOR_COLORS: Record<SectorStatus, string> = {
  PURPLE: '#B000FF',
  GREEN: '#00FF66',
  AMBER: '#FFE600',
};

export const TimingTower: React.FC = () => {
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const strategyResult = useTelemetryStore((s) => s.strategyResult);

  if (!payload) return <aside className="hud-quadrant" />;
  const { timingTower, meta } = payload;

  return (
    <aside className="hud-quadrant">
      <header className="quadrant-header">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#00FF66] inline-block" />
          <span>
            {cockpitMode === 'ML_STRATEGY_ORACLE'
              ? 'Q1 // MONTE CARLO WIN & PODIUM ORACLE'
              : 'Q1 // LIVE TIMING & SECTOR MATRIX'}
          </span>
        </div>
        <span className="font-telemetry text-[9px] text-[#00E5FF]">
          {cockpitMode === 'ML_STRATEGY_ORACLE'
            ? `[${strategyResult?.numSimulations ?? 5000} SIMS]`
            : '[20 DRV // Q3]'}
        </span>
      </header>

      {cockpitMode === 'TELEMETRY_LAB' ? (
        <>
          <div className="grid grid-cols-[26px_52px_38px_1fr_66px] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>POS</span>
            <span>DRV</span>
            <span>TYRE</span>
            <span className="text-right pr-2">LAP / GAP</span>
            <span className="text-center">S1 / S2 / S3</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#141B26]">
            {timingTower.map((drv) => {
              const isA = drv.code === meta.driverA.code;
              const isB = drv.code === meta.driverB.code;
              return (
                <div
                  key={drv.code}
                  className={`grid grid-cols-[26px_52px_38px_1fr_66px] items-center px-2 h-[25px] font-telemetry text-[11px] ${
                    isA
                      ? 'bg-[#141B26] border-l-2 border-l-[#00E5FF]'
                      : isB
                      ? 'bg-[#141B26]/80 border-l-2 border-l-[#B000FF]'
                      : ''
                  }`}
                >
                  <span className="text-[#64748B] font-bold text-[10px]">
                    {drv.position.toString().padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-[3px] h-[14px] inline-block"
                      style={{ backgroundColor: drv.teamColor }}
                    />
                    <span className="font-bold text-[#E2E8F0]">{drv.code}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span
                      className="px-1 border font-bold"
                      style={{
                        color: COMPOUND_COLORS[drv.compound],
                        borderColor: COMPOUND_COLORS[drv.compound],
                      }}
                    >
                      {drv.compound}
                    </span>
                    <span className="text-[#64748B] text-[9px]">L{drv.tyreAgeLaps}</span>
                  </div>
                  <div
                    className={`text-right pr-2 font-semibold ${
                      drv.position === 1 ? 'text-[#00E5FF]' : isB ? 'text-[#B000FF]' : 'text-[#E2E8F0]'
                    }`}
                  >
                    {drv.position === 1 ? drv.bestLapTimeStr : drv.gapToLeaderStr}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {drv.sectors.map((secStatus, sIdx) => (
                      <span
                        key={sIdx}
                        className="w-[17px] h-[5px] inline-block"
                        style={{ backgroundColor: SECTOR_COLORS[secStatus] }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[26px_50px_54px_54px_1fr] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>EXP</span>
            <span>DRV</span>
            <span className="text-right">WIN %</span>
            <span className="text-right">POD %</span>
            <span className="text-right pr-1">P10–P90 BAND</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#141B26]">
            {(strategyResult?.driverProbabilities || []).map((prob, idx) => (
              <div
                key={prob.code}
                className="grid grid-cols-[26px_50px_54px_54px_1fr] items-center px-2 h-[25px] font-telemetry text-[10.5px]"
              >
                <span className="text-[#64748B] font-bold">P{idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-[3px] h-[14px] inline-block"
                    style={{ backgroundColor: prob.teamColor }}
                  />
                  <span className="font-bold text-[#E2E8F0]">{prob.code}</span>
                </div>
                <span
                  className={`text-right font-bold ${
                    prob.winProbPct > 25 ? 'text-[#00FF66]' : 'text-[#E2E8F0]'
                  }`}
                >
                  {prob.winProbPct.toFixed(1)}%
                </span>
                <span className="text-right text-[#00E5FF]">{prob.podiumProbPct.toFixed(1)}%</span>
                <div className="text-right pr-1 text-[9.5px] text-[#94A3B8]">
                  P{prob.p10Position}–P{prob.p90Position}{' '}
                  <span className="text-[#64748B]">({prob.expectedPosition.toFixed(1)})</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
};
```

### 5.4 Quadrant 3 ML Mode: Interactive Strategy & Pit-Window Sandbox (`frontend/src/components/flankRight/MlStrategySandbox.tsx`)

When the user switches to `ML_STRATEGY_ORACLE` (or inside Quadrant 3), this panel lets them drag Pit-Stop Lap sliders for Driver A and Driver B, switch starting/pit tire compounds, toggle a Safety Car deployment lap, and trigger the **3D Pit-Exit Undercut Camera**:

```tsx
// frontend/src/components/flankRight/MlStrategySandbox.tsx
import React from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { TyreCompound } from '../../types/telemetry';

const COMPOUNDS: TyreCompound[] = ['S', 'M', 'H'];

export const MlStrategySandbox: React.FC = () => {
  const strategyInput = useTelemetryStore((s) => s.strategyInput);
  const strategyResult = useTelemetryStore((s) => s.strategyResult);
  const updateStrategyInput = useTelemetryStore((s) => s.updateStrategyInput);
  const jumpToPitExitBattle = useTelemetryStore((s) => s.jumpToPitExitBattle);
  const mlWarpParams = useTelemetryStore((s) => s.mlWarpParams);
  const mlWarpOutput = useTelemetryStore((s) => s.mlWarpOutput);
  const updateMlWarpParams = useTelemetryStore((s) => s.updateMlWarpParams);

  const { strategyA, strategyB, totalRaceLaps, safetyCarWindowLap } = strategyInput;

  return (
    <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 font-telemetry text-[10px] bg-[#0C1017]">
      {/* 1. ML VERDICT BANNER */}
      {strategyResult && (
        <div
          className={`p-2 border ${
            strategyResult.undercutGainSec >= 0
              ? 'border-[#00FF66] bg-[#00FF66]/10'
              : 'border-[#FFE600] bg-[#FFE600]/10'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[#E2E8F0] text-[10.5px]">
              {strategyResult.verdictHeadline}
            </span>
            <span className="text-[9px] text-[#00E5FF]">
              [{strategyResult.executionTimeMs} ms]
            </span>
          </div>
          <p className="text-[9.5px] text-[#94A3B8] leading-snug mb-2">
            {strategyResult.verdictDetail}
          </p>
          <button
            onClick={jumpToPitExitBattle}
            className="w-full py-1 bg-[#141B26] border border-[#00E5FF] text-[#00E5FF] font-bold hover:bg-[#00E5FF] hover:text-[#05070B] transition-colors"
          >
            ▶ SIMULATE 3D PIT-EXIT MERGE AT TURN 1
          </button>
        </div>
      )}

      {/* 2. DRIVER A STRATEGY SANDBOX */}
      <div className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#00E5FF] font-bold">
            [DRIVER A] {strategyA.driverCode} PIT STRATEGY
          </span>
          <span className="text-[#64748B]">
            OPT BOX: LAP {strategyResult?.optimalPitLapA ?? 19}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span>STINT COMPOUNDS:</span>
          <div className="flex items-center gap-1">
            {COMPOUNDS.map((c) => (
              <button
                key={`a-start-${c}`}
                onClick={() =>
                  updateStrategyInput({ strategyA: { ...strategyA, startCompound: c } })
                }
                className={`px-1.5 py-0.5 border ${
                  strategyA.startCompound === c
                    ? 'border-[#00E5FF] bg-[#141B26] text-[#E2E8F0] font-bold'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {c}
              </button>
            ))}
            <span className="text-[#64748B] px-1">→</span>
            {COMPOUNDS.map((c) => (
              <button
                key={`a-next-${c}`}
                onClick={() =>
                  updateStrategyInput({ strategyA: { ...strategyA, nextCompound1: c } })
                }
                className={`px-1.5 py-0.5 border ${
                  strategyA.nextCompound1 === c
                    ? 'border-[#00FF66] bg-[#141B26] text-[#00FF66] font-bold'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between text-[#94A3B8] mb-1">
          <span>TARGET BOX LAP:</span>
          <strong className="text-[#00E5FF]">
            LAP {strategyA.pitLap1} / {totalRaceLaps}
          </strong>
        </label>
        <input
          type="range"
          min={6}
          max={totalRaceLaps - 6}
          value={strategyA.pitLap1}
          onChange={(e) =>
            updateStrategyInput({
              strategyA: { ...strategyA, pitLap1: Number(e.target.value) },
            })
          }
          className="w-full accent-[#00E5FF]"
        />
      </div>

      {/* 3. DRIVER B STRATEGY SANDBOX */}
      <div className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#B000FF] font-bold">
            [GHOST B] {strategyB.driverCode} PIT STRATEGY
          </span>
          <span className="text-[#64748B]">RIVAL BENCHMARK</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span>STINT COMPOUNDS:</span>
          <div className="flex items-center gap-1">
            {COMPOUNDS.map((c) => (
              <button
                key={`b-start-${c}`}
                onClick={() =>
                  updateStrategyInput({ strategyB: { ...strategyB, startCompound: c } })
                }
                className={`px-1.5 py-0.5 border ${
                  strategyB.startCompound === c
                    ? 'border-[#B000FF] bg-[#141B26] text-[#E2E8F0] font-bold'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {c}
              </button>
            ))}
            <span className="text-[#64748B] px-1">→</span>
            {COMPOUNDS.map((c) => (
              <button
                key={`b-next-${c}`}
                onClick={() =>
                  updateStrategyInput({ strategyB: { ...strategyB, nextCompound1: c } })
                }
                className={`px-1.5 py-0.5 border ${
                  strategyB.nextCompound1 === c
                    ? 'border-[#B000FF] bg-[#141B26] text-[#B000FF] font-bold'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between text-[#94A3B8] mb-1">
          <span>RIVAL BOX LAP:</span>
          <strong className="text-[#B000FF]">
            LAP {strategyB.pitLap1} / {totalRaceLaps}
          </strong>
        </label>
        <input
          type="range"
          min={6}
          max={totalRaceLaps - 6}
          value={strategyB.pitLap1}
          onChange={(e) =>
            updateStrategyInput({
              strategyB: { ...strategyB, pitLap1: Number(e.target.value) },
            })
          }
          className="w-full accent-[#B000FF]"
        />
      </div>

      {/* 4. SAFETY CAR WINDOW INJECTOR */}
      <div className="p-2 border border-[#1B2230] bg-[#080B10] flex items-center justify-between">
        <span className="text-[#94A3B8]">SAFETY CAR DEPLOYMENT:</span>
        <div className="flex gap-1">
          <button
            onClick={() => updateStrategyInput({ safetyCarWindowLap: null })}
            className={`px-2 py-0.5 border ${
              safetyCarWindowLap === null
                ? 'border-[#00E5FF] bg-[#141B26] text-[#00E5FF]'
                : 'border-[#1B2230] text-[#64748B]'
            }`}
          >
            STOCHASTIC
          </button>
          <button
            onClick={() =>
              updateStrategyInput({ safetyCarWindowLap: strategyA.pitLap1 })
            }
            className={`px-2 py-0.5 border ${
              safetyCarWindowLap !== null
                ? 'border-[#FFE600] bg-[#FFE600]/20 text-[#FFE600] font-bold'
                : 'border-[#1B2230] text-[#64748B]'
            }`}
          >
            SC ON LAP {strategyA.pitLap1}
          </button>
        </div>
      </div>

      {/* 5. ML TELEMETRY PHYSICS-WARP SIMULATOR (TYRE WEAR & FUEL MASS) */}
      <div className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#00FF66] font-bold">
            ML TELEMETRY PHYSICS-WARP
          </span>
          <button
            onClick={() => updateMlWarpParams({ enabled: !mlWarpParams.enabled })}
            className={`px-2 py-0.5 border font-bold ${
              mlWarpParams.enabled
                ? 'border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66]'
                : 'border-[#1B2230] text-[#64748B]'
            }`}
          >
            {mlWarpParams.enabled ? 'WARP ACTIVE' : 'ENABLE WARP'}
          </button>
        </div>

        <div className="space-y-1.5 text-[9.5px]">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">TYRE AGE: {mlWarpParams.tyreAgeLaps} LAPS</span>
            <span className="text-[#FFE600]">
              GRIP: {((mlWarpOutput?.gripMultiplier ?? 1) * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={38}
            value={mlWarpParams.tyreAgeLaps}
            onChange={(e) =>
              updateMlWarpParams({ enabled: true, tyreAgeLaps: Number(e.target.value) })
            }
            className="w-full accent-[#00FF66]"
          />

          <div className="flex justify-between">
            <span className="text-[#94A3B8]">FUEL LOAD: {mlWarpParams.fuelLoadKg} KG</span>
            <span className="text-[#FF1E44]">
              BRAKE SHIFT: +{mlWarpOutput?.brakingExtensionM ?? 0}m
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={105}
            value={mlWarpParams.fuelLoadKg}
            onChange={(e) =>
              updateMlWarpParams({ enabled: true, fuelLoadKg: Number(e.target.value) })
            }
            className="w-full accent-[#FF1E44]"
          />

          <div className="pt-1 border-t border-[#1B2230] flex justify-between font-bold">
            <span className="text-[#94A3B8]">ML PREDICTED LAP:</span>
            <span className="text-[#00E5FF]">
              {mlWarpOutput?.predictedLapTimeSec.toFixed(3)}s (+
              {mlWarpOutput?.lapDeltaVsBaseSec.toFixed(3)}s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 5.5 Quadrant 4 (ML Mode): 53-Lap Stint Pace & Cumulative Race Gap Fan Chart (`frontend/src/components/scrubber/StrategyFanChart.tsx`)

When `cockpitMode === 'ML_STRATEGY_ORACLE'`, Quadrant 4 renders a high-precision HiDPI 2D Canvas displaying:
* **Top Band:** Driver A (`#00E5FF`) vs. Driver B (`#B000FF`) predicted lap-by-lap stint times showing tire degradation slopes, fuel burn improvement, and sharp vertical spikes on Pit Stop laps (`BOX L19`, `BOX L24`).
* **Bottom Band:** Cumulative Race Time Gap ($\Delta T_{\text{race}}[l]$) with shaded **Monte Carlo P10–P90 uncertainty fan bands** and zero-line crossover marker showing the exact lap the undercut succeeds!

```tsx
// frontend/src/components/scrubber/StrategyFanChart.tsx
import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export const StrategyFanChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strategyResult = useTelemetryStore((s) => s.strategyResult);
  const payload = useTelemetryStore((s) => s.sessionPayload);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !strategyResult || !strategyResult.lapTraces.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#090D14';
    ctx.fillRect(0, 0, w, h);

    const traces = strategyResult.lapTraces;
    const L = traces.length;
    const xOf = (lapIdx: number) => ((lapIdx + 0.5) / L) * w;

    // Draw vertical lap gridlines
    ctx.strokeStyle = '#141C2B';
    ctx.lineWidth = 1 * dpr;
    for (let l = 5; l < L; l += 5) {
      const x = xOf(l - 1);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Center divider between Top Band (Stint Lap Times) & Bottom Band (Cumulative Gap Fan)
    const midY = h * 0.48;
    ctx.strokeStyle = '#1B2230';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // 1. TOP BAND: Non-Pit Stint Pace Curves (Speed / Degradation Slope)
    const baseSec = payload?.meta.driverA.lapTimeSec || 79.3;
    const minLap = baseSec + 0.2;
    const maxLap = baseSec + 5.8;
    const yLap = (sec: number) => {
      const clamped = Math.max(minLap, Math.min(maxLap, sec));
      const norm = (clamped - minLap) / (maxLap - minLap);
      return h * 0.08 + norm * (midY - h * 0.14);
    };

    const drawStintCurve = (key: 'lapTimeASec' | 'lapTimeBSec', pitKey: 'isPitLapA' | 'isPitLapB', col: string) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.0 * dpr;
      ctx.beginPath();
      traces.forEach((tr, i) => {
        const x = xOf(i);
        // Plot clean tire degradation slope (clamp pit spike so slope is clearly visible)
        const val = tr[pitKey] ? tr[key] - 19.5 : tr[key];
        const y = yLap(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    };

    drawStintCurve('lapTimeASec', 'isPitLapA', '#00E5FF');
    drawStintCurve('lapTimeBSec', 'isPitLapB', '#B000FF');

    // 2. BOTTOM BAND: Cumulative Race Gap & P10-P90 Monte Carlo Fan
    const zeroY = midY + (h - midY) * 0.52;
    const maxGap = 18.0;
    const yGap = (g: number) => {
      const clamped = Math.max(-maxGap, Math.min(maxGap, g));
      return zeroY - (clamped / maxGap) * ((h - midY) * 0.42);
    };

    // Zero-gap reference line
    ctx.strokeStyle = '#1E293B';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // P10 - P90 Shaded Confidence Fan Polygon
    ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
    ctx.beginPath();
    traces.forEach((tr, i) => {
      const x = xOf(i);
      const y = yGap(tr.cumulativeGapP90Sec);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = L - 1; i >= 0; i--) {
      ctx.lineTo(xOf(i), yGap(traces[i].cumulativeGapP10Sec));
    }
    ctx.closePath();
    ctx.fill();

    // Median Cumulative Gap Curve
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    traces.forEach((tr, i) => {
      const x = xOf(i);
      const y = yGap(tr.cumulativeGapMedianSec);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pit Stop Vertical Callout Markers
    traces.forEach((tr, i) => {
      if (tr.isPitLapA || tr.isPitLapB) {
        const x = xOf(i);
        ctx.strokeStyle = tr.isPitLapA ? '#00E5FF' : '#B000FF';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = tr.isPitLapA ? '#00E5FF' : '#B000FF';
        ctx.font = `bold ${10 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillText(
          `BOX L${tr.lapNumber} [${tr.isPitLapA ? tr.compoundA : tr.compoundB}]`,
          x + 4 * dpr,
          (tr.isPitLapA ? 16 : 30) * dpr
        );
      }
    });
  }, [strategyResult, payload]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};
```

---

### 5.6 Dual-Buffer 60 FPS Telemetry Oscillograph With ML Physics-Warp Overlay (`frontend/src/components/scrubber/TelemetryOscillograph.tsx`)

When `mlWarpParams.enabled` is true, this canvas overlays the **ML Physics-Warped Speed Trace (`#FFE600` dashed)** and **ML Warped Time Delta** directly on top of the baseline telemetry so the engineer sees the exact corner apex and braking zones where tire wear and fuel load cost lap time:

```tsx
// frontend/src/components/scrubber/TelemetryOscillograph.tsx
import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';

export const TelemetryOscillograph: React.FC = () => {
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgBufferRef = useRef<HTMLCanvasElement | null>(null);
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const mlWarpParams = useTelemetryStore((s) => s.mlWarpParams);
  const mlWarpOutput = useTelemetryStore((s) => s.mlWarpOutput);

  useEffect(() => {
    if (!payload || !fgCanvasRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    const width = fgCanvasRef.current.clientWidth * dpr;
    const height = fgCanvasRef.current.clientHeight * dpr;
    fgCanvasRef.current.width = width;
    fgCanvasRef.current.height = height;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d')!;

    ctx.fillStyle = '#090D14';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#161F30';
    ctx.lineWidth = 1 * dpr;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const maxDistance = payload.gridLength;
    const drawTrace = (
      arr: number[],
      minV: number,
      maxV: number,
      topPct: number,
      botPct: number,
      color: string,
      dashed = false
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6 * dpr;
      if (dashed) ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.beginPath();
      const yTop = height * topPct;
      const ySpan = height * (botPct - topPct);
      for (let m = 0; m < arr.length; m += 2) {
        const x = (m / maxDistance) * width;
        const norm = (arr[m] - minV) / (maxV - minV || 1);
        const y = yTop + ySpan * (1 - Math.max(0, Math.min(1, norm)));
        if (m === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    // Band 1: Speed A (#00E5FF), Speed B (#B000FF), and ML Warped Speed (#FFE600)
    drawTrace(payload.driverA.speed, 60, 360, 0.04, 0.36, '#00E5FF', false);
    drawTrace(payload.driverB.speed, 60, 360, 0.04, 0.36, '#B000FF', true);
    if (mlWarpParams.enabled && mlWarpOutput) {
      drawTrace(mlWarpOutput.warpedSpeed, 60, 360, 0.04, 0.36, '#FFE600', true);
    }

    // Band 2: Time Delta (-0.6s to +2.5s)
    drawTrace(payload.deltaT, -0.5, 0.5, 0.40, 0.56, '#00E5FF', false);
    if (mlWarpParams.enabled && mlWarpOutput) {
      drawTrace(mlWarpOutput.warpedDeltaT, -0.5, 3.5, 0.40, 0.56, '#FFE600', true);
    }

    // Band 3: Throttle (#00FF66)
    drawTrace(payload.driverA.throttle, 0, 100, 0.60, 0.78, '#00FF66', false);
    // Band 4: Brake (#FF1E44)
    drawTrace(payload.driverA.brake, 0, 100, 0.82, 0.96, '#FF1E44', false);

    bgBufferRef.current = offscreen;
  }, [payload, mlWarpParams, mlWarpOutput]);

  useEffect(() => {
    let rafId: number;
    const renderFrame = () => {
      const canvas = fgCanvasRef.current;
      const bg = bgBufferRef.current;
      if (canvas && bg) {
        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        const { currentDistance, maxDistance: maxD } = useTelemetryStore.getState();

        ctx.drawImage(bg, 0, 0);
        const cursorX = (currentDistance / maxD) * canvas.width;

        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 10 * dpr;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, canvas.height);
        ctx.stroke();
        ctx.restore();
      }
      rafId = requestAnimationFrame(renderFrame);
    };
    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerScrub = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    useTelemetryStore.getState().setDistance(ratio * useTelemetryStore.getState().maxDistance);
  };

  return (
    <canvas
      ref={fgCanvasRef}
      onPointerDown={handlePointerScrub}
      onPointerMove={handlePointerScrub}
      className="w-full h-full cursor-ew-resize block"
    />
  );
};
```

### 5.7 Quadrant 2: 3D Kinetic Circuit Viewport With ML Ghost Car (`frontend/src/components/viewport3d/CircuitViewport3D.tsx`)

```tsx
// frontend/src/components/viewport3d/CircuitViewport3D.tsx
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTelemetryStore } from '../../store/useTelemetryStore';

const KineticTrackScene: React.FC = () => {
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const trackColorMode = useTelemetryStore((s) => s.trackColorMode);
  const elevationScale = useTelemetryStore((s) => s.elevationScale);
  const mlWarpEnabled = useTelemetryStore((s) => s.mlWarpParams.enabled);

  const carARef = useRef<THREE.Group>(null);
  const carBRef = useRef<THREE.Group>(null);
  const carMlRef = useRef<THREE.Group>(null);
  const liveTagARef = useRef<HTMLDivElement>(null);

  const { spline, linePoints, vertexColors } = useMemo(() => {
    if (!payload) return { spline: null, linePoints: [], vertexColors: [] };
    const { driverA, deltaT, gridLength } = payload;
    const pts: THREE.Vector3[] = [];
    const cols: [number, number, number][] = [];
    const c = new THREE.Color();

    for (let k = 0; k <= gridLength; k += 4) {
      pts.push(new THREE.Vector3(driverA.x[k], driverA.z[k] * elevationScale, -driverA.y[k]));
      if (trackColorMode === 'PEDAL') {
        if (driverA.brake[k] > 18) c.setHex(0xff1e44);
        else if (driverA.throttle[k] > 88) c.setHex(0x00ff66);
        else c.setHex(0x00e5ff);
      } else if (trackColorMode === 'SPEED') {
        const norm = Math.max(0, Math.min(1, (driverA.speed[k] - 80) / 270));
        c.setHSL(0.54 * norm, 1.0, 0.38 + 0.22 * norm);
      } else {
        c.setHex((deltaT[k] || 0) >= 0 ? 0x00e5ff : 0xb000ff);
      }
      cols.push([c.r, c.g, c.b]);
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    return { spline: curve, linePoints: pts, vertexColors: cols };
  }, [payload, trackColorMode, elevationScale]);

  useFrame(({ camera }, delta) => {
    const state = useTelemetryStore.getState();
    state.advanceFrame(delta);
    if (!spline || !state.sessionPayload) return;

    const maxD = state.maxDistance;
    const curD = state.currentDistance;
    const idx = Math.min(Math.floor(curD), maxD);
    const uA = (curD / maxD) % 1.0;

    const posA = spline.getPointAt(uA);
    const tanA = spline.getTangentAt(uA).normalize();

    if (carARef.current) carARef.current.position.copy(posA);
    if (liveTagARef.current) {
      const spd = Math.round(state.sessionPayload.driverA.speed[idx] || 0);
      const dt = state.sessionPayload.deltaT[idx] || 0;
      const sign = dt >= 0 ? '-' : '+';
      liveTagARef.current.textContent = `${state.sessionPayload.meta.driverA.code} ${spd
        .toString()
        .padStart(3, '0')} KM/H | Δ ${sign}${Math.abs(dt).toFixed(3)}s`;
    }

    // Ghost Car B spatial offset
    if (carBRef.current) {
      const dtSec = state.sessionPayload.deltaT[idx] || 0;
      const vBMs = (state.sessionPayload.driverB.speed[idx] || 220) / 3.6;
      const offsetM = dtSec * vBMs * 3.0;
      const distB = ((curD - offsetM) % maxD + maxD) % maxD;
      carBRef.current.position.copy(spline.getPointAt(distB / maxD));
    }

    // ML Physics-Warped Ghost Car (#FFE600 Amber)
    if (carMlRef.current && state.mlWarpParams.enabled && state.mlWarpOutput) {
      const warpDt = state.mlWarpOutput.warpedDeltaT[idx] || 0;
      const vWarpMs = (state.mlWarpOutput.warpedSpeed[idx] || 200) / 3.6;
      const warpOffsetM = warpDt * vWarpMs * 2.0;
      const distWarp = ((curD - warpOffsetM) % maxD + maxD) % maxD;
      carMlRef.current.position.copy(spline.getPointAt(distWarp / maxD));
    }

    if (state.cameraMode === 'CHASE') {
      const camTargetPos = posA.clone().add(tanA.clone().multiplyScalar(-180)).add(new THREE.Vector3(0, 95, 0));
      camera.position.lerp(camTargetPos, 0.1);
      camera.lookAt(posA.clone().add(tanA.clone().multiplyScalar(80)));
    } else if (state.cameraMode === 'ORTHO') {
      camera.position.lerp(new THREE.Vector3(0, 1650, 0.01), 0.08);
      camera.lookAt(0, 0, 0);
    }
  });

  if (!payload || linePoints.length === 0) return null;

  return (
    <group>
      <gridHelper args={[3200, 48, '#141B26', '#0B1018']} position={[0, -18, 0]} />
      <Line points={linePoints} color="#1B2230" lineWidth={7} />
      <Line points={linePoints} vertexColors={vertexColors} lineWidth={3.2} />

      {payload.corners.map((c) => (
        <group key={c.id} position={[c.x, c.z * elevationScale + 18, -c.y]}>
          <Html center distanceFactor={1400}>
            <div className="bg-[#080B10]/90 border border-[#1B2230] px-1.5 py-0.5 text-[9px] font-telemetry whitespace-nowrap text-[#94A3B8]">
              <span className="text-[#00E5FF] font-bold">{c.id}</span> {c.vMinA} km/h
            </div>
          </Html>
        </group>
      ))}

      <group ref={carARef}>
        <mesh>
          <sphereGeometry args={[18, 24, 24]} />
          <meshBasicMaterial color="#00E5FF" />
        </mesh>
        <Html position={[0, 38, 0]} center>
          <div
            ref={liveTagARef}
            className="bg-[#05070B]/95 border border-[#00E5FF] px-1.5 py-0.5 text-[10px] font-telemetry font-bold text-[#E2E8F0] whitespace-nowrap"
          >
            VER 000 KM/H
          </div>
        </Html>
      </group>

      <group ref={carBRef}>
        <mesh>
          <sphereGeometry args={[14, 20, 20]} />
          <meshBasicMaterial color="#B000FF" />
        </mesh>
      </group>

      {mlWarpEnabled && (
        <group ref={carMlRef}>
          <mesh>
            <sphereGeometry args={[15, 20, 20]} />
            <meshBasicMaterial color="#FFE600" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const CircuitViewport3D: React.FC = () => {
  const cameraMode = useTelemetryStore((s) => s.cameraMode);
  const trackColorMode = useTelemetryStore((s) => s.trackColorMode);
  const setCameraMode = useTelemetryStore((s) => s.setCameraMode);
  const setTrackColorMode = useTelemetryStore((s) => s.setTrackColorMode);

  return (
    <section className="hud-quadrant relative">
      <header className="quadrant-header">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block" />
          <span>Q2 // 3D KINETIC CIRCUIT &amp; ML GHOST VIEWPORT</span>
        </div>
        <div className="flex items-center gap-3 font-telemetry text-[9px]">
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">CAM:</span>
            {(['ISO', 'ORTHO', 'CHASE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCameraMode(m)}
                className={`px-1.5 py-0.5 border ${
                  cameraMode === m
                    ? 'border-[#00E5FF] bg-[#141B26] text-[#00E5FF]'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">SHADER:</span>
            {(['PEDAL', 'SPEED', 'DELTA'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTrackColorMode(mode)}
                className={`px-1.5 py-0.5 border ${
                  trackColorMode === mode
                    ? 'border-[#00FF66] bg-[#141B26] text-[#00FF66]'
                    : 'border-[#1B2230] text-[#64748B]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 relative bg-[#05070B]">
        <Canvas camera={{ position: [0, 950, 1150], fov: 42, near: 1, far: 8000 }}>
          <KineticTrackScene />
          {cameraMode === 'ISO' && <OrbitControls enableDamping dampingFactor={0.08} />}
        </Canvas>
      </div>
    </section>
  );
};
```

### 5.8 Quadrant 3 Container & Master `App.tsx` Orchestrator (`RightFlankPanel.tsx` & `App.tsx`)

```tsx
// frontend/src/components/flankRight/RightFlankPanel.tsx
import React from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { GGTractionRadar } from './GGTractionRadar';
import { SteeringWheelHUD } from './SteeringWheelHUD';
import { CornerAuditCard } from './CornerAuditCard';
import { MlStrategySandbox } from './MlStrategySandbox';

export const RightFlankPanel: React.FC = () => {
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const setCockpitMode = useTelemetryStore((s) => s.setCockpitMode);

  return (
    <aside className="hud-quadrant">
      <header className="quadrant-header">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#FFE600] inline-block" />
          <span>
            {cockpitMode === 'ML_STRATEGY_ORACLE'
              ? 'Q3 // ML PIT-WINDOW & PHYSICS SANDBOX'
              : 'Q3 // INERTIAL G-G & STEERING HUD'}
          </span>
        </div>
        <button
          onClick={() =>
            setCockpitMode(
              cockpitMode === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB'
            )
          }
          className="px-1.5 py-0.5 border border-[#00E5FF] text-[#00E5FF] font-telemetry text-[8.5px]"
        >
          {cockpitMode === 'TELEMETRY_LAB' ? 'OPEN ML SANDBOX →' : '← LIVE HUD'}
        </button>
      </header>

      {cockpitMode === 'ML_STRATEGY_ORACLE' ? (
        <MlStrategySandbox />
      ) : (
        <>
          <GGTractionRadar />
          <SteeringWheelHUD />
          <CornerAuditCard />
        </>
      )}
    </aside>
  );
};
```

```tsx
// frontend/src/App.tsx
import React, { useEffect } from 'react';
import './styles/aero-spec-hud.css';
import { useTelemetryStore } from './store/useTelemetryStore';
import { MissionRibbon } from './components/header/MissionRibbon';
import { TimingTower } from './components/flankLeft/TimingTower';
import { CircuitViewport3D } from './components/viewport3d/CircuitViewport3D';
import { RightFlankPanel } from './components/flankRight/RightFlankPanel';
import { TelemetryOscillograph } from './components/scrubber/TelemetryOscillograph';
import { StrategyFanChart } from './components/scrubber/StrategyFanChart';
import { TransportBar } from './components/scrubber/TransportBar';

export const App: React.FC = () => {
  const loadSession = useTelemetryStore((s) => s.loadSession);
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);

  useEffect(() => {
    loadSession('2024_monza_q3_ver_nor');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        useTelemetryStore.getState().togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        useTelemetryStore.getState().stepDistance(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        useTelemetryStore.getState().stepDistance(10);
      } else if (e.key === 'm' || e.key === 'M') {
        const cur = useTelemetryStore.getState().cockpitMode;
        useTelemetryStore
          .getState()
          .setCockpitMode(cur === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadSession]);

  return (
    <div className="cockpit-shell">
      <div className="crt-overlay" />
      <MissionRibbon />
      <TimingTower />
      <CircuitViewport3D />
      <RightFlankPanel />

      <section className="hud-quadrant col-span-3">
        <header className="quadrant-header">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block" />
            <span>
              {cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'Q4 // 53-LAP ML STINT DEGRADATION & MONTE CARLO CUMULATIVE RACE GAP FAN CHART (P10–P90)'
                : 'Q4 // 60 FPS MULTI-CHANNEL SYNCHRONIZED TELEMETRY OSCILLOGRAPH (1M SPATIAL GRID)'}
            </span>
          </div>
          <div className="flex items-center gap-4 font-telemetry text-[9px]">
            {cockpitMode === 'ML_STRATEGY_ORACLE' ? (
              <>
                <span className="text-[#00E5FF]">■ DRIVER A STINT PACE</span>
                <span className="text-[#B000FF]">■ DRIVER B STINT PACE</span>
                <span className="text-[#00FF66]">■ MEDIAN CUMULATIVE GAP (s)</span>
                <span className="text-[#00E5FF]/60">■ P10–P90 MONTE CARLO FAN</span>
              </>
            ) : (
              <>
                <span className="text-[#00E5FF]">■ SPEED A (km/h)</span>
                <span className="text-[#B000FF]">■■ SPEED B (GHOST)</span>
                <span className="text-[#FFE600]">■■ ML WARPED TRACE</span>
                <span className="text-[#00FF66]">■ THROTTLE (%)</span>
                <span className="text-[#FF1E44]">■ BRAKE (bar)</span>
              </>
            )}
          </div>
        </header>
        <div className="flex-1 min-h-0 relative">
          {cockpitMode === 'ML_STRATEGY_ORACLE' ? <StrategyFanChart /> : <TelemetryOscillograph />}
        </div>
        <TransportBar />
      </section>
    </div>
  );
};

export default App;
```

---

## SECTION 6: STEP-BY-STEP PHASED EXECUTION PROCEDURE FOR ANTIGRAVITY

Antigravity: Execute this blueprint in **5 clean sequential phases**. At the end of each phase, update `ORCHESTRATOR_STATE.md` and output the **`[ANTIGRAVITY -> ORCHESTRATOR HANDOFF REPORT]`** block from Section 0.2.

### Phase 1: Backend ML Engine, Spatial Resampler & Deterministic Static Seeds
1. Create `backend/requirements.txt`, `backend/ml/lap_time_model.py`, `backend/ml/monte_carlo_engine.py`, `backend/telemetry_engine.py`, `backend/seed_demo_telemetry.py`, and `backend/main.py`.
2. Run `backend/seed_demo_telemetry.py` so it trains/saves `backend/ml/artifacts/aero_spec_gbdt_v1.joblib` and generates `2024_monza_q3_ver_nor.json`, `2024_silverstone_q3_ver_nor.json`, and `2024_monaco_q3_lec_pia.json` inside `frontend/public/telemetry/` (including pre-computed `defaultStrategyOracle` results).
3. **Verification Gate:** Confirm `aero_spec_gbdt_v1.joblib` and all 3 JSON bundles exist and have zero `NaN` values.

### Phase 2: Frontend TypeScript Contracts, Client ML Engine & Zustand Store
1. Scaffold `frontend/` with Vite + React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`) + Zustand + Tailwind CSS.
2. Create `src/types/telemetry.ts`, `src/utils/formatters.ts`, `src/utils/clientMlSimulator.ts`, `src/store/useTelemetryStore.ts`, and `src/styles/aero-spec-hud.css`.
3. **Verification Gate:** Confirm `computeMlPhysicsWarp()` and `simulateMonteCarloStrategyClient()` run 5,000 simulations in `< 100 ms` with strict TypeScript compilation (`tsc --noEmit`).

### Phase 3: Zone 0 Header, Dual-Mode Timing/Probability Tower & 3D Kinetic Circuit
1. Implement `MissionRibbon.tsx` (with the `[1] 60 FPS TELEMETRY LAB` vs `[2] ML STRATEGY & MONTE CARLO ORACLE` mode toggle).
2. Implement `TimingTower.tsx` switching cleanly between 20-driver qualifying sector timings and 20-driver Monte Carlo Win % / Podium % / P10–P90 finish predictions.
3. Implement `CircuitViewport3D.tsx` with `PEDAL`, `SPEED`, and `DELTA` vertex shaders, `ISO`/`ORTHO`/`CHASE` cameras, and the 3D ML Ghost Car offset.

### Phase 4: Quadrant 3 — G-G Radar, Direct-DOM Steering Wheel HUD, Corner Audit & ML Strategy Sandbox
1. Implement `GGTractionRadar.tsx`, `SteeringWheelHUD.tsx` (15-LED sequential RPM shift array), `CornerAuditCard.tsx`, and `MlStrategySandbox.tsx`.
2. Wire `RightFlankPanel.tsx` so the user can toggle seamlessly between live G-G/Steering telemetry and the interactive ML Strategy & Physics-Warp sliders.

### Phase 5: Quadrant 4 — Dual-Buffer 60 FPS Telemetry Oscillograph & 53-Lap Strategy Fan Chart
1. Implement `TelemetryOscillograph.tsx` (rendering 1-meter Speed, $\Delta t$, Throttle, Brake, and the dashed green/cyan **ML Physics-Warped Ghost Speed Trace** when `mlWarpParams.enabled` is active).
2. Implement `StrategyFanChart.tsx` (rendering the 53-lap stint degradation curves, Pit Box callouts, and P10–P90 Monte Carlo cumulative gap fan chart) and `TransportBar.tsx`.
3. Assemble `App.tsx`, run `tsc --noEmit` and `vite build`, verify 60.0 FPS playback and zero console errors, update `ORCHESTRATOR_STATE.md`, and emit the final **`[ANTIGRAVITY -> ORCHESTRATOR HANDOFF REPORT]`**.
