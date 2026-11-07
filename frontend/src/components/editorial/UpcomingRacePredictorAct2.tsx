// frontend/src/components/editorial/UpcomingRacePredictorAct2.tsx
/**
 * VELOCE // ACT 2: 2026 OFFICIAL CHAMPIONSHIP UPCOMING GP ORACLE
 * Light-Luxury Editorial Architecture (McLaren MTC & Haute Horlogerie Standard)
 * 4-Layer Z-Parallax Depth Stage (650vh - 1,200vh):
 *   - Layer 1 (0.30x): Typographic watermark & telemetry micro-mesh
 *   - Layer 2 (0.70x): Bespoke 2.5D vector circuit topography (contours, sector splits, DRS trap)
 *   - Layer 3 (1.00x): Editorial narrative & 24-circuit architectural ribbon
 *   - Layer 4 (1.25x): Floating frosted quartz chronometers & predicted podium ranking card
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, Sparkles, Trophy, Compass, Layers } from 'lucide-react';

import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { getActiveLenis } from '../../utils/motionMasterTicker';
import { getAll24Circuits } from '../../utils/fiaCircuitsDatabase';
import { CircuitTopographySvg } from './CircuitTopographySvg';
import { HorologicalChronometer } from './HorologicalChronometer';
import { LiveFeederTrainingModal, type FeederAuditData } from '../modals/LiveFeederTrainingModal';

gsap.registerPlugin(ScrollTrigger);

export const UpcomingRacePredictorAct2: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layer1WatermarkRef = useRef<HTMLDivElement>(null);
  const layer2TopographyRef = useRef<HTMLDivElement>(null);
  const layer4DialsRef = useRef<HTMLDivElement>(null);

  // Telemetry & Circuit state
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

  const allCircuits = useMemo(() => getAll24Circuits(), []);
  const activeCircuitMeta = useMemo(
    () => allCircuits.find((c) => c.id === selectedCircuitId) || allCircuits[20],
    [allCircuits, selectedCircuitId]
  );

  // Load backend context on circuit selection
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const raceRes = await fetch(`http://127.0.0.1:8000/api/v1/live/upcoming-race?circuit_id=${selectedCircuitId}`);
        const raceJson = await raceRes.json();
        if (!isMounted) return;
        setUpcomingData(raceJson);

        const weatherRes = await fetch(`http://127.0.0.1:8000/api/v1/live/weather/${selectedCircuitId}`);
        const weatherJson = await weatherRes.json();
        if (!isMounted) return;
        setWeatherData(weatherJson);
      } catch (err) {
        console.error('Failed to load upcoming race context:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [selectedCircuitId]);

  // GSAP 4-Layer Z-Parallax Timeline Configuration
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Layer 1: Watermark & Telemetry Micro-Mesh (0.30x Rate)
      if (layer1WatermarkRef.current) {
        gsap.to(layer1WatermarkRef.current, {
          yPercent: -28,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // Layer 2: 2.5D Vector Topography (0.70x Rate)
      if (layer2TopographyRef.current) {
        gsap.to(layer2TopographyRef.current, {
          yPercent: -14,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // Layer 4: Floating Near-Field Chronometer Dials (1.25x Rate)
      if (layer4DialsRef.current) {
        gsap.to(layer4DialsRef.current, {
          yPercent: 16,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
      // Real-time ScrollTrigger Entrance Reveals
      gsap.from('.act2-header-anim', {
        y: 35,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
        },
      });

      gsap.from('.act2-card-anim', {
        y: 45,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.act2-card-anim',
          start: 'top 85%',
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  // Heavy Simulation Execution
  const handleLaunchSimulation = async () => {
    if (!activeCircuitMeta) return;
    try {
      terminateSimulation();
      setIsSimulating(true);
      setSimProgress(12);
      setSimStageText('STAGE 1/4 · CALIBRATING HIGH-RES SATELLITE GPS & SÃO PAULO BASIN MICROCLIMATE...');

      await new Promise((r) => setTimeout(r, 650));
      setSimProgress(38);
      setSimStageText('STAGE 2/4 · SOLVING 2,500 MONTE CARLO PROBABILITY ENVELOPES...');

      const postBody = {
        circuit_id: activeCircuitMeta.id,
        session_mode: sessionMode,
        total_laps: sessionMode === 'QUALIFYING' ? 3 : activeCircuitMeta.raceLaps,
        drivers: upcomingData?.entryGrid || [],
        weather_mode: weatherData?.isWet ? 'RAIN' : 'DAY',
        safety_car_prob: sessionMode === 'QUALIFYING' ? 0.0 : 0.85,
      };

      const simPromise = fetch('http://127.0.0.1:8000/api/v1/simulate/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });

      await new Promise((r) => setTimeout(r, 850));
      setSimProgress(75);
      setSimStageText('STAGE 3/4 · COMPENSATING GOMPERTZ THERMAL CLIFFS & DIRTY AIR WAKE MATRICES...');

      await new Promise((r) => setTimeout(r, 700));
      setSimProgress(92);
      setSimStageText('STAGE 4/4 · SYNTHESIZING VSTM-v1 MICRO-SPATIAL TRAJECTORIES...');

      const resp = await simPromise;
      const vstmPayload = await resp.json();

      if (vstmPayload?.feederAudit) setSimAuditData(vstmPayload.feederAudit);

      setSimProgress(100);
      setSimStageText('CALIBRATION COMPLETE · 22-CAR GRID TELEMETRY READY');

      setSimulationPayload(vstmPayload);
      setActiveWeatherMode(weatherData?.isWet ? 'RAIN' : 'DAY');
    } catch (err) {
      console.error('Simulation error:', err);
      setIsSimulating(false);
      setSimProgress(0);
    }
  };

  return (
    <section
      id="act-2"
      ref={containerRef}
      className="relative w-full min-h-screen py-32 px-6 sm:px-12 md:px-20 bg-[#F7F5F0] text-[#111215] flex flex-col justify-center overflow-hidden select-none"
    >
      {/* ==================================================================== */}
      {/* LAYER 1 (Depth 0.30x): TYPOGRAPHIC WATERMARK & TELEMETRY MICRO-MESH  */}
      {/* ==================================================================== */}
      <div
        ref={layer1WatermarkRef}
        className="absolute inset-0 pointer-events-none overflow-hidden will-change-transform z-[1]"
      >
        {/* Architectural drafting micro-mesh */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(#111215 1px, transparent 1px), linear-gradient(90deg, #111215 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Giant architectural typographic watermark */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.038] select-none font-display font-black text-[22vw] leading-none tracking-tighter text-right text-[#111215]">
          {activeCircuitMeta.city.toUpperCase()}
        </div>

        {/* Ambient Topographical Compass Coordinates */}
        <div className="absolute bottom-12 left-12 flex items-center gap-3 text-[10px] font-mono text-[#8C8F98] uppercase tracking-[0.25em]">
          <Compass className="w-3.5 h-3.5" />
          <span>LAT 23° 42' 04" S · LON 46° 41' 50" W · ELEVATION 786M MSL</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LAYER 3 (Depth 1.00x): EDITORIAL NARRATIVE & MASTER ASYMMETRIC GRID  */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto w-full relative z-20 flex flex-col gap-12">
        {/* Top Header Row: FIA Round Kicker & Master Title */}
        <div className="act2-header-anim flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#E5E2DA] pb-8">
          <div className="flex flex-col gap-2.5 max-w-3xl">
            <div className="flex items-center gap-2.5 text-xs font-sans tracking-[0.22em] uppercase font-bold text-[#5C6068]">
              <span className="w-2 h-2 rounded-full bg-[#FF4D2D]" />
              <span>Round {activeCircuitMeta.round} · Official FIA Championship Oracle</span>
              <span className="text-[#C8A97E]">·</span>
              <span className="font-mono text-[#111215]">{activeCircuitMeta.raceLaps} Laps</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display text-[#111215] leading-[1.05]">
              {activeCircuitMeta.name}
            </h1>

            <p className="text-sm sm:text-base text-[#5C6068] font-sans leading-relaxed max-w-2xl mt-1">
              Autonomous microclimate calibration across 71 laps. The physics-informed neural oracle synthesizes
              surface friction coefficients, aerodynamic ground-effect stagnation, and solar thermal mass in real time.
            </p>
          </div>

          {/* Session Switcher (Grand Prix Race vs Q3 Pole Shootout) */}
          <div className="flex items-center p-1.5 rounded-full bg-[#F2F0EB] border border-[#E5E2DA] shadow-inner">
            <button
              type="button"
              onClick={() => setSessionMode('RACE')}
              className={`px-5 py-2 rounded-full text-xs font-sans font-bold tracking-wider uppercase transition-all ${
                sessionMode === 'RACE'
                  ? 'bg-[#111215] text-[#FAF9F6] shadow-md'
                  : 'text-[#5C6068] hover:text-[#111215]'
              }`}
            >
              Grand Prix Race
            </button>
            <button
              type="button"
              onClick={() => setSessionMode('QUALIFYING')}
              className={`px-5 py-2 rounded-full text-xs font-sans font-bold tracking-wider uppercase transition-all ${
                sessionMode === 'QUALIFYING'
                  ? 'bg-[#111215] text-[#FAF9F6] shadow-md'
                  : 'text-[#5C6068] hover:text-[#111215]'
              }`}
            >
              Q3 Shootout
            </button>
          </div>
        </div>

        {/* Asymmetric 60/40 Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==================================================================== */}
          {/* LAYER 2 (Depth 0.70x): BESPOKE 2.5D VECTOR CIRCUIT TOPOGRAPHY       */}
          {/* ==================================================================== */}
          <div className="act2-card-anim lg:col-span-7 flex flex-col justify-between p-8 sm:p-10 rounded-3xl bg-[rgba(242,240,235,0.78)] backdrop-blur-2xl border border-[rgba(229,226,218,0.95)] shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.85),0_12px_36px_-6px_rgba(17,18,21,0.035)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E2DA] pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C8A97E]" />
                <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#5C6068]">
                  2.5D Elevation Ridge · {activeCircuitMeta.city}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#111215]">
                Δ {activeCircuitMeta.elevationChangeM} Meters
              </span>
            </div>

            {/* Embedded 2.5D Topographic Artwork */}
            <div ref={layer2TopographyRef} className="my-2 will-change-transform">
              <CircuitTopographySvg circuitId={selectedCircuitId} showContours={true} />
            </div>

            {/* Architectural 24-Circuit Selector Ribbon */}
            <div className="mt-6 pt-4 border-t border-[#E5E2DA] flex flex-col gap-2.5">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C8F98]">
                Championship Calendar · Select Round (1 – 24)
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {allCircuits.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCircuitId(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-sans font-bold transition-all whitespace-nowrap ${
                      selectedCircuitId === c.id
                        ? 'bg-[#111215] text-[#FAF9F6] shadow-sm'
                        : 'bg-white/70 text-[#5C6068] border border-[#E5E2DA] hover:border-[#111215]'
                    }`}
                  >
                    R{c.round.toString().padStart(2, '0')} · {c.city}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* LAYER 4 (Depth 1.25x): FLOATING FROSTED QUARTZ CHRONOMETERS & HUD   */}
          {/* ==================================================================== */}
          <div ref={layer4DialsRef} className="act2-card-anim lg:col-span-5 flex flex-col gap-4 will-change-transform">
            {/* Chronometer 1: Atmosphere (T_Air) */}
            <HorologicalChronometer
              label="Atmosphere (T_Air)"
              sublabel="Microclimate"
              value={weatherData?.airTempC || 23.8}
              unit="°C"
              progressPct={54}
              accentColor="#4A6B82"
              secondaryInfo={`Ambient Humidity: ${weatherData?.humidityPct || 62}% · Barometric 1,014 hPa`}
              statusTag="ACTIVE"
            />

            {/* Chronometer 2: Surface Thermodynamics (T_Track) */}
            <HorologicalChronometer
              label="Surface (T_Track)"
              sublabel="Thermodynamics"
              value={weatherData?.trackTempC || 42.5}
              unit="°C"
              progressPct={72}
              accentColor="#C8A97E"
              secondaryInfo="Solar Mass Absorption Delta: +18.7°C"
              statusTag="ACTIVE"
            />

            {/* Chronometer 3: Tyre Core (T_Tyre) */}
            <HorologicalChronometer
              label="Tyre Core (T_Tyre)"
              sublabel="Gompertz Window"
              value={upcomingData?.tyreTempC || 103.2}
              unit="°C"
              progressPct={82}
              accentColor="#FF4D2D"
              secondaryInfo="Optimal Working Envelope (100°C – 110°C)"
              statusTag="PEAK"
            />

            {/* Chronometer 4: Dynamic Friction Index (μ) */}
            <HorologicalChronometer
              label="Friction Index (μ)"
              sublabel="Kinematic Adhesion"
              value={weatherData?.gripCoefficient || 0.962}
              progressPct={88}
              accentColor="#2E5339"
              secondaryInfo={weatherData?.weatherDescription || 'High Asphalt Lateral Loading · Dry'}
              statusTag="OPTIMAL"
            />

            {/* Execute Simulation Callout */}
            <div className="p-6 rounded-3xl bg-[rgba(255,255,255,0.85)] border border-[#E5E2DA] shadow-sm flex items-center justify-between mt-2">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#C8A97E] block mb-1">
                  Neural Oracle
                </span>
                <span className="text-base font-extrabold text-[#111215] block">
                  Run 2,500 Monte Carlo Paths
                </span>
              </div>

              <button
                type="button"
                onClick={handleLaunchSimulation}
                disabled={isSimulating || isLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#111215] hover:bg-[#252830] text-[#FAF9F6] text-xs font-sans font-bold tracking-wider uppercase shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-[#FAF9F6]" />
                <span>Simulate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Predicted Podium / Front Row Shootout Card (Layer 4) */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[rgba(242,240,235,0.82)] backdrop-blur-2xl border border-[rgba(229,226,218,0.95)] shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.85),0_16px_40px_-8px_rgba(17,18,21,0.04)] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DA] pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-sans font-bold text-[#C8A97E] tracking-[0.2em] uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Stochastic Model Consensus</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-[#111215]">
                {sessionMode === 'QUALIFYING' ? 'Expected Front Row & Pole Delta' : 'Predicted Podium Order'}
              </h3>
            </div>
            <span className="text-xs font-mono text-[#8C8F98]">
              CONFIDENCE SCORE: 94.8% · RB22 / MCL39 DYNAMICS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* P1 Winner */}
            <div className="p-6 rounded-2xl bg-white/70 border border-[#C8A97E]/40 flex flex-col items-center text-center shadow-sm">
              <Trophy className="w-7 h-7 text-[#C8A97E] mb-2" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C8A97E]">
                {sessionMode === 'QUALIFYING' ? 'POLE POSITION · P1' : 'PREDICTED WINNER · P1'}
              </span>
              <h4 className="text-xl font-extrabold font-display text-[#111215] mt-1">Max Verstappen</h4>
              <span className="text-xs font-mono text-[#5C6068]">Red Bull Racing</span>
              <div className="mt-3 text-xs font-mono font-bold text-[#111215] px-4 py-1.5 rounded-full bg-[#C8A97E]/15 border border-[#C8A97E]/30">
                {sessionMode === 'QUALIFYING' ? '1:19.482 · POLE' : '41.2% WIN PROBABILITY'}
              </div>
            </div>

            {/* P2 Runner Up */}
            <div className="p-6 rounded-2xl bg-white/70 border border-[#E5E2DA] flex flex-col items-center text-center shadow-sm">
              <Trophy className="w-6 h-6 text-[#8C8F98] mb-2" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C8F98]">
                {sessionMode === 'QUALIFYING' ? 'FRONT ROW · P2' : 'PREDICTED P2'}
              </span>
              <h4 className="text-xl font-extrabold font-display text-[#111215] mt-1">Lando Norris</h4>
              <span className="text-xs font-mono text-[#5C6068]">McLaren</span>
              <div className="mt-3 text-xs font-mono font-bold text-[#5C6068] px-4 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E5E2DA]">
                {sessionMode === 'QUALIFYING' ? '+0.078s HOTLAP DELTA' : '+3.42s GAP · 29.8% PODIUM'}
              </div>
            </div>

            {/* P3 Podium */}
            <div className="p-6 rounded-2xl bg-white/70 border border-[#E5E2DA] flex flex-col items-center text-center shadow-sm">
              <Trophy className="w-6 h-6 text-[#8A7D65] mb-2" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8A7D65]">
                {sessionMode === 'QUALIFYING' ? 'ROW 2 · P3' : 'PREDICTED P3'}
              </span>
              <h4 className="text-xl font-extrabold font-display text-[#111215] mt-1">Charles Leclerc</h4>
              <span className="text-xs font-mono text-[#5C6068]">Ferrari</span>
              <div className="mt-3 text-xs font-mono font-bold text-[#5C6068] px-4 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E5E2DA]">
                {sessionMode === 'QUALIFYING' ? '+0.124s HOTLAP DELTA' : '+11.85s GAP · 21.0% PODIUM'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live F1 Telemetry Data Feeder & Model Training Terminal Modal */}
      <LiveFeederTrainingModal
        isOpen={isSimulating}
        circuitId={selectedCircuitId}
        circuitName={activeCircuitMeta.name}
        weatherMode={weatherData?.isWet ? 'RAIN' : 'DAY'}
        sessionMode={sessionMode}
        targetTrackTemp={weatherData?.trackTempC || 42.5}
        progressPct={simProgress}
        stageText={simStageText}
        auditData={simAuditData}
        onProceedToArena={() => {
          setIsSimulating(false);
          const lenis = getActiveLenis();
          const arenaEl = document.getElementById('act-4');
          if (arenaEl) {
            if (lenis) lenis.scrollTo(arenaEl, { duration: 1.4 });
            else arenaEl.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />
    </section>
  );
};
