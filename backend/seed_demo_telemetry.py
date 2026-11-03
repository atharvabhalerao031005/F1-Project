"""
AERO-SPEC // SEED DEMO TELEMETRY ENGINE
=============================================================================
Module: backend/seed_demo_telemetry.py
Contract: AERO-SPEC-ML-AG-CONTRACT-v5.0

Generates canonical 1-meter spatial telemetry bundles for:
  1. 2024 Monza GP Q3 (VER vs NOR, 5793m, 53 laps, pitLoss 21.4s)
  2. 2024 Silverstone GP Q3 (VER vs NOR, 5891m, 52 laps, pitLoss 20.5s)
  3. 2024 Monaco GP Q3 (LEC vs PIA, 3337m, 78 laps, pitLoss 22.0s)
  + Standalone defaultStrategyOracle for Monza

Dual-path generation:
  - Attempts FastF1 fetch with a strict 4.0-second timeout and disk caching.
  - Falls back immediately to deterministic analytical kinematic synthesis
    based on canonical circuit geometry, apex minimum speeds, forward-backward
    braking integration, and realistic sector times.

Enforces:
  - 20-driver qualifying timing tower for all 3 sessions.
  - 5,000-run Monte Carlo defaultStrategyOracle embedded in every bundle.
  - Exact float precision truncation (x/y/z: 2, speed: 1, t/deltaT: 4, inputs: 1, G: 2, ints).
  - json.dump(..., allow_nan=False).
"""

import json
import logging
import math
import os
import pickle
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy.interpolate import CubicSpline

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.ml.monte_carlo_engine import run_monte_carlo_strategy_oracle
from backend.ml.lap_time_model import load_gbdt_model
from backend.telemetry_engine import (
    compute_kinematics_1m,
    build_corner_apex_metadata,
    process_lap_telemetry,
    F1GForceEnvelope,
    GRAVITY_MS2,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AERO-SPEC SEED] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("aero_spec.seed")

TELEMETRY_OUT_DIR = PROJECT_ROOT / "frontend" / "public" / "telemetry"
FASTF1_CACHE_DIR = PROJECT_ROOT / "backend" / "f1_telemetry_cache"


# ============================================================================
# 1. 20-DRIVER GRID DEFINITIONS (2024 FORMULA 1 WORLD CHAMPIONSHIP)
# ============================================================================

GRID_2024 = [
    {"code": "VER", "number": 1, "fullName": "Max Verstappen", "teamName": "Red Bull Racing", "teamColor": "#3671C6"},
    {"code": "NOR", "number": 4, "fullName": "Lando Norris", "teamName": "McLaren", "teamColor": "#FF8000"},
    {"code": "PIA", "number": 81, "fullName": "Oscar Piastri", "teamName": "McLaren", "teamColor": "#FF8000"},
    {"code": "LEC", "number": 16, "fullName": "Charles Leclerc", "teamName": "Ferrari", "teamColor": "#E80020"},
    {"code": "SAI", "number": 55, "fullName": "Carlos Sainz", "teamName": "Ferrari", "teamColor": "#E80020"},
    {"code": "RUS", "number": 63, "fullName": "George Russell", "teamName": "Mercedes", "teamColor": "#27F4D2"},
    {"code": "HAM", "number": 44, "fullName": "Lewis Hamilton", "teamName": "Mercedes", "teamColor": "#27F4D2"},
    {"code": "PER", "number": 11, "fullName": "Sergio Perez", "teamName": "Red Bull Racing", "teamColor": "#3671C6"},
    {"code": "ALB", "number": 23, "fullName": "Alexander Albon", "teamName": "Williams", "teamColor": "#64C4FF"},
    {"code": "ALO", "number": 14, "fullName": "Fernando Alonso", "teamName": "Aston Martin", "teamColor": "#229971"},
    {"code": "STR", "number": 18, "fullName": "Lance Stroll", "teamName": "Aston Martin", "teamColor": "#229971"},
    {"code": "TSU", "number": 22, "fullName": "Yuki Tsunoda", "teamName": "RB", "teamColor": "#6692FF"},
    {"code": "RIC", "number": 3, "fullName": "Daniel Ricciardo", "teamName": "RB", "teamColor": "#6692FF"},
    {"code": "GAS", "number": 10, "fullName": "Pierre Gasly", "teamName": "Alpine", "teamColor": "#0093CC"},
    {"code": "OCO", "number": 31, "fullName": "Esteban Ocon", "teamName": "Alpine", "teamColor": "#0093CC"},
    {"code": "HUL", "number": 27, "fullName": "Nico Hulkenberg", "teamName": "Haas", "teamColor": "#B6BABD"},
    {"code": "MAG", "number": 20, "fullName": "Kevin Magnussen", "teamName": "Haas", "teamColor": "#B6BABD"},
    {"code": "BOT", "number": 77, "fullName": "Valtteri Bottas", "teamName": "Kick Sauber", "teamColor": "#52E252"},
    {"code": "ZHO", "number": 24, "fullName": "Zhou Guanyu", "teamName": "Kick Sauber", "teamColor": "#52E252"},
    {"code": "SAR", "number": 2, "fullName": "Logan Sargeant", "teamName": "Williams", "teamColor": "#64C4FF"},
]


