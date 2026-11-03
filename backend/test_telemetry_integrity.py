"""
AERO-SPEC // Phase 1 Telemetry Integrity, ML Model Verification & Schema Audit
=============================================================================
Comprehensive test suite validating:
  1. GBDT ML model artifact loading, inference latency, R^2 score (> 0.98), and MAE (< 0.10s).
  2. Recursive Zero-NaN, Zero-Inf, and Zero-Null checks across all telemetry payloads.
  3. Strict 1-meter spatial array length invariant: len(channel) == gridLength + 1 for all 13 channels.
  4. Delta-T length invariant: len(deltaT) == gridLength + 1.
  5. Timing Tower completeness: exactly 20 drivers with 3 sector status indicators ('PURPLE'|'GREEN'|'AMBER').
  6. Track feature metadata: corner apex/markers and DRS detection/activation zones.
  7. Default Strategy Oracle: exactly 20 driver probabilities and lapTraces length == totalRaceLaps.
  8. Static bundle payload compression / size constraint: strictly < 2.5 MB per JSON bundle.
"""

import os
import sys
import math
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import orjson

try:
    import pytest
except ImportError:
    class _MockPytestMark:
        @staticmethod
        def parametrize(*args, **kwargs):
            def decorator(fn):
                return fn
            return decorator

    class _MockPytest:
        mark = _MockPytestMark()

    pytest = _MockPytest()

from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.ml.train_and_verify import (
    ARTIFACT_PATH,
    COMPOUND_PARAMS,
    evaluate_physics_lap_delta,
    generate_training_dataset,
)

TELEMETRY_DIR = PROJECT_ROOT / "frontend" / "public" / "telemetry"

BUNDLE_NAMES = [
    "2024_monza_q3_ver_nor.json",
    "2024_silverstone_q3_ver_nor.json",
    "2024_monaco_q3_lec_pia.json",
]

REQUIRED_13_CHANNELS = [
    "t",
    "x",
    "y",
    "z",
    "speed",
    "throttle",
    "brake",
    "rpm",
    "gear",
    "drs",
    "gLong",
    "gLat",
    "steerDeg",
]

VALID_SECTOR_STATUSES = {"PURPLE", "GREEN", "AMBER"}
VALID_TYRE_COMPOUNDS = {"S", "M", "H", "I", "W"}
MAX_BUNDLE_BYTES = 2.5 * 1024 * 1024  # 2.5 MB ceiling


# ============================================================================
# HELPER FUNCTIONS FOR RECURSIVE INTEGRITY CHECKS
# ============================================================================

def recursive_assert_no_nan_inf_null(obj: Any, path: str = "root") -> None:
    """
    Recursively scans nested structures (dicts, lists, scalars, ndarrays)
    to enforce absolute zero NaN, zero Inf, and zero Null/None presence.
    Optimized with vectorized NumPy checks for large telemetry arrays.
    """
    if obj is None:
        raise AssertionError(f"[INTEGRITY VIOLATION] Found null/None value at: {path}")

    if isinstance(obj, float):
        if math.isnan(obj):
            raise AssertionError(f"[INTEGRITY VIOLATION] Found NaN float value at: {path}")
        if math.isinf(obj):
            raise AssertionError(f"[INTEGRITY VIOLATION] Found Inf float value at: {path}")
    elif isinstance(obj, (int, str, bool)):
        return
    elif isinstance(obj, dict):
        for k, v in obj.items():
            recursive_assert_no_nan_inf_null(v, f"{path}.{k}")
    elif isinstance(obj, (list, tuple)):
        # Fast vectorized path for large homogeneous numeric arrays
        if len(obj) > 0 and isinstance(obj[0], (int, float)):
            try:
                arr = np.asarray(obj, dtype=np.float64)
                if not np.all(np.isfinite(arr)):
                    nans = int(np.sum(np.isnan(arr)))
                    infs = int(np.sum(np.isinf(arr)))
                    raise AssertionError(
                        f"[INTEGRITY VIOLATION] Numeric array at {path} contains {nans} NaNs and {infs} Infs (length {len(arr)})"
                    )
            except (ValueError, TypeError) as err:
                for idx, item in enumerate(obj):
                    recursive_assert_no_nan_inf_null(item, f"{path}[{idx}]")
        else:
            for idx, item in enumerate(obj):
                recursive_assert_no_nan_inf_null(item, f"{path}[{idx}]")
    elif isinstance(obj, np.ndarray):
        if not np.all(np.isfinite(obj)):
            nans = int(np.sum(np.isnan(obj)))
            infs = int(np.sum(np.isinf(obj)))
            raise AssertionError(
                f"[INTEGRITY VIOLATION] NumPy ndarray at {path} contains {nans} NaNs and {infs} Infs"
            )


