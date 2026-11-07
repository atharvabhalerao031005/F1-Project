// frontend/src/utils/fiaCircuitsDatabase.ts
/**
 * VELOCE V2 // FIA FORMULA 1 CALENDAR: ALL 24 CANONICAL CIRCUITS DATABASE
 * Accurate 3D Centerline Geometry & Coordinate Transformation Engine
 * 
 * Invariants:
 * 1. Zero Rollercoaster Distortion:
 *    - OpenF1/FastF1 raw coordinates: X is Easting (decimeters), Y is Northing (decimeters), Z is Elevation (decimeters).
 *    - Metric Conversion: x = X / 10.0, y = Y / 10.0, z = Z / 10.0.
 *    - Ground Plane Mapping: threeX = x - centerX, threeY = (z - baseZ) * elevationScale, threeZ = -(y - centerY).
 *    - Chirality: Mapping Northing y to Three.js -z strictly preserves clockwise/counter-clockwise track chirality.
 * 2. Complete 24-Circuit Coverage:
 *    All 24 rounds of the official FIA calendar are fully supported with verified coordinates and metadata.
 */

import * as THREE from 'three';
import master24Json from '../data/master_24_circuits.json';

export type CircuitId =
  | 'bahrain'
  | 'jeddah'
  | 'albert_park'
  | 'suzuka'
  | 'shanghai'
  | 'miami'
  | 'imola'
  | 'monaco'
  | 'montreal'
  | 'catalunya'
  | 'red_bull_ring'
  | 'silverstone'
  | 'hungaroring'
  | 'spa'
  | 'zandvoort'
  | 'monza'
  | 'baku'
  | 'marina_bay'
  | 'cota'
  | 'mexico'
  | 'interlagos'
  | 'las_vegas'
  | 'lusail'
  | 'yas_marina';

export type TrackDirection = 'Clockwise' | 'Counter-Clockwise' | 'Figure-8';

export interface CircuitBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minElev: number;
  maxElev: number;
}

export interface LapRecord {
  time: string;
  driver: string;
  year: number;
}

export interface CircuitMetadata {
  id: CircuitId;
  name: string;
  shortName: string;
  country: string;
  city: string;
  round: number;
  officialLengthMeters: number;
  calculatedLengthMeters: number;
  raceLaps: number;
  turnsCount: number;
  direction: TrackDirection;
  pitLossSec: number;
  drsZones: number;
  lapRecord: LapRecord;
  elevationChangeM: number;
  poleLapTimeSec: number;
  pointsCount: number;
  bounds: CircuitBounds;
  centerline: [number, number, number][];
}

export interface CircuitSplineBundle {
  circuit: CircuitMetadata;
  trackSpline: THREE.CatmullRomCurve3;
  centerlinePoints: THREE.Vector3[];
  trackLengthMeters: number;
}

