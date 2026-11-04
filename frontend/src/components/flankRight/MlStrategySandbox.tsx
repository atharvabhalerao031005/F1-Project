// frontend/src/components/flankRight/MlStrategySandbox.tsx
/**
 * AERO-SPEC F1 // QUADRANT 3 ML MODE: INTERACTIVE STRATEGY & PIT-WINDOW SANDBOX
 * Blueprint Specification: aero_spec_antigravity_master_blueprint.md (lines 138, 1452-1735, 2275)
 * Research Synthesis: PHASE_4_RESEARCH_SWARM_SYNTHESIS.md Section 4.5
 *
 * ARCHITECTURAL CONTRACT:
 * - Full-height interactive strategy and pit-window sandbox:
 *   flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 font-telemetry text-[10px] bg-[#0C1017]
 * - Sub-Section 1: ML Verdict Banner
 *   * Dynamic border & background (#00FF66 / 10% if undercutGainSec >= 0 else #FFE600 / 10%)
 *   * Verdict headline and execution time [{strategyResult.executionTimeMs} ms]
 *   * Detailed recommendation text (verdictDetail)
 *   * Action Button: "▶ SIMULATE 3D PIT-EXIT MERGE AT TURN 1" triggering jumpToPitExitBattle()
 * - Sub-Section 2: Driver A Pit Strategy Sandbox
 *   * Stint Compounds: Starting compound selector (S, M, H) and Next compound selector (S, M, H)
 *   * Target Box Lap slider: min=6, max=totalRaceLaps - 6, value=strategyA.pitLap1
 *   * FIA Mandatory Two-Compound Rule Check: If startCompound === nextCompound1, displays
 *     caution badge "[FIA 2-COMPOUND RULE VIOLATION: DRY TIRES MUST USE >= 2 DIFFERENT COMPOUNDS]"
 * - Sub-Section 3: Driver B Rival Strategy Sandbox
 *   * Rival Benchmark banner: "[GHOST B] {strategyB.driverCode} PIT STRATEGY"
 *   * Stint Compounds: Starting compound selector (S, M, H) and Next compound selector (S, M, H)
 *   * Rival Box Lap slider: min=6, max=totalRaceLaps - 6, value=strategyB.pitLap1
 * - Sub-Section 4: Safety Car Window Injector
 *   * Quick toggle buttons: STOCHASTIC (safetyCarWindowLap: null), SC ON LAP {pitLap1A}, SC ON LAP {pitLap1B}
 *   * Highlights active selection in #00E5FF or #FFE600
 * - Sub-Section 5: ML Telemetry Physics-Warp Simulator
 *   * Enable/Disable toggle button (WARP ACTIVE in #00FF66 vs ENABLE WARP in #64748B)
 *   * Tyre Age slider (0 to 38 laps), displaying grip percentage GRIP: {((gripMultiplier) * 100).toFixed(1)}%
 *   * Fuel Load slider (8 to 105 kg), displaying braking shift BRAKE SHIFT: +{brakingExtensionM}m
 *   * ML Predicted Lap Time readout: {predictedLapTimeSec}s (+{lapDeltaVsBaseSec}s) in Electric Cyan #00E5FF
 * - Slider Drag Coalescing: Coalesces slider dispatch events via requestAnimationFrame to maintain 120 FPS
 *   UI fluidity without dropping frames during high-frequency dragging.
 * - GATE 5 AST CONFORMANCE: Subscribes strictly only to:
 *   strategyInput, strategyResult, updateStrategyInput, jumpToPitExitBattle, mlWarpParams, mlWarpOutput, updateMlWarpParams.
 *   ZERO subscriptions to currentDistance or isPlaying.
 * - Component wrapped with React.memo.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type {
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  TyreCompound,
} from '../../types/telemetry';

export const COMPOUNDS: TyreCompound[] = ['S', 'M', 'H'];

export const FIA_RULE_VIOLATION_MESSAGE =
  '[FIA 2-COMPOUND RULE VIOLATION: DRY TIRES MUST USE >= 2 DIFFERENT COMPOUNDS]';

/**
 * Checks whether the driver's compound selection violates the FIA Sporting Regulations
 * requiring dry-weather race stints to use at least two distinct dry tyre specifications.
 */