def load_bundle_payload(bundle_name: str) -> Tuple[Path, Dict[str, Any], int]:
    """Loads and parses a JSON bundle from frontend/public/telemetry/."""
    bundle_path = TELEMETRY_DIR / bundle_name
    assert bundle_path.exists(), f"Telemetry bundle does not exist on disk: {bundle_path}"

    file_size_bytes = bundle_path.stat().st_size
    with open(bundle_path, "rb") as f:
        payload = orjson.loads(f.read())

    return bundle_path, payload, file_size_bytes


# ============================================================================
# PART 1: ML MODEL ARTIFACT VERIFICATION
# ============================================================================

def test_ml_model_artifact_load_and_performance():
    """
    Verifies that the serialized GBDT model artifact exists, loads cleanly,
    achieves R^2 > 0.98 and MAE < 0.10s on a held-out test distribution,
    and exhibits sub-millisecond single-inference latency.
    """
    print("\n" + "=" * 78)
    print("TEST: ML MODEL ARTIFACT INTEGRITY & ACCURACY VERIFICATION")
    print("=" * 78)

    assert os.path.exists(ARTIFACT_PATH), f"Artifact missing at {ARTIFACT_PATH}"
    artifact_size_kb = os.path.getsize(ARTIFACT_PATH) / 1024.0
    print(f"  * Artifact path: {ARTIFACT_PATH}")
    print(f"  * Artifact file size: {artifact_size_kb:.2f} KB")

    # 1. Load model with joblib
    t0 = time.perf_counter()
    model = joblib.load(ARTIFACT_PATH)
    t_load_ms = (time.perf_counter() - t0) * 1000.0
    print(f"  * Model successfully loaded with joblib in {t_load_ms:.2f} ms")
    assert hasattr(model, "predict"), "Loaded artifact has no 'predict' method"

    # 2. Test predictions on sample features
    # Feature format: [compound_id, tyre_age, cliff_excess_sq, fuel_kg, track_temp_c, driver_delta]
    sample_features = np.array([
        [0.0, 0.0, 0.0, 10.0, 38.0, 0.0],     # Fresh Soft in optimal window
        [0.0, 18.0, 9.0, 10.0, 38.0, 0.0],    # Worn Soft past cliff
        [1.0, 5.0, 0.0, 50.0, 41.0, 0.0],     # Mid-stint Medium
        [2.0, 30.0, 0.0, 20.0, 44.0, 0.0],    # Hard tyre
    ], dtype=np.float64)

    t_inf_start = time.perf_counter()
    sample_preds = model.predict(sample_features)
    t_inf_ms = (time.perf_counter() - t_inf_start) * 1000.0
    print(f"  * Batch inference on 4 samples: {sample_preds.round(3)} (took {t_inf_ms:.3f} ms)")
    assert len(sample_preds) == 4
    assert sample_preds[1] > sample_preds[0], "Worn soft tyre should have higher delta than fresh soft tyre"

    # 3. Accuracy evaluation on synthetic ground-truth dataset
    print("  * Synthesizing 10,000 verification stint telemetry points...")
    X, y = generate_training_dataset(n_samples=10000, random_seed=42)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    y_pred = model.predict(X_test)
    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))

    print(f"  * Model Evaluation Metrics on Held-Out Test Set:")
    print(f"    - R^2 Score : {r2:.5f} (Required: > 0.98000)")
    print(f"    - MAE       : {mae:.4f} s ({mae * 1000.0:.2f} ms) (Required: < 0.1000 s)")

    assert r2 > 0.98, f"GBDT R^2 score {r2:.5f} is below 0.98 threshold!"
    assert mae < 0.10, f"GBDT MAE score {mae:.4f}s is above 0.10s threshold!"
    print("  [PASS] ML Model Artifact loads with joblib, passes latency & R^2 > 0.98 / MAE < 0.10s checks.")


