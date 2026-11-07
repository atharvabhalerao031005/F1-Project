// frontend/src/components/editorial/Act1To2MonocoqueExplosionBridge.tsx
/**
 * VELOCE PRO // ACT 1 -> ACT 2 INTERSTITIAL: MONOCOQUE CAD WIREFRAME EXPLOSION BRIDGE
 * Eliminates all blank space between Section 1 (Wind Tunnel) and Section 2 (Oracle Gallery).
 * 
 * Interactive 4-Tier Deconstructed Architecture:
 * 1. Aerodynamic Nosecone & High-Aspect Front Wing (Toray T1000 2x2 Twill Carbon Fiber)
 * 2. Monocoque Survival Tub & Grade 5 Titanium Halo (350kN FIA Static Crash Rating)
 * 3. 1.6L V6 Turbo Hybrid Power Unit & 350kW MGU-K Inverter (1,000+ Total BHP)
 * 4. Twin Venturi Ground-Effect Underfloor & Stepped Diffuser (-4.82 kPa Depression Throat)
 * 
 * Design Language: Swiss Haute Horlogerie & McLaren Architectural CAD
 * Fully interactive with scroll-driven exploded isometric offsets and hover micro-telemetry.
 */

import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Wind,
  Shield,
  Gauge,
  Maximize2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { KineticScrollText } from '../common/KineticScrollText';
import { playAcousticDetent } from '../common/TactileCardPrimitives';

interface CadLayerSpec {
  id: string;
  name: string;
  category: string;
  material: string;
  massKg: number;
  rating: string;
  description: string;
  color: string;
  svgIcon: React.ReactNode;
  specs: { label: string; value: string }[];
}

const CAD_LAYERS: CadLayerSpec[] = [
  {
    id: 'aero-wing',
    name: 'AERO NOSECONE & FRONT WING',
    category: 'TIER 01 · AERODYNAMICS',
    material: 'Toray T1000 Intermediate-Modulus Carbon Fiber',
    massKg: 14.2,
    rating: '45kN FIA Deceleration Homologation',
    description: 'Four-element high-aspect mainplane with tunable Gurney flap. Outwashes tire wake while feeding twin Venturi floor intakes.',
    color: '#0284C7',
    svgIcon: <Wind className="w-5 h-5 text-[#0284C7]" />,
    specs: [
      { label: 'Downforce Contribution', value: '32% Front Balance' },
      { label: 'Deflection Under 200kg Load', value: '< 2.5 mm' },
      { label: 'Aero Efficiency Ratio', value: '3.82 L/D' },
    ],
  },
  {
    id: 'monocoque-tub',
    name: 'SURVIVAL CELL & TITANIUM HALO',
    category: 'TIER 02 · SAFETY & CHASSIS',
    material: 'Grade 5 Ti-6Al-4V Titanium & Zylon Anti-Intrusion Panels',
    massKg: 148.0,
    rating: '350kN Static Lateral Load Rating',
    description: 'Structural carbon safety cell with integrated fire suppression, molded carbon-fiber seat, and ballistic cockpit protection.',
    color: '#D43811',
    svgIcon: <Shield className="w-5 h-5 text-[#D43811]" />,
    specs: [
      { label: 'Chassis Torsional Stiffness', value: '62,000 Nm/deg' },
      { label: 'Halo Peak Load Homologation', value: '125 kN Longitudinal' },
      { label: 'Ballistic Penetration Resistance', value: 'Zylon Side Flanks' },
    ],
  },
  {
    id: 'hybrid-powertrain',
    name: '1.6L V6 TURBO & 350kW MGU-K',
    category: 'TIER 03 · PROPULSION',
    material: 'Inconel 718 Exhaust, Cast Aluminum-Lithium Block',
    massKg: 153.5,
    rating: '1,000+ Combined Brake Horsepower',
    description: 'Direct-injection turbocharged V6 internal combustion engine revving to 15,000 RPM, coupled with dual-vector kinetic energy recovery.',
    color: '#B8860B',
    svgIcon: <Cpu className="w-5 h-5 text-[#B8860B]" />,
    specs: [
      { label: 'Thermal Efficiency', value: '48.2% Indicated' },
      { label: 'MGU-K Electric Vectoring', value: '350 kW (476 HP)' },
      { label: 'Fuel Flow Ceiling', value: '100 kg/h 100% E-Fuel' },
    ],
  },
  {
    id: 'venturi-floor',
    name: 'GROUND-EFFECT VENTURI UNDERFLOOR',
    category: 'TIER 04 · PRESSURE MATRIX',
    material: 'Ultra-High Modulus Carbon Foam Core Sandwich',
    massKg: 38.4,
    rating: '-4.82 kPa Throat Peak Depression',
    description: 'Twin 3D Venturi floor tunnels generate 68% of car downforce via ground effect, featuring titanium wear skids and rear diffuser strakes.',
    color: '#2E5339',
    svgIcon: <Gauge className="w-5 h-5 text-[#2E5339]" />,
    specs: [
      { label: 'Peak Floor Downforce', value: '1,280 kg @ 280 km/h' },
      { label: 'Ride Height Throat Window', value: '18 mm ± 1.2 mm' },
      { label: 'Diffuser Expansion Ratio', value: '1:4.8 Area Gradient' },
    ],
  },
];

