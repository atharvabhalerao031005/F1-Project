// frontend/src/components/editorial/PitWallOracleAct3.tsx
import React, { useId, useState } from 'react';
import {
  BrainCircuit,
  ShieldAlert,
  ChevronRight,
  X,
  Thermometer,
} from 'lucide-react';
import type {
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  TyreCompound,
} from '../../types/telemetry';
import { StrategyFanChart } from '../scrubber/StrategyFanChart';

interface PitWallOracleAct3Props {
  strategyInput: MlStrategySimulationInput;
  strategyResult: MlStrategySimulationResult | null;
  onUpdateStrategy: (partial: Partial<MlStrategySimulationInput>) => void;
  onRunSimulation: () => void;
  onSelectCircuit: (circuit: string) => void;
  activeCircuit: string;
}

const COMPOUND_COLORS: Record<TyreCompound, { bg: string; text: string; border: string; name: string }> = {
  S: { bg: '#FF1E44', text: '#FFFFFF', border: '#FF1E44', name: 'Soft (C4)' },
  M: { bg: '#FFE600', text: '#0F1012', border: '#FFE600', name: 'Medium (C3)' },
  H: { bg: '#F7F6F2', text: '#0F1012', border: '#D1D5DB', name: 'Hard (C2)' },
  I: { bg: '#00CC66', text: '#FFFFFF', border: '#00CC66', name: 'Inter (Green)' },
  W: { bg: '#0088FF', text: '#FFFFFF', border: '#0088FF', name: 'Wet (Blue)' },
};

