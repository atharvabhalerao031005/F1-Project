// frontend/src/store/useStrategyStore.ts
/**
 * VELOCE V2 // SYSTEM 1: ML PREDICTIVE STRATEGY ORACLE STORE
 * Decoupled analytical state management for 5,000-run Monte Carlo simulations,
 * tire compound degradation crossover deltas, and pit-lane undercut predictions.
 * Isolated from high-frequency 60/120 Hz 3D playback traffic.
 */

import { create } from 'zustand';
import type {
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  TimingTowerDriver,
} from '../types/telemetry';
import { simulateMonteCarloStrategyClient } from '../utils/clientMlSimulator';
import { useTelemetryStore } from './useTelemetryStore';

export interface StrategyStoreState {
  strategyInput: MlStrategySimulationInput;
  strategyResult: MlStrategySimulationResult | null;
  isSimulating: boolean;
  selectedSeason: number;
  selectedCircuit: string;

  // Actions
  updateStrategyInput: (partial: Partial<MlStrategySimulationInput>) => void;
  runMonteCarloSimulation: () => void;
  setSelectedSeason: (season: number) => void;
  setSelectedCircuit: (circuit: string) => void;
}

const DEFAULT_STRATEGY_INPUT: MlStrategySimulationInput = {
  totalRaceLaps: 53,
  safetyCarWindowLap: null,
  trackTempC: 42.4,
  pitLossNormalSec: 21.4,
  pitLossScSec: 11.2,
  numSimulations: 5000,
  strategyA: {
    driverCode: 'VER',
    startCompound: 'M',
    pitLap1: 19,
    nextCompound1: 'H',
    stops: 1,
    pitLap2: 38,
    nextCompound2: 'S',
  },
  strategyB: {
    driverCode: 'NOR',
    startCompound: 'M',
    pitLap1: 23,
    nextCompound1: 'H',
    stops: 1,
    pitLap2: 40,
    nextCompound2: 'S',
  },
};

const DEFAULT_TIMING_TOWER: TimingTowerDriver[] = [
  { position: 1, code: 'VER', number: 1, teamName: 'Red Bull Racing', teamColor: '#3671C6', compound: 'M', tyreAgeLaps: 0, bestLapTimeStr: '1:19.311', bestLapTimeSec: 79.311, gapToLeaderStr: 'LEADER', sectors: ['PURPLE', 'PURPLE', 'PURPLE'], sectorTimesSec: [26.4, 27.2, 25.711] },
  { position: 2, code: 'NOR', number: 4, teamName: 'McLaren', teamColor: '#FF8000', compound: 'M', tyreAgeLaps: 0, bestLapTimeStr: '1:19.420', bestLapTimeSec: 79.420, gapToLeaderStr: '+0.109', sectors: ['GREEN', 'GREEN', 'GREEN'], sectorTimesSec: [26.5, 27.2, 25.72] },
  { position: 3, code: 'LEC', number: 16, teamName: 'Ferrari', teamColor: '#E8002D', compound: 'H', tyreAgeLaps: 0, bestLapTimeStr: '1:19.650', bestLapTimeSec: 79.650, gapToLeaderStr: '+0.339', sectors: ['GREEN', 'GREEN', 'GREEN'], sectorTimesSec: [26.6, 27.3, 25.75] },
];

function runSim(input: MlStrategySimulationInput): MlStrategySimulationResult {
  const telemetry = useTelemetryStore.getState().sessionPayload;
  const baseLap = telemetry?.meta.driverA.lapTimeSec ?? 79.311;
  const tower = telemetry?.timingTower ?? DEFAULT_TIMING_TOWER;
  return simulateMonteCarloStrategyClient(baseLap, tower, input);
}

export const useStrategyStore = create<StrategyStoreState>((set, get) => ({
  strategyInput: DEFAULT_STRATEGY_INPUT,
  strategyResult: runSim(DEFAULT_STRATEGY_INPUT),
  isSimulating: false,
  selectedSeason: 2024,
  selectedCircuit: 'monza',

  updateStrategyInput: (partial) => {
    const updatedInput: MlStrategySimulationInput = {
      ...get().strategyInput,
      ...partial,
      strategyA: { ...get().strategyInput.strategyA, ...(partial.strategyA || {}) },
      strategyB: { ...get().strategyInput.strategyB, ...(partial.strategyB || {}) },
    };
    set({
      strategyInput: updatedInput,
      strategyResult: runSim(updatedInput),
    });
  },

  runMonteCarloSimulation: () => {
    set({ isSimulating: true });
    const result = runSim(get().strategyInput);
    set({ strategyResult: result, isSimulating: false });
  },

  setSelectedSeason: (season) => set({ selectedSeason: season }),
  setSelectedCircuit: (circuit) => {
    set({ selectedCircuit: circuit });
  },
}));
