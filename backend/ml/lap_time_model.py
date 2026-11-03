"""
AERO-SPEC // F1 Lap-Time Regressor & Non-Linear Tire Degradation Model
Physics-informed response surface evaluator & GBDT inference engine.
"""

import os
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

ARTIFACT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts", "aero_spec_gbdt_v1.joblib")

COMPOUND_MAP = {"S": 0, "M": 1, "H": 2, "I": 3, "W": 4}
COMPOUND_PARAMS = {
    0: {"name": "Soft", "offset": 0.00, "alpha": 0.075, "cliff": 15.0, "beta": 0.014, "opt_temp": 38.0, "mu0": 1.000},
    1: {"name": "Medium", "offset": 0.42, "alpha": 0.046, "cliff": 26.0, "beta": 0.009, "opt_temp": 41.0, "mu0": 0.978},
    2: {"name": "Hard", "offset": 0.88, "alpha": 0.028, "cliff": 38.0, "beta": 0.006, "opt_temp": 44.0, "mu0": 0.956},
    3: {"name": "Intermediate", "offset": 2.80, "alpha": 0.065, "cliff": 22.0, "beta": 0.012, "opt_temp": 28.0, "mu0": 0.890},
    4: {"name": "Wet", "offset": 5.40, "alpha": 0.050, "cliff": 30.0, "beta": 0.010, "opt_temp": 24.0, "mu0": 0.830},
}

_MODEL_INSTANCE: HistGradientBoostingRegressor | None = None


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
    fuel_penalty = 0.032 * (fuel_kg - 8.0)
    temp_penalty = 0.0018 * ((track_temp_c - p["opt_temp"]) ** 2)
    return float(tyre_deg + fuel_penalty + temp_penalty + driver_delta)


def load_gbdt_model() -> HistGradientBoostingRegressor:
    """
    Loads the trained and serialized HistGradientBoostingRegressor model.
    Caches model instance in-memory for instant sub-millisecond inference.
    """
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is not None:
        return _MODEL_INSTANCE

    if not os.path.exists(ARTIFACT_PATH):
        from .train_and_verify import train_and_verify
        train_and_verify()

    _MODEL_INSTANCE = joblib.load(ARTIFACT_PATH)
    return _MODEL_INSTANCE


def predict_lap_delta(
    compound: str | int,
    tyre_age: float,
    fuel_kg: float,
    track_temp_c: float,
    driver_delta: float = 0.0,
) -> float:
    """
    Predicts lap delta (seconds above baseline) for a single vehicle configuration.
    """
    comp_id = COMPOUND_MAP[compound] if isinstance(compound, str) else int(compound)
    p = COMPOUND_PARAMS.get(comp_id, COMPOUND_PARAMS[1])
    cliff_excess_sq = max(0.0, tyre_age - p["cliff"]) ** 2

    feature_vec = np.array([[
        float(comp_id),
        float(tyre_age),
        float(cliff_excess_sq),
        float(fuel_kg),
        float(track_temp_c),
        float(driver_delta),
    ]], dtype=np.float64)

    model = load_gbdt_model()
    pred = model.predict(feature_vec)[0]
    return float(pred)


def predict_lap_time(
    base_lap_sec: float,
    compound: str | int,
    tyre_age: float,
    fuel_kg: float,
    track_temp_c: float,
    driver_delta: float = 0.0,
) -> float:
    """
    Predicts absolute lap time: base_lap_sec + predicted_delta.
    """
    delta = predict_lap_delta(compound, tyre_age, fuel_kg, track_temp_c, driver_delta)
    return float(base_lap_sec + delta)


def compute_ml_physics_warp(
    base_lap_speed: list[float] | np.ndarray,
    base_lap_brake: list[float] | np.ndarray,
    base_lap_time_sec: float,
    compound: str,
    tyre_age_laps: float,
    fuel_load_kg: float,
    track_temp_c: float,
) -> dict:
    """
    Warps a 1-meter normalized telemetry lap based on ML-predicted Tire Degradation,
    Fuel Load & Track Temp.
    """
    c_id = COMPOUND_MAP.get(compound.upper(), 0)
    p = COMPOUND_PARAMS.get(c_id, COMPOUND_PARAMS[0])

    cliff_excess = max(0.0, float(tyre_age_laps) - p["cliff"])
    deg_only_sec = p["offset"] + p["alpha"] * tyre_age_laps + p["beta"] * (cliff_excess ** 2)
    total_delta_sec = evaluate_physics_lap_delta(c_id, tyre_age_laps, fuel_load_kg, track_temp_c, 0.0)

    grip_multiplier = max(0.82, min(1.03, p["mu0"] - 0.0038 * deg_only_sec - 0.0004 * (fuel_load_kg - 8.0)))
    braking_extension_m = max(0.0, 18.0 * (1.0 - grip_multiplier) + 0.09 * (fuel_load_kg - 8.0))

    speeds = np.asarray(base_lap_speed, dtype=np.float64)
    brakes = np.asarray(base_lap_brake, dtype=np.float64)
    n = len(speeds)

    corner_grip_factor = np.sqrt(grip_multiplier)
    accel_mass_factor = 1.0 - 0.00035 * (fuel_load_kg - 8.0)

    is_corner_or_brake = (speeds < 265.0) | (brakes > 10.0)
    factors = np.where(is_corner_or_brake, corner_grip_factor, accel_mass_factor)
    warped_speed = np.clip(speeds * factors, 55.0, 362.0)

    # dt = 1.0 / (v / 3.6)
    dt_base = 1.0 / (np.maximum(50.0, speeds) / 3.6)
    dt_warp = 1.0 / (np.maximum(50.0, warped_speed) / 3.6)
    dt_diff = dt_warp - dt_base
    cum_time_diff = np.cumsum(dt_diff)

    final_diff = cum_time_diff[-1] if n > 0 else 0.0
    scale = (total_delta_sec / final_diff) if abs(final_diff) > 1e-4 else 1.0
    warped_delta_t = cum_time_diff * scale

    return {
        "predictedLapTimeSec": round(float(base_lap_time_sec + total_delta_sec), 3),
        "lapDeltaVsBaseSec": round(float(total_delta_sec), 3),
        "gripMultiplier": round(float(grip_multiplier), 3),
        "brakingExtensionM": round(float(braking_extension_m), 1),
        "warpedSpeed": np.round(warped_speed, 1).tolist(),
        "warpedDeltaT": np.round(warped_delta_t, 4).tolist(),
    }