export const PitWallOracleAct3: React.FC<PitWallOracleAct3Props> = ({
  strategyInput,
  strategyResult,
  onUpdateStrategy,
  onRunSimulation,
  onSelectCircuit,
  activeCircuit,
}) => {
  const [showFullClassification, setShowFullClassification] = useState(false);

  const driverASliderId = useId();
  const driverBSliderId = useId();
  const trackTempSliderId = useId();
  const scSliderId = useId();

  const driverA = strategyInput.strategyA;
  const driverB = strategyInput.strategyB;
  const totalLaps = strategyInput.totalRaceLaps;

  // Stint widths as percentages of total race laps
  const stint1APct = Math.min(100, Math.max(5, (driverA.pitLap1 / totalLaps) * 100));
  const stint2APct = 100 - stint1APct;

  const stint1BPct = Math.min(100, Math.max(5, (driverB.pitLap1 / totalLaps) * 100));
  const stint2BPct = 100 - stint1BPct;

  const verdictHeadline = strategyResult?.verdictHeadline || '+1.84s UNDERCUT GAIN';
  const verdictDetail =
    strategyResult?.verdictDetail ||
    'Boxing on Lap 19 for Hard tires clears Norris by 11.5 meters at the Turn 1 pit exit merge.';

  const probs = strategyResult?.driverProbabilities || [
    { code: 'VER', teamColor: '#3671C6', winProbPct: 64.2, podiumProbPct: 94.1, pointsProbPct: 98.8, expectedPosition: 1.2, p10Position: 1, p90Position: 2, expectedRaceTimeSec: 4210.4 },
    { code: 'NOR', teamColor: '#FF8000', winProbPct: 28.5, podiumProbPct: 88.4, pointsProbPct: 96.5, expectedPosition: 2.1, p10Position: 1, p90Position: 3, expectedRaceTimeSec: 4212.2 },
    { code: 'LEC', teamColor: '#E8002D', winProbPct: 5.1, podiumProbPct: 52.8, pointsProbPct: 91.2, expectedPosition: 3.4, p10Position: 2, p90Position: 5, expectedRaceTimeSec: 4218.6 },
  ];

  const handleUpdateAndSim = (partial: Partial<MlStrategySimulationInput>) => {
    onUpdateStrategy(partial);
    onRunSimulation();
  };

  return (
    <section
      id="act-3"
      className="relative w-full min-h-[140vh] bg-[#F4F2ED] text-[#0F1012] px-6 sm:px-12 md:px-20 py-28 transition-colors duration-500"
    >
      {/* Section Header */}
      <div className="max-w-4xl mb-16">
        <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#EAE7DF] border border-[rgba(15,16,18,0.08)] mb-4">
          <BrainCircuit className="w-3.5 h-3.5 text-[#FF3B00]" />
          <span className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-[#7A7E85]">
            03 — THE PIT-WALL ORACLE
          </span>
        </div>

        <h2 className="font-display font-extrabold text-[clamp(2.4rem,5.5vw,5.5rem)] text-[#0F1012] leading-[0.94] tracking-tight mb-4">
          5,000 Races. <br />
          <span className="font-editorial italic font-normal text-[#FF3B00]">
            Simulated in 80 Milliseconds.
          </span>
        </h2>

        <p className="font-sans text-base sm:text-lg text-[#555962] leading-relaxed max-w-[54ch]">
          Vectorized Monte Carlo probability distributions evaluating tire compound degradation crossover deltas,
          pit lane loss, and dynamic Safety Car probability windows.
        </p>

        {/* Circuit Selector Pills */}
        <div className="flex flex-wrap items-center gap-3 mt-8">
          <span className="font-sans text-xs uppercase tracking-wider text-[#7A7E85] font-semibold mr-1">
            Circuit:
          </span>
          {[
            { id: 'monza', name: 'Monza', laps: 53, subtitle: 'Temple of Speed' },
            { id: 'silverstone', name: 'Silverstone', laps: 52, subtitle: 'High-G Sweeps' },
            { id: 'monaco', name: 'Monaco', laps: 78, subtitle: 'Barrier Canyon' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCircuit(c.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border ${
                activeCircuit === c.id
                  ? 'bg-[#0F1012] text-white border-[#0F1012] shadow-md scale-105'
                  : 'bg-white text-[#555962] border-[rgba(15,16,18,0.12)] hover:border-[#0F1012]'
              }`}
            >
              <span>{c.name}</span>
              <span className="text-[10px] opacity-60">({c.laps} Laps)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Decluttered 2-Column Interactive Strategy Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto">
        {/* ================================================================== */}
        {/* LEFT COLUMN (5 cols): TACTILE PIT WINDOWS & STRATEGY CONTROLS      */}
        {/* ================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-7 rounded-3xl bg-white border border-[rgba(15,16,18,0.08)] shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(15,16,18,0.06)]">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0F1012]">
                  Tactile Stint Windows
                </h3>
                <span className="font-sans text-xs text-[#7A7E85]">
                  Drag pit stops to trigger real-time Monte Carlo recalculation
                </span>
              </div>
              <span className="font-numeric text-xs font-bold text-[#FF3B00] bg-[#FF3B00]/10 px-2.5 py-1 rounded-full">
                {totalLaps} LAPS
              </span>
            </div>

            {/* DRIVER A: VER (Red Bull) */}
            <div className="mb-8 p-4 rounded-2xl bg-[#F8F7F4] border border-[rgba(15,16,18,0.06)]">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-sans text-xs font-bold text-[#1E41FF] flex items-center gap-1.5 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E41FF]" />
                  Driver A ({driverA.driverCode})
                </span>
                <span className="font-numeric text-xs font-bold text-[#0F1012]">
                  BOX LAP {driverA.pitLap1}
                </span>
              </div>

              {/* Proportional Stint Timeline Bar */}
              <div className="w-full h-4 rounded-full overflow-hidden flex mb-3 p-0.5 bg-black/5">
                <div
                  className="h-full rounded-l-full flex items-center justify-center text-[9px] font-bold font-numeric shadow-inner transition-all duration-150"
                  style={{
                    width: `${stint1APct}%`,
                    backgroundColor: COMPOUND_COLORS[driverA.startCompound].bg,
                    color: COMPOUND_COLORS[driverA.startCompound].text,
                  }}
                >
                  {driverA.startCompound} ({driverA.pitLap1}L)
                </div>
                <div
                  className="h-full rounded-r-full flex items-center justify-center text-[9px] font-bold font-numeric shadow-inner transition-all duration-150"
                  style={{
                    width: `${stint2APct}%`,
                    backgroundColor: COMPOUND_COLORS[driverA.nextCompound1].bg,
                    color: COMPOUND_COLORS[driverA.nextCompound1].text,
                  }}
                >
                  {driverA.nextCompound1} ({totalLaps - driverA.pitLap1}L)
                </div>
              </div>

              {/* Pit Lap Range Slider */}
              <label htmlFor={driverASliderId} className="sr-only">Driver A Pit Lap</label>
              <input
                id={driverASliderId}
                type="range"
                min={8}
                max={totalLaps - 8}
                value={driverA.pitLap1}
                onChange={(e) => {
                  handleUpdateAndSim({
                    strategyA: { ...driverA, pitLap1: Number(e.target.value) },
                  });
                }}
                className="w-full"
              />

              {/* Compound Swap Controls */}
              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[rgba(15,16,18,0.06)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#7A7E85]">Stint 1:</span>
                  {(['S', 'M', 'H'] as TyreCompound[]).map((c) => (
                    <button
                      key={`a1-${c}`}
                      onClick={() =>
                        handleUpdateAndSim({
                          strategyA: { ...driverA, startCompound: c },
                        })
                      }
                      className={`w-6 h-6 rounded-full font-bold text-[10px] font-numeric transition-transform ${
                        driverA.startCompound === c ? 'scale-110 ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: COMPOUND_COLORS[c].bg,
                        color: COMPOUND_COLORS[c].text,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#7A7E85]">Stint 2:</span>
                  {(['S', 'M', 'H'] as TyreCompound[]).map((c) => (
                    <button
                      key={`a2-${c}`}
                      onClick={() =>
                        handleUpdateAndSim({
                          strategyA: { ...driverA, nextCompound1: c },
                        })
                      }
                      className={`w-6 h-6 rounded-full font-bold text-[10px] font-numeric transition-transform ${
                        driverA.nextCompound1 === c ? 'scale-110 ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: COMPOUND_COLORS[c].bg,
                        color: COMPOUND_COLORS[c].text,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DRIVER B: NOR (McLaren) */}
            <div className="mb-6 p-4 rounded-2xl bg-[#F8F7F4] border border-[rgba(15,16,18,0.06)]">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-sans text-xs font-bold text-[#FF8000] flex items-center gap-1.5 uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF8000]" />
                  Driver B ({driverB.driverCode})
                </span>
                <span className="font-numeric text-xs font-bold text-[#0F1012]">
                  BOX LAP {driverB.pitLap1}
                </span>
              </div>

              {/* Proportional Stint Timeline Bar */}
              <div className="w-full h-4 rounded-full overflow-hidden flex mb-3 p-0.5 bg-black/5">
                <div
                  className="h-full rounded-l-full flex items-center justify-center text-[9px] font-bold font-numeric shadow-inner transition-all duration-150"
                  style={{
                    width: `${stint1BPct}%`,
                    backgroundColor: COMPOUND_COLORS[driverB.startCompound].bg,
                    color: COMPOUND_COLORS[driverB.startCompound].text,
                  }}
                >
                  {driverB.startCompound} ({driverB.pitLap1}L)
                </div>
                <div
                  className="h-full rounded-r-full flex items-center justify-center text-[9px] font-bold font-numeric shadow-inner transition-all duration-150"
                  style={{
                    width: `${stint2BPct}%`,
                    backgroundColor: COMPOUND_COLORS[driverB.nextCompound1].bg,
                    color: COMPOUND_COLORS[driverB.nextCompound1].text,
                  }}
                >
                  {driverB.nextCompound1} ({totalLaps - driverB.pitLap1}L)
                </div>
              </div>

              <label htmlFor={driverBSliderId} className="sr-only">Driver B Pit Lap</label>
              <input
                id={driverBSliderId}
                type="range"
                min={8}
                max={totalLaps - 8}
                value={driverB.pitLap1}
                onChange={(e) => {
                  handleUpdateAndSim({
                    strategyB: { ...driverB, pitLap1: Number(e.target.value) },
                  });
                }}
                className="w-full"
              />

              {/* Compound Swap Controls */}
              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[rgba(15,16,18,0.06)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#7A7E85]">Stint 1:</span>
                  {(['S', 'M', 'H'] as TyreCompound[]).map((c) => (
                    <button
                      key={`b1-${c}`}
                      onClick={() =>
                        handleUpdateAndSim({
                          strategyB: { ...driverB, startCompound: c },
                        })
                      }
                      className={`w-6 h-6 rounded-full font-bold text-[10px] font-numeric transition-transform ${
                        driverB.startCompound === c ? 'scale-110 ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: COMPOUND_COLORS[c].bg,
                        color: COMPOUND_COLORS[c].text,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#7A7E85]">Stint 2:</span>
                  {(['S', 'M', 'H'] as TyreCompound[]).map((c) => (
                    <button
                      key={`b2-${c}`}
                      onClick={() =>
                        handleUpdateAndSim({
                          strategyB: { ...driverB, nextCompound1: c },
                        })
                      }
                      className={`w-6 h-6 rounded-full font-bold text-[10px] font-numeric transition-transform ${
                        driverB.nextCompound1 === c ? 'scale-110 ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: COMPOUND_COLORS[c].bg,
                        color: COMPOUND_COLORS[c].text,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Environmental Temperature & Safety Car Sliders */}
            <div className="space-y-4 pt-4 border-t border-[rgba(15,16,18,0.06)]">
              {/* Track Temp */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-sans text-xs text-[#7A7E85] flex items-center gap-1 font-semibold uppercase">
                    <Thermometer className="w-3.5 h-3.5 text-[#FF3B00]" />
                    Track Temperature
                  </span>
                  <span className="font-numeric text-xs font-bold text-[#0F1012]">
                    {strategyInput.trackTempC.toFixed(1)}°C
                  </span>
                </div>
                <label htmlFor={trackTempSliderId} className="sr-only">Track Temperature</label>
                <input
                  id={trackTempSliderId}
                  type="range"
                  min={18}
                  max={60}
                  step={0.5}
                  value={strategyInput.trackTempC}
                  onChange={(e) => {
                    handleUpdateAndSim({ trackTempC: Number(e.target.value) });
                  }}
                  className="w-full"
                />
              </div>

              {/* Safety Car Window */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F4] border border-[rgba(15,16,18,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-xs font-semibold text-[#0F1012] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B00]" />
                    Safety Car Intervention
                  </span>
                  <button
                    onClick={() => {
                      const newWindow = strategyInput.safetyCarWindowLap ? null : 23;
                      handleUpdateAndSim({ safetyCarWindowLap: newWindow });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      strategyInput.safetyCarWindowLap
                        ? 'bg-[#FF3B00] text-white shadow'
                        : 'bg-[#EAE7DF] text-[#7A7E85] hover:text-[#0F1012]'
                    }`}
                  >
                    {strategyInput.safetyCarWindowLap ? `Lap ${strategyInput.safetyCarWindowLap}` : 'Disabled'}
                  </button>
                </div>

                {strategyInput.safetyCarWindowLap && (
                  <div>
                    <label htmlFor={scSliderId} className="sr-only">Safety Car Window Lap</label>
                    <input
                      id={scSliderId}
                      type="range"
                      min={5}
                      max={totalLaps - 5}
                      value={strategyInput.safetyCarWindowLap}
                      onChange={(e) => {
                        handleUpdateAndSim({ safetyCarWindowLap: Number(e.target.value) });
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-[#7A7E85] mt-1 font-numeric">
                      <span>Lap 5</span>
                      <span>Target: Lap {strategyInput.safetyCarWindowLap}</span>
                      <span>Lap {totalLaps - 5}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT COLUMN (7 cols): HERO VERDICT, PODIUM CARDS & FAN CHART      */}
        {/* ================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Verdict Banner */}
          <div className="p-8 rounded-3xl bg-[#0F1012] text-[#F7F6F2] shadow-2xl relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-[#FF3B00]/20 text-[#FF3B00] border border-[#FF3B00]/30 font-sans text-[11px] font-bold uppercase tracking-wider">
                  Oracle Strategy Verdict
                </span>
                <span className="font-numeric text-xs text-[#7A7E85]">
                  5,000 SIMULATIONS // NUMPY VECTORIZED
                </span>
              </div>

              <h3 className="font-display font-extrabold text-3xl sm:text-5xl text-[#F7F6F2] tracking-tight mb-3">
                {verdictHeadline}
              </h3>

              <p className="font-sans text-sm sm:text-base text-[#9CA3AF] leading-relaxed max-w-[52ch] mb-6">
                {verdictDetail}
              </p>

              {/* Tactical Pit Exit Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center font-numeric">
                <div className="p-3 rounded-xl bg-white/[0.04]">
                  <span className="block text-[10px] text-[#7A7E85] uppercase">Turn 1 Pit Exit Gap</span>
                  <span className="text-xl font-bold text-[#00FF66]">
                    +{strategyResult?.pitExitGapMeters?.toFixed(1) || '11.5'}m
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04]">
                  <span className="block text-[10px] text-[#7A7E85] uppercase">Optimal Pit Lap</span>
                  <span className="text-xl font-bold text-[#FF3B00]">
                    Lap {strategyResult?.optimalPitLapA || driverA.pitLap1}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04]">
                  <span className="block text-[10px] text-[#7A7E85] uppercase">Normal Pit Delta</span>
                  <span className="text-xl font-bold text-white">
                    {strategyInput.pitLossNormalSec.toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 Podium Probability Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {probs.slice(0, 3).map((p, idx) => (
              <div
                key={p.code}
                className="p-5 rounded-2xl bg-white border border-[rgba(15,16,18,0.08)] shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-numeric text-xs font-bold text-[#7A7E85]">
                    P{idx + 1}
                  </span>
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: p.teamColor }}
                  />
                </div>

                <span className="block font-display font-bold text-2xl text-[#0F1012]">
                  {p.code}
                </span>

                <span className="block font-numeric text-3xl font-extrabold text-[#FF3B00] mt-1">
                  {p.winProbPct.toFixed(1)}%
                </span>

                <div className="w-full h-1.5 rounded-full bg-black/5 mt-2 mb-2 overflow-hidden">
                  <div
                    className="h-full bg-[#FF3B00] rounded-full"
                    style={{ width: `${p.winProbPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#7A7E85] font-numeric">
                  <span>Podium: {p.podiumProbPct.toFixed(0)}%</span>
                  <span>Range: P{p.p10Position}–P{p.p90Position}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Expand Full 20-Driver Classification Button */}
          <button
            onClick={() => setShowFullClassification(true)}
            className="w-full py-3 px-4 rounded-2xl bg-white border border-[rgba(15,16,18,0.08)] hover:border-[#0F1012] font-sans text-xs font-semibold tracking-wide text-[#0F1012] flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span>View Full 20-Driver Classification Matrix</span>
            <ChevronRight className="w-4 h-4 text-[#7A7E85]" />
          </button>

          {/* Smooth 53-Lap Cumulative Stint Gap Fan Curve */}
          <div className="p-6 rounded-3xl bg-white border border-[rgba(15,16,18,0.08)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#0F1012]">
                  53-Lap Cumulative Undercut & Confidence Fan
                </h4>
                <p className="font-sans text-[11px] text-[#7A7E85]">
                  Green median line shows cumulative delta (sec). Shaded cyan band represents P10–P90 Monte Carlo spread.
                </p>
              </div>
              <span className="font-numeric text-xs font-bold text-[#00FF66] bg-black px-2.5 py-1 rounded-full">
                MEDIAN DELTA
              </span>
            </div>

            <div className="w-full h-72 overflow-hidden rounded-2xl bg-[#090D14] border border-[#1B2230]">
              <StrategyFanChart />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPANDABLE MODAL: FULL 20-DRIVER CLASSIFICATION MATRIX               */}
      {/* ==================================================================== */}
      {showFullClassification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-[#0F1012] text-white border border-white/10 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl text-[#F7F6F2]">
                  20-Driver Monte Carlo Classification Matrix
                </h3>
                <p className="font-sans text-xs text-[#7A7E85] mt-0.5">
                  5,000 Stochastic Iterations // Empirical Pit-Stop Duration & Tire Cliff Variance
                </p>
              </div>
              <button
                onClick={() => setShowFullClassification(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#9CA3AF] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left font-numeric text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-sans font-semibold uppercase tracking-wider text-[#7A7E85]">
                    <th className="py-2 px-3">Pos</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3 text-right">Win Prob</th>
                    <th className="py-2 px-3 text-right">Podium Prob</th>
                    <th className="py-2 px-3 text-right">Points Prob</th>
                    <th className="py-2 px-3 text-right">Exp. Pos</th>
                    <th className="py-2 px-3 text-right">P10–P90 Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {probs.map((p, idx) => (
                    <tr key={p.code} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-white">P{idx + 1}</td>
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.teamColor }}
                        />
                        <span className="font-bold text-white">{p.code}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#FF3B00]">
                        {p.winProbPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right text-[#9CA3AF]">
                        {p.podiumProbPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right text-[#9CA3AF]">
                        {p.pointsProbPct?.toFixed(1) || '—'}%
                      </td>
                      <td className="py-3 px-3 text-right text-white">
                        {p.expectedPosition?.toFixed(1) || (idx + 1).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#7A7E85]">
                        P{p.p10Position || 1} – P{p.p90Position || idx + 2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                onClick={() => setShowFullClassification(false)}
                className="px-5 py-2 rounded-full bg-[#FF3B00] text-white font-sans text-xs font-semibold hover:bg-[#e03400] transition-colors"
              >
                Close Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
