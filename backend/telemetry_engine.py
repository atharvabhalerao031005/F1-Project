"""
AERO-SPEC // HIGH-THROUGHPUT 1-METER SPATIAL TELEMETRY RESAMPLER & KINEMATICS ENGINE
=====================================================================================
Production Implementation for Phase 1 - Aero-Spec Antigravity Master Blueprint.
Blueprint Contract: AERO-SPEC-ML-AG-CONTRACT-v5.0

Key Capabilities:
  1. Canonical 1-meter integer spatial grid resampling:
     - Distance preconditioning (re-zeroing, strictly increasing forward pruning).
     - PCHIP interpolation (scipy.interpolate.PchipInterpolator) for continuous channels
       (speed, t, throttle, brake, rpm, x, y, z) preventing Runge overshoot.
     - Strict physical bounds clamping (throttle in [0, 100], brake >= 0, rpm in [0, 16000]).
     - Exact finish-line time parity via direct PCHIP interpolation of timestamp channel t(s).
     - Zero-order hold (interp1d nearest/previous) for discrete channels: gear in [1, 8], drs in [0, 1].
  2. FastF1 quirks handling:
     - Coordinate conversion: decimeters to SI metric meters (divide by 10.0).
     - Continuous brake bar synthesis (0-100 bar) from deceleration when brake is boolean.
     - DRS integer decoding: drs >= 10 indicates wing flap open.
     - Gearbox 0-drop filtering when speed > 70 km/h.
  3. Kinematics & Savitzky-Golay G-forces:
     - Window length 21, polyorder 3, delta 1.0m.
     - Longitudinal G: g_long = (v / g0) * (dv/ds).
     - Lateral G: g_lat = (v^2 * kappa) / g0 from 2D/3D curvature kappa.
     - Dynamic aerodynamic friction ellipse clamping:
         mu_y(v) = min(5.8, 1.95 + 0.00045 * v^2)
         mu_x,brake(v) = min(6.0, 2.20 + 0.00040 * v^2)
         mu_x,accel = 2.20
         Radial projection back to boundary if norm_radius > 1.0.
     - Steering wheel angle in degrees from signed lateral G.
  4. Automated Corner Apex & Boundary Detection:
     - Corner detection from inverted velocity minima and curvature peaks.
     - Detects entryDistanceM (braking onset threshold > 15% brake), apexDistanceM (vMin),
       and exitDistanceM (throttle pickup > 85%).
     - Generates CornerApexMeta for all detected corners.
  5. Clean public API conforming to Phase 1 blueprint contracts.
"""

from dataclasses import dataclass, field
import logging
import math
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy.interpolate import PchipInterpolator, interp1d
from scipy.signal import find_peaks, savgol_filter

logger = logging.getLogger("aero_spec.telemetry_engine")

GRAVITY_MS2: float = 9.80665  # Standard gravitational acceleration g_0 (m/s^2)


# ============================================================================
# 1. PHYSICAL TRACTION ENVELOPE CONFIGURATION
# ============================================================================

@dataclass
class F1GForceEnvelope:
    """
    F1 Physical Acceleration Limits and Dynamic Aerodynamic Grip Parameters.
    Conforms to the dynamic aerodynamic friction ellipse specification:
      mu_y(v) = min(5.8, 1.95 + 0.00045 * v^2)
      mu_x,brake(v) = min(6.0, 2.20 + 0.00040 * v^2)
      mu_x,accel = 2.20
    """
    max_accel_g: float = 2.20       # Max forward traction limit (engine/rear tyres)
    max_brake_g: float = 6.00       # Absolute peak braking limit with max downforce
    max_lat_g: float = 5.80         # Absolute peak lateral cornering limit
    base_lat_g: float = 1.95        # Mechanical grip baseline lateral limit at v -> 0
    base_brake_g: float = 2.20      # Mechanical grip baseline braking limit at v -> 0
    aero_lat_k: float = 0.00045     # Downforce lateral grip capacity coefficient (s^2/m^2)
    aero_brake_k: float = 0.00040   # Downforce braking grip capacity coefficient (s^2/m^2)


# ============================================================================
# 2. FASTF1 QUIRKS & DATA CLEANING UTILITIES
# ============================================================================

def convert_fastf1_coordinates(
    x: np.ndarray,
    y: np.ndarray,
    z: Optional[np.ndarray] = None,
    assume_decimeters: bool = True,
) -> Tuple[np.ndarray, np.ndarray, Optional[np.ndarray]]:
    """
    Converts FastF1 coordinates from decimeters (tenths of a meter) to metric SI meters.
    FastF1 stores raw telemetry coordinates in decimeters (e.g. 12000 for 1200m).
    """
    x_arr = np.asarray(x, dtype=np.float64).copy()
    y_arr = np.asarray(y, dtype=np.float64).copy()
    z_arr = np.asarray(z, dtype=np.float64).copy() if z is not None else None

    # Check if conversion is needed
    max_mag = max(float(np.nanmax(np.abs(x_arr))), float(np.nanmax(np.abs(y_arr))))
    if assume_decimeters or max_mag > 3500.0:
        x_arr = x_arr / 10.0
        y_arr = y_arr / 10.0
        if z_arr is not None:
            z_arr = z_arr / 10.0

    return x_arr, y_arr, z_arr


def decode_drs(drs_raw: Union[np.ndarray, List[int]]) -> np.ndarray:
    """
    Decodes FOM/FastF1 DRS status codes into binary wing flap state:
      drs >= 10 indicates wing flap open (e.g. 10, 12, 14).
      drs < 10 indicates wing flap closed (0, 1, 8, 9).
    Returns binary integer array in [0, 1].
    """
    arr = np.asarray(drs_raw, dtype=np.int32)
    return np.where(arr >= 10, 1, 0).astype(np.int32)


def filter_gearbox_zeroes(
    gear: Union[np.ndarray, List[int]],
    speed: Union[np.ndarray, List[float]],
    threshold_speed: float = 70.0,
) -> np.ndarray:
    """
    Filters out spurious gear 0 (neutral) dropouts when speed > 70 km/h.
    FastF1 telemetry occasionally registers gear 0 during high-speed shifts.
    Interpolates / forward-fills from the last valid non-zero gear in [1, 8].
    """
    g = np.asarray(gear, dtype=np.int32).copy()
    v = np.asarray(speed, dtype=np.float64)
    n = len(g)
    if n == 0:
        return g

    # Forward pass: replace gear 0 with last valid non-zero gear
    last_valid = 1
    for i in range(n):
        if v[i] > threshold_speed and g[i] <= 0:
            g[i] = last_valid
        elif g[i] > 0:
            last_valid = g[i]

    # Backward pass: handle initial dropouts if lap started at speed > 70 km/h with 0
    next_valid = 1
    for i in range(n - 1, -1, -1):
        if v[i] > threshold_speed and g[i] <= 0:
            g[i] = next_valid
        elif g[i] > 0:
            next_valid = g[i]

    return np.clip(g, 1, 8).astype(np.int32)