def format_lap_time(sec: float) -> str:
    m = int(sec // 60)
    s = sec - (m * 60)
    return f"{m}:{s:06.3f}"


def build_timing_tower(
    session_order: List[str],
    pole_time_sec: float,
    gap_spreads: List[float],
    s1_ratio: float,
    s2_ratio: float,
    s3_ratio: float,
) -> List[dict]:
    """
    Constructs a realistic 20-driver qualifying timing tower.
    """
    drivers_by_code = {d["code"]: d for d in GRID_2024}
    tower = []

    for pos_idx, code in enumerate(session_order):
        pos = pos_idx + 1
        driver_meta = drivers_by_code.get(code, GRID_2024[pos_idx % 20])
        gap_sec = gap_spreads[pos_idx]
        best_time_sec = round(pole_time_sec + gap_sec, 3)

        # Compute sector splits summing exactly to best_time_sec
        s1 = round(best_time_sec * s1_ratio, 3)
        s2 = round(best_time_sec * s2_ratio, 3)
        s3 = round(best_time_sec - s1 - s2, 3)

        # Realistic sector colorings (PURPLE / GREEN / AMBER)
        if pos == 1:
            sectors = ("PURPLE", "PURPLE", "GREEN")
        elif pos == 2:
            sectors = ("GREEN", "PURPLE", "AMBER")
        elif pos <= 4:
            sectors = ("GREEN", "GREEN", "GREEN")
        elif pos <= 8:
            sectors = ("GREEN", "AMBER", "GREEN")
        elif pos <= 12:
            sectors = ("AMBER", "GREEN", "AMBER")
        else:
            sectors = ("AMBER", "AMBER", "AMBER")

        gap_str = "INTERVAL" if pos == 1 else f"+{gap_sec:.3f}"

        tower.append({
            "position": pos,
            "code": driver_meta["code"],
            "number": driver_meta["number"],
            "teamName": driver_meta["teamName"],
            "teamColor": driver_meta["teamColor"],
            "compound": "S",
            "tyreAgeLaps": 3 if pos <= 10 else 4,
            "bestLapTimeStr": format_lap_time(best_time_sec),
            "bestLapTimeSec": best_time_sec,
            "gapToLeaderStr": gap_str,
            "sectors": sectors,
            "sectorTimesSec": (s1, s2, s3),
        })

    return tower


# ============================================================================
# 2. CIRCUIT GEOMETRY & APEX CONFIGURATIONS
# ============================================================================

def get_monza_circuit_config() -> dict:
    circuit_length = 5793
    grid_points = circuit_length + 1
    s = np.linspace(0, circuit_length, grid_points)

    phi = 2.0 * np.pi * (s / circuit_length)
    x = 1200.0 * np.cos(phi) + 400.0 * np.sin(2.0 * phi)
    y = 600.0 * np.sin(phi) + 200.0 * np.cos(3.0 * phi)
    z = 180.0 + 12.0 * np.sin(3.0 * phi)

    corners = [
        {"id": "T1", "name": "Variante del Rettifilo T1", "apexDistanceM": 450, "entryDistanceM": 320, "exitDistanceM": 540, "vMinA": 74.2, "vMinB": 71.8},
        {"id": "T2", "name": "Variante del Rettifilo T2", "apexDistanceM": 560, "entryDistanceM": 530, "exitDistanceM": 670, "vMinA": 82.5, "vMinB": 80.1},
        {"id": "T3", "name": "Curva Grande", "apexDistanceM": 1100, "entryDistanceM": 900, "exitDistanceM": 1300, "vMinA": 288.0, "vMinB": 285.4},
        {"id": "T4", "name": "Variante della Roggia T4", "apexDistanceM": 1650, "entryDistanceM": 1520, "exitDistanceM": 1720, "vMinA": 112.4, "vMinB": 109.8},
        {"id": "T5", "name": "Variante della Roggia T5", "apexDistanceM": 1720, "entryDistanceM": 1680, "exitDistanceM": 1820, "vMinA": 125.0, "vMinB": 122.5},
        {"id": "T6", "name": "Curva di Lesmo 1", "apexDistanceM": 2150, "entryDistanceM": 2040, "exitDistanceM": 2240, "vMinA": 168.2, "vMinB": 165.9},
        {"id": "T7", "name": "Curva di Lesmo 2", "apexDistanceM": 2500, "entryDistanceM": 2400, "exitDistanceM": 2600, "vMinA": 154.6, "vMinB": 152.0},
        {"id": "T8", "name": "Variante Ascari T8", "apexDistanceM": 3900, "entryDistanceM": 3760, "exitDistanceM": 4010, "vMinA": 164.0, "vMinB": 161.5},
        {"id": "T9", "name": "Variante Ascari T9", "apexDistanceM": 4020, "entryDistanceM": 3950, "exitDistanceM": 4100, "vMinA": 205.0, "vMinB": 202.0},
        {"id": "T10", "name": "Variante Ascari T10", "apexDistanceM": 4140, "entryDistanceM": 4080, "exitDistanceM": 4250, "vMinA": 235.0, "vMinB": 232.0},
        {"id": "T11", "name": "Curva Parabolica", "apexDistanceM": 5100, "entryDistanceM": 4950, "exitDistanceM": 5350, "vMinA": 182.5, "vMinB": 180.2},
    ]

    drs_zones = [
        {"id": "DRS_1", "detectionDistanceM": 380, "startDistanceM": 520, "endDistanceM": 1320},
        {"id": "DRS_2", "detectionDistanceM": 3980, "startDistanceM": 4120, "endDistanceM": 4920},
    ]

    order = ["VER", "NOR", "PIA", "LEC", "SAI", "HAM", "RUS", "PER", "ALB", "HUL", "ALO", "RIC", "GAS", "STR", "TSU", "OCO", "BOT", "MAG", "SAR", "ZHO"]
    gaps = [0.000, 0.109, 0.222, 0.291, 0.377, 0.434, 0.479, 0.571, 0.710, 0.839, 0.904, 0.977, 1.043, 1.107, 1.181, 1.259, 1.341, 1.424, 1.513, 1.639]

    return {
        "sessionId": "2024_monza_q3_ver_nor",
        "eventName": "Italian Grand Prix",
        "circuitName": "Autodromo Nazionale Monza",
        "circuitLength": circuit_length,
        "gridLength": circuit_length,
        "totalRaceLaps": 53,
        "pitLossSec": 21.4,
        "pitLossScSec": 11.2,
        "sectorSplitM": (1820, 3950),
        "weather": {
            "trackTempC": 42.4,
            "airTempC": 28.6,
            "humidityPct": 46.0,
            "windSpeedMs": 1.8,
            "windDirection": "SSE",
            "trackStatus": "GREEN",
        },
        "driverA": {"code": "VER", "fullName": "Max Verstappen", "number": 1, "teamName": "Red Bull Racing", "teamColor": "#3671C6", "lapTimeStr": "1:19.311", "lapTimeSec": 79.311, "tyreCompound": "S"},
        "driverB": {"code": "NOR", "fullName": "Lando Norris", "number": 4, "teamName": "McLaren", "teamColor": "#FF8000", "lapTimeStr": "1:19.420", "lapTimeSec": 79.420, "tyreCompound": "S"},
        "vTop": 351.4,
        "s": s,
        "x": x,
        "y": y,
        "z": z,
        "corners": corners,
        "drsZones": drs_zones,
        "tower": build_timing_tower(order, 79.311, gaps, 0.333, 0.339, 0.328),
        "strategyA": {"driverCode": "VER", "startCompound": "M", "pitLap1": 19, "nextCompound1": "H", "stops": 1},
        "strategyB": {"driverCode": "NOR", "startCompound": "M", "pitLap1": 22, "nextCompound1": "H", "stops": 1},
    }


def get_silverstone_circuit_config() -> dict:
    circuit_length = 5891
    grid_points = circuit_length + 1

    # Silverstone waypoint track geometry (Hamilton Straight -> Abbey -> Village -> Wellington -> Brooklands -> Copse -> Becketts -> Stowe -> Club)
    wp = np.array([
        [0.0, 0.0, 150.0],
        [320.0, 20.0, 151.2],
        [520.0, -90.0, 152.0],
        [780.0, -260.0, 152.8],
        [1080.0, -520.0, 153.5],
        [1020.0, -680.0, 152.5],
        [840.0, -640.0, 150.5],
        [100.0, -500.0, 148.0],
        [-650.0, -360.0, 146.5],
        [-880.0, -180.0, 147.0],
        [-960.0, 60.0, 147.5],
        [-780.0, 260.0, 148.5],
        [-450.0, 480.0, 149.2],
        [-200.0, 720.0, 150.0],
        [150.0, 920.0, 151.5],
        [380.0, 960.0, 152.5],
        [580.0, 880.0, 152.0],
        [720.0, 740.0, 151.0],
        [950.0, 320.0, 149.0],
        [1050.0, -100.0, 148.0],
        [750.0, -140.0, 149.0],
        [350.0, -70.0, 149.8],
        [0.0, 0.0, 150.0],
    ])

    chords = np.sqrt(np.sum(np.diff(wp, axis=0)**2, axis=1))
    cum_dist = np.concatenate(([0.0], np.cumsum(chords)))
    cum_dist = cum_dist * (circuit_length / cum_dist[-1])
    cum_dist[-1] = circuit_length

    cs_x = CubicSpline(cum_dist, wp[:, 0], bc_type='periodic')
    cs_y = CubicSpline(cum_dist, wp[:, 1], bc_type='periodic')
    cs_z = CubicSpline(cum_dist, wp[:, 2], bc_type='periodic')

    s = np.linspace(0, circuit_length, grid_points)
    x = cs_x(s)
    y = cs_y(s)
    z = cs_z(s)

    corners = [
        {"id": "T1", "name": "Abbey", "apexDistanceM": 520, "entryDistanceM": 420, "exitDistanceM": 620, "vMinA": 265.4, "vMinB": 262.8},
        {"id": "T2", "name": "Farm Curve", "apexDistanceM": 780, "entryDistanceM": 680, "exitDistanceM": 880, "vMinA": 285.0, "vMinB": 283.0},
        {"id": "T3", "name": "Village", "apexDistanceM": 1080, "entryDistanceM": 940, "exitDistanceM": 1180, "vMinA": 105.2, "vMinB": 102.5},
        {"id": "T4", "name": "The Loop", "apexDistanceM": 1320, "entryDistanceM": 1220, "exitDistanceM": 1420, "vMinA": 88.4, "vMinB": 86.1},
        {"id": "T5", "name": "Aintree", "apexDistanceM": 1540, "entryDistanceM": 1460, "exitDistanceM": 1640, "vMinA": 170.0, "vMinB": 167.5},
        {"id": "T6", "name": "Brooklands", "apexDistanceM": 2420, "entryDistanceM": 2260, "exitDistanceM": 2520, "vMinA": 152.0, "vMinB": 149.2},
        {"id": "T7", "name": "Luffield", "apexDistanceM": 2700, "entryDistanceM": 2560, "exitDistanceM": 2840, "vMinA": 115.5, "vMinB": 113.0},
        {"id": "T8", "name": "Woodcote", "apexDistanceM": 3000, "entryDistanceM": 2880, "exitDistanceM": 3120, "vMinA": 245.0, "vMinB": 242.0},
        {"id": "T9", "name": "Copse", "apexDistanceM": 3450, "entryDistanceM": 3340, "exitDistanceM": 3580, "vMinA": 288.5, "vMinB": 285.8},
        {"id": "T10", "name": "Maggotts", "apexDistanceM": 3820, "entryDistanceM": 3720, "exitDistanceM": 3900, "vMinA": 295.0, "vMinB": 292.0},
        {"id": "T11", "name": "Becketts 1", "apexDistanceM": 3960, "entryDistanceM": 3900, "exitDistanceM": 4040, "vMinA": 260.0, "vMinB": 256.5},
        {"id": "T12", "name": "Becketts 2", "apexDistanceM": 4090, "entryDistanceM": 4030, "exitDistanceM": 4160, "vMinA": 215.0, "vMinB": 212.0},
        {"id": "T13", "name": "Chapel", "apexDistanceM": 4250, "entryDistanceM": 4180, "exitDistanceM": 4350, "vMinA": 240.0, "vMinB": 237.0},
        {"id": "T15", "name": "Stowe", "apexDistanceM": 5200, "entryDistanceM": 5040, "exitDistanceM": 5320, "vMinA": 185.0, "vMinB": 182.0},
        {"id": "T16", "name": "Vale", "apexDistanceM": 5560, "entryDistanceM": 5440, "exitDistanceM": 5640, "vMinA": 112.0, "vMinB": 109.5},
        {"id": "T17", "name": "Club", "apexDistanceM": 5750, "entryDistanceM": 5660, "exitDistanceM": 5850, "vMinA": 158.0, "vMinB": 155.5},
    ]

    drs_zones = [
        {"id": "DRS_1", "detectionDistanceM": 1450, "startDistanceM": 1580, "endDistanceM": 2360},
        {"id": "DRS_2", "detectionDistanceM": 4180, "startDistanceM": 4300, "endDistanceM": 5080},
    ]

    order = ["VER", "NOR", "RUS", "HAM", "PIA", "SAI", "LEC", "HUL", "STR", "ALB", "ALO", "PER", "TSU", "RIC", "GAS", "OCO", "BOT", "MAG", "SAR", "ZHO"]
    gaps = [0.000, 0.109, 0.205, 0.296, 0.369, 0.491, 0.606, 0.731, 0.861, 0.971, 1.071, 1.191, 1.301, 1.421, 1.531, 1.641, 1.771, 1.891, 2.031, 2.201]

    return {
        "sessionId": "2024_silverstone_q3_ver_nor",
        "eventName": "British Grand Prix",
        "circuitName": "Silverstone Circuit",
        "circuitLength": circuit_length,
        "gridLength": circuit_length,
        "totalRaceLaps": 52,
        "pitLossSec": 20.5,
        "pitLossScSec": 11.0,
        "sectorSplitM": (1650, 4200),
        "weather": {
            "trackTempC": 34.2,
            "airTempC": 19.8,
            "humidityPct": 62.0,
            "windSpeedMs": 4.2,
            "windDirection": "WSW",
            "trackStatus": "GREEN",
        },
        "driverA": {"code": "VER", "fullName": "Max Verstappen", "number": 1, "teamName": "Red Bull Racing", "teamColor": "#3671C6", "lapTimeStr": "1:25.819", "lapTimeSec": 85.819, "tyreCompound": "S"},
        "driverB": {"code": "NOR", "fullName": "Lando Norris", "number": 4, "teamName": "McLaren", "teamColor": "#FF8000", "lapTimeStr": "1:25.928", "lapTimeSec": 85.928, "tyreCompound": "S"},
        "vTop": 332.5,
        "s": s,
        "x": x,
        "y": y,
        "z": z,
        "corners": corners,
        "drsZones": drs_zones,
        "tower": build_timing_tower(order, 85.819, gaps, 0.325, 0.345, 0.330),
        "strategyA": {"driverCode": "VER", "startCompound": "M", "pitLap1": 20, "nextCompound1": "H", "stops": 1},
        "strategyB": {"driverCode": "NOR", "startCompound": "M", "pitLap1": 23, "nextCompound1": "H", "stops": 1},
    }


def get_monaco_circuit_config() -> dict:
    circuit_length = 3337
    grid_points = circuit_length + 1

    # Monaco waypoint track geometry (Start -> Sainte Devote -> Beau Rivage -> Massenet -> Casino -> Mirabeau -> Hairpin -> Tunnel -> Chicane -> Tabac -> Piscine -> Rascasse)
    wp = np.array([
        [0.0, 0.0, 10.0],
        [240.0, 15.0, 12.0],
        [280.0, 50.0, 16.0],
        [240.0, 180.0, 26.0],
        [180.0, 360.0, 38.0],
        [100.0, 480.0, 46.0],
        [40.0, 530.0, 48.0],
        [-40.0, 490.0, 42.0],
        [-110.0, 440.0, 32.0],
        [-150.0, 420.0, 26.0],
        [-110.0, 380.0, 20.0],
        [-60.0, 340.0, 14.0],
        [-20.0, 260.0, 9.0],
        [50.0, 100.0, 6.0],
        [110.0, -80.0, 5.0],
        [120.0, -220.0, 5.5],
        [90.0, -340.0, 5.5],
        [50.0, -420.0, 6.0],
        [-10.0, -470.0, 6.5],
        [-80.0, -490.0, 7.0],
        [-150.0, -440.0, 7.5],
        [-160.0, -320.0, 8.5],
        [-100.0, -180.0, 9.5],
        [0.0, 0.0, 10.0],
    ])

    chords = np.sqrt(np.sum(np.diff(wp, axis=0)**2, axis=1))
    cum_dist = np.concatenate(([0.0], np.cumsum(chords)))
    cum_dist = cum_dist * (circuit_length / cum_dist[-1])
    cum_dist[-1] = circuit_length

    cs_x = CubicSpline(cum_dist, wp[:, 0], bc_type='periodic')
    cs_y = CubicSpline(cum_dist, wp[:, 1], bc_type='periodic')
    cs_z = CubicSpline(cum_dist, wp[:, 2], bc_type='periodic')

    s = np.linspace(0, circuit_length, grid_points)
    x = cs_x(s)
    y = cs_y(s)
    z = cs_z(s)

    corners = [
        {"id": "T1", "name": "Sainte Devote", "apexDistanceM": 280, "entryDistanceM": 180, "exitDistanceM": 380, "vMinA": 88.5, "vMinB": 86.8},
        {"id": "T3", "name": "Massenet", "apexDistanceM": 780, "entryDistanceM": 680, "exitDistanceM": 860, "vMinA": 148.0, "vMinB": 145.5},
        {"id": "T4", "name": "Casino Square", "apexDistanceM": 940, "entryDistanceM": 870, "exitDistanceM": 1020, "vMinA": 124.0, "vMinB": 121.8},
        {"id": "T5", "name": "Mirabeau Haute", "apexDistanceM": 1220, "entryDistanceM": 1120, "exitDistanceM": 1300, "vMinA": 78.5, "vMinB": 76.2},
        {"id": "T6", "name": "Grand Hotel Hairpin", "apexDistanceM": 1410, "entryDistanceM": 1340, "exitDistanceM": 1480, "vMinA": 48.0, "vMinB": 46.5},
        {"id": "T7", "name": "Mirabeau Bas", "apexDistanceM": 1560, "entryDistanceM": 1500, "exitDistanceM": 1620, "vMinA": 76.0, "vMinB": 74.0},
        {"id": "T8", "name": "Portier", "apexDistanceM": 1680, "entryDistanceM": 1620, "exitDistanceM": 1750, "vMinA": 72.0, "vMinB": 70.0},
        {"id": "T10", "name": "Nouvelle Chicane In", "apexDistanceM": 2110, "entryDistanceM": 2000, "exitDistanceM": 2160, "vMinA": 68.0, "vMinB": 66.5},
        {"id": "T11", "name": "Nouvelle Chicane Out", "apexDistanceM": 2170, "entryDistanceM": 2140, "exitDistanceM": 2230, "vMinA": 82.0, "vMinB": 80.0},
        {"id": "T12", "name": "Tabac", "apexDistanceM": 2450, "entryDistanceM": 2360, "exitDistanceM": 2530, "vMinA": 162.0, "vMinB": 159.5},
        {"id": "T13", "name": "Louis Chiron", "apexDistanceM": 2640, "entryDistanceM": 2560, "exitDistanceM": 2720, "vMinA": 208.0, "vMinB": 205.0},
        {"id": "T15", "name": "Piscine", "apexDistanceM": 2830, "entryDistanceM": 2780, "exitDistanceM": 2900, "vMinA": 118.0, "vMinB": 115.5},
        {"id": "T17", "name": "La Rascasse", "apexDistanceM": 3080, "entryDistanceM": 2990, "exitDistanceM": 3140, "vMinA": 56.0, "vMinB": 54.5},
        {"id": "T19", "name": "Antony Noghes", "apexDistanceM": 3220, "entryDistanceM": 3170, "exitDistanceM": 3290, "vMinA": 86.0, "vMinB": 84.2},
    ]

    drs_zones = [
        {"id": "DRS_1", "detectionDistanceM": 3280, "startDistanceM": 10, "endDistanceM": 250},
    ]

    order = ["LEC", "PIA", "SAI", "NOR", "RUS", "VER", "HAM", "TSU", "ALB", "GAS", "OCO", "HUL", "RIC", "STR", "ALO", "SAR", "PER", "BOT", "ZHO", "MAG"]
    gaps = [0.000, 0.154, 0.248, 0.272, 0.283, 0.297, 0.351, 0.588, 0.678, 1.041, 1.015, 1.170, 1.215, 1.293, 1.335, 1.439, 1.480, 1.568, 1.749, 1.830]

    return {
        "sessionId": "2024_monaco_q3_lec_pia",
        "eventName": "Monaco Grand Prix",
        "circuitName": "Circuit de Monaco",
        "circuitLength": circuit_length,
        "gridLength": circuit_length,
        "totalRaceLaps": 78,
        "pitLossSec": 22.0,
        "pitLossScSec": 12.0,
        "sectorSplitM": (1050, 2250),
        "weather": {
            "trackTempC": 48.5,
            "airTempC": 24.2,
            "humidityPct": 54.0,
            "windSpeedMs": 1.2,
            "windDirection": "S",
            "trackStatus": "GREEN",
        },
        "driverA": {"code": "LEC", "fullName": "Charles Leclerc", "number": 16, "teamName": "Ferrari", "teamColor": "#E80020", "lapTimeStr": "1:10.270", "lapTimeSec": 70.270, "tyreCompound": "S"},
        "driverB": {"code": "PIA", "fullName": "Oscar Piastri", "number": 81, "teamName": "McLaren", "teamColor": "#FF8000", "lapTimeStr": "1:10.424", "lapTimeSec": 70.424, "tyreCompound": "S"},
        "vTop": 292.0,
        "s": s,
        "x": x,
        "y": y,
        "z": z,
        "corners": corners,
        "drsZones": drs_zones,
        "tower": build_timing_tower(order, 70.270, gaps, 0.315, 0.355, 0.330),
        "strategyA": {"driverCode": "LEC", "startCompound": "M", "pitLap1": 32, "nextCompound1": "H", "stops": 1},
        "strategyB": {"driverCode": "PIA", "startCompound": "M", "pitLap1": 34, "nextCompound1": "H", "stops": 1},
    }


# ============================================================================
# 3. DETERMINISTIC ANALYTICAL KINEMATIC SYNTHESIS
# ============================================================================

def synthesize_driver_kinematics(
    s: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    corners: List[dict],
    drs_zones: List[dict],
    v_top_kmh: float,
    target_lap_time_sec: float,
    is_driver_b: bool = False,
    driver_seed: int = 42,
) -> Dict[str, np.ndarray]:
    """
    Synthesizes complete 1-meter spatial telemetry channels for a driver using
    forward-backward braking integration, power/traction curves, and aerodynamic limits.
    """
    rng = np.random.default_rng(driver_seed)
    n = len(s)

    # 1. Trajectory Curvature kappa
    dx = np.gradient(x)
    dy = np.gradient(y)
    d2x = np.gradient(dx)
    d2y = np.gradient(dy)
    num = np.abs(dx * d2y - dy * d2x)
    denom = np.maximum(dx**2 + dy**2, 1e-6) ** 1.5
    kappa = num / denom

    # 2. Target Cornering Speed Envelope
    mu_lat = 3.65 if not is_driver_b else 3.61
    v_lat_cap_kmh = np.clip(np.sqrt(mu_lat * GRAVITY_MS2 / np.maximum(kappa, 1e-5)) * 3.6, 50.0, v_top_kmh)

    v_target_kmh = np.full(n, v_top_kmh, dtype=np.float64)
    v_target_kmh = np.minimum(v_target_kmh, v_lat_cap_kmh)

    # Corner apex minimum speed dips
    for c in corners:
        apex_dist = float(c["apexDistanceM"])
        entry_dist = float(c["entryDistanceM"])
        exit_dist = float(c["exitDistanceM"])
        v_min = float(c["vMinB"] if is_driver_b else c["vMinA"])
        width = max(20.0, (exit_dist - entry_dist) / 2.0)

        d_from_apex = np.abs(s - apex_dist)
        corner_mask = (s >= entry_dist - 10.0) & (s <= exit_dist + 10.0)
        c_speed = v_min + (v_top_kmh - v_min) * np.clip((d_from_apex / width)**2, 0.0, 1.0)
        v_target_kmh[corner_mask] = np.minimum(v_target_kmh[corner_mask], c_speed[corner_mask])

    # 3. Backward Integration (Braking decel limits)
    v_bwd_ms = (v_target_kmh / 3.6).copy()
    brake_k = 0.00038 if not is_driver_b else 0.00037
    base_brake = 2.85 if not is_driver_b else 2.80

    for _ in range(2):  # Periodic track wrap
        for i in range(n - 2, -1, -1):
            v_next = v_bwd_ms[i + 1]
            a_brake = (base_brake + brake_k * (v_next**2)) * GRAVITY_MS2
            v_bwd_ms[i] = min(v_bwd_ms[i], np.sqrt(v_next**2 + 2.0 * a_brake * 1.0))
        v_bwd_ms[-1] = v_bwd_ms[0]

    # 4. Forward Integration (Traction & Acceleration limits)
    v_fwd_ms = v_bwd_ms.copy()
    max_accel_g = 2.15 if not is_driver_b else 2.12
    power_w = 750000.0 if not is_driver_b else 746000.0

    for _ in range(2):
        for i in range(n - 1):
            v_curr = v_fwd_ms[i]
            a_accel = min(max_accel_g * GRAVITY_MS2, power_w / (800.0 * max(18.0, v_curr))) - 0.5 * 1.2 * 1.15 * (v_curr**2) / 800.0
            a_accel = max(0.2, a_accel)
            v_fwd_ms[i + 1] = min(v_fwd_ms[i + 1], np.sqrt(v_curr**2 + 2.0 * a_accel * 1.0))
        v_fwd_ms[0] = v_fwd_ms[-1]

    # Add driver micro-signature
    noise = rng.normal(0.0, 0.25, size=n)
    v_speed_kmh = np.clip(v_fwd_ms * 3.6 + noise, 45.0, v_top_kmh)

    # 5. Normalize Time & Velocity to exact Target Lap Time
    dt_raw = 1.0 / (v_speed_kmh / 3.6)
    t_raw = np.cumsum(dt_raw)
    t_raw = t_raw - t_raw[0]

    scale_factor = target_lap_time_sec / t_raw[-1]
    v_speed_kmh = v_speed_kmh / scale_factor
    t_final = t_raw * scale_factor

    # 6. Savitzky-Golay Kinematics & G-Forces
    kin = compute_kinematics_1m(s, v_speed_kmh, x, y, z=z)
    g_long = kin["g_long"]
    g_lat = kin["g_lat"]
    signed_g_lat = kin["signed_g_lat"]

    # 7. Inputs: Throttle, Brake, Steer, RPM, Gear, DRS
    throttle = np.where(
        g_long > 0.05,
        np.clip(35.0 + g_long * 35.0, 0.0, 100.0),
        np.where(v_speed_kmh > (v_top_kmh - 20.0), 100.0, np.clip(25.0 + g_long * 15.0, 0.0, 60.0))
    )
    brake = np.where(
        g_long < -0.15,
        np.clip(-g_long * 20.0, 0.0, 100.0),
        0.0
    )
    throttle = np.where(brake > 10.0, 0.0, throttle)
    steer_deg = np.clip(signed_g_lat * 22.0, -120.0, 120.0)

    gear = np.zeros(n, dtype=int)
    gear[v_speed_kmh < 95.0] = 2
    gear[(v_speed_kmh >= 95.0) & (v_speed_kmh < 135.0)] = 3
    gear[(v_speed_kmh >= 135.0) & (v_speed_kmh < 175.0)] = 4
    gear[(v_speed_kmh >= 175.0) & (v_speed_kmh < 220.0)] = 5
    gear[(v_speed_kmh >= 220.0) & (v_speed_kmh < 265.0)] = 6
    gear[(v_speed_kmh >= 265.0) & (v_speed_kmh < 305.0)] = 7
    gear[v_speed_kmh >= 305.0] = 8

    rpm = 9600.0 + ((v_speed_kmh % 40.0) / 40.0) * 3800.0
    rpm = np.clip(rpm, 9500.0, 13800.0)

    drs = np.zeros(n, dtype=int)
    for dz in drs_zones:
        start_m = dz["startDistanceM"]
        end_m = dz["endDistanceM"]
        drs_mask = (s >= start_m) & (s <= end_m) & (throttle > 88.0) & (v_speed_kmh > 210.0)
        drs[drs_mask] = 12

    return {
        "t": t_final,
        "x": x,
        "y": y,
        "z": z,
        "speed": v_speed_kmh,
        "throttle": throttle,
        "brake": brake,
        "rpm": rpm,
        "gear": gear,
        "drs": drs,
        "gLong": g_long,
        "gLat": g_lat,
        "steerDeg": steer_deg,
        "kappa": kappa,
    }


# ============================================================================
# 4. DUAL-PATH FETCH & BUNDLE SERIALIZATION
# ============================================================================

def try_fastf1_fetch(session_id: str, year: int, gp: str, driver_a_code: str, driver_b_code: str, circuit_length: int, timeout_sec: float = 4.0) -> Optional[Tuple[dict, dict]]:
    """
    Attempts to download live telemetry via FastF1 within a strict subprocess timeout.
    Guarantees no hanging threads or network stalls.
    """
    FASTF1_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    pickle_path = FASTF1_CACHE_DIR / f"{session_id}_fastf1.pkl"

    # 1. Return immediately from disk cache if pre-warmed
    if pickle_path.is_file():
        try:
            with open(pickle_path, "rb") as f:
                tel_a, tel_b = pickle.load(f)
            res_a = process_lap_telemetry(tel_a, track_length_m=circuit_length)
            res_b = process_lap_telemetry(tel_b, track_length_m=circuit_length)
            return res_a["channels"], res_b["channels"]
        except Exception as e:
            logger.warning(f"Failed to read cached FastF1 pickle {pickle_path}: {e}")

    # 2. Strict subprocess execution with kill on timeout
    fetch_cmd = (
        f"import fastf1, pickle; "
        f"fastf1.Cache.enable_cache(r'{FASTF1_CACHE_DIR}'); "
        f"sess = fastf1.get_session({year}, '{gp}', 'Q'); "
        f"sess.load(telemetry=True, weather=False, messages=False); "
        f"lap_a = sess.laps.pick_driver('{driver_a_code}').pick_fastest(); "
        f"lap_b = sess.laps.pick_driver('{driver_b_code}').pick_fastest(); "
        f"tel_a = lap_a.get_telemetry(); "
        f"tel_b = lap_b.get_telemetry(); "
        f"pickle.dump((tel_a, tel_b), open(r'{pickle_path}', 'wb'))"
    )

    try:
        proc = subprocess.Popen([sys.executable, "-c", fetch_cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        proc.wait(timeout=timeout_sec)
        if proc.returncode == 0 and pickle_path.is_file():
            with open(pickle_path, "rb") as f:
                tel_a, tel_b = pickle.load(f)
            res_a = process_lap_telemetry(tel_a, track_length_m=circuit_length)
            res_b = process_lap_telemetry(tel_b, track_length_m=circuit_length)
            return res_a["channels"], res_b["channels"]
    except subprocess.TimeoutExpired:
        proc.kill()
        logger.info(f"[DUAL-PATH] FastF1 fetch timed out after {timeout_sec}s for {session_id}. Switching immediately to analytical synthesis.")
    except Exception as e:
        logger.info(f"[DUAL-PATH] FastF1 fetch error for {session_id}: {e}")

    return None


def serialize_channels_with_precision(ch: dict) -> dict:
    """
    Truncates floating point arrays to canonical Aero-Spec precision rules:
      - Coordinates (x, y, z): 2 decimals
      - Speed: 1 decimal
      - Time (t): 4 decimals
      - Throttle, Brake, Steer: 1 decimal
      - G-forces (gLong, gLat): 2 decimals
      - RPM, Gear, DRS: int
    """
    return {
        "t": [round(float(v), 4) for v in ch["t"]],
        "x": [round(float(v), 2) for v in ch["x"]],
        "y": [round(float(v), 2) for v in ch["y"]],
        "z": [round(float(v), 2) for v in ch["z"]],
        "speed": [round(float(v), 1) for v in ch["speed"]],
        "throttle": [round(float(v), 1) for v in ch["throttle"]],
        "brake": [round(float(v), 1) for v in ch["brake"]],
        "rpm": [int(round(float(v))) for v in ch["rpm"]],
        "gear": [int(round(float(v))) for v in ch["gear"]],
        "drs": [int(round(float(v))) for v in ch["drs"]],
        "gLong": [round(float(v), 2) for v in ch["gLong"]],
        "gLat": [round(float(v), 2) for v in ch["gLat"]],
        "steerDeg": [round(float(v), 1) for v in ch["steerDeg"]],
    }


def generate_canonical_session_bundle(circuit_cfg: dict) -> dict:
    """
    Generates a full SessionTelemetryPayload bundle with Dual-Path resolution.
    """
    session_id = circuit_cfg["sessionId"]
    circuit_length = circuit_cfg["circuitLength"]
    driver_a = circuit_cfg["driverA"]
    driver_b = circuit_cfg["driverB"]
    gp_name = circuit_cfg["eventName"].replace(" Grand Prix", "")

    logger.info(f"Generating canonical bundle: {session_id} ({circuit_length}m, {driver_a['code']} vs {driver_b['code']})...")

    # Path A: FastF1 with strict 4.0s timeout
    fastf1_res = try_fastf1_fetch(session_id, 2024, gp_name, driver_a["code"], driver_b["code"], circuit_length, timeout_sec=4.0)

    if fastf1_res is not None:
        logger.info(f"  -> Path A SUCCESS: Sourced directly from FastF1 live session telemetry.")
        ch_a_raw, ch_b_raw = fastf1_res
        kappa = np.zeros(len(ch_a_raw["t"]))
    else:
        logger.info(f"  -> Path B DETERMINISTIC SYNTHESIS: Forward-backward kinematic integration.")
        ch_a_raw = synthesize_driver_kinematics(
            s=circuit_cfg["s"],
            x=circuit_cfg["x"],
            y=circuit_cfg["y"],
            z=circuit_cfg["z"],
            corners=circuit_cfg["corners"],
            drs_zones=circuit_cfg["drsZones"],
            v_top_kmh=circuit_cfg["vTop"],
            target_lap_time_sec=driver_a["lapTimeSec"],
            is_driver_b=False,
            driver_seed=2024,
        )
        ch_b_raw = synthesize_driver_kinematics(
            s=circuit_cfg["s"],
            x=circuit_cfg["x"],
            y=circuit_cfg["y"],
            z=circuit_cfg["z"],
            corners=circuit_cfg["corners"],
            drs_zones=circuit_cfg["drsZones"],
            v_top_kmh=circuit_cfg["vTop"] * 0.996,
            target_lap_time_sec=driver_b["lapTimeSec"],
            is_driver_b=True,
            driver_seed=2025,
        )
        kappa = ch_a_raw["kappa"]

    # Compute deltaT (t_b - t_a)
    delta_t = np.array(ch_b_raw["t"]) - np.array(ch_a_raw["t"])
    delta_t_rounded = [round(float(v), 4) for v in delta_t]

    # Corner apex metadata using build_corner_apex_metadata from telemetry_engine
    audited_corners = build_corner_apex_metadata(
        s=circuit_cfg["s"],
        speed_a=np.array(ch_a_raw["speed"], dtype=np.float64),
        throttle_a=np.array(ch_a_raw["throttle"], dtype=np.float64),
        brake_a=np.array(ch_a_raw["brake"], dtype=np.float64),
        t_a=np.array(ch_a_raw["t"], dtype=np.float64),
        x=np.array(circuit_cfg["x"], dtype=np.float64),
        y=np.array(circuit_cfg["y"], dtype=np.float64),
        z=np.array(circuit_cfg["z"], dtype=np.float64),
        kappa=kappa,
        speed_b=np.array(ch_b_raw["speed"], dtype=np.float64),
        throttle_b=np.array(ch_b_raw["throttle"], dtype=np.float64),
        brake_b=np.array(ch_b_raw["brake"], dtype=np.float64),
        t_b=np.array(ch_b_raw["t"], dtype=np.float64),
        custom_corners=circuit_cfg["corners"],
    )

    # 5,000-Run Monte Carlo Strategy Oracle
    logger.info(f"  -> Computing 5,000-run Monte Carlo defaultStrategyOracle...")
    default_oracle = run_monte_carlo_strategy_oracle(
        base_lap_sec=driver_a["lapTimeSec"],
        total_laps=circuit_cfg["totalRaceLaps"],
        pit_loss_normal=circuit_cfg["pitLossSec"],
        pit_loss_sc=circuit_cfg["pitLossScSec"],
        sc_window_lap=None,
        track_temp_c=circuit_cfg["weather"]["trackTempC"],
        strategy_a=circuit_cfg["strategyA"],
        strategy_b=circuit_cfg["strategyB"],
        timing_tower=circuit_cfg["tower"],
        num_sims=5000,
    )

    # Serialize channel arrays with float truncation
    driver_a_channels = serialize_channels_with_precision(ch_a_raw)
    driver_b_channels = serialize_channels_with_precision(ch_b_raw)

    bundle = {
        "sessionId": session_id,
        "meta": {
            "year": 2024,
            "eventName": circuit_cfg["eventName"],
            "circuitName": circuit_cfg["circuitName"],
            "sessionType": "Qualifying 3",
            "circuitLengthM": circuit_length,
            "totalRaceLaps": circuit_cfg["totalRaceLaps"],
            "pitLossSec": circuit_cfg["pitLossSec"],
            "sectorSplitM": list(circuit_cfg["sectorSplitM"]),
            "weather": circuit_cfg["weather"],
            "driverA": driver_a,
            "driverB": driver_b,
        },
        "gridLength": circuit_cfg["gridLength"],
        "deltaT": delta_t_rounded,
        "timingTower": circuit_cfg["tower"],
        "corners": audited_corners,
        "drsZones": circuit_cfg["drsZones"],
        "driverA": driver_a_channels,
        "driverB": driver_b_channels,
        "defaultStrategyOracle": default_oracle,
    }

    return bundle


# ============================================================================
# 5. MAIN SEED EXECUTION & VERIFICATION
# ============================================================================

def seed_all_demo_telemetry():
    t_start = time.perf_counter()
    print("=" * 78)
    print("AERO-SPEC // CANONICAL 1-METER TELEMETRY SEED GENERATOR")
    print("=" * 78)

    # 1. Ensure target directory exists
    TELEMETRY_OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[SETUP] Destination Directory Verified: {TELEMETRY_OUT_DIR}")

    # 2. Check and verify trained GBDT model
    try:
        model = load_gbdt_model()
        if model is None:
            print("[SETUP] GBDT artifact missing, training via train_and_verify...")
            from backend.ml.train_and_verify import train_and_verify
            train_and_verify()
        else:
            print("[SETUP] GBDT ML Model verified in backend/ml/artifacts/aero_spec_gbdt_v1.joblib")
    except Exception as e:
        logger.warning(f"GBDT verify check: {e}")

    # 3. Define session generator tasks
    sessions = [
        get_monza_circuit_config(),
        get_silverstone_circuit_config(),
        get_monaco_circuit_config(),
    ]

    generated_files = []

    for cfg in sessions:
        sess_id = cfg["sessionId"]
        bundle = generate_canonical_session_bundle(cfg)

        out_path = TELEMETRY_OUT_DIR / f"{sess_id}.json"
        print(f"\n[WRITE] Writing {out_path.name}...")

        # Strict JSON dump with allow_nan=False
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(bundle, f, allow_nan=False, separators=(",", ":"))

        file_size_mb = out_path.stat().st_size / (1024 * 1024)
        print(f"        Size: {file_size_mb:.2f} MB | gridLength: {bundle['gridLength']} | Zero NaNs: CONFIRMED")
        generated_files.append((out_path, file_size_mb, bundle["gridLength"]))

        # For Monza, also save standalone baseline Monte Carlo strategy oracle
        if sess_id == "2024_monza_q3_ver_nor":
            oracle_path = TELEMETRY_OUT_DIR / "2024_monza_strategy_oracle.json"
            with open(oracle_path, "w", encoding="utf-8") as f:
                json.dump(bundle["defaultStrategyOracle"], f, allow_nan=False, indent=2)
            print(f"        Saved baseline strategy oracle: {oracle_path.name}")

    total_time = (time.perf_counter() - t_start)

    print("\n" + "=" * 78)
    print("VERIFICATION SUMMARY:")
    for path, sz, gl in generated_files:
        print(f"  - {path.name:<38} | {sz:.2f} MB | gridLength: {gl}")
    print(f"Total Execution Time: {total_time:.2f} seconds")
    print("=" * 78)


if __name__ == "__main__":
    seed_all_demo_telemetry()
