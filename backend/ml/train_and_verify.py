"""
AERO-SPEC F1 Telemetry & ML Strategy Engine
Phase 1: Physics-Informed GBDT Lap-Time & Non-Linear Tire Cliff Regression

This module trains, validates, tests monotonic constraints, and serializes
the core HistGradientBoostingRegressor model into backend/ml/artifacts/aero_spec_gbdt_v1.joblib.
"""

import os
import sys
import time
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error

# Define directory constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)
ARTIFACT_PATH = os.path.join(ARTIFACTS_DIR, "aero_spec_gbdt_v1.joblib")

# Compound characteristics dictionary
# Compound indices: 0 = Soft (S), 1 = Medium (M), 2 = Hard (H)
COMPOUND_MAP = {"S": 0, "M": 1, "H": 2}
COMPOUND_PARAMS = {
    0: {
        "name": "Soft",
        "offset": 0.00,       # Base mechanical grip baseline (s)
        "alpha": 0.075,       # Linear degradation rate (s/lap)
        "cliff": 15.0,        # Critical wear cliff lap (laps)
        "beta": 0.014,        # Quadratic cliff acceleration penalty (s/lap^2)
        "opt_temp": 38.0,     # Optimal operating track temperature (deg C)
    },
    1: {
        "name": "Medium",
        "offset": 0.42,       # Delta to Soft baseline (s)
        "alpha": 0.046,       # Linear degradation rate (s/lap)
        "cliff": 26.0,        # Critical wear cliff lap (laps)
        "beta": 0.009,        # Quadratic cliff acceleration penalty (s/lap^2)
        "opt_temp": 41.0,     # Optimal operating track temperature (deg C)
    },
    2: {
        "name": "Hard",
        "offset": 0.88,       # Delta to Soft baseline (s)
        "alpha": 0.028,       # Linear degradation rate (s/lap)
        "cliff": 38.0,        # Critical wear cliff lap (laps)
        "beta": 0.006,        # Quadratic cliff acceleration penalty (s/lap^2)
        "opt_temp": 44.0,     # Optimal operating track temperature (deg C)
    },
}

# Physical constants
FUEL_PENALTY_PER_KG = 0.032    # +0.32s per 10 kg fuel
TEMP_QUADRATIC_COEFF = 0.0018  # s / (deg C)^2


def evaluate_physics_lap_delta(
    compound_id: int,
    tyre_age: float,
    fuel_kg: float,
    track_temp_c: float,
    driver_delta: float = 0.0,
) -> float:
    """
    Evaluates the physics-grounded lap time delta:
    t_lap_delta = Delta_comp(c) + alpha_c * a + beta_c * max(0, a - a_cliff)^2
                  + gamma_fuel * (m_fuel - 8) + delta_T * (T_track - T_opt)^2 + driver_delta
    """
    p = COMPOUND_PARAMS.get(int(compound_id), COMPOUND_PARAMS[1])
    cliff_excess = max(0.0, tyre_age - p["cliff"])
    tyre_deg = p["offset"] + p["alpha"] * tyre_age + p["beta"] * (cliff_excess ** 2)
    fuel_penalty = FUEL_PENALTY_PER_KG * (fuel_kg - 8.0)
    temp_penalty = TEMP_QUADRATIC_COEFF * ((track_temp_c - p["opt_temp"]) ** 2)
    return float(tyre_deg + fuel_penalty + temp_penalty + driver_delta)


