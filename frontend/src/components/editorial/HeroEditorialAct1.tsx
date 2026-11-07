// frontend/src/components/editorial/HeroEditorialAct1.tsx
/**
 * VELOCE V2 // ACT 1 EDITORIAL HERO
 * White Wind-Tunnel Calibration Chamber narrative, kinetic typography,
 * fluid clamp scaling, and magnetic interactive livery selection.
 */

import React from 'react';
import { useKineticTitle } from '../../hooks/useKineticTitle';

interface HeroEditorialAct1Props {
  activeLivery: string;
  onSelectLivery: (color: string) => void;
  onJumpToSimulation: () => void;
  scrollProgress?: number;
}

const LIVERY_OPTIONS = [
  { name: 'Ferrari', code: 'SF-24', color: '#E8002D', label: 'Rosso Corsa' },
  { name: 'Red Bull', code: 'RB20', color: '#1E41FF', label: 'Navy' },
  { name: 'McLaren', code: 'MCL38', color: '#FF8000', label: 'Papaya' },
  { name: 'Mercedes', code: 'W15', color: '#00D2BE', label: 'Silver Teal' },
];

export const HeroEditorialAct1: React.FC<HeroEditorialAct1Props> = ({
  activeLivery,
  onSelectLivery,
  onJumpToSimulation: _onJumpToSimulation,
}) => {
  const titleRef = useKineticTitle({
    enableScrollSkew: true,
    maxSkewDeg: 3.5,
    staggerDelay: 0.08,
  });

  return (
    <section
      id="act-1"
      className="relative w-full min-h-[140vh] flex flex-col justify-between pt-24 pb-16 px-6 sm:px-12 md:px-20 overflow-hidden"
    >
      {/* Layer 0: Parallax Watermark Display Typography (0.35x Drift) */}
      <div
        className="parallax-layer-watermark absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-[1] whitespace-nowrap opacity-20"
        aria-hidden="true"
      >
        <span className="font-display text-[15vw] font-extrabold tracking-tighter text-[#D8D4CA] leading-none">
          MONZA · 352 KM/H
        </span>
      </div>

      {/* Layer 2: Main Editorial Hero Narrative (Left Column max-w-[680px], leaving center-right for 3D car) */}
      <div className="parallax-layer-typography relative z-20 max-w-[680px] mt-8 overflow-visible">
        {/* Section Kicker */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#EAE7DF] border border-[rgba(15,16,18,0.08)] mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#FF3B00] animate-pulse" />
          <span className="font-sans text-xs uppercase tracking-[0.24em] font-semibold text-[#7A7E85]">
            01 — FORMULA 1 CALIBRATION & TELEMETRY
          </span>
        </div>

        {/* Hero Headline: Genuinely Massive Display + Instrument Serif Italic */}
        <h1
          ref={titleRef as React.RefObject<HTMLHeadingElement>}
          aria-label="WHERE MILLISECONDS Become Inevitable."
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-extrabold leading-[0.98] tracking-tight text-[#0F1012] mb-6 font-sans overflow-visible select-none"
          style={{ paddingTop: '0.15em', overflow: 'visible' }}
        >
          WHERE <br />
          MILLISECONDS <br />
          <span className="font-editorial italic font-normal text-[#FF3B00]">
            Become Inevitable.
          </span>
        </h1>

        {/* Editorial Subtitle */}
        <p className="font-sans text-base text-[#555962] leading-relaxed max-w-[480px] mb-8">
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
                      ? 'bg-[#0F1012] text-[#F7F6F2] border-[#0F1012] shadow-md scale-105'
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
      </div>

      {/* Layer 3: Floating Telemetry Highlights Strip (1.40x Near-Field Parallax) */}
      <div className="parallax-layer-telemetry relative z-20 grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-[rgba(15,16,18,0.1)] mt-16 max-w-5xl">
        <div className="p-3.5 rounded-xl bg-white/40 backdrop-blur-sm border border-black/5">
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Track Benchmark
          </span>
          <span className="veloce-telemetry-mono text-2xl font-bold text-[#0F1012]">
            1:19.311
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Monza Q3 Pole (VER)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/40 backdrop-blur-sm border border-black/5">
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Spatial Resolution
          </span>
          <span className="veloce-telemetry-mono text-2xl font-bold text-[#0F1012]">
            1.0 Meter
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Canonical 5,793m Grid</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/40 backdrop-blur-sm border border-black/5">
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            V-Max Velocity
          </span>
          <span className="veloce-telemetry-mono text-2xl font-bold text-[#FF3B00]">
            352.4 KM/H
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Prima Variante Trap</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white/40 backdrop-blur-sm border border-black/5">
          <span className="block font-sans text-[11px] uppercase tracking-wider text-[#7A7E85] mb-1 font-semibold">
            Monte Carlo Oracle
          </span>
          <span className="veloce-telemetry-mono text-2xl font-bold text-[#0F1012]">
            5,000 Runs
          </span>
          <span className="block font-sans text-[11px] text-[#7A7E85]">Sub-100ms Vectorized</span>
        </div>
      </div>
    </section>
  );
};