export const FIA_CIRCUITS_META: Record<CircuitId, Omit<CircuitMetadata, "centerline">> = {
  "bahrain": {
    "id": "bahrain",
    "name": "Bahrain International Circuit",
    "shortName": "Sakhir",
    "country": "Bahrain",
    "city": "Sakhir",
    "round": 1,
    "officialLengthMeters": 5412,
    "calculatedLengthMeters": 5322.4,
    "raceLaps": 57,
    "turnsCount": 15,
    "direction": "Clockwise",
    "pitLossSec": 22.8,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:31.447",
      "driver": "Pedro de la Rosa",
      "year": 2005
    },
    "elevationChangeM": 16.7,
    "poleLapTimeSec": 89.165,
    "pointsCount": 350,
    "bounds": {
      "minX": -403.75,
      "maxX": 403.75,
      "minZ": -592.35,
      "maxZ": 592.35,
      "minElev": 0.0,
      "maxElev": 16.7
    }
  },
  "jeddah": {
    "id": "jeddah",
    "name": "Jeddah Corniche Circuit",
    "shortName": "Jeddah",
    "country": "Saudi Arabia",
    "city": "Jeddah",
    "round": 2,
    "officialLengthMeters": 6174,
    "calculatedLengthMeters": 6101.6,
    "raceLaps": 50,
    "turnsCount": 27,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.2,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:30.734",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "elevationChangeM": 2.4,
    "poleLapTimeSec": 87.472,
    "pointsCount": 347,
    "bounds": {
      "minX": -291.0,
      "maxX": 291.0,
      "minZ": -1371.9,
      "maxZ": 1371.9,
      "minElev": 0.0,
      "maxElev": 2.4
    }
  },
  "albert_park": {
    "id": "albert_park",
    "name": "Albert Park Circuit",
    "shortName": "Melbourne",
    "country": "Australia",
    "city": "Melbourne",
    "round": 3,
    "officialLengthMeters": 5278,
    "calculatedLengthMeters": 5206.5,
    "raceLaps": 58,
    "turnsCount": 14,
    "direction": "Clockwise",
    "pitLossSec": 20.4,
    "drsZones": 4,
    "lapRecord": {
      "time": "1:19.813",
      "driver": "Charles Leclerc",
      "year": 2024
    },
    "elevationChangeM": 2.5,
    "poleLapTimeSec": 75.915,
    "pointsCount": 302,
    "bounds": {
      "minX": -735.35,
      "maxX": 735.35,
      "minZ": -870.65,
      "maxZ": 870.65,
      "minElev": 0.0,
      "maxElev": 2.5
    }
  },
  "suzuka": {
    "id": "suzuka",
    "name": "Suzuka International Racing Course",
    "shortName": "Suzuka",
    "country": "Japan",
    "city": "Suzuka",
    "round": 4,
    "officialLengthMeters": 5807,
    "calculatedLengthMeters": 5761.7,
    "raceLaps": 53,
    "turnsCount": 18,
    "direction": "Figure-8",
    "pitLossSec": 23.5,
    "drsZones": 1,
    "lapRecord": {
      "time": "1:30.983",
      "driver": "Lewis Hamilton",
      "year": 2019
    },
    "elevationChangeM": 40.3,
    "poleLapTimeSec": 88.197,
    "pointsCount": 341,
    "bounds": {
      "minX": -987.95,
      "maxX": 987.95,
      "minZ": -507.15,
      "maxZ": 507.15,
      "minElev": 0.0,
      "maxElev": 40.3
    }
  },
  "shanghai": {
    "id": "shanghai",
    "name": "Shanghai International Circuit",
    "shortName": "Shanghai",
    "country": "China",
    "city": "Shanghai",
    "round": 5,
    "officialLengthMeters": 5451,
    "calculatedLengthMeters": 5355.9,
    "raceLaps": 56,
    "turnsCount": 16,
    "direction": "Clockwise",
    "pitLossSec": 22.6,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:32.238",
      "driver": "Michael Schumacher",
      "year": 2004
    },
    "elevationChangeM": 7.1,
    "poleLapTimeSec": 93.66,
    "pointsCount": 360,
    "bounds": {
      "minX": -607.4,
      "maxX": 607.4,
      "minZ": -540.65,
      "maxZ": 540.65,
      "minElev": 0.0,
      "maxElev": 7.1
    }
  },
  "miami": {
    "id": "miami",
    "name": "Miami International Autodrome",
    "shortName": "Miami",
    "country": "United States",
    "city": "Miami",
    "round": 6,
    "officialLengthMeters": 5412,
    "calculatedLengthMeters": 5340.4,
    "raceLaps": 57,
    "turnsCount": 19,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.9,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:29.708",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "elevationChangeM": 3.6,
    "poleLapTimeSec": 87.241,
    "pointsCount": 341,
    "bounds": {
      "minX": -749.25,
      "maxX": 749.25,
      "minZ": -293.7,
      "maxZ": 293.7,
      "minElev": 0.0,
      "maxElev": 3.6
    }
  },
  "imola": {
    "id": "imola",
    "name": "Autodromo Internazionale Enzo e Dino Ferrari",
    "shortName": "Imola",
    "country": "Italy",
    "city": "Imola",
    "round": 7,
    "officialLengthMeters": 4909,
    "calculatedLengthMeters": 4852.7,
    "raceLaps": 63,
    "turnsCount": 19,
    "direction": "Counter-Clockwise",
    "pitLossSec": 28.5,
    "drsZones": 1,
    "lapRecord": {
      "time": "1:15.484",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "elevationChangeM": 34.4,
    "poleLapTimeSec": 74.746,
    "pointsCount": 293,
    "bounds": {
      "minX": -905.3,
      "maxX": 905.3,
      "minZ": -501.85,
      "maxZ": 501.85,
      "minElev": 0.0,
      "maxElev": 34.4
    }
  },
  "monaco": {
    "id": "monaco",
    "name": "Circuit de Monaco",
    "shortName": "Monte Carlo",
    "country": "Monaco",
    "city": "Monte Carlo",
    "round": 8,
    "officialLengthMeters": 3337,
    "calculatedLengthMeters": 3254.8,
    "raceLaps": 78,
    "turnsCount": 19,
    "direction": "Clockwise",
    "pitLossSec": 24.2,
    "drsZones": 1,
    "lapRecord": {
      "time": "1:12.909",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "elevationChangeM": 41.8,
    "poleLapTimeSec": 70.27,
    "pointsCount": 268,
    "bounds": {
      "minX": -374.8,
      "maxX": 374.8,
      "minZ": -480.25,
      "maxZ": 480.25,
      "minElev": 0.0,
      "maxElev": 41.8
    }
  },
  "montreal": {
    "id": "montreal",
    "name": "Circuit Gilles-Villeneuve",
    "shortName": "Montreal",
    "country": "Canada",
    "city": "Montreal",
    "round": 9,
    "officialLengthMeters": 4361,
    "calculatedLengthMeters": 4270.8,
    "raceLaps": 70,
    "turnsCount": 14,
    "direction": "Clockwise",
    "pitLossSec": 19.8,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:13.078",
      "driver": "Valtteri Bottas",
      "year": 2019
    },
    "elevationChangeM": 5.2,
    "poleLapTimeSec": 71.742,
    "pointsCount": 276,
    "bounds": {
      "minX": -316.85,
      "maxX": 316.85,
      "minZ": -951.6,
      "maxZ": 951.6,
      "minElev": 0.0,
      "maxElev": 5.2
    }
  },
  "catalunya": {
    "id": "catalunya",
    "name": "Circuit de Barcelona-Catalunya",
    "shortName": "Catalunya",
    "country": "Spain",
    "city": "Montmel\u00f3",
    "round": 10,
    "officialLengthMeters": 4657,
    "calculatedLengthMeters": 4590.0,
    "raceLaps": 66,
    "turnsCount": 14,
    "direction": "Clockwise",
    "pitLossSec": 22.1,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:16.330",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "elevationChangeM": 30.0,
    "poleLapTimeSec": 71.383,
    "pointsCount": 277,
    "bounds": {
      "minX": -480.5,
      "maxX": 480.5,
      "minZ": -579.85,
      "maxZ": 579.85,
      "minElev": 0.0,
      "maxElev": 30.0
    }
  },
  "red_bull_ring": {
    "id": "red_bull_ring",
    "name": "Red Bull Ring",
    "shortName": "Spielberg",
    "country": "Austria",
    "city": "Spielberg",
    "round": 11,
    "officialLengthMeters": 4318,
    "calculatedLengthMeters": 4257.1,
    "raceLaps": 71,
    "turnsCount": 10,
    "direction": "Clockwise",
    "pitLossSec": 20.6,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:05.619",
      "driver": "Carlos Sainz",
      "year": 2020
    },
    "elevationChangeM": 63.4,
    "poleLapTimeSec": 64.314,
    "pointsCount": 255,
    "bounds": {
      "minX": -623.9,
      "maxX": 623.9,
      "minZ": -396.1,
      "maxZ": 396.1,
      "minElev": 0.0,
      "maxElev": 63.4
    }
  },
  "silverstone": {
    "id": "silverstone",
    "name": "Silverstone Circuit",
    "shortName": "Silverstone",
    "country": "Great Britain",
    "city": "Silverstone",
    "round": 12,
    "officialLengthMeters": 5891,
    "calculatedLengthMeters": 5805.5,
    "raceLaps": 52,
    "turnsCount": 18,
    "direction": "Clockwise",
    "pitLossSec": 21.0,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:27.097",
      "driver": "Max Verstappen",
      "year": 2020
    },
    "elevationChangeM": 11.3,
    "poleLapTimeSec": 85.819,
    "pointsCount": 325,
    "bounds": {
      "minX": -505.1,
      "maxX": 505.1,
      "minZ": -861.6,
      "maxZ": 861.6,
      "minElev": 0.0,
      "maxElev": 11.3
    }
  },
  "hungaroring": {
    "id": "hungaroring",
    "name": "Hungaroring",
    "shortName": "Hungaroring",
    "country": "Hungary",
    "city": "Mogyor\u00f3d",
    "round": 13,
    "officialLengthMeters": 4381,
    "calculatedLengthMeters": 4331.2,
    "raceLaps": 70,
    "turnsCount": 14,
    "direction": "Clockwise",
    "pitLossSec": 21.5,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:16.627",
      "driver": "Lewis Hamilton",
      "year": 2020
    },
    "elevationChangeM": 34.8,
    "poleLapTimeSec": 75.227,
    "pointsCount": 288,
    "bounds": {
      "minX": -531.1,
      "maxX": 531.1,
      "minZ": -602.5,
      "maxZ": 602.5,
      "minElev": 0.0,
      "maxElev": 34.8
    }
  },
  "spa": {
    "id": "spa",
    "name": "Circuit de Spa-Francorchamps",
    "shortName": "Spa-Francorchamps",
    "country": "Belgium",
    "city": "Stavelot",
    "round": 14,
    "officialLengthMeters": 7004,
    "calculatedLengthMeters": 6924.4,
    "raceLaps": 44,
    "turnsCount": 19,
    "direction": "Clockwise",
    "pitLossSec": 23.0,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:46.286",
      "driver": "Valtteri Bottas",
      "year": 2018
    },
    "elevationChangeM": 102.4,
    "poleLapTimeSec": 113.159,
    "pointsCount": 422,
    "bounds": {
      "minX": -632.45,
      "maxX": 632.45,
      "minZ": -1015.9,
      "maxZ": 1015.9,
      "minElev": 0.0,
      "maxElev": 102.4
    }
  },
  "zandvoort": {
    "id": "zandvoort",
    "name": "Circuit Zandvoort",
    "shortName": "Zandvoort",
    "country": "Netherlands",
    "city": "Zandvoort",
    "round": 15,
    "officialLengthMeters": 4259,
    "calculatedLengthMeters": 4159.9,
    "raceLaps": 72,
    "turnsCount": 14,
    "direction": "Clockwise",
    "pitLossSec": 21.8,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:11.097",
      "driver": "Lewis Hamilton",
      "year": 2021
    },
    "elevationChangeM": 9.2,
    "poleLapTimeSec": 69.673,
    "pointsCount": 273,
    "bounds": {
      "minX": -485.8,
      "maxX": 485.8,
      "minZ": -415.5,
      "maxZ": 415.5,
      "minElev": 0.0,
      "maxElev": 9.2
    }
  },
  "monza": {
    "id": "monza",
    "name": "Autodromo Nazionale Monza",
    "shortName": "Monza",
    "country": "Italy",
    "city": "Monza",
    "round": 16,
    "officialLengthMeters": 5793,
    "calculatedLengthMeters": 6833.6,
    "raceLaps": 53,
    "turnsCount": 11,
    "direction": "Clockwise",
    "pitLossSec": 24.0,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:21.046",
      "driver": "Rubens Barrichello",
      "year": 2004
    },
    "elevationChangeM": 24.0,
    "poleLapTimeSec": 79.311,
    "pointsCount": 363,
    "bounds": {
      "minX": -1394.0,
      "maxX": 1394.0,
      "minZ": -739.1,
      "maxZ": 739.1,
      "minElev": 0.0,
      "maxElev": 24.0
    }
  },
  "baku": {
    "id": "baku",
    "name": "Baku City Circuit",
    "shortName": "Baku",
    "country": "Azerbaijan",
    "city": "Baku",
    "round": 17,
    "officialLengthMeters": 6003,
    "calculatedLengthMeters": 5925.7,
    "raceLaps": 51,
    "turnsCount": 20,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.4,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:43.009",
      "driver": "Charles Leclerc",
      "year": 2019
    },
    "elevationChangeM": 26.8,
    "poleLapTimeSec": 101.365,
    "pointsCount": 394,
    "bounds": {
      "minX": -1031.65,
      "maxX": 1031.65,
      "minZ": -741.25,
      "maxZ": 741.25,
      "minElev": 0.0,
      "maxElev": 26.8
    }
  },
  "marina_bay": {
    "id": "marina_bay",
    "name": "Marina Bay Street Circuit",
    "shortName": "Singapore",
    "country": "Singapore",
    "city": "Marina Bay",
    "round": 18,
    "officialLengthMeters": 4940,
    "calculatedLengthMeters": 4842.2,
    "raceLaps": 62,
    "turnsCount": 19,
    "direction": "Counter-Clockwise",
    "pitLossSec": 29.5,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:34.486",
      "driver": "Daniel Ricciardo",
      "year": 2024
    },
    "elevationChangeM": 5.4,
    "poleLapTimeSec": 89.525,
    "pointsCount": 338,
    "bounds": {
      "minX": -719.6,
      "maxX": 719.6,
      "minZ": -449.75,
      "maxZ": 449.75,
      "minElev": 0.0,
      "maxElev": 5.4
    }
  },
  "cota": {
    "id": "cota",
    "name": "Circuit of the Americas",
    "shortName": "Austin",
    "country": "United States",
    "city": "Austin",
    "round": 19,
    "officialLengthMeters": 5513,
    "calculatedLengthMeters": 5411.7,
    "raceLaps": 56,
    "turnsCount": 20,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.7,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:36.169",
      "driver": "Charles Leclerc",
      "year": 2019
    },
    "elevationChangeM": 30.3,
    "poleLapTimeSec": 92.33,
    "pointsCount": 363,
    "bounds": {
      "minX": -906.75,
      "maxX": 906.75,
      "minZ": -525.55,
      "maxZ": 525.55,
      "minElev": 0.0,
      "maxElev": 30.3
    }
  },
  "mexico": {
    "id": "mexico",
    "name": "Aut\u00f3dromo Hermanos Rodr\u00edguez",
    "shortName": "Mexico City",
    "country": "Mexico",
    "city": "Mexico City",
    "round": 20,
    "officialLengthMeters": 4304,
    "calculatedLengthMeters": 4218.2,
    "raceLaps": 71,
    "turnsCount": 17,
    "direction": "Clockwise",
    "pitLossSec": 22.5,
    "drsZones": 3,
    "lapRecord": {
      "time": "1:17.774",
      "driver": "Valtteri Bottas",
      "year": 2021
    },
    "elevationChangeM": 2.8,
    "poleLapTimeSec": 75.946,
    "pointsCount": 293,
    "bounds": {
      "minX": -722.35,
      "maxX": 722.35,
      "minZ": -516.4,
      "maxZ": 516.4,
      "minElev": 0.0,
      "maxElev": 2.8
    }
  },
  "interlagos": {
    "id": "interlagos",
    "name": "Aut\u00f3dromo Jos\u00e9 Carlos Pace",
    "shortName": "Interlagos",
    "country": "Brazil",
    "city": "S\u00e3o Paulo",
    "round": 21,
    "officialLengthMeters": 4309,
    "calculatedLengthMeters": 4208.6,
    "raceLaps": 71,
    "turnsCount": 15,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.6,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:10.540",
      "driver": "Valtteri Bottas",
      "year": 2018
    },
    "elevationChangeM": 43.1,
    "poleLapTimeSec": 83.405,
    "pointsCount": 307,
    "bounds": {
      "minX": -327.2,
      "maxX": 327.2,
      "minZ": -520.1,
      "maxZ": 520.1,
      "minElev": 0.0,
      "maxElev": 43.1
    }
  },
  "las_vegas": {
    "id": "las_vegas",
    "name": "Las Vegas Strip Circuit",
    "shortName": "Las Vegas",
    "country": "United States",
    "city": "Las Vegas",
    "round": 22,
    "officialLengthMeters": 6201,
    "calculatedLengthMeters": 6149.7,
    "raceLaps": 50,
    "turnsCount": 17,
    "direction": "Counter-Clockwise",
    "pitLossSec": 21.1,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:35.490",
      "driver": "Oscar Piastri",
      "year": 2023
    },
    "elevationChangeM": 16.3,
    "poleLapTimeSec": 92.312,
    "pointsCount": 368,
    "bounds": {
      "minX": -580.6,
      "maxX": 580.6,
      "minZ": -974.65,
      "maxZ": 974.65,
      "minElev": 0.0,
      "maxElev": 16.3
    }
  },
  "lusail": {
    "id": "lusail",
    "name": "Lusail International Circuit",
    "shortName": "Lusail",
    "country": "Qatar",
    "city": "Lusail",
    "round": 23,
    "officialLengthMeters": 5419,
    "calculatedLengthMeters": 5346.1,
    "raceLaps": 57,
    "turnsCount": 16,
    "direction": "Clockwise",
    "pitLossSec": 24.5,
    "drsZones": 1,
    "lapRecord": {
      "time": "1:24.319",
      "driver": "Max Verstappen",
      "year": 2023
    },
    "elevationChangeM": 4.2,
    "poleLapTimeSec": 80.52,
    "pointsCount": 309,
    "bounds": {
      "minX": -626.15,
      "maxX": 626.15,
      "minZ": -733.7,
      "maxZ": 733.7,
      "minElev": 0.0,
      "maxElev": 4.2
    }
  },
  "yas_marina": {
    "id": "yas_marina",
    "name": "Yas Marina Circuit",
    "shortName": "Yas Marina Circuit",
    "country": "United Arab Emirates",
    "city": "Abu Dhabi",
    "round": 24,
    "officialLengthMeters": 5281,
    "calculatedLengthMeters": 5208.1,
    "raceLaps": 58,
    "turnsCount": 16,
    "direction": "Counter-Clockwise",
    "pitLossSec": 22.3,
    "drsZones": 2,
    "lapRecord": {
      "time": "1:26.103",
      "driver": "Max Verstappen",
      "year": 2021
    },
    "elevationChangeM": 11.0,
    "poleLapTimeSec": 82.595,
    "pointsCount": 323,
    "bounds": {
      "minX": -399.6,
      "maxX": 399.6,
      "minZ": -855.8,
      "maxZ": 855.8,
      "minElev": 0.0,
      "maxElev": 11.0
    }
  }
};