export const Act1To2MonocoqueExplosionBridge: React.FC = () => {
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(1);
  const [explosionDistance, setExplosionDistance] = useState<number>(65); // 0 (assembled) to 100 (exploded)

  const activeLayer = CAD_LAYERS[activeLayerIndex];

  const handleSelectLayer = (idx: number) => {
    playAcousticDetent(1100 + idx * 120);
    setActiveLayerIndex(idx);
  };

  return (
    <section className="relative w-full py-28 px-6 sm:px-12 md:px-20 bg-[#F4F2EB] text-[#111215] overflow-hidden select-none border-y border-[#E5E2DA]">
      {/* Background Architectural Vector Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(229, 226, 218, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(229, 226, 218, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />

      {/* Decorative Technical Isobar Watermark */}
      <div
        className="absolute right-6 top-12 pointer-events-none opacity-[0.04] font-mono text-[14vw] font-black leading-none text-[#111215]"
        aria-hidden="true"
      >
        CAD-798KG
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#E5E2DA] shadow-sm mb-4">
              <Layers className="w-3.5 h-3.5 text-[#D43811]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1F2228]">
                CHASSIS DECONSTRUCTION PROTOCOL · 01 TO 02 TRANSITION
              </span>
            </div>

            <KineticScrollText
              as="h2"
              mode="words"
              stagger={0.035}
              text="THE SURVIVAL CELL. 798 Kilograms of Pure Tension."
              accentWords={['Tension.', '798', 'Pure']}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display text-[#111215] leading-[1.05]"
            />

            <p className="mt-4 text-sm sm:text-base text-[#5C6068] font-sans leading-relaxed max-w-xl">
              Deconstructing the FIA Formula 1 architectural assembly. Inspect how the carbon survival cell,
              aero surfaces, hybrid powertrain, and Venturi ground-effect floors integrate into a single rigid structure.
            </p>
          </div>

          {/* Interactive Explosion Depth Slider */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[#E5E2DA] shadow-sm w-full md:w-72">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#111215]">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-[#D43811]" />
                EXPLOSION SPREAD
              </span>
              <span className="text-[#D43811] tabular-nums">{explosionDistance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={explosionDistance}
              onChange={(e) => setExplosionDistance(Number(e.target.value))}
              className="veloce-range-slider cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8C8F98]">
              <span>ASSEMBLED</span>
              <span>NOMINAL (65%)</span>
              <span>FULLY DECONSTRUCTED</span>
            </div>
          </div>
        </div>

        {/* Master Interactive 2.5D Isometric CAD Explosion Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: 4-Tier Interactive Exploded Stack */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {CAD_LAYERS.map((layer, idx) => {
              const isSelected = activeLayerIndex === idx;
              // Compute dynamic isometric translation based on explosion spread slider
              const spreadOffset = (idx - 1.5) * (explosionDistance * 0.45);

              return (
                <div
                  key={layer.id}
                  onClick={() => handleSelectLayer(idx)}
                  style={{
                    transform: `translateY(${spreadOffset}px)`,
                  }}
                  className={`relative p-5 sm:p-6 rounded-2xl transition-all duration-300 cursor-pointer border ${
                    isSelected
                      ? 'bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] border-[#111215] scale-[1.01]'
                      : 'bg-white/60 hover:bg-white/90 border-[#E5E2DA] shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5"
                        style={{ backgroundColor: `${layer.color}15` }}
                      >
                        {layer.svgIcon}
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono tracking-widest font-bold text-[#8C8F98] uppercase">
                          {layer.category}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold font-display text-[#111215]">
                          {layer.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className="block text-[10px] font-mono text-[#8C8F98]">MASS</span>
                        <span className="font-numeric text-sm font-bold text-[#111215]">
                          {layer.massKg} kg
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 transition-transform duration-300 ${
                          isSelected ? 'rotate-90 text-[#111215]' : 'text-[#C8BFAC]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Micro Tensile Badge */}
                  <div className="mt-3 pt-3 border-t border-[#E5E2DA]/80 flex flex-wrap items-center justify-between text-[11px] font-mono">
                    <span className="text-[#5C6068] truncate max-w-[280px]">
                      MATERIAL: <strong className="text-[#111215]">{layer.material.split(',')[0]}</strong>
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: layer.color, backgroundColor: `${layer.color}12` }}
                    >
                      {layer.rating}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Technical Dossier Card for Selected Layer */}
          <div className="lg:col-span-5">
            <div className="p-7 rounded-3xl bg-white border border-[#E5E2DA] shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E2DA]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeLayer.color }}
                    />
                    <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-[#1F2228]">
                      ENGINEERING DOSSIER
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#8C8F98] uppercase">
                    DOC · VELOCE-MTC-2026
                  </span>
                </div>

                <h4 className="text-2xl font-bold font-display text-[#111215] mb-2">
                  {activeLayer.name}
                </h4>

                <p className="font-sans text-sm text-[#45484E] leading-relaxed mb-6">
                  {activeLayer.description}
                </p>

                {/* Technical Metric Cards */}
                <div className="space-y-3 mb-6">
                  {activeLayer.specs.map((sp, sIdx) => (
                    <div
                      key={`spec-${sIdx}`}
                      className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DA] flex items-center justify-between"
                    >
                      <span className="text-xs font-mono text-[#5C6068]">{sp.label}</span>
                      <span className="text-xs font-mono font-bold text-[#111215]">{sp.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Assembly Compliance Banner */}
              <div className="p-4 rounded-2xl bg-[#F4F2EB] border border-[#E5E2DA] flex items-center gap-3">
                <Info className="w-4 h-4 text-[#D43811] shrink-0" />
                <p className="text-[11px] font-sans text-[#5C6068] leading-tight">
                  Fully compliant with 2026 FIA Technical Regulations Article 5.1. All components verified under 50G dynamic deceleration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