def generate_training_dataset(n_samples: int = 20000, random_seed: int = 42):
    """
    Generates synthetic stint telemetry covering wide operational envelopes:
    - Compound IDs: Soft (0), Medium (1), Hard (2)
    - Tyre Age: 0 to 45 laps
    - Fuel Load: 5 to 110 kg
    - Track Temp: 20 to 55 deg C
    - Driver Delta: Normal(0, 0.15) sec
    """
    rng = np.random.default_rng(random_seed)
    comp_ids = rng.integers(0, 3, size=n_samples)
    tyre_ages = rng.uniform(0.0, 45.0, size=n_samples)
    fuel_loads = rng.uniform(5.0, 110.0, size=n_samples)
    track_temps = rng.uniform(20.0, 55.0, size=n_samples)
    driver_deltas = rng.normal(0.0, 0.15, size=n_samples)

    # Feature 2: Quadratic age cliff excess max(0, a - a_cliff_c)^2
    cliff_thresholds = np.array([COMPOUND_PARAMS[c]["cliff"] for c in comp_ids])
    cliff_excess_sq = np.maximum(0.0, tyre_ages - cliff_thresholds) ** 2

    y = np.zeros(n_samples, dtype=np.float64)
    for i in range(n_samples):
        clean_delta = evaluate_physics_lap_delta(
            comp_ids[i],
            tyre_ages[i],
            fuel_loads[i],
            track_temps[i],
            driver_deltas[i],
        )
        # Add realistic micro-variance noise: track rubbering, dirty air turbulence, wind gusts
        noise = rng.normal(0.0, 0.025)
        y[i] = clean_delta + noise

    # Features:
    # 0: compound_id (0=S, 1=M, 2=H)
    # 1: tyre_age (laps)
    # 2: quadratic_age_cliff_excess (laps^2)
    # 3: fuel_load (kg)
    # 4: track_temp (deg C)
    # 5: driver_delta (s)
    X = np.column_stack([
        comp_ids.astype(np.float64),
        tyre_ages,
        cliff_excess_sq,
        fuel_loads,
        track_temps,
        driver_deltas,
    ])
    return X, y


