# AERO-SPEC // ORCHESTRATOR STATE & PHASE TRACKER

**Master Blueprint Contract:** `AERO-SPEC-ML-AG-CONTRACT-v5.0`  
**Current Active Phase:** `Phase 4 - Quadrant 3 Flank Right Panel (G-G Radar, Direct-DOM Steering HUD, Corner Audit Card & ML Strategy Sandbox)`  
**Phase 1 Status:** `COMPLETE & VERIFIED` (Git Commit `999efb9`)  
**Phase 2 Status:** `COMPLETE & VERIFIED` (Git Commit `5924207`)  
**Phase 3 Status:** `COMPLETE & VERIFIED` (Git Commit `0183973`, 6/6 Gates Passed, 89/89 Tests Passed)  
**Phase 4 Research Status:** `100% COMPLETE & BENCHMARKED` (10/10 Specialized Subagents Complete, Master Synthesis Published)  
**Phase 4 Build Status:** `READY FOR DEPLOYMENT`  

---

## 1. FILE TREE & ARTIFACT AUDIT (PHASES 1, 2, 3 & 4 RESEARCH)

| File / Artifact Path | Status | Lines / Size | Key Symbols / Exports |
| :--- | :--- | :--- | :--- |
| **Backend Core (Phase 1)** | | | |
| `backend/requirements.txt` | COMPLETE | 12 lines | `fastapi`, `fastf1`, `scipy`, `scikit-learn`, `orjson` |
| `backend/ml/lap_time_model.py` | COMPLETE | 185 lines | `load_gbdt_model`, `predict_lap_delta`, `compute_ml_physics_warp` |
| `backend/ml/monte_carlo_engine.py` | COMPLETE | 174 lines | `run_monte_carlo_strategy_oracle` |
| `backend/ml/train_and_verify.py` | COMPLETE | 257 lines | `train_and_verify`, `evaluate_physics_lap_delta` |
| `backend/ml/artifacts/aero_spec_gbdt_v1.joblib` | COMPLETE | 294.5 KB | Trained GBDT model artifact ($R^2 = 0.999$, MAE $= 0.086$s) |
| `backend/telemetry_engine.py` | COMPLETE | 1,618 lines | `resample_to_1m_grid`, `compute_kinematics_1m`, `build_corner_apex_metadata` |
| `backend/test_f1_kinematics_engine.py` | COMPLETE | 393 lines | `run_comprehensive_verification` (6/6 tests passed) |
| `backend/seed_demo_telemetry.py` | COMPLETE | 560 lines | `seed_all_demo_telemetry`, `try_fastf1_fetch`, `synthesize_driver_kinematics` |
| `backend/test_telemetry_integrity.py` | COMPLETE | 282 lines | `verify_bundle`, `run_all_audits` (23/23 tests passed) |
| `backend/main.py` | COMPLETE | 747 lines | FastAPI server (`/api/v1/session-compare`, `/api/v1/ml/*`) |
| **Static Seeds (Phase 1)** | | | |
| `frontend/public/telemetry/2024_monza_q3_ver_nor.json` | COMPLETE | 857.4 KB | Monza Q3 1m spatial bundle (gridLength: 5793, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_silverstone_q3_ver_nor.json` | COMPLETE | 870.2 KB | Silverstone Q3 1m spatial bundle (gridLength: 5891, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_monaco_q3_lec_pia.json` | COMPLETE | 494.9 KB | Monaco Q3 1m spatial bundle (gridLength: 3337, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_monza_strategy_oracle.json` | COMPLETE | 25.1 KB | Pre-computed baseline Monte Carlo race strategy oracle |
| **Frontend Toolchain & Core Engine (Phase 2)** | | | |
| `frontend/package.json` | COMPLETE | 48 lines | React 18.3, Three.js 0.169, R3F 8.17, Drei 9.122, Zustand 5.0, Tailwind 3.4 |
| `frontend/vite.config.ts` | COMPLETE | 62 lines | Rollup manual chunking (`vendor-three`, `vendor-react`, `vendor-ui`), IPv4 proxy |
| `frontend/tsconfig.json` | COMPLETE | 38 lines | Strict ES2022, bundler module resolution, path aliases `@/*` |
| `frontend/tailwind.config.ts` | COMPLETE | 45 lines | Aero-Spec HUD color tokens, JetBrains Mono, 0px border-radius |
| `frontend/postcss.config.js` | COMPLETE | 6 lines | Tailwind & Autoprefixer |
| `frontend/index.html` | COMPLETE | 85 lines | Preconnect Google Fonts, zero-FOUC styles, dark theme, diagnostic noscript |
| `frontend/src/styles/aero-spec-hud.css` | COMPLETE | 876 lines | Master HUD tokens, 5-zone grid, optical reticles, CRT scanlines |
| `frontend/src/types/telemetry.ts` | COMPLETE | 631 lines | Strict TypeScript interfaces matching backend, runtime type guards |
| `frontend/src/utils/formatters.ts` | COMPLETE | 485 lines | CLS=0 fixed-width tabular formatting, nanosecond pre-allocated LUTs |
| `frontend/src/utils/clientMlSimulator.ts` | COMPLETE | 475 lines | 0.014ms ML physics-warp engine, 5.59ms 5,000-run Monte Carlo engine |
| `frontend/src/store/useTelemetryStore.ts` | COMPLETE | 265 lines | Zustand `subscribeWithSelector`, zero-render 60 Hz cursor updates |
| `frontend/src/store/telemetrySubscriber.ts` | COMPLETE | 148 lines | Direct-DOM, Canvas, and Three.js imperative subscription hooks |
| `frontend/src/main.tsx` | COMPLETE | 24 lines | React 18 createRoot mount |
| `frontend/src/App.tsx` | COMPLETE | 140 lines | Master 6-Zone Cockpit layout shell wiring Ribbon, Tower, 3D Viewport |
| `frontend/scripts/test_phase2_verification_harness.js` | COMPLETE | 345 lines | Automated Phase 2 verification harness (5/5 gates passed) |
| `frontend/scripts/test_telemetry_store.js` | COMPLETE | 230 lines | Zustand store unit & kinetic test runner (27/27 tests passed) |
| **Phase 3 Components & Verification Harness** | | | |
| `frontend/src/components/header/MissionRibbon.tsx` | COMPLETE | 315 lines | Zone 0 (36px) RAF loop, decoupled rolling FPS, direct-DOM lap clock, dual-engine toggle |
| `frontend/src/components/header/__tests__/MissionRibbon.test.ts` | COMPLETE | 380 lines | Comprehensive Zone 0 unit test suite (25/25 tests passed) |
| `frontend/src/components/flankLeft/TimingTower.tsx` | COMPLETE | 340 lines | Quadrant 1 (315px) Dual-mode qualifying matrix & Monte Carlo win/podium tower |
| `frontend/src/components/flankLeft/__tests__/TimingTower.test.ts` | COMPLETE | 320 lines | Quadrant 1 unit test suite (25/25 tests passed) |
| `frontend/src/components/viewport3d/CircuitViewport3D.tsx` | COMPLETE | 460 lines | Quadrant 2 (1fr) 3D Centripetal Catmull-Rom spline, getPoint alignment, scratch pool |
| `frontend/src/components/viewport3d/__tests__/CircuitViewport3D.test.ts` | COMPLETE | 360 lines | Quadrant 2 unit test suite (39/39 tests passed) |
| `frontend/scripts/test_phase3_verification_harness.js` | COMPLETE | 360 lines | Master Phase 3 verification harness (6/6 gates passed) |
| `docs/research/PHASE_3_VERIFICATION_BENCHMARK_RESULTS.json` | COMPLETE | 185 lines | Machine-readable multi-gate audit benchmark results |
| `PHASE_3_RESEARCH_SWARM_SYNTHESIS.md` | COMPLETE | Artifact | Master Phase 3 Research Synthesis across all 10 specialized subagents |
| **Phase 4 Research Fleet Deliverables** | | | |
| `docs/research/PHASE_4_GG_TRACTION_RADAR_KINEMATICS_AND_POLAR_PHYSICS_RESEARCH.md` | COMPLETE | 38.0 KB | Subagent 2: Asymmetric pear-shaped friction envelope, 45-frame comet tail |
| `docs/research/PHASE_4_STEERING_WHEEL_HUD_AND_SHIFT_LIGHTS_RESEARCH_REPORT.md` | COMPLETE | 45.3 KB | Subagent 3: FIA 15-LED shift array, bitmask caching, direct-DOM mutation |
| `docs/research/CORNER_APEX_PROXIMITY_AND_AUDIT_CARD_RESEARCH_REPORT.md` | COMPLETE | 57.0 KB | Subagent 4: O(1) 4.31ns chicane bisector spatial LUT, comparative apex metrics |
| `docs/research/PHASE_4_PIT_EXIT_BATTLE_RESEARCH_REPORT.md` | COMPLETE | 16.2 KB | Subagent 6: Turn 1 pit merge formula $d_{\text{pitMerge}} = \max(150, t_{1\text{Apex}} - 240\text{m})$ |
| `docs/research/ZERO_VDOM_DIRECT_DOM_AND_60FPS_CANVAS_TICKERS_RESEARCH_REPORT.md` | COMPLETE | 41.1 KB | Subagent 8: Imperative store subscriber, batch DOM mutations, 306x headroom |
| `docs/research/PHASE_4_QUADRANT_3_AEROSPACE_STYLING_MICRO_TYPOGRAPHY_AND_OPTICAL_RETICLES_SPECIFICATION.md` | COMPLETE | 38.7 KB | Subagent 9: NASA FDO / ATLAS design system, 0px border-radius, optical reticles |
| `docs/research/PHASE_4_STATE_MANAGEMENT_AND_CROSS_QUADRANT_SYNCHRONIZATION_RESEARCH.md` | COMPLETE | 36.3 KB | Subagent 10: Multi-quadrant sync topology, monotonic generation tokens, Gate 5 AST |
| `frontend/scripts/test_phase4_state_sync.js` | COMPLETE | 240 lines | Subagent 10 state synchronization & race condition harness (6/6 tests passed) |
| `PHASE_4_RESEARCH_SWARM_SYNTHESIS.md` | COMPLETE | Artifact | Master Phase 4 Research Synthesis across all 10 specialized subagents |

---

## 2. PHASE 4 RESEARCH FLEET KEY DISCOVERIES & MATHEMATICAL INVARIANTS

1. **Asymmetric Pear-Shaped G-G Dynamic Aero Friction Envelope:**
   Formula 1 cars pull $-6.0\text{G}$ under maximum braking + downforce drag, $+2.2\text{G}$ under acceleration, and $5.5\text{G}$ lateral grip. The boundary is formulated as an asymmetric polar curve $\mu_{\text{eff}}(\theta, v)$ with guaranteed $C^1$ tangent continuity across the equator ($g_{\text{long}} = 0$).
2. **Precomputed 1m Spatial LUT with Chicane Boundary Bisectors ($O(1)$ $4.31\text{ ns}$):**
   Tight chicane complexes (T1/T2 separated by $110\text{m}$, T4/T5 by $70\text{m}$) cause proximity jitter if using naive radius spheres. Midpoint bisector partitioning baked into a `Uint8Array(gridLength)` spatial LUT enables instantaneous $4.31\text{ ns}$ $O(1)$ corner resolution with zero ambiguity.
3. **15-Bit Integer Bitmask Caching on FIA Shift LEDs ($0.000098\text{ ms}$/frame):**
   Encoding 15 sequential LEDs into a single 15-bit integer and caching `prevMask` skips DOM mutations on $89\%+$ of frames during acceleration, reducing per-frame execution to $98\text{ ns}$ ($306\times$ headroom).
4. **Universal Pit-Exit Merge Station Formula:**
   $$d_{\text{pitMerge}} = \max(150, t_{1\text{Apex}} - 240\text{m})$$
   Monza: $610\text{m}$ (straight out of Rettifilo onto Curva Grande at $177.5\text{ km/h}$). Silverstone: $280\text{m}$. Monaco: $150\text{m}$. Synchronizes Zone 0 clock, Q1 timing tower, Q2 3D chase camera ($\lambda = 6.3216$), and Q3 corner audit simultaneously.
5. **In-Place Float32Array ML Physics-Warp Kinematics ($0.0175\text{ ms}$, 57,000+ FPS):**
   Client-side in-place integration using pre-allocated `Float32Array` buffer pools executes across 5,794 points in $0.0175\text{ ms}$ ($139\times$ faster than naive blueprint code) with 0 bytes GC heap allocation.
6. **Monotonic Generation Tokens (`simulationToken++`):**
   Protects against out-of-order async worker completions ($C_1 \to C_3 \to C_2$) when dragging sliders. Paired with `requestAnimationFrame` drag coalescing, this guarantees 120 FPS slider fluidity while eliminating stale state regression.
7. **Pixel Height Budgeting at 1080p ($756\text{px}$ exact):**
   Header $24\text{px}$ + G-G Radar $210\text{px}$ + Steering Wheel HUD $185\text{px}$ + Corner Audit Card $337\text{px}$ (flex-1) $= 756\text{px}$ ($0\text{px}$ overflow).

---

## 3. PHASE 4 BUILDER FLEET DEPLOYMENT PLAN

```
Builder 1: RightFlankPanel.tsx (Quadrant 3 Container, Mode Switcher Bar, 756px Layout)
Builder 2: GGTractionRadar.tsx (Canvas 2D Polar Acceleration Radar, Dynamic Pear-Shaped Aero Boundary, 45-Frame Comet Tail)
Builder 3: SteeringWheelHUD.tsx (FIA 15-LED Shift Array, Bitmask Cache, Gear, RPM, Speed, DRS, Steering Gauge)
Builder 4: CornerAuditCard.tsx (O(1) Spatial LUT Apex Engine, Comparative Telemetry, Embedded ML Physics Sliders)
Builder 5: MlStrategySandbox.tsx (5 Sub-Sections, rAF Coalesced Pit Lap Sliders, SC Injector, MC Verdict, Pit Merge Button)
```
Master Verification: Mount in `App.tsx`, build automated multi-gate verification harness `test_phase4_verification_harness.js`, run `tsc --noEmit`, unit tests, Gate 5 AST zero-VDOM audit, and `vite build`.
