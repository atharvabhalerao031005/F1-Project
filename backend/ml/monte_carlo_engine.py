# backend/ml/monte_carlo_engine.py
"""
AERO-SPEC // 5,000-Run Vectorized Monte Carlo Race Strategy & Undercut Oracle
"""
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
        sc_laps = rng.integers(12, max(13, total_laps - 8), size=num_sims)
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
    n_drivers = len(timing_tower) if timing_tower else 2
    if timing_tower:
        driver_pace_offsets = np.array([(d.get("bestLapTimeSec", base_lap_sec) - base_lap_sec) for d in timing_tower])
        total_race_means = (base_lap_sec + 3.1 + driver_pace_offsets) * total_laps + pit_loss_normal
        total_race_means[0] = float(np.mean(sim_cum_a[:, -1]))
        if n_drivers > 1:
            total_race_means[1] = float(np.mean(sim_cum_b[:, -1]))
    else:
        total_race_means = np.array([float(np.mean(sim_cum_a[:, -1])), float(np.mean(sim_cum_b[:, -1]))])
        timing_tower = [
            {"code": strategy_a["driverCode"], "teamColor": "#3671C6", "bestLapTimeSec": base_lap_sec},
            {"code": strategy_b["driverCode"], "teamColor": "#FF8000", "bestLapTimeSec": base_lap_sec + 0.109},
        ]

    field_noise = rng.normal(0.0, 2.6, size=(num_sims, n_drivers))
    field_totals = total_race_means[None, :] + field_noise
    ranks = np.argsort(np.argsort(field_totals, axis=1), axis=1) + 1  # 1 = P1, 20 = P20

    probs = []
    for d_idx, drv in enumerate(timing_tower):
        drv_ranks = ranks[:, d_idx]
        probs.append({
            "code": drv["code"],
            "teamColor": drv.get("teamColor", "#FFFFFF"),
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
    for cand_lap in range(max(2, 10), max(3, total_laps - 8)):
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