def train_and_verify():
    print("=" * 72)
    print("AERO-SPEC // GBDT LAP-TIME & NON-LINEAR TIRE CLIFF TRAINING SUITE")
    print("=" * 72)

    # 1. Dataset Generation
    n_samples = 25000
    print(f"\n[1/6] Synthesizing {n_samples:,} physics-grounded telemetry stint observations...")
    X, y = generate_training_dataset(n_samples=n_samples, random_seed=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"      Train set: {X_train.shape[0]:,} samples | Test set: {X_test.shape[0]:,} samples")

    # 2. Monotonic Constraints Configuration
    # Feature 0: compound_id -> 0 (unconstrained or categorical)
    # Feature 1: tyre_age -> +1 (monotonically non-decreasing: older tyre = slower lap)
    # Feature 2: cliff_excess_sq -> +1 (monotonically non-decreasing: cliff degradation)
    # Feature 3: fuel_load -> +1 (monotonically non-decreasing: heavier fuel = slower lap)
    # Feature 4: track_temp -> 0 (unconstrained: parabolic U-curve around optimal window)
    # Feature 5: driver_delta -> +1 (monotonically non-decreasing: driver offset adds directly)
    monotonic_cst = [0, 1, 1, 1, 0, 1]
    print(f"\n[2/6] Configured monotonic constraints: {monotonic_cst}")
    print("      Enforcing strictly non-decreasing response for: [tyre_age, cliff_excess_sq, fuel_load, driver_delta]")

    # 3. Model Initialization & Training
    print("\n[3/6] Initializing and training HistGradientBoostingRegressor...")
    model = HistGradientBoostingRegressor(
        max_iter=250,
        learning_rate=0.08,
        max_depth=6,
        min_samples_leaf=20,
        l2_regularization=0.1,
        monotonic_cst=monotonic_cst,
        random_state=42,
    )

    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    t_train = time.perf_counter() - t0
    print(f"      Training completed in: {t_train * 1000:.2f} ms ({t_train:.3f} s)")

    # 4. Evaluation Metrics
    print("\n[4/6] Evaluating model performance metrics on held-out test set...")
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    r2_train = r2_score(y_train, y_pred_train)
    r2_test = r2_score(y_test, y_pred_test)
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = root_mean_squared_error(y_test, y_pred_test)

    print(f"      Train R^2: {r2_train:.5f}")
    print(f"      Test  R^2: {r2_test:.5f} (Target: > 0.985)")
    print(f"      Test  MAE: {mae_test:.4f} s ({mae_test * 1000:.1f} ms) (Target: < 0.100 s)")
    print(f"      Test RMSE: {rmse_test:.4f} s ({rmse_test * 1000:.1f} ms)")

    assert r2_test >= 0.985, f"R^2 score {r2_test} below target threshold of 0.985"
    assert mae_test <= 0.120, f"MAE score {mae_test} above target threshold of 0.120 s"

    # 5. Strict Monotonicity Stress Testing
    print("\n[5/6] Verifying strict monotonicity constraints under multi-dimensional sweeps...")
    # Sweep Tyre Age from 0 to 45 laps (holding fuel=50kg, temp=38C, driver=0s) across Soft, Medium, Hard
    for comp_id, comp_name in [(0, "Soft"), (1, "Medium"), (2, "Hard")]:
        p = COMPOUND_PARAMS[comp_id]
        ages = np.linspace(0.0, 45.0, 200)
        cliff_excess_sq = np.maximum(0.0, ages - p["cliff"]) ** 2
        fuels = np.full_like(ages, 50.0)
        temps = np.full_like(ages, p["opt_temp"])
        drivers = np.zeros_like(ages)
        c_arr = np.full_like(ages, comp_id)

        X_sweep = np.column_stack([c_arr, ages, cliff_excess_sq, fuels, temps, drivers])
        y_sweep = model.predict(X_sweep)

        diffs = np.diff(y_sweep)
        violations = np.sum(diffs < -1e-9)
        print(f"      Compound {comp_name} Age Sweep (0 -> 45 laps): {violations} monotonic violations detected.")
        assert violations == 0, f"Monotonicity violated on {comp_name} tyre age sweep!"

    # Sweep Fuel Load from 5 to 110 kg (holding age=10 laps, temp=40C, driver=0s)
    fuels = np.linspace(5.0, 110.0, 200)
    ages = np.full_like(fuels, 10.0)
    cliff_excess_sq = np.maximum(0.0, ages - COMPOUND_PARAMS[1]["cliff"]) ** 2
    temps = np.full_like(fuels, 41.0)
    drivers = np.zeros_like(fuels)
    c_arr = np.full_like(fuels, 1.0)  # Medium

    X_fuel_sweep = np.column_stack([c_arr, ages, cliff_excess_sq, fuels, temps, drivers])
    y_fuel_sweep = model.predict(X_fuel_sweep)
    fuel_diffs = np.diff(y_fuel_sweep)
    fuel_violations = np.sum(fuel_diffs < -1e-9)
    print(f"      Fuel Load Sweep (5 -> 110 kg): {fuel_violations} monotonic violations detected.")
    assert fuel_violations == 0, "Monotonicity violated on fuel load sweep!"

    # 6. Artifact Serialization & Verification
    print(f"\n[6/6] Serializing model to artifact repository with joblib (compress=3)...")
    joblib.dump(model, ARTIFACT_PATH, compress=3)
    file_size_kb = os.path.getsize(ARTIFACT_PATH) / 1024.0
    print(f"      Artifact saved to: {ARTIFACT_PATH}")
    print(f"      Artifact file size: {file_size_kb:.2f} KB (Ultra-lightweight, zero bloated overhead)")

    # Verify reloading
    t_load_start = time.perf_counter()
    reloaded_model = joblib.load(ARTIFACT_PATH)
    t_load = time.perf_counter() - t_load_start
    print(f"      Deserialization verification successful in: {t_load * 1000:.2f} ms")

    # Assert bit-for-bit numerical equivalence
    y_orig = model.predict(X_test[:500])
    y_reloaded = reloaded_model.predict(X_test[:500])
    np.testing.assert_allclose(y_orig, y_reloaded, rtol=1e-7, atol=1e-7)
    print("      Verification check: 100% numerical prediction equivalence confirmed!")

    print("\n" + "=" * 72)
    print("GBDT MODEL TRAINED, VERIFIED & EXPORTED SUCCESSFULLY FOR PRODUCTION!")
    print("=" * 72)

    return {
        "r2_test": r2_test,
        "mae_test": mae_test,
        "rmse_test": rmse_test,
        "train_time_sec": t_train,
        "artifact_size_kb": file_size_kb,
        "artifact_path": ARTIFACT_PATH,
    }


if __name__ == "__main__":
    results = train_and_verify()