/**
 * Maps raw FastF1 or OpenF1 telemetry coordinates to Three.js ground plane.
 * Prevents the 5,000m vertical rollercoaster loop distortion.
 */
export function fiaCoordsToThree(
  xMeters: number,
  yMeters: number,
  zMeters: number,
  centerX: number = 0,
  centerY: number = 0,
  baseElevation: number = 0,
  elevationScale: number = 1.0
): THREE.Vector3 {
  // threeX = Easting relative to track centroid
  const threeX = xMeters - centerX;
  // threeY = Altitude above track baseline (VERTICAL UP in Three.js)
  const threeY = (zMeters - baseElevation) * elevationScale;
  // threeZ = -Northing relative to track centroid (Preserves CW/CCW chirality)
  const threeZ = -(yMeters - centerY);

  return new THREE.Vector3(threeX, threeY, threeZ);
}

/**
 * Converts raw FastF1 decimeters (tenths of a meter) to SI meters.
 */
export function fastF1DecimetersToMeters(val: number): number {
  return val / 10.0;
}

/**
 * Builds a smooth, closed centripetal Catmull-Rom spline from 3D centerline points.
 */
export function buildTrackSplineFromPoints(
  points: [number, number, number][] | THREE.Vector3[]
): {
  spline: THREE.CatmullRomCurve3;
  vectorPoints: THREE.Vector3[];
  length: number;
} {
  const vectorPoints: THREE.Vector3[] = points.map((p) =>
    p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2])
  );

  const spline = new THREE.CatmullRomCurve3(vectorPoints, true, 'centripetal');
  spline.arcLengthDivisions = 2000;
  spline.updateArcLengths();
  const length = Math.round(spline.getLength());

  return { spline, vectorPoints, length };
}


