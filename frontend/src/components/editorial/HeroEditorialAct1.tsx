// frontend/src/components/editorial/HeroEditorialAct1.tsx
/**
 * VELOCE PRO // ACT 1 EDITORIAL HERO & 4-CHAPTER WIND-TUNNEL SCROLLYTELLING
 * McLaren Technology Centre (MTC Woking) Light-Luxury Architectural Language.
 * Eliminates all blank scroll space across 0vh -> 650vh with 4 synchronized chapters.
 * 
 * Synchronized Chapters:
 * 1. 00% - 25% (0vh - 160vh): Monocoque Specification & Interactive Livery Selection
 * 2. 25% - 55% (160vh - 360vh): Computational Fluid Dynamics & Venturi Ground Effect Blueprint
 * 3. 55% - 80% (360vh - 520vh): Thermal Retardation (1,020°C Monza Turn 1) & DRS Actuation
 * 4. 80% - 100% (520vh - 650vh): Warp Propulsion, Full Grid Telemetry & Departure
 */

import React, { useMemo } from 'react';
import {
  Wind,
  Flame,
  Zap,
  ArrowDown,
} from 'lucide-react';
import { useKineticText } from '../../hooks/useKineticText';
import { playAcousticDetent } from '../common/TactileCardPrimitives';
import { getActiveLenis } from '../../utils/motionMasterTicker';

interface HeroEditorialAct1Props {
  activeLivery: string;
  onSelectLivery: (color: string) => void;
  onJumpToSimulation: () => void;
  scrollProgress?: number; // 0.0 to 1.0 across full 2,100vh master runway
}

const LIVERY_OPTIONS = [
  { name: 'Ferrari', code: 'SF-24', color: '#E8002D', label: 'Rosso Corsa' },
  { name: 'Red Bull', code: 'RB20', color: '#1E41FF', label: 'Navy' },
  { name: 'McLaren', code: 'MCL38', color: '#FF8000', label: 'Papaya' },
  { name: 'Mercedes', code: 'W15', color: '#00D2BE', label: 'Silver Teal' },
  { name: 'Cadillac', code: 'CAD26', color: '#C5A059', label: 'Cadillac Gold' },
];