export function isFiaTwoCompoundRuleViolated(
  startCompound: TyreCompound,
  nextCompound: TyreCompound
): boolean {
  const isDryStart = startCompound === 'S' || startCompound === 'M' || startCompound === 'H';
  const isDryNext = nextCompound === 'S' || nextCompound === 'M' || nextCompound === 'H';
  if (isDryStart && isDryNext) {
    return startCompound === nextCompound;
  }
  return false;
}

/**
 * Factory helper for requestAnimationFrame slider event coalescing.
 * Preserves 120 FPS UI fluidity without dropping frames during high-frequency scrub events.
 */
export function createRafCoalescer<T>(callback: (payload: T) => void) {
  let pendingRaf: number | null = null;
  let latestPayload: T | null = null;

  const trigger = (payload: T) => {
    latestPayload = payload;
    if (typeof requestAnimationFrame === 'undefined') {
      callback(payload);
      return;
    }
    if (pendingRaf === null) {
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        if (latestPayload !== null) {
          callback(latestPayload);
          latestPayload = null;
        }
      });
    }
  };

  const cancel = () => {
    if (pendingRaf !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }
    latestPayload = null;
  };

  const flush = () => {
    if (pendingRaf !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }
    if (latestPayload !== null) {
      callback(latestPayload);
      latestPayload = null;
    }
  };

  return { trigger, cancel, flush };
}

export interface MlStrategySandboxProps {
  strategyInput?: MlStrategySimulationInput;
  strategyResult?: MlStrategySimulationResult | null;
  updateStrategyInput?: (partial: Partial<MlStrategySimulationInput>) => void;
  jumpToPitExitBattle?: () => void;
  mlWarpParams?: MlPhysicsWarpParams;
  mlWarpOutput?: MlPhysicsWarpOutput | null;
  updateMlWarpParams?: (partial: Partial<MlPhysicsWarpParams>) => void;
}

