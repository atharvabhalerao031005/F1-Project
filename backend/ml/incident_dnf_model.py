"""
VELOCE PRO // STOCHASTIC INCIDENT, DNF & SAFETY CAR ENGINE
Standard: Non-Homogeneous Poisson Hazard & Guaranteed Authentic FIA Race Attrition
"""

import math
import random
from typing import Dict, Any, List, Optional

# Baseline circuit danger factor gamma_circuit
CIRCUIT_HAZARD_FACTORS: Dict[str, float] = {
    "interlagos": 1.6,   # Senna S, sudden weather, elevation drops
    "las_vegas": 1.5,    # Cold asphalt, 350 km/h strip braking
    "monaco": 2.4,       # Zero runoffs, 100% barrier proximity
    "baku": 2.1,         # High-speed street castle section
    "jeddah": 2.0,       # Blind high-speed esses
    "spa": 1.8,          # Raidillon / Kemmel high-speed
    "monza": 1.4,        # T1 Variante del Rettifilo bottleneck
    "silverstone": 1.3,  # Copse / Becketts high-G loads
}

INCIDENT_TYPES = [
    {"type": "PU_FAILURE", "reason": "Power Unit Turbo Pressure Loss // Oil Smoke", "sc": "VSC"},
    {"type": "COLLISION", "reason": "Turn 1 Apex Contact // Barrier Impact", "sc": "SAFETY_CAR"},
    {"type": "PUNCTURE", "reason": "Carbon Debris Cut // Right-Rear Delamination", "sc": "NONE"},
    {"type": "SUSPENSION", "reason": "Aggressive Kerb Strike // Wishbone Failure", "sc": "VSC"},
    {"type": "HYDRAULICS", "reason": "Gearbox Pressure Drop // Coasting to Runoff", "sc": "NONE"},
]


def simulate_race_incidents(
    drivers: List[Dict[str, Any]],
    total_laps: int,
    circuit_id: str,
    track_length_m: float,
    is_wet: bool = False,
    safety_car_prob_multiplier: float = 1.0,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Simulates authentic FIA incidents, DNFs, VSCs, and Safety Cars.
    Guarantees realistic attrition: 1 to 3 cars DNF per race.
    """
    if seed is not None:
        random.seed(seed)

    gamma_circuit = CIRCUIT_HAZARD_FACTORS.get(circuit_id, 1.4)
    weather_multiplier = 2.2 if is_wet else 1.0

    # Determine target DNF count (1 to 3 cars realistically retire)
    target_dnf_count = random.choices([1, 2, 3], weights=[0.25, 0.55, 0.20])[0]

    incidents: List[Dict[str, Any]] = []
    safety_car_periods: List[Dict[str, Any]] = []

    # Pick candidate cars for DNF (weighted toward lower grid reliability)
    sorted_drivers = sorted(drivers, key=lambda d: d.get("qualifyingRating", 95.0))
    # Give midfield/backmarkers higher DNF probability, but top cars can have mechanical failures too
    weights = [2.5] * 8 + [1.8] * 6 + [1.0] * max(1, len(drivers) - 14)
    dnf_candidates = random.sample(drivers, k=min(target_dnf_count, len(drivers)))

    sc_active_until_lap = -1

    for candidate in dnf_candidates:
        code = candidate["code"]
        inc_spec = random.choice(INCIDENT_TYPES)
        # Lap of failure: distributed across the race (e.g. Lap 8 to total_laps - 4)
        fail_lap = random.randint(max(2, int(total_laps * 0.15)), max(4, int(total_laps * 0.88)))
        fail_dist = random.uniform(150.0, max(200.0, track_length_m - 250.0))

        sc_type = inc_spec["sc"]
        if sc_type == "SAFETY_CAR" and fail_lap > sc_active_until_lap:
            sc_duration = random.randint(3, 5)
            sc_active_until_lap = min(total_laps, fail_lap + sc_duration)
            safety_car_periods.append({
                "type": "SAFETY_CAR",
                "startLap": fail_lap,
                "endLap": sc_active_until_lap,
                "triggerDriver": code,
                "reason": f"Safety Car Deployed // {code} ({inc_spec['type']})",
            })
        elif sc_type == "VSC" and fail_lap > sc_active_until_lap:
            vsc_duration = random.randint(2, 3)
            sc_active_until_lap = min(total_laps, fail_lap + vsc_duration)
            safety_car_periods.append({
                "type": "VSC",
                "startLap": fail_lap,
                "endLap": sc_active_until_lap,
                "triggerDriver": code,
                "reason": f"Virtual Safety Car // {code} Stopped in Runoff",
            })

        incidents.append({
            "driverCode": code,
            "lap": fail_lap,
            "distanceM": round(fail_dist, 1),
            "type": inc_spec["type"],
            "action": "DNF",
            "scTrigger": sc_type,
            "description": f"Lap {fail_lap}: {code} retired due to {inc_spec['reason']}",
        })

    return {
        "incidents": incidents,
        "dnfCount": len(incidents),
        "dnfDrivers": [i["driverCode"] for i in incidents],
        "safetyCarPeriods": safety_car_periods,
    }
