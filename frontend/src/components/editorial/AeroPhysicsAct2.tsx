// frontend/src/components/editorial/AeroPhysicsAct2.tsx
/**
 * VELOCE V2 // ACT 2 AERO-PHYSICS 2.5D PARALLAX LAB (250vh -> 520vh)
 * 3-Chapter Parallax Experience:
 *   - Chapter 2A (250vh - 340vh): Front Wing & Carbon Ceramic Brakes
 *   - Chapter 2B (340vh - 430vh): Venturi Ground-Effect Underfloor & Porpoising Boundary
 *   - Chapter 2C (430vh - 520vh): Rear Wing DRS Mainplane & High-Speed Apex Delta
 * 4 Z-layers (0.35x, 1.00x, 1.25x, 1.40x), >= 65% negative whitespace, Three Hero Metrics rule,
 * magnetic button pills, and 12ms Web Audio acoustic detent chirps.
 */

import React, { useId, useMemo, useState } from 'react';
import { Flame, Wind, Zap } from 'lucide-react';
import type { TyreCompound } from '../../types/telemetry';
import { useKineticTitle } from '../../hooks/useKineticTitle';
import { useMagneticPill } from '../../hooks/useMagneticPill';

interface AeroPhysicsAct2Props {
  tyreAgeLaps: number;
  fuelLoadKg: number;
  compound: TyreCompound;
  onUpdateParams: (params: { tyreAgeLaps?: number; fuelLoadKg?: number; compound?: TyreCompound }) => void;
}

/**
 * 12ms synthetic Web Audio chirp (1,150 Hz -> 380 Hz) on slider detent crossing
 */
function triggerAcousticDetent() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.012);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.014);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(6);
    }
  } catch {
    // Audio context was blocked or not allowed
  }
}

