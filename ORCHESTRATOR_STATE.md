# AERO-SPEC // ORCHESTRATOR STATE & PHASE TRACKER

**Master Blueprint Contract:** `AERO-SPEC-ML-AG-CONTRACT-v5.0`  
**Current Active Phase:** `Phase 1 - Backend ML Engine, Spatial Resampler & Deterministic Static Seeds`  
**Phase 1 Status:** `COMPLETE & VERIFIED`

---

## 1. FILE TREE & ARTIFACT AUDIT (PHASE 1)

| File / Artifact Path | Status | Lines / Size | Key Symbols / Exports |
| :--- | :--- | :--- | :--- |
| `backend/requirements.txt` | COMPLETE | 12 lines | `fastapi`, `fastf1`, `scipy`, `scikit-learn`, `orjson` |
| `backend/ml/lap_time_model.py` | COMPLETE | 185 lines | `load_gbdt_model`, `predict_lap_delta`, `compute_ml_physics_warp` |
| `backend/ml/monte_carlo_engine.py` | COMPLETE | 174 lines | `run_monte_carlo_strategy_oracle` |
| `backend/ml/train_and_verify.py` | COMPLETE | 257 lines | `train_and_verify`, `evaluate_physics_lap_delta` |
| `backend/ml/artifacts/aero_spec_gbdt_v1.joblib` | COMPLETE | 294.5 KB | Trained GBDT model artifact ($R^2 = 0.999$, MAE $= 0.027$s) |
| `backend/telemetry_engine.py` | COMPLETE | 1,618 lines | `resample_to_1m_grid`, `compute_kinematics_1m`, `build_corner_apex_metadata` |
| `backend/test_f1_kinematics_engine.py` | COMPLETE | 393 lines | `run_comprehensive_verification` (6/6 tests passed) |
| `backend/seed_demo_telemetry.py` | COMPLETE | 560 lines | `seed_all_demo_telemetry`, `try_fastf1_fetch`, `synthesize_driver_kinematics` |
| `backend/main.py` | COMPLETE | 747 lines | FastAPI server (`/api/v1/session-compare`, `/api/v1/ml/*`) |
| `frontend/public/telemetry/2024_monza_q3_ver_nor.json` | COMPLETE | 857.4 KB | Monza Q3 1m spatial bundle (gridLength: 5793, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_silverstone_q3_ver_nor.json` | COMPLETE | 870.2 KB | Silverstone Q3 1m spatial bundle (gridLength: 5891, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_monaco_q3_lec_pia.json` | COMPLETE | 494.9 KB | Monaco Q3 1m spatial bundle (gridLength: 3337, 20 drivers, 5,000 sims) |
| `frontend/public/telemetry/2024_monza_strategy_oracle.json` | COMPLETE | 25.1 KB | Pre-computed baseline Monte Carlo race strategy oracle |
| `frontend/src/styles/aero-spec-hud.css` | COMPLETE | 876 lines / 23.8 KB | Master HUD CSS tokens, 5-zone grid, 4-corner reticles, CRT overlay, tabular numerics |
| `docs/research/AERO_SPEC_HUD_DESIGN_SYSTEM_RESEARCH_REPORT.md` | COMPLETE | 494 lines / 25.9 KB | NASA FDO / ATLAS visual language, reticle math, GPU scanlines & grid architecture |

---

## 2. VERIFICATION GATES SUMMARY

1. **Dual-Path Telemetry Generation:**
   - FastF1 attempted via subprocess with a strict 4.0s timeout per session.
   - Clean, zero-hang timeout fallback to deterministic analytical kinematic synthesis based on canonical circuit geometry, apex minimum speeds, forward-backward braking integration, and realistic sector times.
2. **20-Driver Timing Towers:**
   - All 3 bundles contain complete 20-driver qualifying timing towers (P1 to P20).
   - Valid sector splits summing exactly to `bestLapTimeSec`.
   - Realistic PURPLE / GREEN / AMBER sector color mappings.
3. **ML Strategy Oracle (5,000 Runs):**
   - Embedded in all 3 bundles under `defaultStrategyOracle`.
   - Vectorized NumPy Monte Carlo completed in ~26ms per session.
4. **Float Precision Truncation:**
   - Coordinates ($x, y, z$): 2 decimals.
   - Speed: 1 decimal.
   - Time ($t$) and $\Delta t$: 4 decimals.
   - Throttle, Brake, Steer: 1 decimal.
   - G-forces ($g_{\text{long}}, g_{\text{lat}}$): 2 decimals.
   - RPM, Gear, DRS: integer.
5. **Zero-NaN Compliance:**
   - Enforced by `json.dump(..., allow_nan=False)`.
   - Validated across all 3 bundles with recursive float NaN/Inf check and Pydantic `SessionTelemetryPayload.model_validate()`.
6. **FastAPI Endpoints:**
   - `/api/v1/session-compare` verified with `TestClient` for all 3 sessions.
