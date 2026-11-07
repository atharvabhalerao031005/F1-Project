// frontend/src/store/useTelemetryStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  CameraMode,
  CockpitMode,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  PlaybackSpeed,
  SessionTelemetryPayload,
  TrackColorMode,
} from '../types/telemetry';
import {
  computeMlPhysicsWarp,
  simulateMonteCarloStrategyClient,
} from '../utils/clientMlSimulator';

export type LoopSector = 'ALL' | 'S1' | 'S2' | 'S3';

// Monotonic session request token for race condition prevention
let activeSessionLoadToken = 0;

export interface TelemetryStoreState {
  // Session & Telemetry State
  sessionPayload: SessionTelemetryPayload | null;
  isLoading: boolean;
  error: string | null;

  // Cockpit Mode Switcher: 'TELEMETRY_LAB' vs 'ML_STRATEGY_ORACLE'
  cockpitMode: CockpitMode;

  // High-Frequency Mutable Cursor State (Zero-VDOM)
  currentDistance: number;
  maxDistance: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  cameraMode: CameraMode;
  trackColorMode: TrackColorMode;
  elevationScale: number;
  loopSector: LoopSector;

  // ML Subsystem 1: Real-Time Physics-Warp
  mlWarpParams: MlPhysicsWarpParams;
  mlWarpOutput: MlPhysicsWarpOutput | null;

  // ML Subsystem 2: 5,000-Run Monte Carlo Strategy Oracle
  strategyInput: MlStrategySimulationInput;
  strategyResult: MlStrategySimulationResult | null;

  // Veloce Editorial & Showcase State
  liveryColor: string;
  scrollProgress: number;
  activeAct: number;

  // Playback & Session Actions
  loadSession: (sessionId?: string) => Promise<void>;
  setCockpitMode: (mode: CockpitMode) => void;
  setLiveryColor: (color: string) => void;
  setScrollProgress: (progress: number) => void;
  setActiveAct: (act: number) => void;
  setDistance: (distM: number) => void;
  stepDistance: (deltaM: number) => void;
  advanceFrame: (dtSeconds: number) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTrackColorMode: (mode: TrackColorMode) => void;
  setElevationScale: (scale: number) => void;
  setLoopSector: (sector: LoopSector) => void;
  toggleCockpitMode: () => void;
  resetPlayback: () => void;
  cycleCameraMode: () => void;

  // ML Actions
  updateMlWarpParams: (partial: Partial<MlPhysicsWarpParams>) => void;
  updateStrategyInput: (partial: Partial<MlStrategySimulationInput>) => void;
  runMonteCarloSimulation: () => void;
  jumpToPitExitBattle: () => void;
}