const MlStrategySandboxComponent: React.FC<MlStrategySandboxProps> = (props) => {
  // Gate 5 AST Conformance: Subscribes strictly only to authorized strategy & warp channels
  const storeStrategyInput = useTelemetryStore((s) => s.strategyInput);
  const storeStrategyResult = useTelemetryStore((s) => s.strategyResult);
  const storeUpdateStrategyInput = useTelemetryStore((s) => s.updateStrategyInput);
  const storeJumpToPitExitBattle = useTelemetryStore((s) => s.jumpToPitExitBattle);
  const storeMlWarpParams = useTelemetryStore((s) => s.mlWarpParams);
  const storeMlWarpOutput = useTelemetryStore((s) => s.mlWarpOutput);
  const storeUpdateMlWarpParams = useTelemetryStore((s) => s.updateMlWarpParams);

  // In SSR / renderToString environments, Zustand's getServerSnapshot may return initial state.
  // Fall back to useTelemetryStore.getState() if running in SSR (typeof window === 'undefined')
  const isSsr = typeof window === 'undefined';
  const currentStoreState = isSsr ? useTelemetryStore.getState() : null;

  // Allow property injection for isolated testing / custom harness
  const strategyInput = props.strategyInput ?? currentStoreState?.strategyInput ?? storeStrategyInput;
  const strategyResult = props.strategyResult !== undefined
    ? props.strategyResult
    : (currentStoreState?.strategyResult !== undefined ? currentStoreState.strategyResult : storeStrategyResult);
  const updateStrategyInput = props.updateStrategyInput ?? storeUpdateStrategyInput;
  const jumpToPitExitBattle = props.jumpToPitExitBattle ?? storeJumpToPitExitBattle;
  const mlWarpParams = props.mlWarpParams ?? currentStoreState?.mlWarpParams ?? storeMlWarpParams;
  const mlWarpOutput = props.mlWarpOutput !== undefined
    ? props.mlWarpOutput
    : (currentStoreState?.mlWarpOutput !== undefined ? currentStoreState.mlWarpOutput : storeMlWarpOutput);
  const updateMlWarpParams = props.updateMlWarpParams ?? storeUpdateMlWarpParams;

  const { strategyA, strategyB, totalRaceLaps, safetyCarWindowLap } = strategyInput;

  // RequestAnimationFrame Coalescing for Strategy Sliders
  const strategyRafRef = useRef<number | null>(null);
  const pendingStrategyInputRef = useRef<Partial<MlStrategySimulationInput> | null>(null);

  const coalescedUpdateStrategyInput = useCallback(
    (partial: Partial<MlStrategySimulationInput>) => {
      if (typeof requestAnimationFrame === 'undefined') {
        updateStrategyInput(partial);
        return;
      }

      pendingStrategyInputRef.current = {
        ...(pendingStrategyInputRef.current ?? {}),
        ...partial,
      };

      if (strategyRafRef.current === null) {
        strategyRafRef.current = requestAnimationFrame(() => {
          strategyRafRef.current = null;
          if (pendingStrategyInputRef.current) {
            updateStrategyInput(pendingStrategyInputRef.current);
            pendingStrategyInputRef.current = null;
          }
        });
      }
    },
    [updateStrategyInput]
  );

  // RequestAnimationFrame Coalescing for ML Warp Sliders
  const warpRafRef = useRef<number | null>(null);
  const pendingWarpParamsRef = useRef<Partial<MlPhysicsWarpParams> | null>(null);

  const coalescedUpdateMlWarpParams = useCallback(
    (partial: Partial<MlPhysicsWarpParams>) => {
      if (typeof requestAnimationFrame === 'undefined') {
        updateMlWarpParams(partial);
        return;
      }

      pendingWarpParamsRef.current = {
        ...(pendingWarpParamsRef.current ?? {}),
        ...partial,
      };

      if (warpRafRef.current === null) {
        warpRafRef.current = requestAnimationFrame(() => {
          warpRafRef.current = null;
          if (pendingWarpParamsRef.current) {
            updateMlWarpParams(pendingWarpParamsRef.current);
            pendingWarpParamsRef.current = null;
          }
        });
      }
    },
    [updateMlWarpParams]
  );

  // Clean up any pending RAF frames on unmount
  useEffect(() => {
    return () => {
      if (strategyRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(strategyRafRef.current);
      }
      if (warpRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(warpRafRef.current);
      }
    };
  }, []);

  const isFiaRuleViolatedA = isFiaTwoCompoundRuleViolated(strategyA.startCompound, strategyA.nextCompound1);

  return (
    <div
      data-testid="ml-strategy-sandbox-container"
      className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 font-telemetry text-[10px] bg-[#0C1017] select-none"
    >
      {/* ================================================================= */}
      {/* 1. ML VERDICT BANNER                                              */}
      {/* ================================================================= */}
      {strategyResult && (
        <div
          data-testid="ml-verdict-banner"
          className={`p-2 border transition-colors ${
            strategyResult.undercutGainSec >= 0
              ? 'border-[#00FF66] bg-[#00FF66]/10'
              : 'border-[#FFE600] bg-[#FFE600]/10'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[#E2E8F0] text-[10.5px] tracking-wide">
              {strategyResult.verdictHeadline}
            </span>
            <span className="text-[9px] text-[#00E5FF] font-mono">
              [{strategyResult.executionTimeMs} ms]
            </span>
          </div>
          <p className="text-[9.5px] text-[#94A3B8] leading-snug mb-2 font-mono">
            {strategyResult.verdictDetail}
          </p>
          <button
            type="button"
            data-testid="simulate-pit-exit-merge-btn"
            onClick={jumpToPitExitBattle}
            className="w-full py-1 bg-[#141B26] border border-[#00E5FF] text-[#00E5FF] font-bold hover:bg-[#00E5FF] hover:text-[#05070B] active:translate-y-[1px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ▶ SIMULATE 3D PIT-EXIT MERGE AT TURN 1
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. DRIVER A PIT STRATEGY SANDBOX                                  */}
      {/* ================================================================= */}
      <div data-testid="driver-a-sandbox" className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#00E5FF] font-bold tracking-wide">
            [DRIVER A] {strategyA.driverCode} PIT STRATEGY
          </span>
          <span className="text-[#64748B] text-[9px] font-mono">
            OPT BOX: LAP {strategyResult?.optimalPitLapA ?? 19}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[#94A3B8]">STINT COMPOUNDS:</span>
          <div className="flex items-center gap-1">
            {COMPOUNDS.map((c) => (
              <button
                key={`a-start-${c}`}
                type="button"
                data-testid={`driver-a-start-compound-${c}`}
                onClick={() =>
                  updateStrategyInput({
                    strategyA: { ...strategyA, startCompound: c },
                  })
                }
                className={`px-1.5 py-0.5 border cursor-pointer transition-colors ${
                  strategyA.startCompound === c
                    ? 'border-[#00E5FF] bg-[#141B26] text-[#E2E8F0] font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {c}
              </button>
            ))}
            <span className="text-[#64748B] px-1 select-none font-bold">→</span>
            {COMPOUNDS.map((c) => (
              <button
                key={`a-next-${c}`}
                type="button"
                data-testid={`driver-a-next-compound-${c}`}
                onClick={() =>
                  updateStrategyInput({
                    strategyA: { ...strategyA, nextCompound1: c },
                  })
                }
                className={`px-1.5 py-0.5 border cursor-pointer transition-colors ${
                  strategyA.nextCompound1 === c
                    ? 'border-[#00FF66] bg-[#141B26] text-[#00FF66] font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between text-[#94A3B8] mb-1">
          <span>TARGET BOX LAP:</span>
          <strong className="text-[#00E5FF] font-mono font-bold">
            LAP {strategyA.pitLap1} / {totalRaceLaps}
          </strong>
        </label>
        <input
          type="range"
          data-testid="driver-a-pit-lap-slider"
          min={6}
          max={Math.max(6, totalRaceLaps - 6)}
          value={strategyA.pitLap1}
          onChange={(e) =>
            coalescedUpdateStrategyInput({
              strategyA: { ...strategyA, pitLap1: Number(e.target.value) },
            })
          }
          className="w-full accent-[#00E5FF] cursor-pointer"
        />

        {/* FIA Mandatory Two-Compound Rule Check */}
        {isFiaRuleViolatedA && (
          <div
            data-testid="fia-rule-violation-badge"
            className="p-1 border border-[#FFE600] bg-[#FFE600]/15 text-[#FFE600] font-bold text-[9px] tracking-wide mt-2 flex items-center justify-center text-center"
          >
            {FIA_RULE_VIOLATION_MESSAGE}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. DRIVER B RIVAL STRATEGY SANDBOX                                */}
      {/* ================================================================= */}
      <div data-testid="driver-b-sandbox" className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#B000FF] font-bold tracking-wide">
            [GHOST B] {strategyB.driverCode} PIT STRATEGY
          </span>
          <span className="text-[#64748B] text-[9px]">RIVAL BENCHMARK</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[#94A3B8]">STINT COMPOUNDS:</span>
          <div className="flex items-center gap-1">
            {COMPOUNDS.map((c) => (
              <button
                key={`b-start-${c}`}
                type="button"
                data-testid={`driver-b-start-compound-${c}`}
                onClick={() =>
                  updateStrategyInput({
                    strategyB: { ...strategyB, startCompound: c },
                  })
                }
                className={`px-1.5 py-0.5 border cursor-pointer transition-colors ${
                  strategyB.startCompound === c
                    ? 'border-[#B000FF] bg-[#141B26] text-[#E2E8F0] font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {c}
              </button>
            ))}
            <span className="text-[#64748B] px-1 select-none font-bold">→</span>
            {COMPOUNDS.map((c) => (
              <button
                key={`b-next-${c}`}
                type="button"
                data-testid={`driver-b-next-compound-${c}`}
                onClick={() =>
                  updateStrategyInput({
                    strategyB: { ...strategyB, nextCompound1: c },
                  })
                }
                className={`px-1.5 py-0.5 border cursor-pointer transition-colors ${
                  strategyB.nextCompound1 === c
                    ? 'border-[#B000FF] bg-[#141B26] text-[#B000FF] font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between text-[#94A3B8] mb-1">
          <span>RIVAL BOX LAP:</span>
          <strong className="text-[#B000FF] font-mono font-bold">
            LAP {strategyB.pitLap1} / {totalRaceLaps}
          </strong>
        </label>
        <input
          type="range"
          data-testid="driver-b-pit-lap-slider"
          min={6}
          max={Math.max(6, totalRaceLaps - 6)}
          value={strategyB.pitLap1}
          onChange={(e) =>
            coalescedUpdateStrategyInput({
              strategyB: { ...strategyB, pitLap1: Number(e.target.value) },
            })
          }
          className="w-full accent-[#B000FF] cursor-pointer"
        />
      </div>

      {/* ================================================================= */}
      {/* 4. SAFETY CAR WINDOW INJECTOR                                     */}
      {/* ================================================================= */}
      <div data-testid="safety-car-sandbox" className="p-2 border border-[#1B2230] bg-[#080B10] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[#94A3B8] font-bold">SAFETY CAR DEPLOYMENT:</span>
          <span className="text-[#64748B] text-[9px] font-mono">
            {safetyCarWindowLap === null ? 'STOCHASTIC HAZARD' : `FORCED LAP ${safetyCarWindowLap}`}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            data-testid="sc-btn-stochastic"
            onClick={() => updateStrategyInput({ safetyCarWindowLap: null })}
            className={`flex-1 py-1 px-1 border text-center cursor-pointer transition-colors ${
              safetyCarWindowLap === null
                ? 'border-[#00E5FF] bg-[#141B26] text-[#00E5FF] font-bold'
                : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            STOCHASTIC
          </button>
          <button
            type="button"
            data-testid="sc-btn-pit-lap-a"
            onClick={() => updateStrategyInput({ safetyCarWindowLap: strategyA.pitLap1 })}
            className={`flex-1 py-1 px-1 border text-center cursor-pointer transition-colors ${
              safetyCarWindowLap === strategyA.pitLap1
                ? 'border-[#FFE600] bg-[#FFE600]/20 text-[#FFE600] font-bold'
                : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            SC ON LAP {strategyA.pitLap1}
          </button>
          <button
            type="button"
            data-testid="sc-btn-pit-lap-b"
            onClick={() => updateStrategyInput({ safetyCarWindowLap: strategyB.pitLap1 })}
            className={`flex-1 py-1 px-1 border text-center cursor-pointer transition-colors ${
              safetyCarWindowLap === strategyB.pitLap1
                ? 'border-[#FFE600] bg-[#FFE600]/20 text-[#FFE600] font-bold'
                : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            SC ON LAP {strategyB.pitLap1}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 5. ML TELEMETRY PHYSICS-WARP SIMULATOR (TYRE WEAR & FUEL MASS)    */}
      {/* ================================================================= */}
      <div data-testid="ml-physics-warp-sandbox" className="p-2 border border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#00FF66] font-bold tracking-wide">
            ML TELEMETRY PHYSICS-WARP
          </span>
          <button
            type="button"
            data-testid="warp-toggle-btn"
            onClick={() => updateMlWarpParams({ enabled: !mlWarpParams.enabled })}
            className={`px-2 py-0.5 border font-bold cursor-pointer transition-colors ${
              mlWarpParams.enabled
                ? 'border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66]'
                : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {mlWarpParams.enabled ? 'WARP ACTIVE' : 'ENABLE WARP'}
          </button>
        </div>

        <div className="space-y-1.5 text-[9.5px]">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">TYRE AGE: {mlWarpParams.tyreAgeLaps} LAPS</span>
            <span className="text-[#FFE600] font-mono font-bold">
              GRIP: {((mlWarpOutput?.gripMultiplier ?? 1) * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            data-testid="tyre-age-slider"
            min={0}
            max={38}
            value={mlWarpParams.tyreAgeLaps}
            onChange={(e) =>
              coalescedUpdateMlWarpParams({
                enabled: true,
                tyreAgeLaps: Number(e.target.value),
              })
            }
            className="w-full accent-[#00FF66] cursor-pointer"
          />

          <div className="flex justify-between">
            <span className="text-[#94A3B8]">FUEL LOAD: {mlWarpParams.fuelLoadKg} KG</span>
            <span className="text-[#FF1E44] font-mono font-bold">
              BRAKE SHIFT: +{mlWarpOutput?.brakingExtensionM ?? 0}m
            </span>
          </div>
          <input
            type="range"
            data-testid="fuel-load-slider"
            min={8}
            max={105}
            value={mlWarpParams.fuelLoadKg}
            onChange={(e) =>
              coalescedUpdateMlWarpParams({
                enabled: true,
                fuelLoadKg: Number(e.target.value),
              })
            }
            className="w-full accent-[#FF1E44] cursor-pointer"
          />

          <div className="pt-1.5 border-t border-[#1B2230] flex justify-between font-bold">
            <span className="text-[#94A3B8]">ML PREDICTED LAP:</span>
            <span data-testid="ml-predicted-lap-readout" className="text-[#00E5FF] font-mono">
              {mlWarpOutput
                ? `${mlWarpOutput.predictedLapTimeSec.toFixed(3)}s (+${mlWarpOutput.lapDeltaVsBaseSec.toFixed(3)}s)`
                : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MlStrategySandbox = React.memo(MlStrategySandboxComponent);