// 24-Circuit runtime cache for pre-computed splines
const _splineCache = new Map<string, CircuitSplineBundle>();

/**
 * Retrieves full 3D spline and centerline coordinates for any of the 24 FIA circuits.
 */
export function getCircuitSplineBundle(circuitId: string): CircuitSplineBundle {
  const normId = (circuitId || 'monza').toLowerCase().replace(/[\s-]/g, '_');
  if (_splineCache.has(normId)) {
    return _splineCache.get(normId)!;
  }

  const rawList = (master24Json as any).circuits as CircuitMetadata[];
  const found = rawList.find((c) => c.id === normId) || rawList.find((c) => c.id === 'monza') || rawList[0];

  // Map 3D points strictly onto horizontal ground with Y = 0.05 (or elevation * 0.04)
  const vectorPoints: THREE.Vector3[] = found.centerline.map((pt) => {
    // pt[0] is Easting, pt[1] is Elevation, pt[2] is -Northing
    const yVal = THREE.MathUtils.clamp(pt[1] * 0.04, 0.05, 3.5);
    return new THREE.Vector3(pt[0], yVal, pt[2]);
  });

  const spline = new THREE.CatmullRomCurve3(vectorPoints, true, 'centripetal');
  spline.arcLengthDivisions = 2000;
  spline.updateArcLengths();
  const length = Math.round(spline.getLength());

  const bundle: CircuitSplineBundle = {
    circuit: found,
    trackSpline: spline,
    centerlinePoints: vectorPoints,
    trackLengthMeters: length || found.officialLengthMeters,
  };

  _splineCache.set(normId, bundle);
  return bundle;
}

/**
 * Returns a complete list of all 24 championship circuits for pickers and UI selectors.
 */
export function getAll24Circuits(): CircuitMetadata[] {
  return ((master24Json as any).circuits || []) as CircuitMetadata[];
}