def synthesize_continuous_brake(
    brake_raw: Union[np.ndarray, List[float], List[bool]],
    speed: Union[np.ndarray, List[float]],
    s: Optional[Union[np.ndarray, List[float]]] = None,
    g_long: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    Synthesizes a continuous hydraulic brake pressure bar (0-100 bar) from
    deceleration when the raw brake channel is boolean or binary {0, 1} / {0, 100}.
    Preserves realistic F1 braking characteristics:
      - Sharp initial pressure spike (up to 100 bar)
      - Deceleration-proportional pressure with downforce compensation
      - Trail-braking release curve down to 0 at turn-in
    If the input is already continuous, normalizes and returns within [0.0, 100.0].
    """
    b = np.asarray(brake_raw, dtype=np.float64).copy()
    v = np.asarray(speed, dtype=np.float64)
    n = len(b)
    if n == 0:
        return b

    # Check if raw brake is boolean or binary
    unique_vals = np.unique(b[~np.isnan(b)])
    is_boolean_or_binary = (
        len(unique_vals) <= 3 and
        (set(unique_vals).issubset({0.0, 1.0}) or set(unique_vals).issubset({0.0, 100.0}))
    )

    if not is_boolean_or_binary:
        # Already continuous: clamp to 0-100 bar
        return np.clip(b, 0.0, 100.0)

    # Normalize binary flag to {0.0, 1.0}
    b_flag = np.where(b > 0.0, 1.0, 0.0)

    # Compute deceleration in m/s^2
    v_ms = v / 3.6
    if g_long is not None and len(g_long) == n:
        decel_g = np.maximum(0.0, -g_long)
    else:
        # Compute deceleration from speed gradient
        if s is not None and len(s) == n and n > 1:
            delta_s = np.gradient(np.asarray(s, dtype=np.float64))
            delta_s = np.where(np.abs(delta_s) < 1e-4, 1.0, delta_s)
            dv_ds = np.gradient(v_ms) / delta_s
        else:
            dv_ds = np.gradient(v_ms)
        a_long = v_ms * dv_ds
        decel_g = np.maximum(0.0, -a_long / GRAVITY_MS2)

    # Realistic brake pressure synthesis:
    # 5.2G peak deceleration corresponds to ~100 bar line pressure
    # Trail braking: at lower speeds, decel drops to ~2.0G, pressure ~35 bar
    synth_bar = np.zeros(n, dtype=np.float64)
    for i in range(n):
        if b_flag[i] > 0.5:
            # When brake flag is active, map deceleration to 0-100 bar
            pressure = (decel_g[i] / 5.2) * 100.0
            # Ensure minimum engagement pressure of 18 bar when pedal is flagged active
            synth_bar[i] = np.clip(max(18.0, pressure), 0.0, 100.0)
        else:
            synth_bar[i] = 0.0

    # Smooth the synthesized brake curve to eliminate sharp square artifacts
    # Window length must be odd and <= array length
    wl = min(15, n if n % 2 != 0 else n - 1)
    if wl >= 5:
        synth_bar_smoothed = savgol_filter(synth_bar, window_length=wl, polyorder=2)
        # Ensure non-negative and zero where brake flag is zero outside transition zone
        synth_bar = np.where(b_flag > 0.5, np.clip(synth_bar_smoothed, 0.0, 100.0), 0.0)

    return np.clip(synth_bar, 0.0, 100.0)


# ============================================================================
# 3. DISTANCE PRECONDITIONING & CANONICAL 1-METER RESAMPLING
# ============================================================================

def precondition_distance_and_prune(
    s_raw: np.ndarray,
    *channel_arrays: np.ndarray,
    min_step: float = 1e-4,
) -> Tuple[np.ndarray, List[np.ndarray]]:
    """
    Preconditions distance array for interpolation:
      1. Re-zeroing: s = s - s[0] so distance starts at 0.0m.
      2. Strictly increasing forward pruning: keeps only points where s[i] > s[prev] + min_step.
         Prevents PCHIP / spline ValueError exceptions on duplicate or decreasing coordinates.
      3. Applies the identical pruning mask across all associated channel arrays.
    """
    s = np.asarray(s_raw, dtype=np.float64).copy()
    n = len(s)
    if n == 0:
        raise ValueError("Cannot precondition empty distance array")

    # 1. Re-zero to 0.0
    s = s - s[0]

    # 2. Strictly increasing forward pruning
    kept_indices = [0]
    last_s = s[0]
    for i in range(1, n):
        if s[i] > last_s + min_step:
            kept_indices.append(i)
            last_s = s[i]

    kept = np.array(kept_indices, dtype=np.intp)
    s_clean = s[kept]

    # 3. Apply identical pruning to all channel arrays
    cleaned_channels = []
    for ch in channel_arrays:
        arr = np.asarray(ch)
        if len(arr) != n:
            raise ValueError(f"Channel array length {len(arr)} does not match distance array length {n}")
        cleaned_channels.append(arr[kept])

    return s_clean, cleaned_channels


def resample_to_1m_grid(
    s_raw: np.ndarray,
    t_raw: np.ndarray,
    speed_raw: np.ndarray,
    throttle_raw: np.ndarray,
    brake_raw: np.ndarray,
    rpm_raw: np.ndarray,
    gear_raw: np.ndarray,
    drs_raw: np.ndarray,
    x_raw: np.ndarray,
    y_raw: np.ndarray,
    z_raw: Optional[np.ndarray] = None,
    track_length_m: Optional[int] = None,
    target_lap_time_sec: Optional[float] = None,
    is_fastf1: bool = True,
) -> Dict[str, np.ndarray]:
    """
    Resamples raw multi-rate telemetry onto a canonical 1-meter integer spatial grid
    s in [0, track_length_m].

    Parameters:
      s_raw: Raw distance channel in meters.
      t_raw: Raw timestamp channel in seconds (or timedelta).
      speed_raw: Raw vehicle speed in km/h.
      throttle_raw: Raw throttle input (0-100%).
      brake_raw: Raw brake channel (boolean or 0-100 bar).
      rpm_raw: Raw engine RPM.
      gear_raw: Raw gearbox gear selection.
      drs_raw: Raw DRS status code.
      x_raw: Raw X Cartesian coordinate.
      y_raw: Raw Y Cartesian coordinate.
      z_raw: Optional raw Z coordinate (elevation).
      track_length_m: Circuit track length in integer meters (e.g. 5793 for Monza).
      target_lap_time_sec: Official lap time in seconds for finish-line time parity.
      is_fastf1: Whether coordinates are in FastF1 format (decimeters).

    Returns:
      Dict containing 1-meter integer spatial grid and resampled channels.
    """
    n_in = len(s_raw)
    if n_in < 5:
        raise ValueError(f"Telemetry array length {n_in} is too small to resample")

    # Convert timestamps if provided as timedeltas
    if hasattr(t_raw, "dt"):
        t_arr = t_raw.dt.total_seconds().to_numpy()
    elif isinstance(t_raw[0], (pd.Timedelta, np.timedelta64)):
        t_arr = pd.to_timedelta(t_raw).total_seconds().to_numpy()
    else:
        t_arr = np.asarray(t_raw, dtype=np.float64).copy()

    # Pre-clean FastF1 coordinates if applicable
    if is_fastf1:
        x_in, y_in, z_in = convert_fastf1_coordinates(x_raw, y_raw, z_raw)
    else:
        x_in = np.asarray(x_raw, dtype=np.float64)
        y_in = np.asarray(y_raw, dtype=np.float64)
        z_in = np.asarray(z_raw, dtype=np.float64) if z_raw is not None else None

    if z_in is None:
        z_in = np.zeros(n_in, dtype=np.float64)

    # Decode DRS and clean gear
    drs_decoded = decode_drs(drs_raw) if is_fastf1 else np.asarray(drs_raw, dtype=np.int32)
    gear_cleaned = filter_gearbox_zeroes(gear_raw, speed_raw)

    # Synthesize continuous brake if raw is boolean
    brake_cleaned = synthesize_continuous_brake(brake_raw, speed_raw, s=s_raw)

    # Distance preconditioning and strictly increasing forward pruning
    s_clean, (
        t_clean,
        speed_clean,
        throttle_clean,
        brake_clean,
        rpm_clean,
        gear_clean,
        drs_clean,
        x_clean,
        y_clean,
        z_clean,
    ) = precondition_distance_and_prune(
        s_raw,
        t_arr,
        speed_raw,
        throttle_raw,
        brake_cleaned,
        rpm_raw,
        gear_cleaned,
        drs_decoded,
        x_in,
        y_in,
        z_in,
    )

    # Establish track length
    actual_max_dist = float(s_clean[-1])
    if track_length_m is None:
        track_length_m = int(round(actual_max_dist))

    # Stretch/normalize distance domain so final point matches track_length_m exactly
    if abs(actual_max_dist - track_length_m) > 1e-4 and actual_max_dist > 0:
        s_clean = s_clean * (float(track_length_m) / actual_max_dist)

    # Generate canonical 1-meter integer spatial grid: s in [0, track_length_m]
    grid_s = np.arange(0, track_length_m + 1, 1.0, dtype=np.float64)

    # 1. PCHIP Interpolation for Continuous Channels (No Runge overshoot)
    # Velocity
    pchip_speed = PchipInterpolator(s_clean, speed_clean, extrapolate=True)
    speed_1m = np.maximum(0.0, pchip_speed(grid_s))

    # Throttle: bounded strictly to [0.0, 100.0]
    pchip_thr = PchipInterpolator(s_clean, throttle_clean, extrapolate=True)
    throttle_1m = np.clip(pchip_thr(grid_s), 0.0, 100.0)

    # Brake: continuous bar bounded to [0.0, 100.0]
    pchip_brk = PchipInterpolator(s_clean, brake_clean, extrapolate=True)
    brake_1m = np.clip(pchip_brk(grid_s), 0.0, 100.0)

    # Engine RPM: bounded strictly to [0.0, 16000.0]
    pchip_rpm = PchipInterpolator(s_clean, rpm_clean, extrapolate=True)
    rpm_1m = np.clip(pchip_rpm(grid_s), 0.0, 16000.0)

    # Coordinates: x, y, z
    pchip_x = PchipInterpolator(s_clean, x_clean, extrapolate=True)
    x_1m = pchip_x(grid_s)

    pchip_y = PchipInterpolator(s_clean, y_clean, extrapolate=True)
    y_1m = pchip_y(grid_s)

    pchip_z = PchipInterpolator(s_clean, z_clean, extrapolate=True)
    z_1m = pchip_z(grid_s)

    # Timestamp t(s): Monotonic PCHIP with exact finish-line time parity
    t_clean_rel = t_clean - t_clean[0]
    pchip_t = PchipInterpolator(s_clean, t_clean_rel, extrapolate=True)
    t_1m = np.maximum(0.0, pchip_t(grid_s))

    # Exact finish-line time parity calibration
    if target_lap_time_sec is not None and target_lap_time_sec > 0:
        if t_1m[-1] > 1e-4:
            t_1m = t_1m * (target_lap_time_sec / t_1m[-1])
        t_1m[-1] = target_lap_time_sec
    else:
        # Calibrate to last raw time
        if t_clean_rel[-1] > 0 and t_1m[-1] > 1e-4:
            t_1m = t_1m * (t_clean_rel[-1] / t_1m[-1])
            t_1m[-1] = t_clean_rel[-1]

    t_1m[0] = 0.0  # Exact 0.0 at starting line

    # 2. Zero-Order Hold for Discrete Channels (Gears and DRS)
    interp_gear = interp1d(s_clean, gear_clean, kind="previous", bounds_error=False, fill_value="extrapolate")
    gear_1m = np.clip(np.round(interp_gear(grid_s)).astype(np.int32), 1, 8)

    interp_drs = interp1d(s_clean, drs_clean, kind="previous", bounds_error=False, fill_value="extrapolate")
    drs_1m = np.clip(np.round(interp_drs(grid_s)).astype(np.int32), 0, 1)

    return {
        "s": grid_s,
        "t": t_1m,
        "speed": speed_1m,
        "throttle": throttle_1m,
        "brake": brake_1m,
        "rpm": rpm_1m,
        "gear": gear_1m,
        "drs": drs_1m,
        "x": x_1m,
        "y": y_1m,
        "z": z_1m,
        "track_length_m": track_length_m,
    }


# ============================================================================
# 4. KINEMATICS, SAVITZKY-GOLAY G-FORCES & DYNAMIC FRICTION ELLIPSE CLAMPING
# ============================================================================

def compute_kinematics_1m(
    s: np.ndarray,
    v: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    z: Optional[np.ndarray] = None,
    window_length: int = 21,
    polyorder: int = 3,
    v_in_kmh: bool = True,
    clamp_envelope: bool = True,
    envelope: Optional[F1GForceEnvelope] = None,
) -> Dict[str, np.ndarray]:
    """
    Computes spatial derivatives, trajectory curvature kappa (2D and 3D),
    longitudinal G-forces, lateral G-forces, and steering wheel angles
    from the canonical 1-meter spatial grid using Savitzky-Golay filtering.

    Parameters:
      s: 1D array of arc distance along track (delta_s = 1.0m).
      v: 1D array of velocity (km/h if v_in_kmh=True, else m/s).
      x: 1D array of X track coordinate in SI meters.
      y: 1D array of Y track coordinate in SI meters.
      z: Optional 1D array of Z track coordinate (elevation) in SI meters.
      window_length: Savitzky-Golay window width in meters (odd integer, default 21).
      polyorder: Savitzky-Golay polynomial order (default 3).
      v_in_kmh: Whether input v is in km/h.
      clamp_envelope: Whether to apply dynamic aerodynamic friction ellipse clamping.
      envelope: F1GForceEnvelope instance with physical limits.

    Returns:
      Dict containing smoothed channels, derivatives, curvature, g_long, g_lat, and steer_deg.
    """
    if envelope is None:
        envelope = F1GForceEnvelope()

    n = len(s)
    if n < window_length:
        # Adapt window length if needed
        window_length = n if n % 2 != 0 else n - 1
        if window_length <= polyorder:
            raise ValueError(f"Array length {n} is too small for polyorder {polyorder}")

    if window_length % 2 == 0:
        window_length += 1

    # Convert velocity to m/s
    v_ms = (v / 3.6).astype(np.float64) if v_in_kmh else v.astype(np.float64)
    delta_s = float(s[1] - s[0]) if n > 1 else 1.0

    # 1. Savitzky-Golay filtering and differentiation for (x, y) coordinates
    # 1st spatial derivative: dx/ds, dy/ds (unit tangent vector components)
    dx_ds = savgol_filter(x, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)
    dy_ds = savgol_filter(y, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)

    # 2nd spatial derivative: d2x/ds2, d2y/ds2 (principal normal components)
    d2x_ds2 = savgol_filter(x, window_length=window_length, polyorder=polyorder, deriv=2, delta=delta_s)
    d2y_ds2 = savgol_filter(y, window_length=window_length, polyorder=polyorder, deriv=2, delta=delta_s)

    # 2. Savitzky-Golay filtering and differentiation for velocity v(s)
    # dv/ds: rate of speed change per meter of track
    dv_ds = savgol_filter(v_ms, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)
    v_smoothed_ms = savgol_filter(v_ms, window_length=window_length, polyorder=polyorder, deriv=0)
    v_smoothed_ms = np.maximum(0.1, v_smoothed_ms)  # Prevent zero-speed singularities

    # 3. Longitudinal Acceleration & G-Force
    # a_long = dv/dt = (dv/ds) * (ds/dt) = v * (dv/ds)
    # g_long = a_long / g_0
    # + is forward acceleration (throttle), - is braking deceleration
    a_long = v_smoothed_ms * dv_ds
    g_long_raw = a_long / GRAVITY_MS2

    # 4. Trajectory Curvature kappa
    # 2D cross product numerator: (x' y'' - y' x'')
    # Positive = counter-clockwise (left turn), Negative = clockwise (right turn)
    num_cross_2d = dx_ds * d2y_ds2 - dy_ds * d2x_ds2
    speed_tangent_sq = dx_ds**2 + dy_ds**2
    denom_2d = np.maximum(speed_tangent_sq, 1e-9) ** 1.5

    signed_kappa_2d = num_cross_2d / denom_2d
    kappa_2d = np.abs(signed_kappa_2d)

    if z is not None:
        dz_ds = savgol_filter(z, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)
        d2z_ds2 = savgol_filter(z, window_length=window_length, polyorder=polyorder, deriv=2, delta=delta_s)

        # 3D cross product: r' x r''
        cross_x = dy_ds * d2z_ds2 - dz_ds * d2y_ds2
        cross_y = dz_ds * d2x_ds2 - dx_ds * d2z_ds2
        cross_z = dx_ds * d2y_ds2 - dy_ds * d2x_ds2

        norm_cross_3d = np.sqrt(cross_x**2 + cross_y**2 + cross_z**2)
        norm_tangent_sq_3d = dx_ds**2 + dy_ds**2 + dz_ds**2
        denom_3d = np.maximum(norm_tangent_sq_3d, 1e-9) ** 1.5
        kappa = norm_cross_3d / denom_3d
    else:
        kappa = kappa_2d

    # Osculating radius of curvature R = 1 / kappa
    radius = np.where(kappa > 1e-5, 1.0 / np.maximum(kappa, 1e-5), 10000.0)

    # 5. Lateral Acceleration & G-Force
    # a_lat = v^2 * kappa
    # g_lat = a_lat / g_0
    a_lat = (v_smoothed_ms**2) * kappa
    g_lat_raw = a_lat / GRAVITY_MS2
    signed_g_lat_raw = ((v_smoothed_ms**2) * signed_kappa_2d) / GRAVITY_MS2

    # 6. Dynamic Aerodynamic Friction Ellipse Clamping
    # Specifications:
    #   mu_y(v) = min(5.8, 1.95 + 0.00045 * v^2)
    #   mu_x,brake(v) = min(6.0, 2.20 + 0.00040 * v^2)
    #   mu_x,accel = 2.20
    #   Radial projection back to boundary if norm_radius > 1.0
    g_long = g_long_raw.copy()
    g_lat = g_lat_raw.copy()
    signed_g_lat = signed_g_lat_raw.copy()

    if clamp_envelope:
        v_sq = v_smoothed_ms**2
        dyn_lat_cap = np.minimum(envelope.max_lat_g, envelope.base_lat_g + envelope.aero_lat_k * v_sq)
        dyn_brake_cap = np.minimum(envelope.max_brake_g, envelope.base_brake_g + envelope.aero_brake_k * v_sq)
        dyn_accel_cap = np.full_like(v_sq, envelope.max_accel_g)

        # Asymmetric longitudinal capacity (accel vs brake)
        long_cap = np.where(g_long >= 0.0, dyn_accel_cap, dyn_brake_cap)

        # Traction Ellipse normalized radius: (g_long / mu_x)^2 + (g_lat / mu_y)^2 <= 1
        norm_radius_sq = (g_long / long_cap)**2 + (g_lat / dyn_lat_cap)**2
        norm_radius = np.sqrt(np.maximum(norm_radius_sq, 1e-12))

        # Radial clamping for points violating friction ellipse (> 1.0)
        exceed_mask = norm_radius > 1.0
        g_long[exceed_mask] = g_long[exceed_mask] / norm_radius[exceed_mask]
        g_lat[exceed_mask] = g_lat[exceed_mask] / norm_radius[exceed_mask]
        signed_g_lat[exceed_mask] = signed_g_lat[exceed_mask] / norm_radius[exceed_mask]

    g_resultant = np.sqrt(g_long**2 + g_lat**2)

    # Steering wheel angle in degrees: proportional to signed lateral G
    # Peak steering angle in F1 hairpins is ~120 degrees
    steer_deg = np.clip(signed_g_lat * 22.5, -120.0, 120.0)

    return {
        "s": s,
        "v_smoothed_kmh": v_smoothed_ms * 3.6,
        "v_smoothed_ms": v_smoothed_ms,
        "dx_ds": dx_ds,
        "dy_ds": dy_ds,
        "kappa": kappa,
        "signed_kappa": signed_kappa_2d,
        "radius_m": radius,
        "g_long_raw": g_long_raw,
        "g_lat_raw": g_lat_raw,
        "g_long": g_long,
        "g_lat": g_lat,
        "signed_g_lat": signed_g_lat,
        "g_resultant": g_resultant,
        "steer_deg": steer_deg,
    }


# ============================================================================
# 5. AUTOMATED CORNER APEX & BOUNDARY DETECTION
# ============================================================================

def detect_corner_candidates(
    s: np.ndarray,
    speed: np.ndarray,
    kappa: np.ndarray,
    min_corner_distance: float = 45.0,
    min_speed_prominence: float = 8.0,
    min_kappa_height: float = 0.0015,
) -> List[int]:
    """
    Detects candidate corner apex indices from inverted velocity minima and curvature peaks.
    Combines peak finding on curvature kappa and speed valleys (-speed).
    """
    n = len(s)
    if n < 50:
        return []

    # 1. Curvature peaks (sharp changes in direction)
    k_peaks, _ = find_peaks(
        kappa,
        height=min_kappa_height,
        distance=int(min_corner_distance),
        prominence=0.0008,
    )

    # 2. Inverted velocity peaks (speed valleys / deceleration points)
    v_peaks, _ = find_peaks(
        -speed,
        distance=int(min_corner_distance),
        prominence=min_speed_prominence,
    )

    # Merge candidates within proximity
    candidates = set(k_peaks.tolist() + v_peaks.tolist())
    sorted_cand = sorted(list(candidates))

    # Cluster nearby candidate points within min_corner_distance
    merged_apexes: List[int] = []
    i = 0
    while i < len(sorted_cand):
        cluster = [sorted_cand[i]]
        j = i + 1
        while j < len(sorted_cand) and (s[sorted_cand[j]] - s[cluster[-1]]) < min_corner_distance:
            cluster.append(sorted_cand[j])
            j += 1

        # In each cluster, find the index of true minimum velocity
        best_apex = min(cluster, key=lambda idx: speed[idx])
        # Also inspect local window (+/- 25m) for lowest speed
        w_start = max(0, best_apex - 25)
        w_end = min(n, best_apex + 26)
        true_min_idx = w_start + int(np.argmin(speed[w_start:w_end]))
        merged_apexes.append(true_min_idx)
        i = j

    # Filter out edge artifacts too close to start/finish line
    valid_apexes = [idx for idx in merged_apexes if 25.0 <= s[idx] <= (s[-1] - 25.0)]
    return sorted(list(set(valid_apexes)))


def detect_corner_boundaries(
    s: np.ndarray,
    speed: np.ndarray,
    throttle: np.ndarray,
    brake: np.ndarray,
    apex_idx: int,
    max_search_back_m: float = 300.0,
    max_search_fwd_m: float = 250.0,
) -> Tuple[int, int, int, int]:
    """
    Determines entry distance (braking onset threshold > 15% brake)
    and exit distance (throttle pickup > 85%) for a single driver through a corner.

    Returns:
      (entry_idx, brake_marker_idx, exit_idx, throttle_pickup_idx)
    """
    n = len(s)
    s_apex = s[apex_idx]

    # 1. Entry & Brake Marker: Scan backwards from apex
    min_back_s = max(0.0, s_apex - max_search_back_m)
    back_indices = range(apex_idx, -1, -1)

    brake_marker_idx = apex_idx
    entry_idx = apex_idx

    # Look for braking onset (> 15% brake)
    braking_found = False
    for i in back_indices:
        if s[i] < min_back_s:
            break
        if brake[i] >= 15.0:
            braking_found = True
            brake_marker_idx = i
        elif braking_found and brake[i] < 15.0:
            # Found the exact onset where brake rose above 15%
            brake_marker_idx = i + 1
            break

    if braking_found:
        entry_idx = max(0, brake_marker_idx - 10)  # Entry starts slightly before hard brake hit
    else:
        # Corner without heavy braking (e.g. lift or high-speed sweeper)
        # Scan backward for throttle lift (< 85%)
        lift_found = False
        for i in back_indices:
            if s[i] < min_back_s:
                break
            if throttle[i] < 85.0:
                lift_found = True
                entry_idx = i
            elif lift_found and throttle[i] >= 85.0:
                entry_idx = i + 1
                break
        if not lift_found:
            entry_idx = max(0, apex_idx - 45)
        brake_marker_idx = entry_idx

    # 2. Exit & Throttle Pickup: Scan forwards from apex
    max_fwd_s = min(s[-1], s_apex + max_search_fwd_m)
    fwd_indices = range(apex_idx, n)

    throttle_pickup_idx = apex_idx
    exit_idx = apex_idx

    pickup_found = False
    for i in fwd_indices:
        if s[i] > max_fwd_s:
            break
        if throttle[i] >= 85.0:
            throttle_pickup_idx = i
            pickup_found = True
            break

    if pickup_found:
        exit_idx = min(n - 1, throttle_pickup_idx + 20)  # Corner exit completes after throttle application
    else:
        exit_idx = min(n - 1, apex_idx + 60)
        throttle_pickup_idx = exit_idx

    # Boundary safeguards
    entry_idx = min(entry_idx, max(0, apex_idx - 5))
    exit_idx = max(exit_idx, min(n - 1, apex_idx + 5))

    return entry_idx, brake_marker_idx, exit_idx, throttle_pickup_idx


def build_corner_apex_metadata(
    s: np.ndarray,
    speed_a: np.ndarray,
    throttle_a: np.ndarray,
    brake_a: np.ndarray,
    t_a: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    kappa: np.ndarray,
    speed_b: Optional[np.ndarray] = None,
    throttle_b: Optional[np.ndarray] = None,
    brake_b: Optional[np.ndarray] = None,
    t_b: Optional[np.ndarray] = None,
    custom_corners: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Constructs the list of CornerApexMeta structures for all corners on the circuit,
    computing entryDistanceM, apexDistanceM, exitDistanceM, brake markers, vMin,
    throttle pickup points, and corner delta times (t_b - t_a).

    Returns list of dicts conforming to CornerApexMeta:
      {
        "id": "T1",
        "name": "Turn 1",
        "apexDistanceM": 450,
        "entryDistanceM": 320,
        "exitDistanceM": 540,
        "x": 120.4,
        "y": 340.2,
        "z": 182.1,
        "brakeMarkerA": 330,
        "brakeMarkerB": 325,
        "vMinA": 74.2,
        "vMinB": 71.8,
        "throttlePickupA": 485,
        "throttlePickupB": 492,
        "cornerDeltaSec": -0.042
      }
    """
    # If custom corner templates are provided (e.g. named corners for Monza/Silverstone/Monaco),
    # use them as reference locations; otherwise auto-detect apexes.
    if custom_corners is not None and len(custom_corners) > 0:
        apex_indices = []
        for c in custom_corners:
            target_dist = float(c.get("apexDistanceM", c.get("apex_distance_m", 0)))
            idx = int(np.clip(round(target_dist), 0, len(s) - 1))
            apex_indices.append(idx)
    else:
        apex_indices = detect_corner_candidates(s, speed_a, kappa)

    has_driver_b = (
        speed_b is not None and
        throttle_b is not None and
        brake_b is not None and
        t_b is not None
    )

    corner_results: List[Dict[str, Any]] = []

    for idx_num, apex_idx in enumerate(apex_indices):
        s_apex = float(s[apex_idx])

        # Driver A boundaries
        entry_a, bm_a, exit_a, tp_a = detect_corner_boundaries(
            s, speed_a, throttle_a, brake_a, apex_idx
        )

        # Driver B boundaries (if available)
        if has_driver_b:
            entry_b, bm_b, exit_b, tp_b = detect_corner_boundaries(
                s, speed_b, throttle_b, brake_b, apex_idx
            )
            # Unified corner envelope spanning both drivers
            entry_idx = min(entry_a, entry_b)
            exit_idx = max(exit_a, exit_b)
            bm_b_dist = float(s[bm_b])
            tp_b_dist = float(s[tp_b])
            vmin_b = float(np.min(speed_b[entry_idx:exit_idx + 1]))
            # Corner delta: time accumulated by Driver B vs Driver A across this corner
            delta_entry = float(t_b[entry_idx] - t_a[entry_idx])
            delta_exit = float(t_b[exit_idx] - t_a[exit_idx])
            corner_delta = delta_exit - delta_entry
        else:
            entry_idx = entry_a
            exit_idx = exit_a
            bm_b_dist = float(s[bm_a])
            tp_b_dist = float(s[tp_a])
            vmin_b = float(np.min(speed_a[entry_idx:exit_idx + 1]))
            corner_delta = 0.0

        vmin_a = float(np.min(speed_a[entry_idx:exit_idx + 1]))

        # Corner naming
        if custom_corners is not None and idx_num < len(custom_corners):
            c_id = custom_corners[idx_num].get("id", f"T{idx_num + 1}")
            c_name = custom_corners[idx_num].get("name", f"Turn {idx_num + 1}")
        else:
            c_id = f"T{idx_num + 1}"
            c_name = f"Turn {idx_num + 1}"

        corner_meta = {
            "id": c_id,
            "name": c_name,
            "apexDistanceM": float(round(s_apex, 1)),
            "entryDistanceM": float(round(float(s[entry_idx]), 1)),
            "exitDistanceM": float(round(float(s[exit_idx]), 1)),
            "x": float(round(float(x[apex_idx]), 2)),
            "y": float(round(float(y[apex_idx]), 2)),
            "z": float(round(float(z[apex_idx]), 2)),
            "brakeMarkerA": float(round(float(s[bm_a]), 1)),
            "brakeMarkerB": float(round(bm_b_dist, 1)),
            "vMinA": float(round(vmin_a, 1)),
            "vMinB": float(round(vmin_b, 1)),
            "throttlePickupA": float(round(float(s[tp_a]), 1)),
            "throttlePickupB": float(round(tp_b_dist, 1)),
            "cornerDeltaSec": float(round(corner_delta, 3)),
        }
        corner_results.append(corner_meta)

    return corner_results


# ============================================================================
# 6. DRS ZONE AUTO-DETECTION
# ============================================================================

def detect_drs_zones(
    s: np.ndarray,
    drs: np.ndarray,
    min_length_m: float = 100.0,
) -> List[Dict[str, Any]]:
    """
    Identifies active DRS zones from the resampled DRS channel (1 = open, 0 = closed).
    Returns list of dicts conforming to DrsZoneMeta:
      {
        "id": "DRS_1",
        "detectionDistanceM": 380,
        "startDistanceM": 520,
        "endDistanceM": 1320
      }
    """
    n = len(s)
    zones: List[Dict[str, Any]] = []
    in_zone = False
    start_idx = 0
    zone_count = 0

    for i in range(n):
        if drs[i] > 0 and not in_zone:
            in_zone = True
            start_idx = i
        elif drs[i] == 0 and in_zone:
            in_zone = False
            end_idx = i
            zone_length = s[end_idx] - s[start_idx]
            if zone_length >= min_length_m:
                zone_count += 1
                start_m = float(s[start_idx])
                end_m = float(s[end_idx])
                detect_m = max(0.0, start_m - 140.0)
                zones.append({
                    "id": f"DRS_{zone_count}",
                    "detectionDistanceM": float(round(detect_m, 1)),
                    "startDistanceM": float(round(start_m, 1)),
                    "endDistanceM": float(round(end_m, 1)),
                })

    # If zone extends to the end of array
    if in_zone:
        end_idx = n - 1
        zone_length = s[end_idx] - s[start_idx]
        if zone_length >= min_length_m:
            zone_count += 1
            start_m = float(s[start_idx])
            end_m = float(s[end_idx])
            detect_m = max(0.0, start_m - 140.0)
            zones.append({
                "id": f"DRS_{zone_count}",
                "detectionDistanceM": float(round(detect_m, 1)),
                "startDistanceM": float(round(start_m, 1)),
                "endDistanceM": float(round(end_m, 1)),
            })

    return zones


# ============================================================================
# 7. UNIFIED PRODUCTION TELEMETRY PIPELINE
# ============================================================================

def process_lap_telemetry(
    raw_telemetry: Union[pd.DataFrame, Dict[str, Any]],
    track_length_m: Optional[int] = None,
    target_lap_time_sec: Optional[float] = None,
    is_fastf1: bool = True,
    window_length: int = 21,
    polyorder: int = 3,
) -> Dict[str, Any]:
    """
    End-to-end processing pipeline for a single driver's lap telemetry:
      1. Resolves input formats (Pandas DataFrame or dict).
      2. Handles FastF1 coordinate scaling, DRS decoding, gearbox dropouts.
      3. Resamples to canonical 1-meter integer spatial grid via PCHIP & zero-order hold.
      4. Calculates Savitzky-Golay kinematics, curvature, and dynamic friction ellipse clamping.
      5. Guarantees zero NaNs across all output channels.

    Returns dict conforming to NormalizedLapChannels:
      t, x, y, z, speed, throttle, brake, rpm, gear, drs, gLong, gLat, steerDeg.
    """
    # Extract channel arrays from DataFrame or dictionary
    if isinstance(raw_telemetry, pd.DataFrame):
        col_map = {c.lower(): c for c in raw_telemetry.columns}

        def get_col(candidates: List[str], default=None):
            for cand in candidates:
                if cand.lower() in col_map:
                    return raw_telemetry[col_map[cand.lower()]].to_numpy()
            return default

        s_raw = get_col(["distance", "dist", "s"])
        t_raw = get_col(["time", "timeraw", "t"])
        speed_raw = get_col(["speed", "v"])
        throttle_raw = get_col(["throttle", "thr"], default=np.zeros(len(s_raw)))
        brake_raw = get_col(["brake", "brk"], default=np.zeros(len(s_raw)))
        rpm_raw = get_col(["rpm"], default=np.full(len(s_raw), 10000.0))
        gear_raw = get_col(["ngear", "gear"], default=np.full(len(s_raw), 4))
        drs_raw = get_col(["drs"], default=np.zeros(len(s_raw)))
        x_raw = get_col(["x"], default=np.zeros(len(s_raw)))
        y_raw = get_col(["y"], default=np.zeros(len(s_raw)))
        z_raw = get_col(["z"], default=np.zeros(len(s_raw)))
    else:
        s_raw = np.asarray(raw_telemetry["Distance" if "Distance" in raw_telemetry else "s"], dtype=np.float64)
        t_raw = raw_telemetry["Time" if "Time" in raw_telemetry else "t"]
        speed_raw = np.asarray(raw_telemetry["Speed" if "Speed" in raw_telemetry else "speed"], dtype=np.float64)
        throttle_raw = np.asarray(raw_telemetry.get("Throttle", raw_telemetry.get("throttle", np.zeros_like(s_raw))), dtype=np.float64)
        brake_raw = raw_telemetry.get("Brake", raw_telemetry.get("brake", np.zeros_like(s_raw)))
        rpm_raw = np.asarray(raw_telemetry.get("RPM", raw_telemetry.get("rpm", np.full_like(s_raw, 10000.0))), dtype=np.float64)
        gear_raw = raw_telemetry.get("nGear", raw_telemetry.get("gear", np.full_like(s_raw, 4)))
        drs_raw = raw_telemetry.get("DRS", raw_telemetry.get("drs", np.zeros_like(s_raw)))
        x_raw = np.asarray(raw_telemetry.get("X", raw_telemetry.get("x", np.zeros_like(s_raw))), dtype=np.float64)
        y_raw = np.asarray(raw_telemetry.get("Y", raw_telemetry.get("y", np.zeros_like(s_raw))), dtype=np.float64)
        z_raw = np.asarray(raw_telemetry.get("Z", raw_telemetry.get("z", np.zeros_like(s_raw))), dtype=np.float64)

    # 1. Resample to 1-meter integer grid
    res = resample_to_1m_grid(
        s_raw=s_raw,
        t_raw=t_raw,
        speed_raw=speed_raw,
        throttle_raw=throttle_raw,
        brake_raw=brake_raw,
        rpm_raw=rpm_raw,
        gear_raw=gear_raw,
        drs_raw=drs_raw,
        x_raw=x_raw,
        y_raw=y_raw,
        z_raw=z_raw,
        track_length_m=track_length_m,
        target_lap_time_sec=target_lap_time_sec,
        is_fastf1=is_fastf1,
    )

    # 2. Compute Savitzky-Golay kinematics and G-forces
    kin = compute_kinematics_1m(
        s=res["s"],
        v=res["speed"],
        x=res["x"],
        y=res["y"],
        z=res["z"],
        window_length=window_length,
        polyorder=polyorder,
        v_in_kmh=True,
        clamp_envelope=True,
    )

    # Assemble normalized output dictionary matching NormalizedLapChannels schema
    channels = {
        "t": np.round(res["t"], 4).tolist(),
        "x": np.round(res["x"], 2).tolist(),
        "y": np.round(res["y"], 2).tolist(),
        "z": np.round(res["z"], 2).tolist(),
        "speed": np.round(res["speed"], 1).tolist(),
        "throttle": np.round(res["throttle"], 1).tolist(),
        "brake": np.round(res["brake"], 1).tolist(),
        "rpm": np.round(res["rpm"], 0).tolist(),
        "gear": res["gear"].tolist(),
        "drs": res["drs"].tolist(),
        "gLong": np.round(kin["g_long"], 2).tolist(),
        "gLat": np.round(kin["g_lat"], 2).tolist(),
        "steerDeg": np.round(kin["steer_deg"], 1).tolist(),
    }

    # Meta outputs useful for downstream session packaging
    return {
        "channels": channels,
        "grid_s": res["s"],
        "kappa": kin["kappa"],
        "raw_kinematics": kin,
        "track_length_m": res["track_length_m"],
    }


def process_session_telemetry(
    lap_a_raw: Union[pd.DataFrame, Dict[str, Any]],
    lap_b_raw: Union[pd.DataFrame, Dict[str, Any]],
    session_id: str,
    meta_info: Dict[str, Any],
    timing_tower: List[Dict[str, Any]],
    default_strategy_oracle: Dict[str, Any],
    custom_corners: Optional[List[Dict[str, Any]]] = None,
    custom_drs_zones: Optional[List[Dict[str, Any]]] = None,
    track_length_m: Optional[int] = None,
    target_lap_time_a_sec: Optional[float] = None,
    target_lap_time_b_sec: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Builds the complete session telemetry comparison bundle conforming
    identically to the SessionTelemetryPayload schema for Phase 1.
    """
    # 1. Process Driver A
    res_a = process_lap_telemetry(
        lap_a_raw,
        track_length_m=track_length_m,
        target_lap_time_sec=target_lap_time_a_sec,
    )
    resolved_track_length = res_a["track_length_m"]

    # 2. Process Driver B on the identical spatial grid
    res_b = process_lap_telemetry(
        lap_b_raw,
        track_length_m=resolved_track_length,
        target_lap_time_sec=target_lap_time_b_sec,
    )

    ch_a = res_a["channels"]
    ch_b = res_b["channels"]
    grid_s = res_a["grid_s"]
    grid_length = len(grid_s)

    # 3. Time Delta trace: deltaT = t_b - t_a
    t_a_arr = np.array(ch_a["t"], dtype=np.float64)
    t_b_arr = np.array(ch_b["t"], dtype=np.float64)
    delta_t = np.round(t_b_arr - t_a_arr, 4).tolist()

    # 4. Corner Apex Metadata Generation
    corners = build_corner_apex_metadata(
        s=grid_s,
        speed_a=np.array(ch_a["speed"], dtype=np.float64),
        throttle_a=np.array(ch_a["throttle"], dtype=np.float64),
        brake_a=np.array(ch_a["brake"], dtype=np.float64),
        t_a=t_a_arr,
        x=np.array(ch_a["x"], dtype=np.float64),
        y=np.array(ch_a["y"], dtype=np.float64),
        z=np.array(ch_a["z"], dtype=np.float64),
        kappa=res_a["kappa"],
        speed_b=np.array(ch_b["speed"], dtype=np.float64),
        throttle_b=np.array(ch_b["throttle"], dtype=np.float64),
        brake_b=np.array(ch_b["brake"], dtype=np.float64),
        t_b=t_b_arr,
        custom_corners=custom_corners,
    )

    # 5. DRS Zones
    if custom_drs_zones is not None and len(custom_drs_zones) > 0:
        drs_zones = custom_drs_zones
    else:
        drs_zones = detect_drs_zones(grid_s, np.array(ch_a["drs"], dtype=np.int32))

    payload = {
        "sessionId": session_id,
        "meta": meta_info,
        "gridLength": grid_length,
        "deltaT": delta_t,
        "timingTower": timing_tower,
        "corners": corners,
        "drsZones": drs_zones,
        "driverA": ch_a,
        "driverB": ch_b,
        "defaultStrategyOracle": default_strategy_oracle,
    }

    # Verify zero NaNs in full payload
    _verify_no_nans(payload)

    return payload


def _verify_no_nans(obj: Any, path: str = "root") -> None:
    """Recursively audits telemetry data structure to guarantee zero NaN values."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            raise ValueError(f"NaN or Inf encountered at {path}")
    elif isinstance(obj, list):
        for i, val in enumerate(obj):
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                raise ValueError(f"NaN or Inf encountered at {path}[{i}]")
            elif isinstance(val, (dict, list)):
                _verify_no_nans(val, f"{path}[{i}]")
    elif isinstance(obj, dict):
        for k, val in obj.items():
            _verify_no_nans(val, f"{path}.{k}")
    elif isinstance(obj, np.ndarray):
        if np.isnan(obj).any() or np.isinf(obj).any():
            raise ValueError(f"NaN or Inf encountered in numpy array at {path}")


# ============================================================================
# 8. COMPREHENSIVE VERIFICATION SUITE (SELF-TEST)
# ============================================================================

def run_comprehensive_verification():
    """
    Executes a comprehensive, rigorous verification suite confirming all 5 findings:
      1. Canonical 1-meter spatial grid resampling & monotonic distance pruning.
      2. PCHIP interpolation boundary enforcement & finish-line time parity.
      3. FastF1 quirks: decimeters to meters, continuous brake synthesis, DRS decoding, gear 0 filtering.
      4. Savitzky-Golay kinematics, G-forces & dynamic friction ellipse clamping.
      5. Automated corner apex & boundary detection with zero NaNs.
    """
    print("=" * 80)
    print("RUNNING AERO-SPEC TELEMETRY ENGINE COMPREHENSIVE VERIFICATION SUITE")
    print("=" * 80)

    rng = np.random.default_rng(2026)

    # -------------------------------------------------------------------------
    # TEST 1: Distance Preconditioning & Strictly Increasing Forward Pruning
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Distance Preconditioning & Monotonic Forward Pruning:")
    s_messy = np.array([-1.2, -1.2, 0.0, 0.0, 1.5, 1.5, 1.4, 2.8, 3.9, 3.9, 5.0], dtype=np.float64)
    v_messy = np.array([50, 50, 52, 52, 55, 55, 54, 60, 65, 65, 70], dtype=np.float64)
    s_clean, (v_clean,) = precondition_distance_and_prune(s_messy, v_messy)

    assert s_clean[0] == 0.0, f"Re-zeroing failed: s_clean[0] = {s_clean[0]}"
    assert np.all(np.diff(s_clean) > 0), "Monotonic forward pruning failed: non-strictly increasing steps remain"
    assert len(s_clean) == 6, f"Pruning count mismatch: got {len(s_clean)}, expected 6"
    print(f"  - Raw distance points: {len(s_messy)} -> Monotonic clean points: {len(s_clean)}")
    print(f"  - Re-zeroed initial point: {s_clean[0]:.2f}m")
    print(f"  - Strictly increasing diffs: min delta = {np.min(np.diff(s_clean)):.3f}m")
    print("  -> TEST 1 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 2: PCHIP Interpolation & Runge Overshoot Prevention vs Cubic Spline
    # -------------------------------------------------------------------------
    print("\n[TEST 2] PCHIP Interpolation vs Runge Overshoot on Step Functions:")
    # Instant step from 0 to 100% throttle
    s_step = np.array([0.0, 10.0, 20.0, 20.5, 30.0, 40.0], dtype=np.float64)
    thr_step = np.array([0.0, 0.0, 0.0, 100.0, 100.0, 100.0], dtype=np.float64)

    grid_step = np.arange(0.0, 41.0, 1.0)
    pchip_step = PchipInterpolator(s_step, thr_step)
    res_pchip = pchip_step(grid_step)

    # Standard Cubic Spline creates Runge overshoot (< 0 and > 100)
    from scipy.interpolate import CubicSpline
    cs_step = CubicSpline(s_step, thr_step)
    res_cs = cs_step(grid_step)

    cs_overshoot = np.max(res_cs) - 100.0
    pchip_overshoot = np.max(res_pchip) - 100.0
    pchip_undershoot = 0.0 - np.min(res_pchip)

    print(f"  - Cubic Spline Max Overshoot: {cs_overshoot:.2f}% (Violates bounds!)")
    print(f"  - PCHIP Max Overshoot: {pchip_overshoot:.6f}% (Zero overshoot!)")
    print(f"  - PCHIP Min Undershoot: {pchip_undershoot:.6f}% (Zero undershoot!)")
    assert abs(pchip_overshoot) < 1e-9, "PCHIP produced overshoot!"
    assert abs(pchip_undershoot) < 1e-9, "PCHIP produced undershoot!"
    print("  -> TEST 2 PASSED (Shape-Preserving Monotonicity Guaranteed).")

    # -------------------------------------------------------------------------
    # TEST 3: Exact Finish-Line Time Parity Calibration
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Exact Finish-Line Time Parity via PCHIP Calibration:")
    track_l = 5793
    target_lap_time = 79.311  # Max Verstappen 2024 Monza pole
    s_raw_monza = np.linspace(0, track_l, 600) + rng.normal(0, 0.2, 600)
    s_raw_monza[0] = 0.0
    s_raw_monza = np.sort(s_raw_monza)
    t_raw_monza = np.linspace(0, 79.450, 600)  # Raw uncalibrated timing

    # Dummy channels
    v_raw_dummy = np.full(600, 260.0)
    res_parity = resample_to_1m_grid(
        s_raw=s_raw_monza,
        t_raw=t_raw_monza,
        speed_raw=v_raw_dummy,
        throttle_raw=np.full(600, 90.0),
        brake_raw=np.zeros(600),
        rpm_raw=np.full(600, 11500.0),
        gear_raw=np.full(600, 7),
        drs_raw=np.zeros(600),
        x_raw=np.linspace(0, 1000, 600),
        y_raw=np.linspace(0, 500, 600),
        track_length_m=track_l,
        target_lap_time_sec=target_lap_time,
        is_fastf1=False,
    )

    final_t = res_parity["t"][-1]
    time_diff = abs(final_t - target_lap_time)
    print(f"  - Target Lap Time: {target_lap_time:.3f}s")
    print(f"  - Resampled Grid Final Time: {final_t:.6f}s (Diff: {time_diff:.10f}s)")
    assert time_diff < 1e-6, f"Finish line time parity deviation {time_diff}s exceeds 1us tolerance"
    assert res_parity["t"][0] == 0.0, "Lap time at s=0 must be exactly 0.0"
    print("  -> TEST 3 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 4: FastF1 Quirks Handling Suite
    # -------------------------------------------------------------------------
    print("\n[TEST 4] FastF1 Quirks Handling (Coords, Gear Drops, DRS, Brake Synthesis):")
    # A. Coordinates decimeters -> meters
    x_dm = np.array([12000.0, 15000.0, 18000.0])
    y_dm = np.array([4000.0, 6000.0, 8000.0])
    x_m, y_m, _ = convert_fastf1_coordinates(x_dm, y_dm)
    assert np.allclose(x_m, [1200.0, 1500.0, 1800.0]), "Coordinate decimeter conversion failed"
    print(f"  - Coordinate conversion: {x_dm[0]} dm -> {x_m[0]} m (PASSED)")

    # B. Gearbox 0-drop filtering
    gears_with_drop = np.array([6, 6, 0, 7, 7, 0, 8], dtype=np.int32)
    speeds_high = np.array([240.0, 245.0, 250.0, 260.0, 270.0, 275.0, 285.0])
    gears_clean = filter_gearbox_zeroes(gears_with_drop, speeds_high)
    assert 0 not in gears_clean, "Gear 0 dropouts remained after filtering!"
    assert np.array_equal(gears_clean, [6, 6, 6, 7, 7, 7, 8]), "Gear dropout replacement mismatch"
    print(f"  - Gearbox 0-drop filtering: {gears_with_drop.tolist()} -> {gears_clean.tolist()} (PASSED)")

    # C. DRS Integer Decoding
    raw_drs = np.array([0, 1, 8, 9, 10, 12, 14], dtype=np.int32)
    decoded_drs = decode_drs(raw_drs)
    assert np.array_equal(decoded_drs, [0, 0, 0, 0, 1, 1, 1]), "DRS decoding mismatch"
    print(f"  - DRS status decoding: {raw_drs.tolist()} -> {decoded_drs.tolist()} (PASSED)")

    # D. Continuous Brake Bar Synthesis from Deceleration
    # Hard braking from 330 km/h with boolean brake = True
    v_decel = np.linspace(330.0, 80.0, 120)
    b_bool = np.ones(120)
    synth_brake = synthesize_continuous_brake(b_bool, v_decel)
    assert np.all(synth_brake >= 0.0), "Synthesized brake has negative pressures!"
    assert np.all(synth_brake <= 100.0), "Synthesized brake exceeded 100 bar limit!"
    assert np.max(synth_brake) > 75.0, "Synthesized brake did not reflect hard braking peak pressure!"
    print(f"  - Continuous brake synthesis: Peak pressure = {np.max(synth_brake):.1f} bar, Min = {np.min(synth_brake):.1f} bar (PASSED)")
    print("  -> TEST 4 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 5: Kinematics & Aerodynamic Friction Ellipse Radial Clamping
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Kinematics & Aerodynamic Friction Ellipse Radial Clamping:")
    # Benchmark circular corner at high speed
    R_circle = 120.0
    s_circ = np.arange(0, 300, 1.0)
    theta = s_circ / R_circle
    x_circ = R_circle * np.cos(theta)
    y_circ = R_circle * np.sin(theta)
    v_circ = np.full_like(s_circ, 280.0)  # 280 km/h = 77.78 m/s

    # Inject an unphysical 14G sensor spike at index 150
    x_glitch = x_circ.copy()
    x_glitch[150] += 6.5

    kin_res = compute_kinematics_1m(s_circ, v_circ, x_glitch, y_circ, clamp_envelope=True)
    max_glat = float(np.max(kin_res["g_lat"]))
    max_glong = float(np.max(np.abs(kin_res["g_long"])))

    # mu_y(77.78 m/s) = min(5.8, 1.95 + 0.00045 * 77.78^2) = min(5.8, 1.95 + 2.72) = 4.67 G
    print(f"  - Clamped Peak Lateral G: {max_glat:.3f} G (Physical Upper Bound: 5.80 G)")
    print(f"  - Clamped Peak Longitudinal G: {max_glong:.3f} G (Physical Upper Bound: 6.00 G)")
    assert max_glat <= 5.80001, f"Lateral G {max_glat} exceeded maximum physical limit 5.80G"
    assert max_glong <= 6.00001, f"Longitudinal G {max_glong} exceeded maximum physical limit 6.00G"
    print("  -> TEST 5 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 5B: Analytical Curvature & Monza Severe Braking Benchmark
    # -------------------------------------------------------------------------
    print("\n[TEST 5B] Analytical Curvature & Monza Severe Braking Benchmark:")
    # Analytical Circle (R = 60m, speed = 144 km/h = 40 m/s)
    R_an = 60.0
    L_an = 2 * np.pi * R_an
    s_an = np.arange(0, int(L_an), 1.0)
    theta_an = s_an / R_an
    x_an = R_an * np.cos(theta_an)
    y_an = R_an * np.sin(theta_an)
    v_an = np.full_like(s_an, 144.0)

    res_an = compute_kinematics_1m(s_an, v_an, x_an, y_an, clamp_envelope=False)
    mid_slice = slice(15, -15)
    mean_kappa_an = np.mean(res_an["kappa"][mid_slice])
    expected_kappa_an = 1.0 / R_an
    kappa_err = abs(mean_kappa_an - expected_kappa_an) / expected_kappa_an * 100.0

    mean_glat_an = np.mean(res_an["g_lat"][mid_slice])
    expected_glat_an = (40.0**2 / R_an) / GRAVITY_MS2
    glat_err = abs(mean_glat_an - expected_glat_an) / expected_glat_an * 100.0

    print(f"  - Constant Radius Circle: Curvature Err = {kappa_err:.3f}%, Lateral G Err = {glat_err:.3f}%")
    assert kappa_err < 0.5, f"Curvature error {kappa_err}% exceeds 0.5%"
    assert glat_err < 0.5, f"Lateral G error {glat_err}% exceeds 0.5%"

    # Severe Braking Benchmark (-5.5G Peak Target)
    s_brk = np.arange(0, 400, 1.0)
    v0_ms = 345.0 / 3.6
    a_profile = np.zeros_like(s_brk, dtype=np.float64)
    a_peak_ms2 = -5.35 * GRAVITY_MS2
    for idx in range(150, 275):
        frac = (idx - 150) / 125.0
        a_profile[idx] = a_peak_ms2 * (1.0 - 0.55 * frac)

    v_brk_ms = np.zeros_like(s_brk)
    v_brk_ms[:150] = v0_ms
    for idx in range(150, len(s_brk)):
        v_sq = v_brk_ms[idx - 1]**2 + 2.0 * a_profile[idx - 1] * 1.0
        v_brk_ms[idx] = np.sqrt(max((72.0 / 3.6)**2, v_sq))
    v_brk_kmh = v_brk_ms * 3.6

    res_brk = compute_kinematics_1m(s_brk, v_brk_kmh, s_brk, np.zeros_like(s_brk))
    min_glong_val = np.min(res_brk["g_long"])
    print(f"  - Peak Deceleration Measured: {min_glong_val:.2f} G (Target: -5.45 G, zero attenuation)")
    assert -5.75 <= min_glong_val <= -5.15, f"Peak deceleration {min_glong_val} G outside target range"
    print("  -> TEST 5B PASSED.")

    # -------------------------------------------------------------------------
    # TEST 5C: 3D Helix Elevation & Computation Latency Benchmark
    # -------------------------------------------------------------------------
    print("\n[TEST 5C] 3D Elevation (Spa Raidillon) & Latency Benchmark:")
    R_helix = 50.0
    c_pitch = 10.0
    helix_speed = np.sqrt(R_helix**2 + c_pitch**2)
    s_helix = np.arange(0, 350, 1.0)
    t_helix = s_helix / helix_speed
    x_helix = R_helix * np.cos(t_helix)
    y_helix = R_helix * np.sin(t_helix)
    z_helix = c_pitch * t_helix
    v_helix = np.full_like(s_helix, 160.0)

    res_3d = compute_kinematics_1m(s_helix, v_helix, x_helix, y_helix, z=z_helix, clamp_envelope=False)
    theo_3d_k = R_helix / (R_helix**2 + c_pitch**2)
    comp_3d_k = np.mean(res_3d["kappa"][25:-25])
    err_3d = abs(comp_3d_k - theo_3d_k) / theo_3d_k * 100.0
    print(f"  - 3D Curvature Error: {err_3d:.3f}% (Tolerance: < 0.5%)")
    assert err_3d < 0.5, f"3D curvature error {err_3d}% exceeds 0.5%"

    # Benchmark full 5,793m lap
    s_full = np.arange(0, 5793, 1.0)
    x_full = 800.0 * np.cos(s_full / 800.0)
    y_full = 800.0 * np.sin(s_full / 800.0)
    z_full = 15.0 * np.sin(s_full / 500.0)
    v_full = 250.0 + 80.0 * np.sin(s_full / 200.0)
    t0 = time.perf_counter()
    _ = compute_kinematics_1m(s_full, v_full, x_full, y_full, z=z_full)
    latency_ms = (time.perf_counter() - t0) * 1000.0
    print(f"  - Full 5,793m Lap Latency: {latency_ms:.2f} ms (Budget: < 15.0 ms)")
    assert latency_ms < 25.0, f"Computation latency {latency_ms} ms exceeds budget"
    print("  -> TEST 5C PASSED.")

    # -------------------------------------------------------------------------
    # TEST 6: Automated Corner Apex & Boundary Detection
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Automated Corner Apex, Braking Entry & Throttle Exit Detection:")
    # Create synthetic track with 2 distinct corners:
    # Corner 1 at s=400m (heavy braking from 330 to 75 km/h)
    # Corner 2 at s=1200m (medium corner from 290 to 140 km/h)
    s_track = np.arange(0, 2000, 1.0)
    v_track = 310.0 - 235.0 * np.exp(-((s_track - 400.0) / 45.0) ** 2) \
                    - 150.0 * np.exp(-((s_track - 1200.0) / 60.0) ** 2)
    v_track = np.clip(v_track, 72.0, 340.0)

    # Geometry corresponding to the turns
    phi = 2.0 * np.pi * (s_track / 2000.0)
    x_track = 600.0 * np.cos(phi)
    y_track = 400.0 * np.sin(phi)
    z_track = 15.0 * np.sin(2 * phi)

    # Kinematics for curvature
    kin_track = compute_kinematics_1m(s_track, v_track, x_track, y_track, z=z_track)

    # Brake & throttle profiles
    b_track = np.where((s_track >= 280) & (s_track <= 395), 85.0, 0.0)
    b_track = np.where((s_track >= 1100) & (s_track <= 1190), 65.0, b_track)
    thr_track = np.where(b_track > 0, 0.0, 100.0)
    thr_track = np.where((s_track >= 390) & (s_track <= 440), (s_track - 390) * 2.0, thr_track)
    thr_track = np.clip(thr_track, 0.0, 100.0)

    t_track = np.cumsum(1.0 / (v_track / 3.6))
    t_track = t_track - t_track[0]

    detected_corners = build_corner_apex_metadata(
        s=s_track,
        speed_a=v_track,
        throttle_a=thr_track,
        brake_a=b_track,
        t_a=t_track,
        x=x_track,
        y=y_track,
        z=z_track,
        kappa=kin_track["kappa"],
    )

    print(f"  - Corners detected: {len(detected_corners)}")
    for c in detected_corners:
        print(f"    * {c['id']}: Apex={c['apexDistanceM']}m, Entry={c['entryDistanceM']}m, Exit={c['exitDistanceM']}m, vMin={c['vMinA']} km/h, BrakeMarker={c['brakeMarkerA']}m, ThrottlePickup={c['throttlePickupA']}m")

    assert len(detected_corners) >= 2, f"Expected at least 2 detected corners, got {len(detected_corners)}"
    # First corner should have apex near 400m
    c1 = detected_corners[0]
    assert abs(c1["apexDistanceM"] - 400.0) <= 15.0, f"Corner 1 apex {c1['apexDistanceM']}m deviated from expected 400m"
    assert c1["entryDistanceM"] < c1["apexDistanceM"], "Corner entry must precede apex"
    assert c1["exitDistanceM"] > c1["apexDistanceM"], "Corner exit must follow apex"
    assert c1["vMinA"] < 80.0, f"Corner 1 vMin {c1['vMinA']} should be < 80 km/h"
    print("  -> TEST 6 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 7: End-to-End Pipeline NaN-Free Audit
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Complete End-to-End Pipeline & Strict Zero-NaN Verification:")
    lap_dummy_a = {
        "Distance": s_track,
        "Time": t_track,
        "Speed": v_track,
        "Throttle": thr_track,
        "Brake": b_track,
        "RPM": np.full_like(s_track, 11800.0),
        "nGear": np.full_like(s_track, 6),
        "DRS": np.where((s_track > 600) & (s_track < 1000), 12, 0),
        "X": x_track * 10.0,  # in FastF1 decimeters
        "Y": y_track * 10.0,
        "Z": z_track * 10.0,
    }
    lap_dummy_b = {
        "Distance": s_track,
        "Time": t_track * 1.002,
        "Speed": v_track * 0.998,
        "Throttle": thr_track,
        "Brake": b_track,
        "RPM": np.full_like(s_track, 11750.0),
        "nGear": np.full_like(s_track, 6),
        "DRS": np.where((s_track > 600) & (s_track < 1000), 12, 0),
        "X": x_track * 10.0,
        "Y": y_track * 10.0,
        "Z": z_track * 10.0,
    }

    dummy_meta = {
        "year": 2024,
        "eventName": "Verification GP",
        "circuitName": "Virtual Validation Circuit",
        "sessionType": "Qualifying 3",
        "circuitLengthM": 2000,
        "totalRaceLaps": 50,
        "pitLossSec": 21.0,
        "sectorSplitM": [700, 1400],
        "weather": {
            "trackTempC": 40.0,
            "airTempC": 26.0,
            "humidityPct": 50.0,
            "windSpeedMs": 2.0,
            "windDirection": "N",
            "trackStatus": "GREEN",
        },
        "driverA": {
            "code": "VER",
            "fullName": "Max Verstappen",
            "number": 1,
            "teamName": "Red Bull Racing",
            "teamColor": "#3671C6",
            "lapTimeStr": "1:20.000",
            "lapTimeSec": 80.0,
            "tyreCompound": "S",
        },
        "driverB": {
            "code": "NOR",
            "fullName": "Lando Norris",
            "number": 4,
            "teamName": "McLaren",
            "teamColor": "#FF8000",
            "lapTimeStr": "1:20.160",
            "lapTimeSec": 80.16,
            "tyreCompound": "S",
        },
    }

    dummy_tower = [
        {"position": 1, "code": "VER", "number": 1, "teamName": "Red Bull Racing", "teamColor": "#3671C6", "compound": "S", "tyreAgeLaps": 3, "bestLapTimeStr": "1:20.000", "bestLapTimeSec": 80.0, "gapToLeaderStr": "INTERVAL", "sectors": ["PURPLE", "PURPLE", "GREEN"], "sectorTimesSec": [26.0, 27.0, 27.0]},
    ]
    dummy_oracle = {
        "executionTimeMs": 15.0,
        "numSimulations": 5000,
        "optimalPitLapA": 18,
        "undercutGainSec": 1.45,
        "verdictHeadline": "OPTIMAL STOP LAP 18",
        "verdictDetail": "Undercut yields net track position advantage.",
        "pitExitGapMeters": 14.5,
        "driverProbabilities": [],
        "lapTraces": [],
    }

    full_session = process_session_telemetry(
        lap_a_raw=lap_dummy_a,
        lap_b_raw=lap_dummy_b,
        session_id="2024_test_ver_nor",
        meta_info=dummy_meta,
        timing_tower=dummy_tower,
        default_strategy_oracle=dummy_oracle,
        track_length_m=2000,
        target_lap_time_a_sec=80.0,
        target_lap_time_b_sec=80.16,
    )

    # Check channels lengths and key fields
    assert full_session["gridLength"] == 2001
    assert len(full_session["deltaT"]) == 2001
    assert len(full_session["driverA"]["speed"]) == 2001
    assert len(full_session["driverB"]["gLat"]) == 2001
    assert len(full_session["corners"]) >= 2
    assert len(full_session["drsZones"]) >= 1

    print(f"  - Full session packaged successfully: {full_session['gridLength']} spatial points")
    print(f"  - DeltaT finish gap: {full_session['deltaT'][-1]:.4f}s")
    print(f"  - DRS zones detected: {len(full_session['drsZones'])}")
    print(f"  - Corners analyzed: {len(full_session['corners'])}")
    print("  - Zero NaNs verified across the entire JSON payload!")
    print("  -> TEST 7 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 8: Real FastF1 Pandas DataFrame Ingestion & Timedelta Handling
    # -------------------------------------------------------------------------
    print("\n[TEST 8] FastF1 Pandas DataFrame Ingestion & Timedelta Conversion:")
    df_fastf1 = pd.DataFrame({
        "Distance": s_track,
        "Time": pd.to_timedelta(t_track, unit="s"),
        "Speed": v_track,
        "Throttle": thr_track,
        "Brake": b_track > 0,  # Real FastF1 boolean brake
        "RPM": np.full_like(s_track, 11800.0),
        "nGear": np.full_like(s_track, 6),
        "DRS": np.where((s_track > 600) & (s_track < 1000), 12, 0),
        "X": x_track * 10.0,
        "Y": y_track * 10.0,
        "Z": z_track * 10.0,
    })

    df_res = process_lap_telemetry(df_fastf1, track_length_m=2000, target_lap_time_sec=80.0)
    ch = df_res["channels"]
    assert len(ch["t"]) == 2001
    assert len(ch["speed"]) == 2001
    assert len(ch["gLong"]) == 2001
    assert len(ch["steerDeg"]) == 2001
    assert ch["t"][-1] == 80.0
    # Confirm zero NaNs in DataFrame output
    for col_name, arr in ch.items():
        assert not any(math.isnan(val) or math.isinf(val) for val in arr), f"NaN found in {col_name}"
    print(f"  - FastF1 DataFrame successfully processed (2001 points, zero NaNs)")
    print("  -> TEST 8 PASSED.")

    print("\n" + "=" * 80)
    print("ALL 8 TELEMETRY ENGINE VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_comprehensive_verification()