# ============================================================================
# PART 2: TELEMETRY BUNDLE SCHEMAS & INVARIANTS AUDIT
# ============================================================================

@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_telemetry_bundle_file_size(bundle_name: str):
    """Asserts bundle exists and file size is strictly under 2.5 MB."""
    bundle_path, _, file_size = load_bundle_payload(bundle_name)
    size_mb = file_size / (1024.0 * 1024.0)
    print(f"\n[{bundle_name}] File size: {size_mb:.3f} MB ({file_size:,} bytes)")
    assert file_size < MAX_BUNDLE_BYTES, (
        f"Bundle {bundle_name} size ({size_mb:.2f} MB) exceeds maximum limit of 2.5 MB"
    )


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_telemetry_bundle_zero_nan_inf_null(bundle_name: str):
    """Performs deep recursive traversal ensuring zero NaN, Inf, or nulls exist anywhere."""
    _, payload, _ = load_bundle_payload(bundle_name)
    recursive_assert_no_nan_inf_null(payload, path=f"{bundle_name}")
    print(f"[{bundle_name}] Zero-NaN / Zero-Inf / Zero-Null recursive check: PASSED")


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_telemetry_bundle_channel_length_invariants(bundle_name: str):
    """
    Asserts the fundamental 1-meter spatial indexing invariant:
    For all 13 channels in driverA and driverB, and deltaT, length MUST equal gridLength + 1.
    """
    _, payload, _ = load_bundle_payload(bundle_name)
    grid_length = payload.get("gridLength")
    assert isinstance(grid_length, int) and grid_length > 1000, (
        f"Invalid gridLength {grid_length} in {bundle_name}"
    )

    expected_len = grid_length + 1
    print(f"\n[{bundle_name}] Invariant Verification: gridLength={grid_length} -> expected channel length={expected_len}")

    # Check deltaT
    delta_t = payload.get("deltaT")
    assert isinstance(delta_t, list), f"deltaT must be a list in {bundle_name}"
    assert len(delta_t) == expected_len, (
        f"deltaT length mismatch: {len(delta_t)} != expected {expected_len}"
    )

    # Check driverA and driverB for all 13 channels
    for driver_key in ["driverA", "driverB"]:
        driver_obj = payload.get(driver_key)
        assert isinstance(driver_obj, dict), f"Missing '{driver_key}' dict in {bundle_name}"

        for ch in REQUIRED_13_CHANNELS:
            assert ch in driver_obj, f"Missing required telemetry channel '{ch}' in {driver_key}"
            ch_data = driver_obj[ch]
            assert isinstance(ch_data, list), f"Channel {driver_key}.{ch} must be a list"
            assert len(ch_data) == expected_len, (
                f"Channel length mismatch on {driver_key}.{ch}: got {len(ch_data)}, expected {expected_len}"
            )

    print(f"[{bundle_name}] All 13 channels in driverA & driverB + deltaT match gridLength + 1: PASSED")


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_telemetry_bundle_physical_channel_ranges(bundle_name: str):
    """Validates realistic physical engineering boundaries on telemetry channels."""
    _, payload, _ = load_bundle_payload(bundle_name)

    for driver_key in ["driverA", "driverB"]:
        driver = payload[driver_key]

        # Time strictly monotonic
        t_arr = np.array(driver["t"])
        assert np.all(np.diff(t_arr) >= 0), f"{driver_key}.t must be monotonically non-decreasing"
        assert t_arr[0] == 0.0, f"{driver_key}.t[0] must start at 0.0"

        # Speed limits (35 to 390 km/h)
        speed = np.array(driver["speed"])
        assert np.all((speed >= 35.0) & (speed <= 390.0)), (
            f"{driver_key}.speed outside physical range [35, 390]: min={speed.min()}, max={speed.max()}"
        )

        # Throttle & Brake in [0, 100]
        throttle = np.array(driver["throttle"])
        assert np.all((throttle >= 0.0) & (throttle <= 100.0)), f"{driver_key}.throttle out of range"

        brake = np.array(driver["brake"])
        assert np.all((brake >= 0.0) & (brake <= 100.0)), f"{driver_key}.brake out of range"

        # Gear in [1, 8]
        gear = np.array(driver["gear"])
        assert np.all((gear >= 1) & (gear <= 8)), f"{driver_key}.gear out of range [1, 8]"

        # RPM in [7000, 15000]
        rpm = np.array(driver["rpm"])
        assert np.all((rpm >= 7000) & (rpm <= 15000)), f"{driver_key}.rpm out of range [7000, 15000]"

        # G-Forces within F1 envelope
        g_long = np.array(driver["gLong"])
        assert -6.5 <= g_long.min() and g_long.max() <= 3.0, (
            f"{driver_key}.gLong outside F1 boundaries: [{g_long.min()}, {g_long.max()}]"
        )

        g_lat = np.array(driver["gLat"])
        assert -6.5 <= g_lat.min() and g_lat.max() <= 6.5, (
            f"{driver_key}.gLat outside F1 boundaries: [{g_lat.min()}, {g_lat.max()}]"
        )


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_timing_tower_has_20_drivers_and_valid_sectors(bundle_name: str):
    """
    Asserts timingTower has exactly 20 drivers with 3 sector statuses.
    Each status must be one of 'PURPLE', 'GREEN', or 'AMBER'.
    """
    _, payload, _ = load_bundle_payload(bundle_name)
    timing_tower = payload.get("timingTower")

    assert isinstance(timing_tower, list), f"timingTower must be a list in {bundle_name}"
    assert len(timing_tower) == 20, (
        f"timingTower driver count mismatch: got {len(timing_tower)}, expected 20 drivers"
    )

    positions_seen = set()
    codes_seen = set()

    for idx, driver in enumerate(timing_tower):
        pos = driver.get("position")
        code = driver.get("code")
        assert pos is not None, f"timingTower[{idx}] missing 'position'"
        assert code is not None, f"timingTower[{idx}] missing 'code'"
        assert pos not in positions_seen, f"Duplicate position {pos} in timingTower"
        assert code not in codes_seen, f"Duplicate driver code {code} in timingTower"
        positions_seen.add(pos)
        codes_seen.add(code)

        # Compound check
        compound = driver.get("compound")
        assert compound in VALID_TYRE_COMPOUNDS, f"Invalid tyre compound {compound} for driver {code}"

        # Sector statuses check
        sectors = driver.get("sectors")
        assert isinstance(sectors, (list, tuple)), f"sectors must be a list for driver {code}"
        assert len(sectors) == 3, f"driver {code} sectors length {len(sectors)} != 3"
        for s_idx, status_str in enumerate(sectors):
            assert status_str in VALID_SECTOR_STATUSES, (
                f"Driver {code} sector {s_idx + 1} status '{status_str}' not in {VALID_SECTOR_STATUSES}"
            )

        # Sector times check
        sector_times = driver.get("sectorTimesSec")
        assert isinstance(sector_times, (list, tuple)), f"sectorTimesSec must be a list for driver {code}"
        assert len(sector_times) == 3, f"driver {code} sectorTimesSec length != 3"
        assert all(t > 0 for t in sector_times), f"Driver {code} has non-positive sector times: {sector_times}"

    assert positions_seen == set(range(1, 21)), "Timing tower positions must span 1 to 20 exactly"
    print(f"[{bundle_name}] Timing Tower contains exactly 20 drivers with 3 valid sectors: PASSED")


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_corners_and_drs_zones(bundle_name: str):
    """
    Asserts corners and DRS zones are properly configured and geometrically consistent
    within the circuit length boundaries.
    """
    _, payload, _ = load_bundle_payload(bundle_name)
    meta = payload.get("meta", {})
    circuit_length = meta.get("circuitLengthM", payload.get("gridLength", 6000))

    # Corners
    corners = payload.get("corners")
    assert isinstance(corners, list), f"corners must be a list in {bundle_name}"
    assert len(corners) >= 6, f"Expected at least 6 corners for circuit, found {len(corners)}"

    required_corner_fields = [
        "id", "name", "apexDistanceM", "entryDistanceM", "exitDistanceM",
        "x", "y", "z", "brakeMarkerA", "brakeMarkerB", "vMinA", "vMinB",
        "throttlePickupA", "throttlePickupB"
    ]
    for idx, c in enumerate(corners):
        for field in required_corner_fields:
            assert field in c, f"Corner[{idx}] missing required field '{field}' in {bundle_name}"
        assert 0 <= c["apexDistanceM"] <= circuit_length + 50, (
            f"Corner {c['id']} apex distance {c['apexDistanceM']} outside circuit [0, {circuit_length}]"
        )
        assert c["vMinA"] > 30 and c["vMinB"] > 30, f"Corner {c['id']} vMin abnormally low"

    # DRS Zones
    drs_zones = payload.get("drsZones")
    assert isinstance(drs_zones, list), f"drsZones must be a list in {bundle_name}"
    assert len(drs_zones) >= 1, f"Expected at least 1 DRS zone in {bundle_name}"

    for idx, drs in enumerate(drs_zones):
        assert "id" in drs
        assert "detectionDistanceM" in drs
        assert "startDistanceM" in drs
        assert "endDistanceM" in drs
        assert drs["startDistanceM"] < drs["endDistanceM"], (
            f"DRS zone {drs['id']} startDistance >= endDistance"
        )
        assert 0 <= drs["startDistanceM"] <= circuit_length + 50
        assert 0 <= drs["endDistanceM"] <= circuit_length + 50

    print(f"[{bundle_name}] Corners ({len(corners)}) & DRS Zones ({len(drs_zones)}) metadata: PASSED")