export const HeroEditorialAct1: React.FC<HeroEditorialAct1Props> = ({
  activeLivery,
  onSelectLivery,
  onJumpToSimulation,
  scrollProgress = 0,
}) => {
  // Normalize scrollProgress across the 0vh -> 650vh Act 1 domain (0.0 to 0.3095 of 2,100vh)
  const act1Progress = useMemo(() => {
    return Math.min(1.0, Math.max(0.0, scrollProgress / 0.3095));
  }, [scrollProgress]);

  // Determine active chapter based on normalized progress
  const currentChapter = useMemo(() => {
    if (act1Progress < 0.25) return 1;
    if (act1Progress < 0.55) return 2;
    if (act1Progress < 0.82) return 3;
    return 4;
  }, [act1Progress]);

  // Optical kinetic headline reveal for Chapter 1
  const headlineRef = useKineticText<HTMLHeadingElement>({
    mode: 'chars',
    stagger: 0.02,
    duration: 0.9,
    yOffset: 36,
    blurPx: 12,
    enableVelocitySkew: true,
    maxSkewDeg: 2.5,
  });

  const handleLiveryClick = (color: string) => {
    playAcousticDetent(1250);
    onSelectLivery(color);
  };

  return (
    <section
      id="act-1"
      className="relative w-full h-full flex flex-col justify-between pt-24 pb-12 px-6 sm:px-12 md:px-20 overflow-hidden select-none"
    >
      {/* Background Watermark Telemetry (Dynamic based on Chapter) */}
      <div
        className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-[1] whitespace-nowrap opacity-[0.035] transition-opacity duration-700"
        aria-hidden="true"
      >
        <span className="font-display text-[16vw] font-extrabold tracking-tighter text-[#111215] leading-none">
          {currentChapter === 1 && 'MONZA · 352 KM/H'}
          {currentChapter === 2 && 'AERODYNAMICS · -4.82 kPa'}
          {currentChapter === 3 && 'THERMAL · 1,020°C'}
          {currentChapter === 4 && 'DEPARTURE · 1,000+ BHP'}
        </span>
      </div>

      {/* Chapter Milestone Rail (Left Border) */}
      <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-20">
        {[
          { id: 1, label: '01 SPECIFICATION' },
          { id: 2, label: '02 COMPUTATIONAL AERO' },
          { id: 3, label: '03 THERMAL RETARDATION' },
          { id: 4, label: '04 LAUNCH PROTOCOL' },
        ].map((ch) => (
          <div
            key={ch.id}
            className="flex items-center gap-2.5 transition-all duration-300"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                currentChapter === ch.id
                  ? 'bg-[#111215] scale-150 shadow-sm'
                  : 'bg-[#C8BFAC] opacity-60'
              }`}
            />
            <span
              className={`text-[9.5px] font-mono tracking-widest transition-colors duration-300 ${
                currentChapter === ch.id
                  ? 'text-[#111215] font-bold'
                  : 'text-[#8C8F98] opacity-70'
              }`}
            >
              {ch.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main Editorial Content Container (Strictly left column, 0% overlap with 3D Car in right column) */}
      <div className="relative z-20 max-w-[490px] ml-0 lg:ml-10 mt-2 flex-1 flex flex-col justify-center overflow-visible">
        {/* ================================================================= */}
        {/* CHAPTER 1: SPECIFICATION & HERO (0.00 to 0.25)                   */}
        {/* ================================================================= */}
        <div
          className={`transition-all duration-500 flex flex-col p-6 sm:p-7 rounded-3xl bg-[#FAF9F6]/88 backdrop-blur-xl border border-[#E5E2DA] shadow-[0_20px_50px_rgba(0,0,0,0.04)] ${
            currentChapter === 1
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-4 pointer-events-none absolute'
          }`}
        >
          {/* Section Kicker */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E5E2DA] mb-4 shadow-sm w-fit backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#D43811] animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1F2228]">
              01 · MCLAREN TECHNOLOGY CENTRE SPECIFICATION
            </span>
          </div>

          {/* Kinetic Display Headline */}
          <h1
            ref={headlineRef}
            aria-label="WHERE MILLISECONDS Become Inevitable."
            className="text-4xl sm:text-5xl md:text-[3.8rem] font-extrabold leading-[0.98] tracking-tight text-[#111215] mb-4 font-display overflow-visible select-none"
          >
            WHERE <br />
            MILLISECONDS <br />
            <span className="font-editorial italic font-normal text-[#D43811]">
              Become Inevitable.
            </span>
          </h1>

          {/* Subtitle with High-Contrast Deep Graphite Typography */}
          <p className="font-sans text-sm sm:text-[15px] font-normal text-[#1F2228] leading-relaxed max-w-[440px] mb-5">
            Synthesizing sub-meter FIA sensor streams with 5,000-run Monte Carlo machine learning.
            We map every apex braking marker, tire thermal cliff, and pit-lane undercut before the lights go green.
          </p>

          {/* Interactive Livery Selector Pills */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#5C6068]">
              Tactile Livery Selection:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {LIVERY_OPTIONS.map((liv) => {
                const isSelected = activeLivery.toLowerCase() === liv.color.toLowerCase();
                return (
                  <button
                    key={liv.name}
                    onClick={() => handleLiveryClick(liv.color)}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? 'bg-[#111215] text-[#FAF9F6] border-[#111215] shadow-md scale-105'
                        : 'bg-white text-[#111215] border-[#D8D4CA] hover:border-[#111215] shadow-sm'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 border border-black/10"
                      style={{ backgroundColor: liv.color }}
                    />
                    <span>{liv.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">({liv.code})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CHAPTER 2: COMPUTATIONAL FLUID DYNAMICS & AERO (0.25 to 0.55)    */}
        {/* ================================================================= */}
        <div
          className={`transition-all duration-500 flex flex-col p-6 sm:p-7 rounded-3xl bg-[#FAF9F6]/88 backdrop-blur-xl border border-[#E5E2DA] shadow-[0_20px_50px_rgba(0,0,0,0.04)] ${
            currentChapter === 2
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none absolute'
          }`}
        >
          {/* Section Kicker */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E5E2DA] mb-4 shadow-sm w-fit backdrop-blur-md">
            <Wind className="w-3.5 h-3.5 text-[#0284C7]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1F2228]">
              02 · GROUND EFFECT & VENTURI AERODYNAMICS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight text-[#111215] mb-4 font-display">
            Sculpting the <br />
            <span className="font-editorial italic font-normal text-[#0284C7]">
              Invisible Airflow.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#1F2228] leading-relaxed max-w-[440px] mb-5">
            Twin Venturi floor channels generate 68% of total downforce without trailing turbulence.
            Laminar flow streamlines accelerate through an 18mm throat, drawing the monocoque toward the tarmac.
          </p>

          {/* 2.5D Aerodynamic Vector Diagram */}
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E5E2DA] shadow-sm mb-4 max-w-[440px]">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#111215] mb-2.5">
              <span>VENTURI PRESSURE PROFILE</span>
              <span className="text-[#0284C7]">-4.82 kPa THROAT DEPRESSION</span>
            </div>
            {/* SVG Pressure Gradient Sparkline */}
            <svg viewBox="0 0 420 54" className="w-full h-12 overflow-visible">
              <defs>
                <linearGradient id="aeroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E5E2DA" />
                  <stop offset="45%" stopColor="#0284C7" />
                  <stop offset="65%" stopColor="#D43811" />
                  <stop offset="100%" stopColor="#E5E2DA" />
                </linearGradient>
              </defs>
              <path
                d="M 10 38 Q 90 38, 140 46 T 220 12 T 310 42 T 410 38"
                fill="none"
                stroke="url(#aeroGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="220" cy="12" r="3.5" fill="#D43811" stroke="#FAF9F6" strokeWidth="1.5" />
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8F98] mt-1.5">
              <span>FRONT WING INTAKE</span>
              <span>18mm THROAT MIN</span>
              <span>DIFFUSER EXPANSION</span>
            </div>
          </div>

          {/* Key Aero Metrics */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[440px]">
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E2DA]">
              <span className="block text-[10px] font-mono text-[#8C8F98]">PEAK DOWNFORCE</span>
              <span className="text-base font-numeric font-bold text-[#111215]">1,840 kg</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E2DA]">
              <span className="block text-[10px] font-mono text-[#8C8F98]">EFFICIENCY RATIO</span>
              <span className="text-base font-numeric font-bold text-[#0284C7]">3.42 L/D</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E2DA]">
              <span className="block text-[10px] font-mono text-[#8C8F98]">VORTEX SHEDDING</span>
              <span className="text-base font-numeric font-bold text-[#111215]">142 Hz</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CHAPTER 3: THERMAL RETARDATION & DRS (0.55 to 0.82)              */}
        {/* ================================================================= */}
        <div
          className={`transition-all duration-500 flex flex-col p-6 sm:p-7 rounded-3xl bg-[#FAF9F6]/88 backdrop-blur-xl border border-[#E5E2DA] shadow-[0_20px_50px_rgba(0,0,0,0.04)] ${
            currentChapter === 3
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none absolute'
          }`}
        >
          {/* Section Kicker */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E5E2DA] mb-4 shadow-sm w-fit backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-[#D43811]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1F2228]">
              03 · THERMAL BRAKING & DRS SPEEDSTREAM
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight text-[#111215] mb-4 font-display">
            Decelerating From <br />
            <span className="font-editorial italic font-normal text-[#D43811]">
              352 to 70 km/h.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#1F2228] leading-relaxed max-w-[440px] mb-5">
            Into Monza Variante del Rettifilo, carbon-ceramic discs experience 5.2G peak deceleration,
            reaching 1,020°C in 2.1 seconds. DRS hydraulic actuators reduce profile drag by 38% along the main straight.
          </p>

          {/* Thermal Telemetry Card */}
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E5E2DA] shadow-sm mb-4 max-w-[440px]">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#111215] mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D43811] animate-ping" />
                <span>BREMBO CARBON-CARBON THERMAL SPIKE</span>
              </span>
              <span className="text-[#D43811] font-numeric font-bold">1,020°C</span>
            </div>
            {/* Thermal Decay Curve */}
            <svg viewBox="0 0 420 48" className="w-full h-11 overflow-visible">
              <path
                d="M 10 40 L 90 40 Q 140 8, 170 6 T 250 28 T 410 38"
                fill="none"
                stroke="#D43811"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="170" cy="6" r="3.5" fill="#D43811" stroke="#FAF9F6" strokeWidth="1.5" />
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8F98] mt-1.5">
              <span>APPROACH 352 KM/H</span>
              <span>APEX 70 KM/H</span>
              <span>EXIT ACCELERATION</span>
            </div>
          </div>

          {/* DRS State & Energy Callout */}
          <div className="flex items-center gap-3 max-w-[440px]">
            <div className="flex-1 p-2.5 rounded-xl bg-white/80 border border-[#E5E2DA] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8C8F98]">DRS WING ACTUATOR</span>
              <span className="text-xs font-mono font-bold text-[#2E5339] px-2 py-0.5 rounded-full bg-[#EBF4EE] border border-[#2E5339]/20">
                OPEN · ACTIVE
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E2DA]">
              <span className="block text-[10px] font-mono text-[#8C8F98]">PEAK RETARDATION</span>
              <span className="text-base font-numeric font-bold text-[#111215]">5.2G</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CHAPTER 4: LAUNCH PROTOCOL & DEPARTURE (0.82 to 1.00)            */}
        {/* ================================================================= */}
        <div
          className={`transition-all duration-500 flex flex-col p-6 sm:p-7 rounded-3xl bg-[#FAF9F6]/88 backdrop-blur-xl border border-[#E5E2DA] shadow-[0_20px_50px_rgba(0,0,0,0.04)] ${
            currentChapter === 4
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none absolute'
          }`}
        >
          {/* Section Kicker */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E5E2DA] mb-4 shadow-sm w-fit backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-[#111215]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1F2228]">
              04 · PROPULSION MATRIX & LAUNCH PROTOCOL
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight text-[#111215] mb-4 font-display">
            Unleashing 1,000+ <br />
            <span className="font-editorial italic font-normal text-[#111215]">
              Hybrid Horsepower.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#1F2228] leading-relaxed max-w-[440px] mb-5">
            MGU-K 350kW kinetic vectoring combined with 1.6L turbocharged internal combustion engine.
            The wind tunnel opens its acoustic louvers — the monocoque launches directly into the 2026 Championship Oracle.
          </p>

          {/* Launch Telemetry Status Card */}
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E5E2DA] shadow-sm mb-5 max-w-[440px]">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#111215] mb-2.5">
              <span>SYSTEM READY FOR DEPARTURE</span>
              <span className="text-[#2E5339] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E5339] animate-pulse" />
                NOMINAL
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 rounded-full bg-[#E5E2DA] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0284C7] via-[#D43811] to-[#2E5339] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, (scrollProgress / 0.30) * 100))}%` }}
                />
              </div>
              <span className="text-[11px] font-numeric font-bold text-[#111215]">
                {Math.round(Math.min(100, (scrollProgress / 0.30) * 100))}%
              </span>
            </div>
            <div className="space-y-1.5 text-[10px] font-mono text-[#5C6068] pt-2 border-t border-[#E5E2DA]/60">
              <div className="flex justify-between">
                <span>CATMULL-ROM SPLINE:</span>
                <span className="text-[#111215] font-bold">24 CANONICAL TRACKS</span>
              </div>
              <div className="flex justify-between">
                <span>DYNAMIC FIA GRID:</span>
                <span className="text-[#111215] font-bold">22 DRIVERS · CADILLAC ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>KINEMATICS DEAD-RECKONING:</span>
                <span className="text-[#111215] font-bold">HERMITE CUBIC 120 FPS</span>
              </div>
            </div>
          </div>

          {/* Scroll Down Trigger Button */}
          <button
            onClick={() => {
              onJumpToSimulation();
              const lenis = getActiveLenis();
              const act2El = document.getElementById('act-2');
              if (act2El) {
                if (lenis) lenis.scrollTo(act2El, { duration: 1.4 });
                else act2El.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center justify-between px-6 py-3.5 rounded-full bg-[#111215] text-white font-mono text-xs font-bold tracking-wider uppercase shadow-md hover:bg-[#252830] transition-all duration-300 max-w-[440px] group cursor-pointer"
          >
            <span>ENTER 2026 CHAMPIONSHIP ORACLE</span>
            <ArrowDown className="w-4 h-4 text-[#C8BFAC] group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer Specification Strip (Always visible across all chapters) */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#E5E2DA] max-w-5xl">
        <div className="flex items-center gap-6 text-[11px] font-mono text-[#8C8F98]">
          <span>MONOCOQUE MASS: 798 KG</span>
          <span>·</span>
          <span>TRACK RESOLUTION: 1.0 METER</span>
          <span>·</span>
          <span>MAX VELOCITY: 352.4 KM/H</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#5C6068]">
          <span>SCROLL TO ADVANCE TUNNEL TOUR</span>
          <ArrowDown className="w-3.5 h-3.5 text-[#D43811] animate-bounce" />
        </div>
      </div>
    </section>
  );
};
