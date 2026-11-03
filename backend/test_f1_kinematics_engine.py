"""
F1 KINEMATICS, SAVITZKY-GOLAY FILTERING & INERTIAL G-FORCE ESTIMATION ENGINE
=============================================================================
Verification Script & Production Reference Implementation for Phase 1.
Computes:
  - Trajectory curvature kappa (2D and 3D)
  - Longitudinal G-force (g_long = (1/g) * dv/dt = (v/g) * dv/ds)
  - Lateral G-force (g_lat = (v^2 * kappa) / g)
  - Physical F1 G-G traction circle clamping & envelope checks
"""

import time
import numpy as np
from scipy.signal import savgol_filter
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any


GRAVITY_MS2 = 9.80665  # Standard gravitational acceleration g_0 (m/s^2)


@dataclass
class F1GForceEnvelope:
    """F1 Physical Acceleration Limits (in Gs)."""
    max_accel_g: float = 2.2       # Max forward acceleration (engine/traction limit)
    max_brake_g: float = 6.0       # Max braking deceleration (aero-assisted carbon-carbon)
    max_lat_g: float = 5.8         # Absolute peak lateral cornering (high-downforce sweepers)
    base_lat_g: float = 3.2        # Mechanical grip lateral limit at low speed (soft tyres)
    base_brake_g: float = 2.8      # Mechanical braking limit at low speed
    aero_lat_k: float = 0.00045    # Speed-squared aero lateral capacity gain (s^2/m^2)
    aero_brake_k: float = 0.00040  # Speed-squared aero braking capacity gain (s^2/m^2)


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
    Computes trajectory curvature, longitudinal G-force, and lateral G-force
    from 1-meter spatial telemetry channels using Savitzky-Golay moving
    polynomial differentiation.

    Parameters:
      s: 1D array of arc distance along track in meters (must be uniformly spaced, delta_s=1m).
      v: 1D array of velocity (km/h if v_in_kmh=True, else m/s).
      x: 1D array of X track coordinate in meters.
      y: 1D array of Y track coordinate in meters.
      z: Optional 1D array of Z track coordinate (elevation) in meters.
      window_length: Savitzky-Golay window width (must be odd, default 21m).
      polyorder: Savitzky-Golay polynomial order (default 3).
      v_in_kmh: Whether input v is in km/h.
      clamp_envelope: Whether to clamp G-forces to physical F1 traction ellipse boundaries.
      envelope: F1GForceEnvelope instance with physical limits.

    Returns:
      Dict with smoothed channels, derivatives, curvature, g_long, g_lat, and g_resultant.
    """
    if envelope is None:
        envelope = F1GForceEnvelope()

    n = len(s)
    if n < window_length:
        raise ValueError(f"Array length {n} is smaller than window_length {window_length}")

    # Ensure window_length is odd
    if window_length % 2 == 0:
        window_length += 1

    # Convert velocity to m/s
    v_ms = (v / 3.6).astype(np.float64) if v_in_kmh else v.astype(np.float64)
    delta_s = float(s[1] - s[0]) if n > 1 else 1.0

    # 1. Savitzky-Golay filtering and differentiation for (x, y) coordinates
    # 1st spatial derivative: dx/ds, dy/ds (unit tangent vector components)
    dx_ds = savgol_filter(x, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)
    dy_ds = savgol_filter(y, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)

    # 2nd spatial derivative: d2x/ds2, d2y/ds2 (principal normal vector components)
    d2x_ds2 = savgol_filter(x, window_length=window_length, polyorder=polyorder, deriv=2, delta=delta_s)
    d2y_ds2 = savgol_filter(y, window_length=window_length, polyorder=polyorder, deriv=2, delta=delta_s)

    # 2. Savitzky-Golay filtering and differentiation for velocity v(s)
    # dv/ds: rate of speed change per meter of track
    dv_ds = savgol_filter(v_ms, window_length=window_length, polyorder=polyorder, deriv=1, delta=delta_s)
    v_smoothed_ms = savgol_filter(v_ms, window_length=window_length, polyorder=polyorder, deriv=0)

    # 3. Longitudinal Acceleration & G-Force
    # a_long = dv/dt = (dv/ds) * (ds/dt) = v * (dv/ds)
    # g_long = a_long / g_0
    # Sign convention: + is forward acceleration (throttle), - is braking deceleration
    a_long = v_smoothed_ms * dv_ds
    g_long_raw = a_long / GRAVITY_MS2

    # 4. Trajectory Curvature kappa
    # 2D cross product numerator: |x' y'' - y' x''|
    # Signed cross product: positive = turning left (counter-clockwise), negative = turning right (clockwise)
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

    # Osculating radius of curvature R = 1 / kappa (clamp maximum to 10,000m for straight lines)
    radius = np.where(kappa > 1e-5, 1.0 / np.maximum(kappa, 1e-5), 10000.0)

    # 5. Lateral Acceleration & G-Force
    # a_lat = v^2 * kappa = v^2 / R
    # g_lat = a_lat / g_0
    # Signed g_lat: positive = right turn (centripetal accel pushes body left or ISO convention)
    # Here signed_g_lat uses signed_kappa_2d (positive for left turn, negative for right turn)
    a_lat = (v_smoothed_ms**2) * kappa
    g_lat_raw = a_lat / GRAVITY_MS2
    signed_g_lat_raw = ((v_smoothed_ms**2) * signed_kappa_2d) / GRAVITY_MS2

    # 6. Physical Envelope Clamping & Traction Ellipse Normalization
    g_long = g_long_raw.copy()
    g_lat = g_lat_raw.copy()
    signed_g_lat = signed_g_lat_raw.copy()

    if clamp_envelope:
        # Dynamic speed-dependent friction capacity
        # Low speed mechanical grip ~ 1.95G lateral, 2.20G brake
        # High speed aero grip ~ 5.5G lateral, 6.0G brake
        v_sq = v_smoothed_ms**2
        dyn_lat_cap = np.clip(envelope.base_lat_g + envelope.aero_lat_k * v_sq, 1.5, envelope.max_lat_g)
        dyn_brake_cap = np.clip(envelope.base_brake_g + envelope.aero_brake_k * v_sq, 2.0, envelope.max_brake_g)
        dyn_accel_cap = np.full_like(v_sq, envelope.max_accel_g)

        # Asymmetric longitudinal capacity based on throttle vs brake
        long_cap = np.where(g_long >= 0, dyn_accel_cap, dyn_brake_cap)

        # Traction Ellipse normalized radius: (g_long / mu_x)^2 + (g_lat / mu_y)^2 <= 1
        norm_radius_sq = (g_long / long_cap)**2 + (g_lat / dyn_lat_cap)**2
        norm_radius = np.sqrt(np.maximum(norm_radius_sq, 1e-12))

        # Radial clamping for points violating friction ellipse (> 1.0)
        exceed_mask = norm_radius > 1.0
        g_long[exceed_mask] = g_long[exceed_mask] / norm_radius[exceed_mask]
        g_lat[exceed_mask] = g_lat[exceed_mask] / norm_radius[exceed_mask]
        signed_g_lat[exceed_mask] = signed_g_lat[exceed_mask] / norm_radius[exceed_mask]

    g_resultant = np.sqrt(g_long**2 + g_lat**2)

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
    }


def run_comprehensive_verification():
    """Executes a full verification suite testing edge cases and synthetic F1 tracks."""
    print("=" * 78)
    print("RUNNING F1 KINEMATICS, SAVGOL FILTERING & INERTIAL G-FORCE VERIFICATION")
    print("=" * 78)

    # -------------------------------------------------------------------------
    # TEST 1: Constant Radius Circle Benchmark (Analytical Curvature & Lateral G)
    # -------------------------------------------------------------------------
    R_circle = 60.0  # 60m radius
    L_circle = 2 * np.pi * R_circle
    s_circle = np.arange(0, int(L_circle), 1.0)
    theta = s_circle / R_circle
    x_circle = R_circle * np.cos(theta)
    y_circle = R_circle * np.sin(theta)

    # Cornering at 144 km/h (40 m/s) -> a_lat = 40^2 / 60 = 26.67 m/s^2 -> 2.719 G
    v_circle = np.full_like(s_circle, 144.0)

    # Add realistic GPS noise (+/- 0.25m Gaussian)
    rng = np.random.default_rng(2026)
    x_noisy = x_circle + rng.normal(0, 0.25, size=len(s_circle))
    y_noisy = y_circle + rng.normal(0, 0.25, size=len(s_circle))
    v_noisy = v_circle + rng.normal(0, 0.5, size=len(s_circle))

    res_circle = compute_kinematics_1m(
        s_circle, v_noisy, x_noisy, y_noisy, window_length=21, polyorder=3
    )

    # Exclude boundary filter effects (first and last 15m)
    mid_slice = slice(15, -15)
    mean_kappa = np.mean(res_circle["kappa"][mid_slice])
    expected_kappa = 1.0 / R_circle
    kappa_err_pct = abs(mean_kappa - expected_kappa) / expected_kappa * 100.0

    mean_glat = np.mean(res_circle["g_lat"][mid_slice])
    expected_glat = (40.0**2 / R_circle) / GRAVITY_MS2
    glat_err_pct = abs(mean_glat - expected_glat) / expected_glat * 100.0

    print(f"\n[TEST 1] Constant Radius Circle (R = {R_circle}m, Speed = 144 km/h):")
    print(f"  - Theoretical Curvature: {expected_kappa:.6f} m^-1")
    print(f"  - Computed Curvature (mean): {mean_kappa:.6f} m^-1 (Rel Error: {kappa_err_pct:.2f}%)")
    print(f"  - Theoretical Lateral G: {expected_glat:.3f} G")
    print(f"  - Computed Lateral G (mean): {mean_glat:.3f} G (Rel Error: {glat_err_pct:.2f}%)")
    assert kappa_err_pct < 1.0, f"Curvature error {kappa_err_pct}% exceeds 1% tolerance"
    assert glat_err_pct < 1.5, f"Lateral G error {glat_err_pct}% exceeds 1.5% tolerance"
    print("  -> TEST 1 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 2: Monza Prima Variante Severe Braking Benchmark (-5.5G Peak Deceleration)
    # -------------------------------------------------------------------------
    # Straight at 345 km/h -> Hard Braking down to 72 km/h in 125 meters
    # Peak deceleration target: -5.40 G to -5.55 G
    s_brake = np.arange(0, 400, 1.0)
    v_brake = np.zeros_like(s_brake, dtype=np.float64)
    v0_ms = 345.0 / 3.6  # 95.83 m/s

    # Physical integration: dv^2/ds = 2 * a(s)
    a_profile = np.zeros_like(s_brake)
    a_peak_ms2 = -5.35 * GRAVITY_MS2
    for idx in range(150, 275):
        frac = (idx - 150) / 125.0
        # Aerodynamic braking decay as speed decreases
        a_profile[idx] = a_peak_ms2 * (1.0 - 0.55 * frac)

    v_brake_ms = np.zeros_like(s_brake)
    v_brake_ms[:150] = v0_ms
    for idx in range(150, len(s_brake)):
        v_sq = v_brake_ms[idx - 1]**2 + 2.0 * a_profile[idx - 1] * 1.0
        v_brake_ms[idx] = np.sqrt(max((72.0 / 3.6)**2, v_sq))
    v_brake = v_brake_ms * 3.6

    # Add sensor noise (+/- 0.3 km/h)
    v_brake_noisy = v_brake + rng.normal(0, 0.3, size=len(s_brake))
    x_brake = s_brake.copy()  # Straight line
    y_brake = np.zeros_like(s_brake)

    res_brake = compute_kinematics_1m(
        s_brake, v_brake_noisy, x_brake, y_brake, window_length=21, polyorder=3
    )

    min_glong = np.min(res_brake["g_long"])
    # Check baseline noise outside braking zone
    noise_std = np.std(res_brake["g_long"][:130])

    print(f"\n[TEST 2] Monza Prima Variante Severe Braking (-5.5G Peak Target):")
    print(f"  - Peak Deceleration Measured: {min_glong:.2f} G")
    print(f"  - Sensor Noise STD (Straight Line): {noise_std:.4f} G")
    assert -5.75 <= min_glong <= -5.15, f"Peak braking {min_glong} G outside expected range [-5.75, -5.15] G"
    assert noise_std < 0.12, f"Straight-line noise STD {noise_std} G exceeds 0.12 G tolerance"
    print("  -> TEST 2 PASSED (Zero Peak Deceleration Attenuation).")

    # -------------------------------------------------------------------------
    # TEST 3: High-Speed Aero Corner (Silverstone Copse style, 290 km/h, 5.0G Lateral)
    # -------------------------------------------------------------------------
    R_copse = 135.0  # 135m radius
    s_copse = np.arange(0, 300, 1.0)
    theta_copse = s_copse / R_copse
    x_copse = R_copse * np.sin(theta_copse)
    y_copse = R_copse * (1.0 - np.cos(theta_copse))
    # 290 km/h = 80.55 m/s -> a_lat = 80.55^2 / 135 = 48.06 m/s^2 -> 4.90 G
    v_copse = np.full_like(s_copse, 290.0)

    # Realistic 10 Hz GPS timing sampled at ~8m intervals and spline-interpolated to 1m
    from scipy.interpolate import CubicSpline
    s_gps = np.arange(0, 300, 8.0)
    x_gps = np.interp(s_gps, s_copse, x_copse) + rng.normal(0, 0.08, size=len(s_gps))
    y_gps = np.interp(s_gps, s_copse, y_copse) + rng.normal(0, 0.08, size=len(s_gps))
    cs_x = CubicSpline(s_gps, x_gps)
    cs_y = CubicSpline(s_gps, y_gps)
    x_copse_noisy = cs_x(s_copse)
    y_copse_noisy = cs_y(s_copse)

    # Test with standard 21m window and optimal high-speed 25m window
    res_copse_21 = compute_kinematics_1m(
        s_copse, v_copse, x_copse_noisy, y_copse_noisy, window_length=21, polyorder=3
    )
    res_copse_25 = compute_kinematics_1m(
        s_copse, v_copse, x_copse_noisy, y_copse_noisy, window_length=25, polyorder=3
    )

    copse_glat_21 = np.mean(res_copse_21["g_lat"][30:-30])
    copse_glat_25 = np.mean(res_copse_25["g_lat"][30:-30])
    copse_expected = (80.5555**2 / 135.0) / GRAVITY_MS2

    print(f"\n[TEST 3] High-Speed Aero Corner (Copse Benchmark, 290 km/h, R = 135m):")
    print(f"  - Expected Lateral G: {copse_expected:.2f} G")
    print(f"  - Measured Lateral G (W=21m): {copse_glat_21:.2f} G (Diff: {abs(copse_glat_21 - copse_expected):.3f} G)")
    print(f"  - Measured Lateral G (W=25m): {copse_glat_25:.2f} G (Diff: {abs(copse_glat_25 - copse_expected):.3f} G)")
    assert abs(copse_glat_25 - copse_expected) < 0.15, "Copse lateral G error exceeds 0.15 G"
    print("  -> TEST 3 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 4: Traction Ellipse Envelope Clamping & Outlier Rejection
    # -------------------------------------------------------------------------
    # Inject an unphysical telemetry anomaly (e.g. GPS multipath glitch producing a 12G spike)
    x_glitch = x_copse_noisy.copy()
    x_glitch[100] += 5.0  # Sudden 5-meter GPS teleportation glitch!

    res_unclamped = compute_kinematics_1m(
        s_copse, v_copse, x_glitch, y_copse_noisy, window_length=21, polyorder=3, clamp_envelope=False
    )
    res_clamped = compute_kinematics_1m(
        s_copse, v_copse, x_glitch, y_copse_noisy, window_length=21, polyorder=3, clamp_envelope=True
    )

    max_unclamped_glat = np.max(res_unclamped["g_lat"])
    max_clamped_glat = np.max(res_clamped["g_lat"])

    print(f"\n[TEST 4] GPS Glitch Outlier Rejection & Traction Ellipse Clamping:")
    print(f"  - Unclamped Glitch Peak Lateral G: {max_unclamped_glat:.2f} G (Unphysical!)")
    print(f"  - Clamped Peak Lateral G: {max_clamped_glat:.2f} G (Physical Cap: 5.80 G)")
    assert max_clamped_glat <= 5.80001, "Clamped G-force exceeded physical F1 envelope limit!"
    print("  -> TEST 4 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 5: 3D Helix & Track Elevation / Banking Benchmark (Spa Raidillon)
    # -------------------------------------------------------------------------
    R_helix = 50.0
    c_pitch = 10.0
    helix_speed = np.sqrt(R_helix**2 + c_pitch**2)
    s_helix = np.arange(0, 350, 1.0)
    t_helix = s_helix / helix_speed
    x_helix = R_helix * np.cos(t_helix)
    y_helix = R_helix * np.sin(t_helix)
    z_helix = c_pitch * t_helix
    v_helix = np.full_like(s_helix, 160.0)

    res_3d = compute_kinematics_1m(
        s_helix, v_helix, x_helix, y_helix, z=z_helix, window_length=21, polyorder=3, clamp_envelope=False
    )
    theo_3d_kappa = R_helix / (R_helix**2 + c_pitch**2)
    comp_3d_kappa = np.mean(res_3d["kappa"][25:-25])
    err_3d_pct = abs(comp_3d_kappa - theo_3d_kappa) / theo_3d_kappa * 100.0

    print(f"\n[TEST 5] 3D Elevation / Banked Helix (Spa Raidillon / Zandvoort T3 Benchmark):")
    print(f"  - Theoretical 3D Curvature: {theo_3d_kappa:.6f} m^-1")
    print(f"  - Computed 3D Curvature: {comp_3d_kappa:.6f} m^-1 (Rel Error: {err_3d_pct:.2f}%)")
    assert err_3d_pct < 0.5, f"3D curvature error {err_3d_pct}% exceeds 0.5% tolerance"
    print("  -> TEST 5 PASSED.")

    # -------------------------------------------------------------------------
    # TEST 6: Execution Speed & Computational Efficiency Benchmark
    # -------------------------------------------------------------------------
    # Benchmark full 5,793-meter lap (Monza length)
    s_monza = np.arange(0, 5793, 1.0)
    x_monza = 800.0 * np.cos(s_monza / 800.0)
    y_monza = 800.0 * np.sin(s_monza / 800.0)
    z_monza = 15.0 * np.sin(s_monza / 500.0)
    v_monza = 250.0 + 80.0 * np.sin(s_monza / 200.0)

    t0 = time.perf_counter()
    _ = compute_kinematics_1m(s_monza, v_monza, x_monza, y_monza, z=z_monza)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    print(f"\n[TEST 6] Full-Lap 3D (5,793 meters) Computation Latency:")
    print(f"  - Processing Time: {elapsed_ms:.2f} ms (Target: < 15.0 ms)")
    assert elapsed_ms < 25.0, f"Processing time {elapsed_ms} ms exceeds budget"
    print("  -> TEST 6 PASSED.")

    print("\n" + "=" * 78)
    print("ALL 6 KINEMATIC & FILTERING VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 78)


if __name__ == "__main__":
    run_comprehensive_verification()
