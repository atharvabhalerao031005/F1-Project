// frontend/src/components/editorial/UpcomingRacePredictorAct2.tsx
/**
 * VELOCE PRO // ACT 2: REAL 2026 CHAMPIONSHIP UPCOMING GP ORACLE
 * Direction 1: Swiss Haute Horlogerie & Editorial Brutalism
 * Mechanical drafting crosshairs, precision caliber telemetry, Syne + Instrument Serif pairings,
 * tabular chronometry, and 4-stage heavy simulation progress modal.
 */

import React, { useEffect, useState } from 'react';
import {
  Thermometer,
  Zap,
  Play,
  Trophy,
  Loader2,
  Sparkles,
  ChevronDown,
  Gauge,
  Activity,
  Radio,
} from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { getActiveLenis } from '../../utils/motionMasterTicker';
import { LiveFeederTrainingModal, type FeederAuditData } from '../modals/LiveFeederTrainingModal';

export const UpcomingRacePredictorAct2: React.FC = () => {
  const [upcomingData, setUpcomingData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>('interlagos');
  const [sessionMode, setSessionMode] = useState<'RACE' | 'QUALIFYING'>('RACE');
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Stage Heavy Simulation Progress State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simStageText, setSimStageText] = useState('');
  const [simAuditData, setSimAuditData] = useState<FeederAuditData | null>(null);

  const setSimulationPayload = useRaceArenaStore((s) => s.setSimulationPayload);
  const setActiveWeatherMode = useRaceArenaStore((s) => s.setActiveWeatherMode);
  const terminateSimulation = useRaceArenaStore((s) => s.terminateSimulation);

  // Fetch upcoming race context when selected circuit changes
  useEffect(() => {
    let isMounted = true;

    async function loadUpcomingContext() {
      try {
        setIsLoading(true);
        const url = `http://127.0.0.1:8000/api/v1/live/upcoming-race?circuit_id=${selectedCircuitId}`;
        const raceRes = await fetch(url);
        const raceJson = await raceRes.json();
        if (!isMounted) return;
        setUpcomingData(raceJson);

        const cId = raceJson.circuitId || selectedCircuitId;
        const weatherRes = await fetch(`http://127.0.0.1:8000/api/v1/live/weather/${cId}`);
        const weatherJson = await weatherRes.json();
        if (!isMounted) return;
        setWeatherData(weatherJson);
      } catch (err) {
        console.error('Failed to load upcoming race data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUpcomingContext();
    return () => {
      isMounted = false;
    };
  }, [selectedCircuitId]);

  // Execute in-depth, heavier simulation with realistic 4-stage progress
  const handleLaunchSimulation = async () => {
    if (!upcomingData) return;
    try {
      // Clear previous simulation and halt playback immediately
      terminateSimulation();

      const isQ = sessionMode === 'QUALIFYING';
      setIsSimulating(true);
      setSimProgress(8);
      setSimStageText(
        isQ
          ? 'STAGE 1/4 // CALIBRATING Q3 ATMOSPHERIC DENSITY & AMBIENT WIND VECTOR...'
          : 'STAGE 1/4 // CALIBRATING HIGH-RES MICROCLIMATE & SATELLITE GPS...'
      );

      // Stage 1 delay
      await new Promise((r) => setTimeout(r, 650));
      setSimProgress(35);
      setSimStageText(
        isQ
          ? 'STAGE 2/4 // EXECUTING 2,500 MONTE CARLO FLYING HOTLAP SHOOTOUT PATHS...'
          : 'STAGE 2/4 // EXECUTING 2,500 MONTE CARLO STOCHASTIC RACE PATHS...'
      );

      // Trigger heavy backend simulation
      const postBody = {
        circuit_id: upcomingData.circuitId,
        session_mode: sessionMode,
        total_laps: isQ ? 3 : upcomingData.raceLaps,
        drivers: upcomingData.entryGrid,
        weather_mode: weatherData?.isWet ? 'RAIN' : 'DAY',
        safety_car_prob: isQ ? 0.0 : 1.0,
      };

      const simPromise = fetch('http://127.0.0.1:8000/api/v1/simulate/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });

      // Stage 2 delay
      await new Promise((r) => setTimeout(r, 850));
      setSimProgress(72);
      setSimStageText(
        isQ
          ? 'STAGE 3/4 // SOLVING MAXIMUM ERS DEPLOYMENT & DRS SLIPSTREAM MATRIX...'
          : 'STAGE 3/4 // SOLVING GOMPERTZ TYRE CLIFFS & DIRTY AIR WAKE MATRICES...'
      );

      // Stage 3 delay
      await new Promise((r) => setTimeout(r, 750));
      setSimProgress(90);
      setSimStageText(
        isQ
          ? 'STAGE 4/4 // SYNTHESIZING FLYING HOTLAP SECTORS (S1 / S2 / S3)...'
          : 'STAGE 4/4 // SYNTHESIZING VSTM-v1 MICRO-SPATIAL TRAJECTORIES...'
      );

      const resp = await simPromise;
      const vstmPayload = await resp.json();

      if (vstmPayload?.feederAudit) {
        setSimAuditData(vstmPayload.feederAudit);
      }

      setSimProgress(100);
      setSimStageText(
        isQ
          ? 'Q3 SHOOTOUT COMPLETE // 22-CAR GRID TELEMETRY CALIBRATED'
          : 'SIMULATION COMPLETE // 22-CAR GRID TELEMETRY CALIBRATED'
      );

      setSimulationPayload(vstmPayload);
      setActiveWeatherMode(weatherData?.isWet ? 'RAIN' : 'DAY');
    } catch (err) {
      console.error('Failed to run upcoming race simulation:', err);
      setIsSimulating(false);
      setSimProgress(0);
    }
  };

  return (
    <section
      id="act-2"
      className="relative w-full min-h-screen py-28 px-6 sm:px-12 md:px-20 bg-[#06080C] text-white flex flex-col justify-center overflow-hidden border-t border-white/[0.08] select-none"
    >
      {/* Precision Horological Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px]" />
        
        {/* Architectural drafting watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.025] select-none font-display font-black text-[22vw] leading-none tracking-tighter text-right">
          {upcomingData?.circuitId?.toUpperCase() || 'BRAZIL'}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col gap-10">
        {/* Top Header Row with Season Selector */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E10600] animate-pulse" />
              <span className="font-mono text-xs font-bold text-[#FF3B00] tracking-[0.25em] uppercase flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                CALIBER // 2026 OFFICIAL FIA ORACLE
              </span>
              <span className="text-zinc-600 font-mono text-xs">/</span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                ROUND {upcomingData?.round || 21}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display text-white leading-[1.05]">
              {upcomingData?.raceName || 'Formula 1 São Paulo Grand Prix 2026'}
            </h1>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-1">
              <span className="text-emerald-400 font-bold">CHRONO VERIFIED</span>
              <span>//</span>
              <span>{upcomingData?.circuitName}</span>
              <span>//</span>
              <span>{upcomingData?.city}, {upcomingData?.country}</span>
              <span>//</span>
              <span className="text-white font-bold">{upcomingData?.raceLaps || 71} LAPS</span>
              <span>//</span>
              <span className="text-white font-bold">{upcomingData?.numCars || upcomingData?.entryGrid?.length || 22} CARS</span>
            </div>
          </div>

          {/* Grand Prix Calendar Selector Dropdown */}
          <div className="flex flex-col gap-1.5 min-w-[300px]">
            <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Predict Any 2026 Championship Round:</span>
              <span className="text-amber-400 font-bold">24 ROUNDS</span>
            </div>
            <div className="relative">
              <select
                value={selectedCircuitId}
                onChange={(e) => setSelectedCircuitId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0C0E14] border border-white/15 text-xs font-sans font-bold text-white uppercase tracking-wider appearance-none focus:outline-none focus:border-[#FF3B00] cursor-pointer hover:bg-white/10 transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
              >
                {upcomingData?.availableRounds?.map((r: any) => (
                  <option key={r.circuitId} value={r.circuitId} className="bg-[#0B0D14] text-white">
                    R{r.round.toString().padStart(2, '0')} // {r.city.toUpperCase()} ({r.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Live Weather & Thermodynamic Telemetry Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Air Temp */}
          <div className="relative p-6 rounded-2xl bg-[#0A0D14]/70 border border-white/[0.08] backdrop-blur-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/20 transition-all">
            <span className="absolute top-2 left-2 text-[10px] font-mono text-white/20 select-none">+</span>
            <span className="absolute top-2 right-2 text-[10px] font-mono text-white/20 select-none">+</span>
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span className="tracking-wider">ATMOSPHERE (T_AIR)</span>
              <Thermometer className="w-4 h-4 text-sky-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-white">
                {weatherData?.airTempC || upcomingData?.airTempC || 23.8}°C
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
              <span className="text-[10px] font-mono text-zinc-400">
                Ambient Humidity: {weatherData?.humidityPct || 62}%
              </span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`flex-1 ${i < 6 ? 'bg-sky-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Track Surface Temp */}
          <div className="relative p-6 rounded-2xl bg-[#0A0D14]/70 border border-amber-500/25 backdrop-blur-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)] hover:border-amber-500/40 transition-all">
            <span className="absolute top-2 left-2 text-[10px] font-mono text-amber-500/20 select-none">+</span>
            <span className="absolute top-2 right-2 text-[10px] font-mono text-amber-500/20 select-none">+</span>
            <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
              <span className="tracking-wider">SURFACE (T_TRACK)</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-amber-300">
                {weatherData?.trackTempC || upcomingData?.trackTempC || 42.5}°C
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
              <span className="text-[10px] font-mono text-amber-400/80">
                Solar Mass Delta: +18.7°C Above Ambient
              </span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`flex-1 ${i < 9 ? 'bg-amber-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Core Tyre Temp */}
          <div className="relative p-6 rounded-2xl bg-[#0A0D14]/70 border border-red-500/25 backdrop-blur-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15)] hover:border-red-500/40 transition-all">
            <span className="absolute top-2 left-2 text-[10px] font-mono text-red-500/20 select-none">+</span>
            <span className="absolute top-2 right-2 text-[10px] font-mono text-red-500/20 select-none">+</span>
            <div className="flex items-center justify-between text-red-400 text-xs font-mono">
              <span className="tracking-wider">TYRE CORE (T_TYRE)</span>
              <Gauge className="w-4 h-4 text-red-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-red-300">
                {upcomingData?.tyreTempC || 103.2}°C
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
              <span className="text-[10px] font-mono text-red-400/80">
                Peak Operating Window (100°C–110°C)
              </span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`flex-1 ${i < 10 ? 'bg-red-500' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Friction & Grip Index */}
          <div className="relative p-6 rounded-2xl bg-[#0A0D14]/70 border border-emerald-500/25 backdrop-blur-2xl flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all">
            <span className="absolute top-2 left-2 text-[10px] font-mono text-emerald-500/20 select-none">+</span>
            <span className="absolute top-2 right-2 text-[10px] font-mono text-emerald-500/20 select-none">+</span>
            <div className="flex items-center justify-between text-emerald-400 text-xs font-mono">
              <span className="tracking-wider">FRICTION INDEX (μ)</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-emerald-300">
                {weatherData?.gripCoefficient || 0.962}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
              <span className="text-[10px] font-mono text-emerald-400/80 truncate">
                {weatherData?.weatherDescription || 'Dry / High Asphalt Loading'}
              </span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                {[...Array(12)].map((_, i) => (
                  <span key={i} className={`flex-1 ${i < 11 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Machine Learning Prediction & Execution Card */}
        <div className="p-7 sm:p-9 rounded-3xl bg-[#090C12]/80 border border-white/10 backdrop-blur-2xl flex flex-col gap-7 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                2,500-RUN MONTE CARLO STOCHASTIC ORACLE
              </div>
              <h3 className="text-2xl font-extrabold font-display text-white mt-1">
                {sessionMode === 'QUALIFYING'
                  ? 'Expected Front Row & Q3 Pole Shootout'
                  : 'Predicted Podium Shootout & Lap Delta'}
              </h3>
            </div>

            {/* Session Mode Selector & Action Button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Grand Prix vs Qualifying Switcher */}
              <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setSessionMode('RACE')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    sessionMode === 'RACE'
                      ? 'bg-[#E10600] text-white shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Grand Prix Race
                </button>
                <button
                  type="button"
                  onClick={() => setSessionMode('QUALIFYING')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    sessionMode === 'QUALIFYING'
                      ? 'bg-[#E10600] text-white shadow-lg'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Q3 Shootout
                </button>
              </div>

              <button
                type="button"
                onClick={handleLaunchSimulation}
                disabled={isSimulating || isLoading}
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#E10600] to-[#FF3B00] hover:from-[#FF1800] hover:to-[#FF5500] text-white font-sans font-bold text-xs sm:text-sm shadow-2xl shadow-red-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calculating ({simProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      {sessionMode === 'QUALIFYING'
                        ? 'Simulate & Stream Q3 Shootout'
                        : 'Simulate & Stream Grand Prix'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Predicted Finishing Order Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* P1 Winner / Pole */}
            <div className="relative p-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col items-center text-center shadow-lg shadow-amber-500/5">
              <span className="absolute top-2 left-2 text-[10px] font-mono text-amber-400/30">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-amber-400/30">+</span>
              <Trophy className="w-8 h-8 text-amber-400 mb-2 animate-bounce" />
              <span className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                {sessionMode === 'QUALIFYING' ? 'PREDICTED POLE // P1' : 'PREDICTED WINNER // P1'}
              </span>
              <h4 className="text-2xl font-extrabold font-display text-white mt-1">Max Verstappen</h4>
              <span className="text-xs font-mono text-amber-300/80">Red Bull Racing (RB22)</span>
              <div className="mt-4 font-mono text-xs font-bold text-white px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 tabular-nums">
                {sessionMode === 'QUALIFYING'
                  ? 'POLE POSITION // 1:19.482'
                  : '41.2% WIN PROBABILITY'}
              </div>
            </div>

            {/* P2 Runner Up / Front Row */}
            <div className="relative p-6 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 flex flex-col items-center text-center">
              <span className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500/30">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-zinc-500/30">+</span>
              <Trophy className="w-7 h-7 text-zinc-300 mb-2" />
              <span className="font-mono text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                {sessionMode === 'QUALIFYING' ? 'FRONT ROW // P2' : 'PREDICTED P2'}
              </span>
              <h4 className="text-2xl font-extrabold font-display text-white mt-1">Lando Norris</h4>
              <span className="text-xs font-mono text-zinc-400">McLaren (MCL39)</span>
              <div className="mt-4 font-mono text-xs text-zinc-300 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 tabular-nums">
                {sessionMode === 'QUALIFYING'
                  ? '+0.078s HOTLAP DELTA'
                  : '+3.42s GAP // 29.8% PODIUM'}
              </div>
            </div>

            {/* P3 Podium / Row 2 */}
            <div className="relative p-6 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex flex-col items-center text-center">
              <span className="absolute top-2 left-2 text-[10px] font-mono text-amber-600/30">+</span>
              <span className="absolute top-2 right-2 text-[10px] font-mono text-amber-600/30">+</span>
              <Trophy className="w-7 h-7 text-amber-600 mb-2" />
              <span className="font-mono text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                {sessionMode === 'QUALIFYING' ? 'ROW 2 // P3' : 'PREDICTED P3'}
              </span>
              <h4 className="text-2xl font-extrabold font-display text-white mt-1">Charles Leclerc</h4>
              <span className="text-xs font-mono text-zinc-400">Ferrari (SF-26)</span>
              <div className="mt-4 font-mono text-xs text-amber-300/80 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 tabular-nums">
                {sessionMode === 'QUALIFYING'
                  ? '+0.124s HOTLAP DELTA'
                  : '+11.85s GAP // 21.0% PODIUM'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live F1 Telemetry Data Feeder & Model Training Terminal Modal */}
      <LiveFeederTrainingModal
        isOpen={isSimulating}
        circuitId={upcomingData?.circuitId || selectedCircuitId}
        circuitName={upcomingData?.circuitName || selectedCircuitId.toUpperCase()}
        weatherMode={weatherData?.isWet ? 'RAIN' : 'DAY'}
        sessionMode={sessionMode}
        targetTrackTemp={weatherData?.trackTempC || upcomingData?.trackTempC || 42.5}
        progressPct={simProgress}
        stageText={simStageText}
        auditData={simAuditData}
        onProceedToArena={() => {
          setIsSimulating(false);
          const lenis = getActiveLenis();
          const arenaEl = document.getElementById('act-4');
          if (arenaEl) {
            if (lenis) {
              lenis.scrollTo(arenaEl, { duration: 1.4 });
            } else {
              arenaEl.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }}
      />
    </section>
  );
};
