// frontend/src/components/flankLeft/TimingTower.tsx
/**
 * AERO-SPEC F1 // QUADRANT 1: DUAL-MODE TIMING & MONTE CARLO ORACLE TOWER
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.3
 *
 * ARCHITECTURAL CONTRACT:
 * - Dual-Mode Architecture:
 *   * TELEMETRY_LAB: 20-driver live timing matrix with sectors (S1/S2/S3), tyre telemetry, and gap deltas.
 *   * ML_STRATEGY_ORACLE: 20-driver Monte Carlo win & podium outcome probability oracle with P10–P90 confidence bounds.
 * - ZERO-RENDER INVARIANT: Strictly subscribes only to `sessionPayload`, `cockpitMode`, and `strategyResult`.
 *   DO NOT subscribe to `currentDistance` or `isPlaying`. TimingTower must execute ZERO re-renders during 60 Hz playback!
 * - CLS = 0: Static layout heights, tabular numeric typography, and 20-row skeleton placeholder state.
 */

import React, { useMemo } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type {
  CockpitMode,
  MlStrategySimulationResult,
  MonteCarloDriverProbability,
  SectorStatus,
  SessionTelemetryPayload,
  TimingTowerDriver,
  TyreCompound,
} from '../../types/telemetry';

export interface TimingTowerProps {
  sessionPayload?: SessionTelemetryPayload | null;
  cockpitMode?: CockpitMode;
  strategyResult?: MlStrategySimulationResult | null;
}

export const COMPOUND_COLORS: Record<TyreCompound, string> = {
  S: '#FF1E44',
  M: '#FFE600',
  H: '#E2E8F0',
  I: '#00FF66',
  W: '#00E5FF',
};

export const SECTOR_COLORS: Record<SectorStatus, string> = {
  PURPLE: '#B000FF',
  GREEN: '#00FF66',
  AMBER: '#FFE600',
};

export const SECTOR_FALLBACK_COLOR = '#1B2230';

/**
 * Ascending sort by expectedPosition to guarantee stable ranking in ML Oracle mode
 * and prevent rank inversion when undercuts or simulation results update.
 */
export function sortDriverProbabilities(
  probabilities: MonteCarloDriverProbability[]
): MonteCarloDriverProbability[] {
  return [...probabilities].sort((a, b) => a.expectedPosition - b.expectedPosition);
}

/**
 * Formats LAP / GAP cell text and styling classes according to telemetry state.
 */
export function formatTimingLapGap(
  drv: TimingTowerDriver,
  isDriverB: boolean
): { text: string; colorClass: string } {
  if (drv.bestLapTimeSec <= 0) {
    return {
      text: 'NO TIME',
      colorClass: 'text-[#64748B]',
    };
  }

  if (drv.position === 1) {
    return {
      text: drv.bestLapTimeStr || 'NO TIME',
      colorClass: 'text-[#00E5FF]',
    };
  }

  return {
    text: drv.gapToLeaderStr || '+0.000',
    colorClass: isDriverB ? 'text-[#B000FF]' : 'text-[#E2E8F0]',
  };
}

/**
 * Formats P10-P90 percentile band string. If p10 === p90, formats as 'P{pos}'.
 */
export function formatConfidenceBand(p10: number, p90: number): string {
  if (p10 === p90) {
    return `P${p10}`;
  }
  return `P${p10}–P${p90}`;
}

