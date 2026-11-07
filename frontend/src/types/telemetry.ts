// frontend/src/types/telemetry.ts

export type TyreCompound = 'S' | 'M' | 'H' | 'I' | 'W';
export type SectorStatus = 'PURPLE' | 'GREEN' | 'AMBER';
export type CameraMode = 'ORTHO' | 'ISO' | 'CHASE';
export type TrackColorMode = 'PEDAL' | 'SPEED' | 'DELTA';
export type CockpitMode = 'TELEMETRY_LAB' | 'ML_STRATEGY_ORACLE';
export type PlaybackSpeed = 0.25 | 0.5 | 1.0 | 2.0 | 4.0 | 5.0 | 10.0;

export interface SessionWeather {
  trackTempC: number;
  airTempC: number;
  humidityPct: number;
  windSpeedMs: number;
  windDirection: string;
  trackStatus: 'GREEN' | 'YELLOW' | 'SC' | 'VSC' | 'RED';
}

export interface TimingTowerDriver {
  position: number;
  code: string;
  number: number;
  teamName: string;
  teamColor: string;
  compound: TyreCompound;
  tyreAgeLaps: number;
  bestLapTimeStr: string;
  bestLapTimeSec: number;
  gapToLeaderStr: string;
  sectors: [SectorStatus, SectorStatus, SectorStatus];
  sectorTimesSec: [number, number, number];
}

export interface CornerApexMeta {
  id: string;
  name: string;
  apexDistanceM: number;
  entryDistanceM: number;
  exitDistanceM: number;
  x: number;
  y: number;
  z: number;
  brakeMarkerA: number;
  brakeMarkerB: number;
  vMinA: number;
  vMinB: number;
  throttlePickupA: number;
  throttlePickupB: number;
  cornerDeltaSec: number;
}

export interface DrsZoneMeta {
  id: string;
  detectionDistanceM: number;
  startDistanceM: number;
  endDistanceM: number;
}

export interface NormalizedLapChannels {
  t: number[];
  x: number[];
  y: number[];
  z: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  rpm: number[];
  gear: number[];
  drs: number[];
  gLong: number[];
  gLat: number[];
  steerDeg: number[];
}

// ============================================================================
// MACHINE LEARNING & MONTE CARLO STRATEGY ORACLE CONTRACTS
// ============================================================================

export interface MlPhysicsWarpParams {
  enabled: boolean;
  compound: TyreCompound;      // 'S' | 'M' | 'H'
  tyreAgeLaps: number;         // 0 to 40 laps
  fuelLoadKg: number;          // 5 to 110 kg (qualifying is ~8 kg)
  trackTempC: number;          // 18 to 55 °C
}

export interface MlPhysicsWarpOutput {
  predictedLapTimeSec: number;
  lapDeltaVsBaseSec: number;   // + means slower than baseline qualifying lap
  gripMultiplier: number;      // e.g. 0.942 on worn tyres
  brakingExtensionM: number;   // e.g. +11.4m earlier braking required
  warpedSpeed: number[] | Float32Array;       // Length = gridLength + 1
  warpedDeltaT: number[] | Float32Array;      // Length = gridLength + 1 (t_warped[k] - t_baseA[k])
}

export interface DriverStrategyConfig {
  driverCode: string;
  startCompound: TyreCompound;
  pitLap1: number;             // 1 to totalRaceLaps - 2
  nextCompound1: TyreCompound;
  stops: 1 | 2;
  pitLap2: number;             // Used if stops === 2
  nextCompound2: TyreCompound;
}

export interface MlStrategySimulationInput {
  totalRaceLaps: number;       // e.g. 53 for Monza
  safetyCarWindowLap: number | null; // null = stochastic SC, or specific lap (e.g. 24)
  trackTempC: number;
  pitLossNormalSec: number;    // e.g. 21.4s at Monza
  pitLossScSec: number;        // e.g. 11.2s under Safety Car
  numSimulations: number;      // e.g. 5000
  strategyA: DriverStrategyConfig;
  strategyB: DriverStrategyConfig;
}

export interface MonteCarloDriverProbability {
  code: string;
  teamColor: string;
  winProbPct: number;          // 0.0 to 100.0
  podiumProbPct: number;       // 0.0 to 100.0
  pointsProbPct: number;       // 0.0 to 100.0
  expectedPosition: number;    // e.g. 1.38
  p10Position: number;         // Optimistic 10th percentile finish
  p90Position: number;         // Conservative 90th percentile finish
  expectedRaceTimeSec: number;
}

export interface LapByLapStrategyTrace {
  lapNumber: number;           // 1 to totalRaceLaps
  lapTimeASec: number;         // Predicted lap time for Driver A on lap l
  lapTimeBSec: number;         // Predicted lap time for Driver B on lap l
  tyreDegASec: number;         // Cumulative tyre degradation penalty on Driver A
  tyreDegBSec: number;         // Cumulative tyre degradation penalty on Driver B
  cumulativeGapMedianSec: number; // CumTime_B[l] - CumTime_A[l] (>0 means A leads B)
  cumulativeGapP10Sec: number; // 10th percentile Monte Carlo confidence bound
  cumulativeGapP90Sec: number; // 90th percentile Monte Carlo confidence bound
  compoundA: TyreCompound;
  compoundB: TyreCompound;
  isPitLapA: boolean;
  isPitLapB: boolean;
}

export interface MlStrategySimulationResult {
  executionTimeMs: number;
  numSimulations: number;
  optimalPitLapA: number;
  undercutGainSec: number;     // Positive = Driver A's undercut gains time over B
  verdictHeadline: string;     // e.g. "UNDERCUT OPTIMAL // BOX LAP 19 FOR [H] (+1.84s NET GAIN)"
  verdictDetail: string;       // Detailed engineering explanation of tyre crossover & pit exit gap
  pitExitGapMeters: number;    // Spatial separation at Turn 1 after both drivers complete stops
  driverProbabilities: MonteCarloDriverProbability[];
  lapTraces: LapByLapStrategyTrace[];
}

export interface SessionTelemetryPayload {
  sessionId: string;
  meta: {
    year: number;
    eventName: string;
    circuitName: string;
    sessionType: string;
    circuitLengthM: number;
    totalRaceLaps: number;     // e.g. 53 for Monza, 52 Silverstone, 78 Monaco
    pitLossSec: number;        // e.g. 21.4
    sectorSplitM: [number, number];
    weather: SessionWeather;
    driverA: {
      code: string;
      fullName: string;
      number: number;
      teamName: string;
      teamColor: string;
      lapTimeStr: string;
      lapTimeSec: number;
      tyreCompound: TyreCompound;
    };
    driverB: {
      code: string;
      fullName: string;
      number: number;
      teamName: string;
      teamColor: string;
      lapTimeStr: string;
      lapTimeSec: number;
      tyreCompound: TyreCompound;
    };
  };
  gridLength: number;
  deltaT: number[];
  timingTower: TimingTowerDriver[];
  corners: CornerApexMeta[];
  drsZones: DrsZoneMeta[];
  driverA: NormalizedLapChannels;
  driverB: NormalizedLapChannels;
  defaultStrategyOracle: MlStrategySimulationResult;
}