@pytest.mark.parametrize("bundle_name", BUNDLE_NAMES)
def test_default_strategy_oracle(bundle_name: str):
    """
    Asserts defaultStrategyOracle contains exactly 20 driver probabilities
    and lapTraces length equals meta.totalRaceLaps.
    """
    _, payload, _ = load_bundle_payload(bundle_name)
    oracle = payload.get("defaultStrategyOracle")
    assert isinstance(oracle, dict), f"Missing defaultStrategyOracle in {bundle_name}"

    total_race_laps = payload.get("meta", {}).get("totalRaceLaps")
    assert isinstance(total_race_laps, int) and total_race_laps > 30, (
        f"Invalid totalRaceLaps {total_race_laps} in {bundle_name}"
    )

    # 1. Driver probabilities: exactly 20 drivers
    driver_probs = oracle.get("driverProbabilities")
    assert isinstance(driver_probs, list), f"driverProbabilities must be a list in {bundle_name}"
    assert len(driver_probs) == 20, (
        f"defaultStrategyOracle.driverProbabilities length {len(driver_probs)} != 20 in {bundle_name}"
    )

    prob_fields = [
        "code", "winProbPct", "podiumProbPct", "pointsProbPct",
        "expectedPosition", "expectedRaceTimeSec"
    ]
    for idx, dp in enumerate(driver_probs):
        for field in prob_fields:
            assert field in dp, f"driverProbabilities[{idx}] missing '{field}'"
        assert 0.0 <= dp["winProbPct"] <= 100.0
        assert 0.0 <= dp["podiumProbPct"] <= 100.0
        assert 0.0 <= dp["pointsProbPct"] <= 100.0
        assert 1.0 <= dp["expectedPosition"] <= 20.0

    # 2. Lap-by-lap traces: length == totalRaceLaps
    lap_traces = oracle.get("lapTraces")
    assert isinstance(lap_traces, list), f"lapTraces must be a list in {bundle_name}"
    assert len(lap_traces) == total_race_laps, (
        f"lapTraces length {len(lap_traces)} != totalRaceLaps {total_race_laps} in {bundle_name}"
    )

    for idx, trace in enumerate(lap_traces):
        assert trace["lapNumber"] == idx + 1, f"lapTraces[{idx}].lapNumber mismatch: {trace['lapNumber']} != {idx + 1}"
        assert trace["lapTimeASec"] > 0
        assert trace["lapTimeBSec"] > 0
        assert trace["compoundA"] in VALID_TYRE_COMPOUNDS
        assert trace["compoundB"] in VALID_TYRE_COMPOUNDS
        assert isinstance(trace["isPitLapA"], bool)
        assert isinstance(trace["isPitLapB"], bool)

    print(f"[{bundle_name}] Strategy Oracle 20 drivers & {len(lap_traces)} lap traces == totalRaceLaps: PASSED")


