// frontend/src/components/editorial/HeroEditorialAct1.tsx
import React from 'react';
import { ChevronDown, Compass } from 'lucide-react';

interface HeroEditorialAct1Props {
  activeLivery: string;
  onSelectLivery: (color: string) => void;
  onJumpToSimulation: () => void;
}

const LIVERY_OPTIONS = [
  { name: 'McLaren', code: 'MCL38', color: '#FF8000', label: 'Papaya' },
  { name: 'Red Bull', code: 'RB20', color: '#1E41FF', label: 'Navy' },
  { name: 'Ferrari', code: 'SF-24', color: '#E8002D', label: 'Rosso Corsa' },
  { name: 'Mercedes', code: 'W15', color: '#00D2BE', label: 'Silver Teal' },
];

export const HeroEditorialAct1: React.FC<HeroEditorialAct1Props> = ({
  activeLivery,
  onSelectLivery,
  onJumpToSimulation,
}) => {
  return (
    <section className="relative w-full min-h-[140vh] flex flex-col justify-between pt-24 pb-16 px-6 sm:px-12 md:px-20 overflow-hidden">
      {/* Layer 0: Giant Parallax Watermark Display Typography */}
      <div
        className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-[1] whitespace-nowrap opacity-25"
        aria-hidden="true"
      >
        <span className="font-display text-[15vw] font-extrabold tracking-tighter text-[#D8D4CA] leading-none">
          MONZA // 352 KM/H
        </span>
      </div>

      {/* Layer 2: Main Editorial Hero Narrative */}
      <div className="relative z-20 max-w-4xl mt-8">
        {/* Section Kicker */}
        <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#EAE7DF] border border-[rgba(15,16,18,0.08)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#FF3B00] animate-pulse" />
          <span className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-[#7A7E85]">
            01 — FORMULA 1 TELEMETRY & PREDICTIVE AI
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="font-display font-extrabold text-[clamp(2.8rem,7.5vw,7.8rem)] text-[#0F1012] leading-[0.92] tracking-tight mb-8">
          WHERE MILLISECONDS <br />
          <span className="font-editorial italic font-normal text-[#FF3B00]">
            Become Inevitable.
          </span>
        </h1>

        {/* Editorial Subtitle */}
        <p className="font-sans text-base sm:text-lg text-[#555962] leading-relaxed max-w-[50ch] mb-10">
          Synthesizing sub-meter FIA telemetry arrays with 5,000-run Monte Carlo machine learning.
          We map every apex braking marker, tire thermal cliff, and pit-lane undercut before the lights go green.
        </p>

        {/* Interactive Livery Selector Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-12">
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#7A7E85]">
            Select Livery:
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {LIVERY_OPTIONS.map((liv) => {
              const isSelected = activeLivery.toLowerCase() === liv.color.toLowerCase();
              return (
                <button
                  key={liv.name}
                  onClick={() => onSelectLivery(liv.color)}
                  className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                    isSelected
                      ? 'bg-[#0F1012] text-[#F7F6F2] border-[#0F1012] shadow-md'
                      : 'bg-[#F4F2ED] text-[#0F1012] border-[rgba(15,16,18,0.15)] hover:border-[#0F1012]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
                    style={{ backgroundColor: liv.color }}
                  />
                  <span>{liv.name}</span>
                  <span className="text-[10px] opacity-60">({liv.code})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onJumpToSimulation}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#0F1012] text-[#F4F2ED] font-sans text-sm font-semibold tracking-wide hover:bg-[#FF3B00] transition-colors duration-200 shadow-lg"
          >
            <Compass className="w-4 h-4" />
            <span>Jump to 3D Race Simulation ↓</span>
          </button>

          <a
            href="#act-2"
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/70 backdrop-blur-md text-[#0F1012] border border-[rgba(15,16,18,0.12)] font-sans text-sm font-medium hover:bg-white transition-all"
          >
            <span>Explore The Machine</span>
            <ChevronDown className="w-4 h-4 text-[#7A7E85]" />
          </a>
        </div>
      </div>

      {/* Hero Bottom Telemetry Highlights Strip */}
      <div className="relative z-20 grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-[rgba(15,16,18,0.1)] mt-16 max-w-5xl">
        <div>
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Track Benchmark
          </span>
          <span className="font-numeric text-2xl font-bold text-[#0F1012]">
            1:19.311
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Monza Q3 Pole (VER)</span>
        </div>

        <div>
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Spatial Resolution
          </span>
          <span className="font-numeric text-2xl font-bold text-[#0F1012]">
            1.0 Meter
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Canonical 5,793m Grid</span>
        </div>

        <div>
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            V-Max Velocity
          </span>
          <span className="font-numeric text-2xl font-bold text-[#FF3B00]">
            352.4 KM/H
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Prima Variante Trap</span>
        </div>

        <div>
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Monte Carlo Oracle
          </span>
          <span className="font-numeric text-2xl font-bold text-[#0F1012]">
            5,000 Runs
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Sub-100ms Vectorized</span>
        </div>
      </div>
    </section>
  );
};