export const useTelemetryStore = create<TelemetryStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial Session State
    sessionPayload: null,
    isLoading: true,
    error: null,
    cockpitMode: 'TELEMETRY_LAB',

    // Initial Playback Cursor State
    currentDistance: 0,
    maxDistance: 5793,
    isPlaying: true,
    playbackSpeed: 1.0,
    cameraMode: 'ISO',
    trackColorMode: 'PEDAL',
    elevationScale: 3.5,
    loopSector: 'ALL',

    // Initial ML Physics-Warp State
    mlWarpParams: {
      enabled: false,
      compound: 'S',
      tyreAgeLaps: 18,
      fuelLoadKg: 45,
      trackTempC: 42.4,
    },
    mlWarpOutput: null,

    // Initial ML Strategy Oracle State
    strategyInput: {
      totalRaceLaps: 53,
      safetyCarWindowLap: null,
      trackTempC: 42.4,
      pitLossNormalSec: 21.4,
      pitLossScSec: 11.2,
      numSimulations: 5000,
      strategyA: {
        driverCode: 'VER',
        startCompound: 'S',
        pitLap1: 19,
        nextCompound1: 'H',
        stops: 1,
        pitLap2: 38,
        nextCompound2: 'S',
      },
      strategyB: {
        driverCode: 'NOR',
        startCompound: 'M',
        pitLap1: 24,
        nextCompound1: 'H',
        stops: 1,
        pitLap2: 40,
        nextCompound2: 'S',
      },
    },
    strategyResult: null,

    // Initial Veloce Showcase & Scrollytelling State
    liveryColor: '#E8002D', // Default: Ferrari SF-24 Rosso Corsa (matching TurboSquid 2025 spec)
    scrollProgress: 0,
    activeAct: 1,

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    setLiveryColor: (color: string) => set({ liveryColor: color }),
    setScrollProgress: (scrollProgress: number) => set({ scrollProgress }),
    setActiveAct: (activeAct: number) => set({ activeAct }),

    /**
     * Asynchronously loads a pre-computed 1m spatial telemetry bundle.
     * Prevents async race conditions via monotonic load tokens.
     */
    loadSession: async (sessionId = '2024_monza_q3_ver_nor') => {
      const loadToken = ++activeSessionLoadToken;
      set({ isLoading: true, error: null });

      try {
        const cleanId = sessionId.replace(/\.json$/, '').replace(/^\/?telemetry\//, '');
        const url = `/telemetry/${cleanId}.json`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load session ${sessionId}: HTTP ${response.status}`);
        }

        const data: SessionTelemetryPayload = await response.json();

        // Drop stale responses if a newer request was dispatched
        if (loadToken !== activeSessionLoadToken) {
          return;
        }

        const currentInput = get().strategyInput;
        const initialStratInput: MlStrategySimulationInput = {
          ...currentInput,
          totalRaceLaps: data.meta.totalRaceLaps || 53,
          pitLossNormalSec: data.meta.pitLossSec || 21.4,
          trackTempC: data.meta.weather.trackTempC,
          strategyA: {
            ...currentInput.strategyA,
            driverCode: data.meta.driverA.code,
          },
          strategyB: {
            ...currentInput.strategyB,
            driverCode: data.meta.driverB.code,
          },
        };

        // Compute baseline ML responses immediately
        const warpOut = computeMlPhysicsWarp(
          data.driverA,
          data.meta.driverA.lapTimeSec,
          get().mlWarpParams
        );

        const stratOut =
          data.defaultStrategyOracle ||
          simulateMonteCarloStrategyClient(
            data.meta.driverA.lapTimeSec,
            data.timingTower,
            initialStratInput
          );

        set({
          sessionPayload: data,
          maxDistance: data.gridLength,
          currentDistance: 0,
          strategyInput: initialStratInput,
          mlWarpOutput: warpOut,
          strategyResult: stratOut,
          isLoading: false,
          error: null,
        });
      } catch (err: unknown) {
        if (loadToken === activeSessionLoadToken) {
          const message = err instanceof Error ? err.message : 'Error occurred while loading telemetry session';
          set({
            error: message,
            isLoading: false,
          });
        }
      }
    },

    setCockpitMode: (cockpitMode) => set({ cockpitMode }),

    /**
     * Absolute position cursor scrub. Normalized within [0, maxDistance).
     * Formula: ((distM % maxDistance) + maxDistance) % maxDistance
     */
    setDistance: (distM) => {
      const { maxDistance } = get();
      if (maxDistance <= 0) return;
      const normalized = ((distM % maxDistance) + maxDistance) % maxDistance;
      set({ currentDistance: normalized });
    },

    /**
     * Relative position cursor step (e.g. keyboard left/right arrows).
     * Formula: ((currentDistance + deltaM) % maxDistance + maxDistance) % maxDistance
     */
    stepDistance: (deltaM) => {
      const { currentDistance, maxDistance } = get();
      if (maxDistance <= 0) return;
      const nextDist = ((currentDistance + deltaM) % maxDistance + maxDistance) % maxDistance;
      set({ currentDistance: nextDist });
    },

    /**
     * Authoritative 60 Hz / 120 Hz playback clock step.
     * Evaluates current car speed at distance index, advances distance, and respects sector looping.
     * - Clamps dtSeconds to <= 0.05 to prevent tunneling on tab backgrounding.
     * - Reads speed from sessionPayload.driverA.speed[floor(currentDistance)].
     * - Accounts for playbackSpeed.
     * - Handles sector looping bounds for 'S1', 'S2', 'S3', 'ALL'.
     */
    advanceFrame: (dtSeconds) => {
      const state = get();
      if (!state.isPlaying || !state.sessionPayload) return;

      // Clamp dt to 50ms (20 FPS minimum) to prevent tunneling when tab is backgrounded
      const clampedDt = Math.min(Math.max(dtSeconds, 0.0001), 0.05);
      const idx = Math.min(Math.max(0, Math.floor(state.currentDistance)), state.maxDistance);

      // Speed in km/h converted to m/s
      const speedKmh = state.sessionPayload.driverA.speed[idx] ?? 220;
      const metersPerSec = speedKmh / 3.6;

      // Calculate sector boundary limits
      let minM = 0;
      let maxM = state.maxDistance;
      const sectorSplits = state.sessionPayload.meta.sectorSplitM;

      if (sectorSplits && sectorSplits.length >= 2) {
        const [s1End, s2End] = sectorSplits;
        if (state.loopSector === 'S1') {
          minM = 0;
          maxM = s1End;
        } else if (state.loopSector === 'S2') {
          minM = s1End;
          maxM = s2End;
        } else if (state.loopSector === 'S3') {
          minM = s2End;
          maxM = state.maxDistance;
        }
      }

      const sectorSpan = Math.max(1, maxM - minM);
      const distanceDelta = metersPerSec * clampedDt * state.playbackSpeed;
      let nextDist = state.currentDistance + distanceDelta;

      // Handle sector looping wrap-around
      if (nextDist >= maxM || nextDist < minM) {
        nextDist = minM + (((nextDist - minM) % sectorSpan + sectorSpan) % sectorSpan);
      }

      set({ currentDistance: nextDist });
    },

    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    setCameraMode: (cameraMode) => set({ cameraMode }),
    setTrackColorMode: (trackColorMode) => set({ trackColorMode }),
    setElevationScale: (elevationScale) => set({ elevationScale }),
    setLoopSector: (loopSector) => set({ loopSector }),

    toggleCockpitMode: () => {
      const cur = get().cockpitMode;
      set({ cockpitMode: cur === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB' });
    },

    resetPlayback: () => {
      const { sessionPayload, loopSector } = get();
      let startM = 0;
      const splits = sessionPayload?.meta?.sectorSplitM;
      if (splits && splits.length >= 2) {
        if (loopSector === 'S2') startM = splits[0];
        else if (loopSector === 'S3') startM = splits[1];
      }
      set({ currentDistance: startM });
    },

    cycleCameraMode: () => {
      const MODES: CameraMode[] = ['ISO', 'ORTHO', 'CHASE'];
      const cur = get().cameraMode;
      const next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
      set({ cameraMode: next });
    },

    /**
     * Updates ML Physics-Warp sliders and re-synthesizes lap delta instantly.
     */
    updateMlWarpParams: (partial) => {
      const state = get();
      const nextParams: MlPhysicsWarpParams = { ...state.mlWarpParams, ...partial };
      if (!state.sessionPayload) {
        set({ mlWarpParams: nextParams });
        return;
      }

      const warpOut = computeMlPhysicsWarp(
        state.sessionPayload.driverA,
        state.sessionPayload.meta.driverA.lapTimeSec,
        nextParams
      );

      set({ mlWarpParams: nextParams, mlWarpOutput: warpOut });
    },

    /**
     * Updates Monte Carlo simulation inputs and re-runs 5,000 simulations.
     */
    updateStrategyInput: (partial) => {
      const state = get();
      const nextInput: MlStrategySimulationInput = { ...state.strategyInput, ...partial };
      if (!state.sessionPayload) {
        set({ strategyInput: nextInput });
        return;
      }

      const stratOut = simulateMonteCarloStrategyClient(
        state.sessionPayload.meta.driverA.lapTimeSec,
        state.sessionPayload.timingTower,
        nextInput
      );

      set({ strategyInput: nextInput, strategyResult: stratOut });
    },

    /**
     * Explicit trigger to re-run 5,000 stochastic simulation runs.
     */
    runMonteCarloSimulation: () => {
      const state = get();
      if (!state.sessionPayload) return;

      const stratOut = simulateMonteCarloStrategyClient(
        state.sessionPayload.meta.driverA.lapTimeSec,
        state.sessionPayload.timingTower,
        state.strategyInput
      );

      set({ strategyResult: stratOut });
    },

    /**
     * Fast-forwards the playback cursor to Turn 1 apex braking point to inspect undercut battle.
     * Jumps currentDistance to Turn 1 pit exit merge, sets cameraMode to 'CHASE', sets isPlaying to false.
     */
    jumpToPitExitBattle: () => {
      const state = get();
      if (!state.sessionPayload) return;

      const t1Apex = state.sessionPayload.corners[0]?.apexDistanceM ?? 850;
      set({
        currentDistance: Math.max(150, t1Apex - 240),
        cameraMode: 'CHASE',
        isPlaying: false,
      });
    },
  }))
);