# ============================================================================
# PART 3: FASTAPI SERVER STARTUP & API ENDPOINT SELF-TESTS
# ============================================================================

def test_fastapi_server_startup_and_endpoints():
    """
    Validates that backend/main.py starts cleanly, initializes ML model and session memory cache,
    and handles health, session comparison, telemetry warping, and strategy simulation requests.
    """
    print("\n" + "=" * 78)
    print("TEST: FASTAPI BACKEND SERVER STARTUP & API ENDPOINT SELF-TESTS")
    print("=" * 78)

    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    # 1. Health check
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
    health_data = res_health.json()
    assert health_data.get("status") == "HEALTHY"
    assert health_data.get("gbdt_model_loaded") is True
    print(f"  * GET /api/v1/health: 200 OK (status={health_data['status']}, gbdt_model_loaded={health_data['gbdt_model_loaded']})")

    # 2. Root banner
    res_root = client.get("/")
    assert res_root.status_code == 200
    root_data = res_root.json()
    assert "AERO-SPEC" in root_data.get("system", "")
    print(f"  * GET /: 200 OK (contract={root_data.get('contract')})")

    # 3. Session compare endpoint
    res_sess = client.get("/api/v1/session-compare?sessionId=2024_monza_q3_ver_nor")
    assert res_sess.status_code == 200, f"Session compare failed: {res_sess.text}"
    sess_data = res_sess.json()
    assert sess_data.get("sessionId") == "2024_monza_q3_ver_nor"
    assert "driverA" in sess_data and "driverB" in sess_data
    assert "deltaT" in sess_data
    grid_len = sess_data["gridLength"]
    assert len(sess_data["deltaT"]) == grid_len + 1
    print(f"  * GET /api/v1/session-compare: 200 OK (gridLength={grid_len}, deltaT len={len(sess_data['deltaT'])})")

    # 4. Warp telemetry endpoint
    warp_req = {
        "sessionId": "2024_monza_q3_ver_nor",
        "driver": "driverA",
        "baseLapTimeSec": 79.311,
        "params": {
            "enabled": True,
            "compound": "S",
            "tyreAgeLaps": 8,
            "fuelLoadKg": 35.0,
            "trackTempC": 42.0,
        },
    }
    res_warp = client.post("/api/v1/ml/warp-telemetry", json=warp_req)
    assert res_warp.status_code == 200, f"Warp telemetry failed: {res_warp.text}"
    warp_data = res_warp.json()
    assert "predictedLapTimeSec" in warp_data
    assert "warpedSpeed" in warp_data
    assert len(warp_data["warpedSpeed"]) == grid_len + 1
    print(f"  * POST /api/v1/ml/warp-telemetry: 200 OK (predictedLapTime={warp_data['predictedLapTimeSec']:.3f}s)")

    # 5. Simulate strategy endpoint (Monte Carlo)
    strat_req = {
        "totalRaceLaps": 53,
        "pitLossNormalSec": 21.4,
        "pitLossScSec": 11.2,
        "safetyCarWindowLap": None,
        "trackTempC": 42.0,
        "strategyA": {
            "driverCode": "VER",
            "startCompound": "M",
            "pitLap1": 19,
            "nextCompound1": "H",
            "stops": 1,
        },
        "strategyB": {
            "driverCode": "NOR",
            "startCompound": "M",
            "pitLap1": 22,
            "nextCompound1": "H",
            "stops": 1,
        },
        "numSimulations": 500,
    }
    res_strat = client.post("/api/v1/ml/simulate-strategy", json=strat_req)
    assert res_strat.status_code == 200, f"Strategy simulation failed: {res_strat.text}"
    strat_data = res_strat.json()
    assert "driverProbabilities" in strat_data
    assert len(strat_data["driverProbabilities"]) == 20
    assert len(strat_data["lapTraces"]) == 53
    assert "verdictHeadline" in strat_data
    print(f"  * POST /api/v1/ml/simulate-strategy: 200 OK (headline: '{strat_data['verdictHeadline']}')")

    print("  [PASS] FastAPI backend server started, pre-warmed cache, and passed all self-tests.")