const TimingTowerComponent: React.FC<TimingTowerProps> = (props) => {
  // CRITICAL ZERO-RENDER INVARIANT:
  // Strictly subscribe only to sessionPayload, cockpitMode, and strategyResult.
  // Never subscribe to currentDistance or isPlaying.
  const storePayload = useTelemetryStore((s) => s.sessionPayload);
  const storeCockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const storeStrategyResult = useTelemetryStore((s) => s.strategyResult);

  const payload = props.sessionPayload !== undefined ? props.sessionPayload : storePayload;
  const cockpitMode = props.cockpitMode !== undefined ? props.cockpitMode : storeCockpitMode;
  const strategyResult = props.strategyResult !== undefined ? props.strategyResult : storeStrategyResult;

  // Fallback to payload's defaultStrategyOracle if strategyResult is null
  const driverProbabilities = useMemo(() => {
    const raw =
      strategyResult?.driverProbabilities ??
      payload?.defaultStrategyOracle?.driverProbabilities ??
      [];
    return sortDriverProbabilities(raw);
  }, [strategyResult, payload]);

  // Loading Skeleton State (CLS = 0)
  if (!payload) {
    return (
      <aside
        data-testid="timing-tower"
        className="hud-quadrant flex flex-col h-full bg-[#0C1017] border-r border-[#1B2230] overflow-hidden select-none font-telemetry tabular-nums"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <header className="quadrant-header h-[24px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00FF66] inline-block animate-pulse" />
            <span className="font-bold text-[10px] tracking-wider text-[#E2E8F0]">
              {cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'Q1 // MONTE CARLO WIN & PODIUM ORACLE'
                : 'Q1 // LIVE TIMING & SECTOR MATRIX'}
            </span>
          </div>
          <span className="font-telemetry text-[9px] text-[#00E5FF]">
            {cockpitMode === 'ML_STRATEGY_ORACLE' ? '[-- SIMS]' : '[20 DRV // Q3]'}
          </span>
        </header>

        {cockpitMode === 'TELEMETRY_LAB' ? (
          <div className="grid grid-cols-[26px_52px_38px_1fr_66px] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>POS</span>
            <span>DRV</span>
            <span>TYRE</span>
            <span className="text-right pr-2">LAP / GAP</span>
            <span className="text-center">S1 / S2 / S3</span>
          </div>
        ) : (
          <div className="grid grid-cols-[26px_50px_54px_54px_1fr] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>EXP</span>
            <span>DRV</span>
            <span className="text-right">WIN %</span>
            <span className="text-right">POD %</span>
            <span className="text-right pr-1">P10–P90 BAND</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-[#141B26] scrollbar-thin">
          {Array.from({ length: 20 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[25px] animate-pulse bg-[#080B10]/40 flex items-center px-2 justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-2.5 bg-[#1B2230]/60 inline-block" />
                <span className="w-8 h-2.5 bg-[#1B2230]/60 inline-block" />
              </div>
              <span className="w-14 h-2.5 bg-[#1B2230]/40 inline-block" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const { timingTower, meta } = payload;
  const numSims =
    strategyResult?.numSimulations ??
    payload.defaultStrategyOracle?.numSimulations ??
    5000;

  return (
    <aside
      data-testid="timing-tower"
      className="hud-quadrant flex flex-col h-full bg-[#0C1017] border-r border-[#1B2230] overflow-hidden select-none font-telemetry tabular-nums"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <header className="quadrant-header h-[24px]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#00FF66] inline-block" />
          <span className="font-bold text-[10px] tracking-wider text-[#E2E8F0]">
            {cockpitMode === 'ML_STRATEGY_ORACLE'
              ? 'Q1 // MONTE CARLO WIN & PODIUM ORACLE'
              : 'Q1 // LIVE TIMING & SECTOR MATRIX'}
          </span>
        </div>
        <span className="font-telemetry text-[9px] text-[#00E5FF]">
          {cockpitMode === 'ML_STRATEGY_ORACLE'
            ? `[${numSims} SIMS]`
            : '[20 DRV // Q3]'}
        </span>
      </header>

      {cockpitMode === 'TELEMETRY_LAB' ? (
        <>
          <div className="grid grid-cols-[26px_52px_38px_1fr_66px] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>POS</span>
            <span>DRV</span>
            <span>TYRE</span>
            <span className="text-right pr-2">LAP / GAP</span>
            <span className="text-center">S1 / S2 / S3</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#141B26] scrollbar-thin">
            {(timingTower || []).map((drv) => {
              const isA = meta?.driverA?.code ? drv.code === meta.driverA.code : false;
              const isB = meta?.driverB?.code ? drv.code === meta.driverB.code : false;
              const compoundColor = COMPOUND_COLORS[drv.compound] ?? '#94A3B8';
              const lapGap = formatTimingLapGap(drv, isB);

              return (
                <div
                  key={drv.code}
                  className={`grid grid-cols-[26px_52px_38px_1fr_66px] items-center px-2 h-[25px] font-telemetry text-[11px] ${
                    isA
                      ? 'bg-[#141B26] border-l-2 border-l-[#00E5FF]'
                      : isB
                      ? 'bg-[#141B26]/80 border-l-2 border-l-[#B000FF]'
                      : 'hover:bg-[#16202E] border-l-2 border-l-transparent'
                  }`}
                >
                  <span className="text-[#64748B] font-bold text-[10px]">
                    {drv.position.toString().padStart(2, '0')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-[3px] h-[14px] inline-block shrink-0"
                      style={{ backgroundColor: drv.teamColor }}
                    />
                    <span className="font-bold text-[#E2E8F0]">{drv.code}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <span
                      className="px-1 border font-bold text-[10px]"
                      style={{
                        color: compoundColor,
                        borderColor: compoundColor,
                      }}
                    >
                      {drv.compound || '-'}
                    </span>
                    <span className="text-[#64748B] text-[9px]">
                      {drv.tyreAgeLaps != null && drv.tyreAgeLaps >= 0
                        ? `L${drv.tyreAgeLaps}`
                        : 'L-'}
                    </span>
                  </div>

                  <div className={`text-right pr-2 font-semibold ${lapGap.colorClass}`}>
                    {lapGap.text}
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    {[0, 1, 2].map((sIdx) => {
                      const secStatus = drv.sectors?.[sIdx];
                      const color = secStatus
                        ? SECTOR_COLORS[secStatus] ?? SECTOR_FALLBACK_COLOR
                        : SECTOR_FALLBACK_COLOR;
                      return (
                        <span
                          key={sIdx}
                          className="w-[17px] h-[5px] inline-block"
                          style={{ backgroundColor: color }}
                          data-sector={sIdx + 1}
                          data-status={secStatus ?? 'NONE'}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[26px_50px_54px_54px_1fr] items-center px-2 h-[20px] bg-[#080B10] border-b border-[#1B2230] text-[9px] font-telemetry text-[#64748B]">
            <span>EXP</span>
            <span>DRV</span>
            <span className="text-right">WIN %</span>
            <span className="text-right">POD %</span>
            <span className="text-right pr-1">P10–P90 BAND</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#141B26] scrollbar-thin">
            {driverProbabilities.map((prob, idx) => {
              const isA = meta?.driverA?.code ? prob.code === meta.driverA.code : false;
              const isB = meta?.driverB?.code ? prob.code === meta.driverB.code : false;
              const band = formatConfidenceBand(prob.p10Position, prob.p90Position);

              return (
                <div
                  key={prob.code}
                  className={`grid grid-cols-[26px_50px_54px_54px_1fr] items-center px-2 h-[25px] font-telemetry text-[10.5px] ${
                    isA
                      ? 'bg-[#141B26] border-l-2 border-l-[#00E5FF]'
                      : isB
                      ? 'bg-[#141B26]/80 border-l-2 border-l-[#B000FF]'
                      : 'hover:bg-[#16202E] border-l-2 border-l-transparent'
                  }`}
                >
                  <span className="text-[#64748B] font-bold text-[10px]">P{idx + 1}</span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-[3px] h-[14px] inline-block shrink-0"
                      style={{ backgroundColor: prob.teamColor }}
                    />
                    <span className="font-bold text-[#E2E8F0]">{prob.code}</span>
                  </div>

                  <span
                    className={`text-right font-bold ${
                      prob.winProbPct > 25 ? 'text-[#00FF66]' : 'text-[#E2E8F0]'
                    }`}
                  >
                    {`${prob.winProbPct.toFixed(1)}%`}
                  </span>

                  <span className="text-right text-[#00E5FF]">
                    {`${prob.podiumProbPct.toFixed(1)}%`}
                  </span>

                  <div className="text-right pr-1 text-[9.5px] text-[#94A3B8]">
                    {band}{' '}
                    <span className="text-[#64748B]">
                      {`(${prob.expectedPosition.toFixed(1)})`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};

export const TimingTower = React.memo(TimingTowerComponent);
