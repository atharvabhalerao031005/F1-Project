"""
VELOCE PRO // LIVE WEATHER & THERMODYNAMIC TRACK TEMPERATURE SERVICE
Standard: Open-Meteo High-Resolution Microclimate Pipeline & Surface Heat Balance
"""

import time
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("veloce.live_weather")

_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}

def _cache_get(key: str) -> Optional[Any]:
    entry = _WEATHER_CACHE.get(key)
    if entry and time.time() < entry["exp"]:
        return entry["val"]
    return None

def _cache_set(key: str, val: Any, ttl_sec: int = 900):
    _WEATHER_CACHE[key] = {"val": val, "exp": time.time() + ttl_sec}


# Circuit GPS and base microclimates
CIRCUIT_COORDS = {
    "interlagos": {"lat": -23.7036, "lon": -46.6997, "name": "Autódromo José Carlos Pace", "base_air": 23.8},
    "las_vegas": {"lat": 36.1147, "lon": -115.173, "name": "Las Vegas Strip Circuit", "base_air": 14.2},
    "lusail": {"lat": 25.4900, "lon": 51.4542, "name": "Lusail International Circuit", "base_air": 27.5},
    "yas_marina": {"lat": 24.4672, "lon": 54.6031, "name": "Yas Marina Circuit", "base_air": 26.4},
    "monza": {"lat": 45.6156, "lon": 9.2811, "name": "Autodromo Nazionale Monza", "base_air": 24.8},
    "spa": {"lat": 50.4372, "lon": 5.9714, "name": "Circuit de Spa-Francorchamps", "base_air": 19.5},
    "monaco": {"lat": 43.7347, "lon": 7.4206, "name": "Circuit de Monaco", "base_air": 22.8},
    "silverstone": {"lat": 52.0786, "lon": -1.0169, "name": "Silverstone Circuit", "base_air": 21.2},
}


async def get_circuit_microclimate(circuit_id: str) -> Dict[str, Any]:
    """
    Fetches real-time microclimate data from Open-Meteo for the specified circuit
    and solves the thermodynamic asphalt surface temperature balance.
    Always maintains physically distinct air, track, and tire temperatures.
    """
    coord = CIRCUIT_COORDS.get(circuit_id, CIRCUIT_COORDS["interlagos"])
    lat = coord["lat"]
    lon = coord["lon"]

    cache_key = f"circuit_microclimate_{circuit_id}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&current="
        f"temperature_2m,relative_humidity_2m,direct_normal_irradiance,wind_speed_10m,wind_direction_10m,precipitation,weather_code"
    )

    air_temp = coord["base_air"]
    humidity = 58.0
    wind_speed = 3.6
    wind_dir = 135
    precip = 0.0
    solar_rad = 740.0  # W/m^2 solar irradiance
    weather_desc = "Warm / Track Sun Baking"
    source = "climatological-model"

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("current", {})
                air_temp = float(data.get("temperature_2m", air_temp))
                humidity = float(data.get("relative_humidity_2m", humidity))
                wind_speed = float(data.get("wind_speed_10m", wind_speed))
                wind_dir = int(data.get("wind_direction_10m", wind_dir))
                precip = float(data.get("precipitation", precip))
                solar_rad = float(data.get("direct_normal_irradiance", solar_rad))
                source = "open-meteo-satellite"

                code = int(data.get("weather_code", 0))
                if code == 0:
                    weather_desc = "Clear Skies / High Solar Load"
                elif code in (1, 2, 3):
                    weather_desc = "Partly Cloudy"
                elif code in (51, 53, 55, 61, 63, 65):
                    weather_desc = "Light Rain / Damp Asphalt"
                elif code in (80, 81, 82, 95):
                    weather_desc = "Thunderstorm / Monsoon"
    except Exception as e:
        logger.warning(f"Open-Meteo weather fetch notice for {circuit_id} ({e})")

    # =========================================================================
    # THERMODYNAMIC TRACK SURFACE TEMPERATURE SOLVER
    # T_track = T_air + Delta_T_solar
    # Under real sunlight, black asphalt absorptivity (0.90) heats the track 12°C - 20°C above ambient!
    # Even on overcast days, thermal mass keeps asphalt 6°C - 10°C hotter than air.
    # =========================================================================
    h_c = 5.8 + (3.8 * wind_speed)
    h_r = 5.2
    h_total = h_c + h_r

    effective_solar = max(380.0, solar_rad)
    delta_t_sun = (0.90 * effective_solar) / h_total

    # Ensure asphalt is always 12°C to 19°C above air in dry daytime conditions
    track_temp = round(air_temp + max(12.5, min(22.0, delta_t_sun)), 1)
    if precip > 0.1:
        # Rain evaporates and cools track, but asphalt still retains baseline thermal energy
        track_temp = round(max(air_temp + 3.0, 18.0), 1)

    # Pirelli P-Zero Tyre Core Surface Temperature (Runs at ~100°C - 108°C at pace)
    tyre_temp = round(track_temp + 62.5 + (wind_speed * 0.4), 1)

    # Asphalt Grip Coefficient
    grip_penalty = abs(track_temp - 42.0) * 0.0018
    rain_penalty = 0.28 if precip > 0.5 else (0.12 if precip > 0.0 else 0.0)
    grip_coefficient = round(max(0.65, min(1.02, 0.985 - grip_penalty - rain_penalty)), 3)

    result = {
        "circuitId": circuit_id,
        "circuitName": coord["name"],
        "airTempC": round(air_temp, 1),
        "trackTempC": track_temp,
        "tyreTempC": tyre_temp,
        "humidityPct": round(humidity, 1),
        "windSpeedKmh": round(wind_speed * 3.6, 1),
        "windDirectionDeg": wind_dir,
        "precipitationMm": precip,
        "solarIrradianceWm2": round(solar_rad, 1),
        "weatherDescription": weather_desc,
        "gripCoefficient": grip_coefficient,
        "isWet": precip > 0.1,
        "source": source,
    }

    _cache_set(cache_key, result, ttl_sec=900)
    return result
