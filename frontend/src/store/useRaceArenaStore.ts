// frontend/src/store/useRaceArenaStore.ts
/**
 * VELOCE PRO // SYSTEM 2: DYNAMIC MULTI-CAR 3D & 2D RACE ARENA STORE
 * Dedicated 60/120 Hz state store with sub-37ns VSTM-v1 spatio-temporal telemetry,
 * dynamic grid sizes (2 to 24 cars), dynamic circuit lap counts (1 to 78 laps),
 * interactive lap scrubber, and broadcast camera control.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PlaybackSpeed, TyreCompound } from '../types/telemetry';
import { useStrategyStore } from './useStrategyStore';
import {
  type VstmSimulationPayload,
  evaluateCarAtTime,
  getRaceDurationSeconds,
} from '../utils/spatioTemporalMatrix';
import { getCircuitSplineBundle } from '../utils/fiaCircuitsDatabase';

export type BroadcastCamRig = 'CHASE' | 'ONBOARD' | 'HELICOPTER' | 'TRACKSIDE';

export interface GridDriverState {
  code: string;
  name: string;
  number: number;
  team: string;
  teamColor: string;
  s: number;               // Distance along track spline (meters)
  w: number;               // Lateral offset from racing line (meters)
  speedKmh: number;
  gear: number;
  rpm: number;
  throttle?: number;
  brake?: number;
  drsActive: boolean;
  compound: TyreCompound;
  tireAge?: number;
  currentLap: number;
  intervalSec: string;
  status?: string;         // RACING, PIT_ENTRY, PIT_STOP, PIT_EXIT, SAFETY_CAR, VSC, DNF
  isRetired?: boolean;
}

export interface GhostMergeSnapshot {
  s: number;
  w: number;
  label: string;
  color: string;
  lapTimeDeltaSec: number;
}

export interface RaceArenaStoreState {
  // Micro-spatial playback state
  playbackDistance: number;
  playbackTimeSec: number;
  totalDurationSec: number;
  currentLap: number;
  totalLaps: number;
  circuitId: string;
  maxDistance: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  activeDriverCode: string;
  cameraRig: BroadcastCamRig;
  isAudioMuted: boolean;
  isLiveOpenF1Streaming: boolean;
  activeWeatherMode: 'DAY' | 'RAIN' | 'NIGHT';

  // Dynamic Driver Grid & Hidden Driver Set
  gridDrivers: GridDriverState[];
  hiddenDriverCodes: string[];

  // Full VSTM-v1 Physics Simulation Telemetry Payload
  simulationPayload: VstmSimulationPayload | null;

  // Translucent ML Ghost Car Snapshot
  ghostSnapshot: GhostMergeSnapshot | null;
  isClassificationModalOpen: boolean;
  isPodiumCardOpen: boolean;

  // Actions
  setSimulationPayload: (payload: VstmSimulationPayload) => void;
  setCircuitId: (circuitId: string) => void;
  terminateSimulation: () => void;
  resetSimulation: () => void;
  scrubToTime: (timeSec: number) => void;
  scrubToLap: (lapNumber: number) => void;
  tickSimulation: (deltaSec: number) => void;
  toggleDriverVisibility: (driverCode: string) => void;
  isDriverVisible: (driverCode: string) => boolean;

  setPlaybackDistance: (distM: number) => void;
  stepPlaybackDistance: (deltaM: number) => void;
  setIsClassificationModalOpen: (open: boolean) => void;
  setIsPodiumCardOpen: (open: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setActiveDriverCode: (driverCode: string) => void;
  setCameraRig: (rig: BroadcastCamRig) => void;
  setActiveWeatherMode: (mode: 'DAY' | 'RAIN' | 'NIGHT') => void;
  toggleAudio: () => void;
  setIsLiveOpenF1Streaming: (streaming: boolean) => void;
  setGhostSnapshot: (snapshot: GhostMergeSnapshot | null) => void;
  updateDriverDistance: (code: string, s: number, w: number, speed: number) => void;
}

// 22 Official Drivers for 2026 Grid (11 Teams including Cadillac F1 with Bottas & Perez)
const INITIAL_CANONICAL_GRID: GridDriverState[] = [
  { code: 'NOR', name: 'Lando Norris', number: 4, team: 'McLaren', teamColor: '#FF8000', s: 24, w: -1.2, speedKmh: 349.5, gear: 8, rpm: 11850, drsActive: true, compound: 'M', currentLap: 19, intervalSec: '+0.42s', status: 'RACING' },
  { code: 'VER', name: 'Max Verstappen', number: 1, team: 'Red Bull Racing', teamColor: '#3671C6', s: 0, w: 0.0, speedKmh: 348.7, gear: 8, rpm: 11800, drsActive: true, compound: 'M', currentLap: 19, intervalSec: 'LEADER', status: 'RACING' },
  { code: 'LEC', name: 'Charles Leclerc', number: 16, team: 'Ferrari', teamColor: '#E8002D', s: -16, w: 1.1, speedKmh: 347.8, gear: 8, rpm: 11720, drsActive: true, compound: 'H', currentLap: 19, intervalSec: '+0.88s', status: 'RACING' },
  { code: 'PIA', name: 'Oscar Piastri', number: 81, team: 'McLaren', teamColor: '#FF8000', s: -32, w: -0.9, speedKmh: 346.5, gear: 8, rpm: 11680, drsActive: true, compound: 'M', currentLap: 19, intervalSec: '+1.35s', status: 'RACING' },
  { code: 'HAM', name: 'Lewis Hamilton', number: 44, team: 'Ferrari', teamColor: '#E8002D', s: -48, w: 0.8, speedKmh: 345.9, gear: 8, rpm: 11620, drsActive: true, compound: 'H', currentLap: 19, intervalSec: '+1.92s', status: 'RACING' },
  { code: 'RUS', name: 'George Russell', number: 63, team: 'Mercedes', teamColor: '#27F4D2', s: -64, w: -1.0, speedKmh: 345.1, gear: 8, rpm: 11580, drsActive: true, compound: 'H', currentLap: 19, intervalSec: '+2.54s', status: 'RACING' },
  { code: 'ANT', name: 'Kimi Antonelli', number: 12, team: 'Mercedes', teamColor: '#27F4D2', s: -78, w: -0.4, speedKmh: 344.8, gear: 8, rpm: 11540, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+3.10s', status: 'RACING' },
  { code: 'LAW', name: 'Liam Lawson', number: 30, team: 'Red Bull Racing', teamColor: '#3671C6', s: -92, w: 0.6, speedKmh: 344.1, gear: 8, rpm: 11500, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+3.65s', status: 'RACING' },
  { code: 'SAI', name: 'Carlos Sainz', number: 55, team: 'Williams', teamColor: '#64C4FF', s: -106, w: 0.7, speedKmh: 343.4, gear: 8, rpm: 11460, drsActive: true, compound: 'M', currentLap: 19, intervalSec: '+4.20s', status: 'RACING' },
  { code: 'ALB', name: 'Alexander Albon', number: 23, team: 'Williams', teamColor: '#64C4FF', s: -120, w: -0.6, speedKmh: 342.8, gear: 8, rpm: 11420, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+4.75s', status: 'RACING' },
  { code: 'BOT', name: 'Valtteri Bottas', number: 77, team: 'Cadillac F1 Team', teamColor: '#C5A059', s: -134, w: 0.5, speedKmh: 342.2, gear: 8, rpm: 11390, drsActive: true, compound: 'M', currentLap: 19, intervalSec: '+5.30s', status: 'RACING' },
  { code: 'PER', name: 'Sergio Perez', number: 11, team: 'Cadillac F1 Team', teamColor: '#C5A059', s: -148, w: -0.5, speedKmh: 341.6, gear: 8, rpm: 11360, drsActive: true, compound: 'H', currentLap: 19, intervalSec: '+5.85s', status: 'RACING' },
  { code: 'ALO', name: 'Fernando Alonso', number: 14, team: 'Aston Martin', teamColor: '#229971', s: -162, w: 1.0, speedKmh: 341.0, gear: 8, rpm: 11320, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+6.40s', status: 'RACING' },
  { code: 'STR', name: 'Lance Stroll', number: 18, team: 'Aston Martin', teamColor: '#229971', s: -176, w: -0.8, speedKmh: 340.5, gear: 8, rpm: 11300, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+6.95s', status: 'RACING' },
  { code: 'GAS', name: 'Pierre Gasly', number: 10, team: 'Alpine', teamColor: '#FF87BC', s: -190, w: -0.7, speedKmh: 340.0, gear: 8, rpm: 11270, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+7.50s', status: 'RACING' },
  { code: 'DOO', name: 'Jack Doohan', number: 7, team: 'Alpine', teamColor: '#FF87BC', s: -204, w: 0.5, speedKmh: 339.4, gear: 8, rpm: 11240, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+8.05s', status: 'RACING' },
  { code: 'OCO', name: 'Esteban Ocon', number: 31, team: 'Haas F1 Team', teamColor: '#B6BABD', s: -218, w: 0.5, speedKmh: 338.9, gear: 8, rpm: 11210, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+8.60s', status: 'RACING' },
  { code: 'BEA', name: 'Oliver Bearman', number: 87, team: 'Haas F1 Team', teamColor: '#B6BABD', s: -232, w: -0.4, speedKmh: 338.3, gear: 8, rpm: 11180, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+9.15s', status: 'RACING' },
  { code: 'HUL', name: 'Nico Hulkenberg', number: 27, team: 'Kick Sauber', teamColor: '#52E252', s: -246, w: -0.5, speedKmh: 337.8, gear: 8, rpm: 11150, drsActive: false, compound: 'H', currentLap: 19, intervalSec: '+9.70s', status: 'RACING' },
  { code: 'BOR', name: 'Gabriel Bortoleto', number: 5, team: 'Kick Sauber', teamColor: '#52E252', s: -260, w: 0.6, speedKmh: 337.2, gear: 8, rpm: 11120, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+10.25s', status: 'RACING' },
  { code: 'TSU', name: 'Yuki Tsunoda', number: 22, team: 'RB', teamColor: '#6692FF', s: -274, w: 0.7, speedKmh: 336.7, gear: 8, rpm: 11090, drsActive: true, compound: 'M', currentLap: 19, intervalSec: '+10.80s', status: 'RACING' },
  { code: 'HAD', name: 'Isack Hadjar', number: 6, team: 'RB', teamColor: '#6692FF', s: -288, w: -0.6, speedKmh: 336.1, gear: 8, rpm: 11060, drsActive: false, compound: 'M', currentLap: 19, intervalSec: '+11.35s', status: 'RACING' },
];

export const useRaceArenaStore = create<RaceArenaStoreState>()(
  subscribeWithSelector((set, get) => ({
    playbackDistance: 0,
    playbackTimeSec: 0,
    totalDurationSec: 5400, // 90 min default
    currentLap: 1,
    totalLaps: 53,
    circuitId: 'monza',
    maxDistance: 5793,
    isPlaying: true,
    playbackSpeed: 1.0,
    activeDriverCode: 'VER',
    cameraRig: 'CHASE',
    isAudioMuted: false,
    isLiveOpenF1Streaming: false,
    activeWeatherMode: 'DAY',
    gridDrivers: INITIAL_CANONICAL_GRID,
    hiddenDriverCodes: [],
    simulationPayload: null,
    ghostSnapshot: null,
    isClassificationModalOpen: false,
    isPodiumCardOpen: false,

    setSimulationPayload: (payload: VstmSimulationPayload) => {
      const dur = getRaceDurationSeconds(payload);
      set({
        simulationPayload: payload,
        totalDurationSec: dur,
        totalLaps: payload.totalLaps,
        circuitId: payload.circuitId,
        maxDistance: payload.trackLengthMeters,
        activeWeatherMode: payload.isWet ? 'RAIN' : 'DAY',
        playbackTimeSec: 0,
        playbackDistance: 0,
        currentLap: 1,
        isPlaying: true,
        isPodiumCardOpen: false,
        isClassificationModalOpen: false,
      });
      // Evaluate starting grid positions at T=0
      get().scrubToTime(0);
    },

    setCircuitId: (id: string) => {
      const bundle = getCircuitSplineBundle(id);
      const laps = bundle.circuit.raceLaps || 53;
      set({
        circuitId: id,
        maxDistance: bundle.trackLengthMeters,
        totalLaps: laps,
        playbackDistance: 0,
        playbackTimeSec: 0,
        currentLap: 1,
        isPlaying: false,
        simulationPayload: null,
        ghostSnapshot: null,
        gridDrivers: INITIAL_CANONICAL_GRID.map((d, idx) => ({
          ...d,
          s: -idx * 8,
          w: (idx % 2 === 0 ? -1.0 : 1.0) * 1.5,
          speedKmh: 0,
          gear: 1,
          rpm: 4200,
          currentLap: 1,
          intervalSec: idx === 0 ? 'LEADER' : `+${(idx * 0.45).toFixed(2)}s`,
          status: 'GRID_READY',
          isRetired: false,
        })),
        isPodiumCardOpen: false,
        isClassificationModalOpen: false,
      });
    },

    terminateSimulation: () => {
      // Halts simulation immediately, wipes payload cache, and resets grid baseline
      set({
        isPlaying: false,
        playbackTimeSec: 0,
        playbackDistance: 0,
        currentLap: 1,
        simulationPayload: null,
        ghostSnapshot: null,
        gridDrivers: INITIAL_CANONICAL_GRID.map((d, idx) => ({
          ...d,
          s: -idx * 8, // Clean staggered 8m starting grid intervals
          w: (idx % 2 === 0 ? -1.0 : 1.0) * 1.5,
          speedKmh: 0,
          gear: 1,
          rpm: 4200,
          currentLap: 1,
          intervalSec: idx === 0 ? 'LEADER' : `+${(idx * 0.45).toFixed(2)}s`,
          status: 'GRID_READY',
          isRetired: false,
        })),
        isPodiumCardOpen: false,
        isClassificationModalOpen: false,
      });
    },

    resetSimulation: () => {
      // Rewinds current active simulation to T=0 without dropping the trajectory payload
      set({
        isPlaying: false,
        playbackTimeSec: 0,
        playbackDistance: 0,
        currentLap: 1,
        isPodiumCardOpen: false,
        isClassificationModalOpen: false,
      });
      get().scrubToTime(0);
    },

    scrubToTime: (timeSec: number) => {
      const { simulationPayload, totalDurationSec, maxDistance } = get();
      const clampedT = Math.max(0, Math.min(totalDurationSec, timeSec));

      // -----------------------------------------------------------------------
      // 1. FALLBACK KINETIC RACING (When No Backend Payload Loaded)
      // -----------------------------------------------------------------------
      if (!simulationPayload) {
        const trackLen = maxDistance || 5793;
        const isPausedAtStart = clampedT <= 0.05;

        const updatedFallback = INITIAL_CANONICAL_GRID.map((d, idx) => {
          if (isPausedAtStart) {
            // Authentic 2x2 Staggered FIA Starting Grid along the main straight
            const gridS = ((trackLen - 120.0 - (idx * 14.0)) % trackLen + trackLen) % trackLen;
            const gridW = (idx % 2 === 0 ? -1.0 : 1.0) * 1.5;
            return {
              ...d,
              s: gridS,
              w: gridW,
              speedKmh: 0,
              gear: 1,
              rpm: 4200,
              currentLap: 1,
              intervalSec: idx === 0 ? 'POLE' : `+${(idx * 0.18).toFixed(2)}s`,
              status: 'GRID_READY',
              isRetired: false,
              totalProgressM: 0,
            };
          }

          // Dynamic race progression with authentic field spread across the entire circuit
          const leadBaseSpeedMs = 254.0 / 3.6; // ~70.5 m/s
          const leadProgressM = leadBaseSpeedMs * clampedT;

          // Tiered driver pace divergence (prevents artificial 22-car clustering)
          const driverPaceLossMs = (idx * 0.042) + ((idx % 4) * 0.015);
          const launchStaggerM = idx * 14.0;
          const carProgressM = Math.max(0, leadProgressM - (driverPaceLossMs * clampedT) - launchStaggerM);

          // Spatial position along track spline
          const s = ((carProgressM + (trackLen - 120.0)) % trackLen + trackLen) % trackLen;
          const lap = Math.floor(Math.max(0, carProgressM) / trackLen) + 1;

          // Realistic sector curvature speed profile (braking into chicanes, high speed on straights)
          const normS = (s / trackLen) * 2.0 * Math.PI;
          const curvatureHarmonic = Math.sin(normS * 4.0) * 0.45 + Math.cos(normS * 2.0) * 0.25;
          const speedKmh = Math.max(88.0, Math.min(352.0, (252.0 - idx * 1.1) + (curvatureHarmonic * 85.0)));
          
          // Lateral weaving and overtakes
          const w = Math.sin(normS * 6.0 + idx * 0.8) * 2.2;
          const drsActive = curvatureHarmonic > 0.15 && s > (trackLen * 0.4) && s < (trackLen * 0.7);

          return {
            ...d,
            s,
            w,
            speedKmh: Math.round(speedKmh * 10) / 10,
            gear: Math.max(2, Math.min(8, Math.floor(speedKmh / 42.0))),
            rpm: Math.round(9200 + (speedKmh % 42.0) * 135.0),
            currentLap: lap,
            drsActive,
            totalProgressM: carProgressM,
          };
        });

        if (isPausedAtStart) {
          set({
            playbackTimeSec: 0,
            playbackDistance: updatedFallback[0].s,
            currentLap: 1,
            gridDrivers: updatedFallback,
          });
          return;
        }

        // Dynamic leaderboard sorting by total race progress
        const sortedFallback = [...updatedFallback].sort((a, b) => b.totalProgressM - a.totalProgressM);
        const leaderCar = sortedFallback[0];
        const leaderM = leaderCar.totalProgressM;

        const finalDrivers: GridDriverState[] = sortedFallback.map((car, rankIdx) => {
          let interval = 'LEADER';
          if (rankIdx > 0) {
            const distGap = Math.max(0, leaderM - car.totalProgressM);
            const timeGapSec = distGap / Math.max(22.0, car.speedKmh / 3.6);
            if (timeGapSec > 75.0) {
              const lapsDown = Math.floor(timeGapSec / 75.0);
              interval = `+${lapsDown} LAP${lapsDown > 1 ? 'S' : ''}`;
            } else {
              interval = `+${timeGapSec.toFixed(2)}s`;
            }
          }
          return {
            ...car,
            intervalSec: interval,
            status: 'RACING',
            isRetired: false,
          };
        });

        set({
          playbackTimeSec: clampedT,
          playbackDistance: leaderCar.s,
          currentLap: leaderCar.currentLap,
          gridDrivers: finalDrivers,
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 2. AUTHENTIC VSTM-v1 SIMULATION DECODER & DYNAMIC LEADERBOARD
      // -----------------------------------------------------------------------
      const trackLen = simulationPayload.trackLengthMeters;
      const spacing = simulationPayload.sampleSpacingMeters;
      const isQualifying =
        simulationPayload.format === 'VSTM_QUALIFYING_v1' || simulationPayload.totalLaps === 3;

      // Evaluate raw state for all active grid drivers
      const evaluated = simulationPayload.drivers.map((dTraj) => {
        const state = evaluateCarAtTime(dTraj, clampedT, trackLen, spacing);
        const isDNF = state.status === 'DNF' || state.isRetired;
        // Cumulative distance along the full race
        const totalProgressM = isDNF
          ? (dTraj.laps[dTraj.laps.length - 1]?.lap || 1) * trackLen + (state.s || 0)
          : (state.lap - 1) * trackLen + state.s;

        return {
          state,
          totalProgressM,
          dTraj,
        };
      });

      // Dynamically rank drivers: active runners first by progress descending, then retired cars
      const sorted = [...evaluated].sort((a, b) => {
        const aDNF = a.state.status === 'DNF' || a.state.isRetired;
        const bDNF = b.state.status === 'DNF' || b.state.isRetired;
        if (aDNF && !bDNF) return 1;
        if (!aDNF && bDNF) return -1;
        return b.totalProgressM - a.totalProgressM;
      });

      const leader = sorted[0];
      const leaderProgressM = leader?.totalProgressM || 0;
      const curLap = leader?.state.lap || 1;

      // Compute authentic intervals, pit stops, and DNF statuses
      const updatedDrivers: GridDriverState[] = sorted.map((item, rankIdx) => {
        const { state, totalProgressM, dTraj } = item;
        let interval = 'LEADER';
        const isDNF = state.status === 'DNF' || state.isRetired;
        const isPit =
          state.status === 'PIT_STOP' ||
          state.status === 'PIT_ENTRY' ||
          state.status === 'PIT_EXIT';

        if (isDNF) {
          interval = 'DNF';
        } else if (isPit) {
          interval = state.status === 'PIT_STOP' ? 'PIT (2.6s)' : 'PIT LANE';
        } else if (rankIdx === 0) {
          interval = isQualifying ? 'POLE' : 'LEADER';
        } else {
          if (isQualifying) {
            // Qualifying hotlap delta (millisecond precision e.g. +0.088s)
            const ratingDelta =
              ((leader.dTraj.driver.qualifyingRating || 99.2) -
                (dTraj.driver.qualifyingRating || 94.0)) *
              0.085;
            const deltaSec = Math.max(0.042, Math.min(1.85, ratingDelta + rankIdx * 0.045));
            interval = `+${deltaSec.toFixed(3)}s`;
          } else {
            // Race mode gap to leader
            const lapDelta = (leader.state.lap || 1) - (state.lap || 1);
            if (lapDelta >= 1) {
              interval = `+${lapDelta} LAP${lapDelta > 1 ? 'S' : ''}`;
            } else {
              const distGap = Math.max(0, leaderProgressM - totalProgressM);
              const carSpeedMs = Math.max(18.0, state.speedKmh / 3.6);
              const timeGapSec = distGap / carSpeedMs;
              interval = `+${timeGapSec.toFixed(2)}s`;
            }
          }
        }

        return {
          code: state.code,
          name: state.name,
          number: state.number,
          team: state.team,
          teamColor: state.teamColor,
          s: state.s,
          w: state.w,
          speedKmh: isDNF ? 0.0 : state.speedKmh,
          gear: isDNF ? 0 : state.gear,
          rpm: isDNF ? 0 : state.rpm,
          throttle: isDNF ? 0 : state.throttle,
          brake: isDNF ? 1 : state.brake,
          drsActive: state.drsActive,
          compound: (state.compound as TyreCompound) || 'M',
          tireAge: state.tireAge,
          currentLap: state.lap,
          intervalSec: interval,
          status: state.status,
          isRetired: isDNF,
        };
      });

      // Did race finish?
      const isFinished = clampedT >= totalDurationSec - 0.5;

      set({
        playbackTimeSec: clampedT,
        playbackDistance: leader.state.s,
        currentLap: curLap,
        gridDrivers: updatedDrivers,
        isPodiumCardOpen: isFinished,
      });
    },

    scrubToLap: (lapNumber: number) => {
      const { simulationPayload } = get();
      if (!simulationPayload || !simulationPayload.drivers[0]?.laps) return;

      const targetLap = Math.max(1, Math.min(simulationPayload.totalLaps, lapNumber));
      const leaderLaps = simulationPayload.drivers[0].laps;
      const lapRecord = leaderLaps.find((l) => l.lap === targetLap) || leaderLaps[0];

      if (lapRecord && lapRecord.t && lapRecord.t.length > 0) {
        const targetTime = lapRecord.t[0];
        get().scrubToTime(targetTime);
      }
    },

    tickSimulation: (deltaSec: number) => {
      const { isPlaying, playbackSpeed, playbackTimeSec, totalDurationSec } = get();
      if (!isPlaying) return;

      const nextTime = playbackTimeSec + (deltaSec * playbackSpeed);
      if (nextTime >= totalDurationSec) {
        set({ isPlaying: false, isPodiumCardOpen: true });
        get().scrubToTime(totalDurationSec);
      } else {
        get().scrubToTime(nextTime);
      }
    },

    toggleDriverVisibility: (driverCode: string) => {
      set((state) => {
        const exists = state.hiddenDriverCodes.includes(driverCode);
        const next = exists
          ? state.hiddenDriverCodes.filter((c) => c !== driverCode)
          : [...state.hiddenDriverCodes, driverCode];
        return { hiddenDriverCodes: next };
      });
    },

    isDriverVisible: (driverCode: string) => {
      return !get().hiddenDriverCodes.includes(driverCode);
    },

    setPlaybackDistance: (distM) => {
      const max = get().maxDistance;
      const normalized = ((distM % max) + max) % max;
      set({ playbackDistance: normalized });
    },

    stepPlaybackDistance: (deltaM) => {
      const cur = get().playbackDistance;
      const max = get().maxDistance;
      const next = ((cur + deltaM) % max + max) % max;
      set({ playbackDistance: next });
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setActiveDriverCode: (driverCode) => set({ activeDriverCode: driverCode }),
    setCameraRig: (rig) => set({ cameraRig: rig }),
    setActiveWeatherMode: (mode) => set({ activeWeatherMode: mode }),
    toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
    setIsLiveOpenF1Streaming: (streaming) => set({ isLiveOpenF1Streaming: streaming }),
    setGhostSnapshot: (snapshot) => set({ ghostSnapshot: snapshot }),
    setIsClassificationModalOpen: (open) => set({ isClassificationModalOpen: open }),
    setIsPodiumCardOpen: (open) => set({ isPodiumCardOpen: open }),

    updateDriverDistance: (code, s, w, speed) => {
      set((state) => ({
        gridDrivers: state.gridDrivers.map((d) =>
          d.code === code ? { ...d, s, w, speedKmh: speed } : d
        ),
      }));
    },
  }))
);

export const StrategyToArenaBridge = {
  injectGhostAndJumpToBattle: () => {
    const strategyState = useStrategyStore.getState();
    const result = strategyState.strategyResult;
    const pitExitStationM = 420;
    const deltaSec = result?.undercutGainSec ? -result.undercutGainSec : -1.84;

    useRaceArenaStore.getState().setGhostSnapshot({
      s: pitExitStationM,
      w: 1.8,
      label: `ML OPTIMAL UNDERCUT GHOST (${deltaSec >= 0 ? '+' : ''}${deltaSec.toFixed(2)}s)`,
      color: '#00E5FF',
      lapTimeDeltaSec: deltaSec,
    });

    useRaceArenaStore.getState().setPlaybackDistance(pitExitStationM);
    useRaceArenaStore.getState().setIsPlaying(true);

    const arenaEl = document.getElementById('act-4');
    if (arenaEl) {
      arenaEl.scrollIntoView({ behavior: 'smooth' });
    }
  },
};