export const AeroPhysicsAct2: React.FC<AeroPhysicsAct2Props> = ({
  tyreAgeLaps,
  fuelLoadKg,
  compound,
  onUpdateParams,
}) => {
  const tireSliderId = useId();
  const fuelSliderId = useId();
  const rideHeightSliderId = useId();

  // Local state for Chapter 2B and 2C interactive parameters
  const [rideHeightMm, setRideHeightMm] = useState(18); // 15mm - 35mm
  const [drsActive, setDrsActive] = useState(true);

  // Chapter titles kinetic animation
  const title2ARef = useKineticTitle({ maxSkewDeg: 3.5, staggerDelay: 0.06 });
  const title2BRef = useKineticTitle({ maxSkewDeg: 3.5, staggerDelay: 0.06 });
  const title2CRef = useKineticTitle({ maxSkewDeg: 3.5, staggerDelay: 0.06 });

  // Magnetic button pills
  const magBtnA = useMagneticPill<HTMLButtonElement>(70, 0.35);

  // Physics predictions derived from empirical F1 telemetry models
  const physicsOutputs = useMemo(() => {
    const compoundCoeffs: Record<TyreCompound, { wearRate: number; baseGrip: number; baseLap: number }> = {
      S: { wearRate: 0.042, baseGrip: 1.0, baseLap: 79.311 },
      M: { wearRate: 0.026, baseGrip: 0.982, baseLap: 79.620 },
      H: { wearRate: 0.016, baseGrip: 0.965, baseLap: 80.050 },
      I: { wearRate: 0.055, baseGrip: 0.910, baseLap: 86.200 },
      W: { wearRate: 0.070, baseGrip: 0.840, baseLap: 91.500 },
    };

    const c = compoundCoeffs[compound] || compoundCoeffs.M;

    // Tire degradation delta: quadratic thermal cliff after 22 laps
    const ageFactor = tyreAgeLaps + Math.max(0, tyreAgeLaps - 22) ** 1.6 * 0.15;
    const tireTimeLoss = ageFactor * c.wearRate;

    // Fuel penalty: ~0.033s per kg of fuel above empty (5kg baseline)
    const fuelTimeLoss = (fuelLoadKg - 5) * 0.033;

    // Ride height aerodynamic ground-effect downforce loss
    // Optimal ground effect seal is at 18mm ride height; porpoising risks start below 16mm
    const rideDelta = rideHeightMm < 16 ? +0.12 : (rideHeightMm - 18) * 0.018;

    // DRS drag delta: -0.320s per lap when active on Monza straights
    const drsBenefit = drsActive ? -0.32 : 0.0;

    const totalDeltaSec = tireTimeLoss + fuelTimeLoss + rideDelta + drsBenefit;
    const predictedLapSec = c.baseLap + totalDeltaSec;

    // Mechanical grip percentage
    const gripPct = Math.max(62, 100 - ageFactor * (c.wearRate * 22));

    // Turn 1 braking point shift (m earlier due to mass and grip loss)
    const brakingShiftM = fuelLoadKg * 0.09 + (100 - gripPct) * 0.45;

    // Ground effect suction force (in kgf at 280 km/h)
    const downforceKg = Math.max(650, 1420 - (rideHeightMm - 15) * 32 + (drsActive ? -180 : 0));

    return {
      predictedLapStr: `${Math.floor(predictedLapSec / 60)}:${(predictedLapSec % 60).toFixed(3).padStart(6, '0')}`,
      deltaStr: totalDeltaSec >= 0 ? `+${totalDeltaSec.toFixed(3)}s` : `${totalDeltaSec.toFixed(3)}s`,
      gripPct: gripPct.toFixed(1),
      brakingShiftM: brakingShiftM.toFixed(1),
      downforceKg: Math.round(downforceKg),
    };
  }, [tyreAgeLaps, fuelLoadKg, compound, rideHeightMm, drsActive]);

  return (
    <div id="act-2" className="relative w-full text-[#F7F6F2] transition-colors duration-700 bg-transparent">
      {/* ==================================================================== */}
      {/* CHAPTER 2A: FRONT WING & CARBON CERAMIC BRAKES (250vh - 340vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-between px-6 sm:px-12 md:px-20 py-24 overflow-hidden">
        {/* Layer 0: Background Watermark (0.35x Drift) */}
        <div
          className="parallax-layer-watermark absolute top-16 left-12 pointer-events-none select-none z-[1] opacity-5 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="font-display text-[14vw] font-extrabold tracking-tighter text-white">
            BRAKING // T1
          </span>
        </div>

        {/* Layer 2: Left Column Card (Strictly <= 34vw, leaving >= 66% whitespace!) */}
        <div className="parallax-layer-typography relative z-20 w-full max-w-lg p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#FF3B00]" />
            <span className="font-sans text-xs uppercase tracking-[0.24em] font-semibold text-[#7A7E85]">
              02A — FRONT WING & DECELERATION
            </span>
          </div>

          <h2
            ref={title2ARef as React.RefObject<HTMLHeadingElement>}
            aria-label="Thermal Wear & Deceleration Physics."
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F7F6F2] leading-tight tracking-tight mb-4 font-sans overflow-visible"
            style={{ paddingTop: '0.15em', paddingLeft: '0.04em', overflow: 'visible' }}
          >
            Thermal Wear & <br />
            <span className="font-editorial italic font-normal text-[#FF3B00]">
              Deceleration Physics.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Drag the sliders to simulate rubber thermal degradation and fuel burn down into Monza's Turn 1.
            Notice the front brake discs heating to glowing carbon-ceramic temperature (1,020°C).
          </p>

          {/* Interactive Compound Selector */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-sans text-xs text-[#7A7E85] font-semibold uppercase mr-2">
              Compound:
            </span>
            {(['S', 'M', 'H'] as const).map((c) => {
              const isSelected = compound === c;
              return (
                <button
                  key={c}
                  onClick={() => {
                    triggerAcousticDetent();
                    onUpdateParams({ compound: c });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isSelected
                      ? c === 'S'
                        ? 'bg-[#FF1E44] text-white shadow-lg scale-105'
                        : c === 'M'
                        ? 'bg-[#FFE600] text-black shadow-lg scale-105'
                        : 'bg-white text-black shadow-lg scale-105'
                      : 'bg-[rgba(255,255,255,0.06)] text-[#9CA3AF] hover:text-white border border-white/10'
                  }`}
                >
                  {c === 'S' ? 'Soft C4' : c === 'M' ? 'Medium C3' : 'Hard C2'}
                </button>
              );
            })}
          </div>

          {/* Interactive Stint Lap Slider with Haptic Detents */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-xs font-sans mb-1.5">
                <label htmlFor={tireSliderId} className="text-[#9CA3AF]">
                  Tyre Age:
                </label>
                <span className="veloce-telemetry-mono font-bold text-white">
                  {tyreAgeLaps} Laps {tyreAgeLaps > 22 && <span className="text-[#FF3B00]">(Thermal Cliff)</span>}
                </span>
              </div>
              <input
                id={tireSliderId}
                type="range"
                min="0"
                max="40"
                step="1"
                value={tyreAgeLaps}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val % 5 === 0) triggerAcousticDetent();
                  onUpdateParams({ tyreAgeLaps: val });
                }}
                className="w-full accent-[#FF3B00] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-sans mb-1.5">
                <label htmlFor={fuelSliderId} className="text-[#9CA3AF]">
                  Fuel Load:
                </label>
                <span className="veloce-telemetry-mono font-bold text-white">{fuelLoadKg} kg</span>
              </div>
              <input
                id={fuelSliderId}
                type="range"
                min="5"
                max="105"
                step="5"
                value={fuelLoadKg}
                onChange={(e) => {
                  triggerAcousticDetent();
                  onUpdateParams({ fuelLoadKg: Number(e.target.value) });
                }}
                className="w-full accent-[#FF3B00] cursor-pointer"
              />
            </div>
          </div>

          {/* Level 1: Three Hero Metrics Rule */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/5">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Predicted Pace</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-white">{physicsOutputs.predictedLapStr}</span>
              <span className="block text-[10px] text-[#FF3B00]">{physicsOutputs.deltaStr}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Mech Grip</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-emerald-400">{physicsOutputs.gripPct}%</span>
              <span className="block text-[10px] text-zinc-500">Contact Patch</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Brake Marker</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-amber-400">+{physicsOutputs.brakingShiftM}m</span>
              <span className="block text-[10px] text-zinc-500">Earlier at T1</span>
            </div>
          </div>
        </div>

        {/* Layer 3: Floating Subpixel Clamped Telemetry Card (Right Side, 1.40x Near-Field Parallax) */}
        <div className="parallax-layer-telemetry hidden lg:block relative z-20 w-80 p-5 rounded-2xl bg-[rgba(15,16,18,0.70)] backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#7A7E85]">
              Monza T1 Apex Delta
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF3B00]/20 text-[#FF3B00]">
              VER vs NOR
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Entry Velocity:</span>
              <span className="veloce-telemetry-mono font-bold text-white">348.7 km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Peak Deceleration:</span>
              <span className="veloce-telemetry-mono font-bold text-[#FF3B00]">-5.2 G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Disc Temperature:</span>
              <span className="veloce-telemetry-mono font-bold text-amber-400">1,024 °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Apex Speed Delta:</span>
              <span className="veloce-telemetry-mono font-bold text-emerald-400">+2.4 km/h (VER)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CHAPTER 2B: VENTURI UNDERFLOOR & PORPOISING (340vh - 430vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-between px-6 sm:px-12 md:px-20 py-24 overflow-hidden">
        {/* Layer 0: Background Watermark (0.35x Drift) */}
        <div
          className="parallax-layer-watermark absolute top-16 right-12 pointer-events-none select-none z-[1] opacity-5 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="font-display text-[14vw] font-extrabold tracking-tighter text-white">
            VENTURI // DIFFUSER
          </span>
        </div>

        {/* Layer 2: Right Column Card (Asymmetric 62% - 94% Viewport Placement) */}
        <div className="parallax-layer-typography relative z-20 w-full max-w-lg ml-auto p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="font-sans text-xs uppercase tracking-[0.24em] font-semibold text-[#7A7E85]">
              02B — GROUND-EFFECT UNDERFLOOR
            </span>
          </div>

          <h2
            ref={title2BRef as React.RefObject<HTMLHeadingElement>}
            aria-label="Venturi Suction & Vortex Sealing."
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F7F6F2] leading-tight tracking-tight mb-4 font-sans overflow-visible"
            style={{ paddingTop: '0.15em', paddingLeft: '0.04em', overflow: 'visible' }}
          >
            Venturi Suction & <br />
            <span className="font-editorial italic font-normal text-cyan-400">
              Vortex Sealing.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Underbody tunnels generate over 60% of total downforce without inducing excessive parasitic drag.
            Lowering ride height increases suction until aerodynamic stalling occurs below 16mm.
          </p>

          {/* Ride Height Slider */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-xs font-sans mb-1.5">
                <label htmlFor={rideHeightSliderId} className="text-[#9CA3AF]">
                  Dynamic Ride Height:
                </label>
                <span className="veloce-telemetry-mono font-bold text-cyan-300">
                  {rideHeightMm} mm {rideHeightMm < 16 && <span className="text-red-400">(Porpoising Zone)</span>}
                </span>
              </div>
              <input
                id={rideHeightSliderId}
                type="range"
                min="12"
                max="32"
                step="1"
                value={rideHeightMm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val === 18 || val === 15) triggerAcousticDetent();
                  setRideHeightMm(val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Level 1: Three Hero Metrics Rule */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/5">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Underfloor Downforce</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-white">{physicsOutputs.downforceKg} kgf</span>
              <span className="block text-[10px] text-cyan-400">@ 280 km/h</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Vortex Stability</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-emerald-400">
                {rideHeightMm < 16 ? 'STALLING' : 'OPTIMAL'}
              </span>
              <span className="block text-[10px] text-zinc-500">Floor Edge Seal</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">L/D Efficiency</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-amber-400">3.82</span>
              <span className="block text-[10px] text-zinc-500">Aero Ratio</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CHAPTER 2C: REAR WING DRS & APEX DELTA (430vh - 520vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-between px-6 sm:px-12 md:px-20 py-24 overflow-hidden">
        {/* Layer 0: Background Watermark (0.35x Drift) */}
        <div
          className="parallax-layer-watermark absolute top-16 left-12 pointer-events-none select-none z-[1] opacity-5 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="font-display text-[14vw] font-extrabold tracking-tighter text-white">
            DRS // 352 KM/H
          </span>
        </div>

        {/* Layer 2: Left Column Card (Strictly <= 34vw) */}
        <div className="parallax-layer-typography relative z-20 w-full max-w-lg p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-sans text-xs uppercase tracking-[0.24em] font-semibold text-[#7A7E85]">
              02C — DRS & REAR WING EFFICIENCY
            </span>
          </div>

          <h2
            ref={title2CRef as React.RefObject<HTMLHeadingElement>}
            aria-label="Drag Reduction & Apex Authority."
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F7F6F2] leading-tight tracking-tight mb-4 font-sans overflow-visible"
            style={{ paddingTop: '0.15em', paddingLeft: '0.04em', overflow: 'visible' }}
          >
            Drag Reduction & <br />
            <span className="font-editorial italic font-normal text-emerald-400">
              Apex Authority.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Opening the DRS actuator flap dumps 22% of aerodynamic drag on Monza's Rettifilo straight,
            elevating terminal speed from 334 km/h to 352.4 km/h before the 100m braking board.
          </p>

          {/* Interactive DRS Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-6">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${drsActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-white">
                DRS Mainplane Flap:
              </span>
            </div>
            <button
              ref={magBtnA}
              onClick={() => {
                triggerAcousticDetent();
                setDrsActive(!drsActive);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-md ${
                drsActive
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              {drsActive ? 'OPEN (+18 KM/H)' : 'CLOSED (HIGH DF)'}
            </button>
          </div>

          {/* Level 1: Three Hero Metrics Rule */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/5">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Straightaway V-Max</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-white">
                {drsActive ? '352.4 km/h' : '334.1 km/h'}
              </span>
              <span className="block text-[10px] text-emerald-400">{drsActive ? '+18.3 km/h' : 'Baseline'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Wing Drag Force</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-zinc-300">
                {drsActive ? '340 N' : '580 N'}
              </span>
              <span className="block text-[10px] text-zinc-500">Trailing Wake</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-[#7A7E85]">Lap Gain Delta</span>
              <span className="veloce-telemetry-mono text-sm font-bold text-emerald-400">
                {drsActive ? '-0.320s' : '0.000s'}
              </span>
              <span className="block text-[10px] text-zinc-500">Monza Straights</span>
            </div>
          </div>
        </div>

        {/* Layer 3: Floating Subpixel Clamped Telemetry Card (Right Side) */}
        <div className="parallax-layer-telemetry hidden lg:block relative z-20 w-80 p-5 rounded-2xl bg-[rgba(18,20,24,0.70)] backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#7A7E85]">
              Curva Parabolica (T11)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-400/20 text-cyan-300">
              5,100m Apex
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Apex Speed (VER):</span>
              <span className="veloce-telemetry-mono font-bold text-white">182.5 km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Apex Speed (NOR):</span>
              <span className="veloce-telemetry-mono font-bold text-orange-400">180.2 km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Lateral Force:</span>
              <span className="veloce-telemetry-mono font-bold text-white">3.4 G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Throttle Pick-up:</span>
              <span className="veloce-telemetry-mono font-bold text-emerald-400">82% (Early)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