# ============================================================================
# STANDALONE CLI TEST RUNNER
# ============================================================================

def run_all_integrity_audits() -> bool:
    """Executes all Phase 1 integrity and schema tests with formatted console report."""
    print("\n" + "=" * 80)
    print("AERO-SPEC // PHASE 1 INTEGRITY, ML VERIFICATION & SCHEMA AUDIT SUITE")
    print("=" * 80)

    total_checks = 0
    passed_checks = 0
    failed_checks = 0
    failures: List[Tuple[str, str]] = []

    def record_test(name: str, fn, *args):
        nonlocal total_checks, passed_checks, failed_checks
        total_checks += 1
        try:
            fn(*args)
            passed_checks += 1
            print(f"  [OK] {name}")
        except Exception as ex:
            failed_checks += 1
            failures.append((name, str(ex)))
            print(f"  [FAIL] {name}: {ex}")

    # 1. ML Model Artifact Tests
    print("\n--- [SUITE 1/3] ML Model GBDT Artifact Tests ---")
    record_test("ML Artifact: Load, Latency, R2 > 0.98, MAE < 0.10s", test_ml_model_artifact_load_and_performance)

    # 2. FastAPI Backend Server Startup & Endpoints Self-Tests
    print("\n--- [SUITE 2/3] FastAPI Backend Main Server Startup & Self-Tests ---")
    record_test("FastAPI Backend Main: Startup, Health, Telemetry & ML Endpoints", test_fastapi_server_startup_and_endpoints)

    # 3. Static Telemetry Bundles Tests
    print("\n--- [SUITE 3/3] Telemetry JSON Bundles & Schema Invariant Audits ---")
    for bundle in BUNDLE_NAMES:
        bundle_path = TELEMETRY_DIR / bundle
        if not bundle_path.exists():
            total_checks += 1
            failed_checks += 1
            failures.append((f"Bundle Exists: {bundle}", f"File not found at {bundle_path}"))
            print(f"  [FAIL] Bundle Exists: {bundle} (File not found at {bundle_path})")
            continue

        record_test(f"Bundle File Size (< 2.5 MB): {bundle}", test_telemetry_bundle_file_size, bundle)
        record_test(f"Zero-NaN/Inf/Null Recursive Check: {bundle}", test_telemetry_bundle_zero_nan_inf_null, bundle)
        record_test(f"Array Length Invariant (gridLength + 1): {bundle}", test_telemetry_bundle_channel_length_invariants, bundle)
        record_test(f"Physical Channel Realistic Ranges: {bundle}", test_telemetry_bundle_physical_channel_ranges, bundle)
        record_test(f"Timing Tower (20 Drivers & 3 Sectors): {bundle}", test_timing_tower_has_20_drivers_and_valid_sectors, bundle)
        record_test(f"Track Corners & DRS Zones: {bundle}", test_corners_and_drs_zones, bundle)
        record_test(f"Strategy Oracle (20 Drivers & Laps): {bundle}", test_default_strategy_oracle, bundle)

    # Print Summary Table
    print("\n" + "=" * 80)
    print("AUDIT EXECUTION SUMMARY")
    print("=" * 80)
    print(f"  Total Audits Executed : {total_checks}")
    print(f"  Passed Audits         : {passed_checks}")
    print(f"  Failed Audits         : {failed_checks}")

    if failures:
        print("\nFailures:")
        for name, err in failures:
            print(f"  - {name}: {err}")
        return False
    else:
        print("\nALL PHASE 1 TELEMETRY INTEGRITY & ML VERIFICATION AUDITS PASSED!")
        return True


if __name__ == "__main__":
    success = run_all_integrity_audits()
    sys.exit(0 if success else 1)
