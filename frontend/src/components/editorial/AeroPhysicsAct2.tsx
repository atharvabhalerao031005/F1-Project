// frontend/src/components/editorial/AeroPhysicsAct2.tsx
import React, { useId, useMemo } from 'react';
import { Flame, Wind, Gauge } from 'lucide-react';
import type { TyreCompound } from '../../types/telemetry';

interface AeroPhysicsAct2Props {
  tyreAgeLaps: number;
  fuelLoadKg: number;
  compound: TyreCompound;
  onUpdateParams: (params: { tyreAgeLaps?: number; fuelLoadKg?: number; compound?: TyreCompound }) => void;
}

const MONZA_CORNER_COMPARISON = [
  { id: 'T1', name: 'Variante del Rettifilo (T1)', dist: 450, vA: 74.2, vB: 71.8, delta: -0.042, adv: 'VER' },
  { id: 'T4', name: 'Variante della Roggia (T4)', dist: 1650, vA: 112.4, vB: 109.8, delta: -0.035, adv: 'VER' },
  { id: 'T8', name: 'Variante Ascari (T8)', dist: 3900, vA: 164.0, vB: 161.5, delta: +0.005, adv: 'NOR' },
  { id: 'T11', name: 'Curva Parabolica (T11)', dist: 5100, vA: 182.5, vB: 180.2, delta: +0.003, adv: 'NOR' },
];

export const AeroPhysicsAct2: React.FC<AeroPhysicsAct2Props> = ({
  tyreAgeLaps,
  fuelLoadKg,
  compound,
  onUpdateParams,
}) => {
  const tireSliderId = useId();
  const fuelSliderId = useId();

  // Physics predictions derived from empirical F1 telemetry models
  const physicsOutputs = useMemo(() => {
    // Compound base grip factor & wear rate
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

    const totalDeltaSec = tireTimeLoss + fuelTimeLoss;
    const predictedLapSec = c.baseLap + totalDeltaSec;

    // Remaining mechanical grip percentage
    const gripPct = Math.max(65, 100 - ageFactor * (c.wearRate * 22));

    // Turn 1 braking point shift (m earlier due to mass and grip loss)
    const brakingShiftM = (fuelLoadKg * 0.09) + (100 - gripPct) * 0.45;

    return {
      predictedLapStr: `${Math.floor(predictedLapSec / 60)}:${(predictedLapSec % 60).toFixed(3).padStart(6, '0')}`,
      deltaStr: `+${totalDeltaSec.toFixed(3)}s`,
      gripPct: gripPct.toFixed(1),
      brakingShiftM: brakingShiftM.toFixed(1),
    };
  }, [tyreAgeLaps, fuelLoadKg, compound]);

  return (
    <div id="act-2" className="relative w-full text-[#F7F6F2] transition-colors duration-700">
      {/* ==================================================================== */}
      {/* STOP 2A: FRONT WING & CARBON CERAMIC BRAKES (140vh - 200vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center px-6 sm:px-12 md:px-20 py-24">
        {/* Left Column Card (Leaving 65% of screen open for 3D Car!) */}
        <div className="relative z-20 w-full max-w-lg p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          {/* Section Kicker */}
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[#FF3B00]" />
            <span className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-[#7A7E85]">
              02A — FRONT WING & BRAKE KINEMATICS
            </span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F7F6F2] leading-tight mb-4">
            Thermal Wear & <br />
            <span className="font-editorial italic font-normal text-[#FF3B00]">
              Deceleration Physics.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Drag the sliders to simulate rubber degradation and fuel burn down into Monza's Turn 1.
            Notice the front brake discs heating to glowing carbon-ceramic temperature.
          </p>

          {/* Interactive Compound Selector */}
          <div className="flex items-center gap-2 mb-6">
            <span className="font-sans text-xs text-[#7A7E85] font-semibold uppercase mr-2">
              Compound:
            </span>
            {(['S', 'M', 'H'] as const).map((c) => {
              const isSelected = compound === c;
              const labels: Record<'S' | 'M' | 'H', string> = { S: 'Soft (C4)', M: 'Medium (C3)', H: 'Hard (C2)' };
              const colors: Record<'S' | 'M' | 'H', string> = { S: '#FF1E44', M: '#FFE600', H: '#F7F6F2' };
              return (
                <button
                  key={c}
                  onClick={() => onUpdateParams({ compound: c })}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#FF3B00] text-white shadow-md'
                      : 'bg-white/5 text-[#9CA3AF] hover:bg-white/10'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[c] }} />
                  <span>{labels[c]}</span>
                </button>
              );
            })}
          </div>

          {/* Slider 1: Tyre Age */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={tireSliderId} className="font-sans text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Tire Age (Laps Completed)
              </label>
              <span className="font-numeric text-sm font-bold text-[#FF3B00]">
                {tyreAgeLaps} LAPS
              </span>
            </div>
            <input
              id={tireSliderId}
              type="range"
              min={0}
              max={38}
              step={1}
              value={tyreAgeLaps}
              onChange={(e) => onUpdateParams({ tyreAgeLaps: Number(e.target.value) })}
              className="w-full accent-[#FF3B00]"
            />
            <div className="flex justify-between text-[10px] text-[#7A7E85] mt-1 font-mono">
              <span>0 (New Scrub)</span>
              <span>18 (Mid Stint)</span>
              <span>38 (Thermal Cliff)</span>
            </div>
          </div>

          {/* Slider 2: Fuel Load */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={fuelSliderId} className="font-sans text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Fuel Tank Load
              </label>
              <span className="font-numeric text-sm font-bold text-[#F7F6F2]">
                {fuelLoadKg} KG
              </span>
            </div>
            <input
              id={fuelSliderId}
              type="range"
              min={8}
              max={105}
              step={1}
              value={fuelLoadKg}
              onChange={(e) => onUpdateParams({ fuelLoadKg: Number(e.target.value) })}
              className="w-full accent-[#FF3B00]"
            />
            <div className="flex justify-between text-[10px] text-[#7A7E85] mt-1 font-mono">
              <span>8 kg (Qualifying Flying Lap)</span>
              <span>105 kg (Race Start Full Tank)</span>
            </div>
          </div>

          {/* Big Editorial Numeric Outcomes */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <div>
              <span className="block font-sans text-[10px] uppercase tracking-wider text-[#7A7E85] mb-1">
                Predicted Pace
              </span>
              <span className="font-numeric text-lg sm:text-xl font-bold text-[#F7F6F2]">
                {physicsOutputs.predictedLapStr}
              </span>
              <span className="block font-numeric text-xs font-semibold text-[#FF3B00]">
                {physicsOutputs.deltaStr}
              </span>
            </div>

            <div>
              <span className="block font-sans text-[10px] uppercase tracking-wider text-[#7A7E85] mb-1">
                Grip Index
              </span>
              <span className="font-numeric text-lg sm:text-xl font-bold text-[#F7F6F2]">
                {physicsOutputs.gripPct}%
              </span>
              <span className="block font-sans text-[10px] text-[#7A7E85]">
                Mechanical
              </span>
            </div>

            <div>
              <span className="block font-sans text-[10px] uppercase tracking-wider text-[#7A7E85] mb-1">
                Turn 1 Brake
              </span>
              <span className="font-numeric text-lg sm:text-xl font-bold text-[#FF3B00]">
                +{physicsOutputs.brakingShiftM}m
              </span>
              <span className="block font-sans text-[10px] text-[#7A7E85]">
                Earlier Marker
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* STOP 2B: TOP-DOWN AERO PROFILE & CORNER BATTLE (200vh - 260vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-end px-6 sm:px-12 md:px-20 py-24">
        {/* Right Column Card (Leaving 65% open for top-down 3D view!) */}
        <div className="relative z-20 w-full max-w-xl p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="w-4 h-4 text-[#FF3B00]" />
            <span className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-[#7A7E85]">
              02B — APEX CORNERING VELOCITY
            </span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F7F6F2] leading-tight mb-4">
            Verstappen vs Norris <br />
            <span className="font-editorial italic font-normal text-[#FF3B00]">
              Apex Comparison.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Observing top-down ground effect venturi tunnels. Telemetry shows Red Bull's edge
            under heavy braking chicanes versus McLaren's superior minimum apex speed in high-speed sweeps.
          </p>

          {/* Minimal Corner Breakdown Cards */}
          <div className="space-y-3">
            {MONZA_CORNER_COMPARISON.map((corner) => (
              <div
                key={corner.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-numeric text-xs font-bold text-[#FF3B00]">
                      {corner.id}
                    </span>
                    <span className="font-sans text-xs font-medium text-[#F7F6F2]">
                      {corner.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#7A7E85] mt-1 font-numeric">
                    <span>VER: <strong className="text-white">{corner.vA} km/h</strong></span>
                    <span>NOR: <strong className="text-white">{corner.vB} km/h</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-numeric text-xs font-bold px-2 py-0.5 rounded-full ${
                      corner.adv === 'VER'
                        ? 'bg-[#1E41FF]/20 text-[#60A5FA] border border-[#1E41FF]/40'
                        : 'bg-[#FF8000]/20 text-[#FB923C] border border-[#FF8000]/40'
                    }`}
                  >
                    {corner.delta > 0 ? `+${corner.delta.toFixed(3)}s` : `${corner.delta.toFixed(3)}s`} ({corner.adv})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* STOP 2C: REAR WING / DRS & DIFFUSER FLOW (260vh - 320vh) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[90vh] flex items-center px-6 sm:px-12 md:px-20 py-24">
        {/* Left Column Card */}
        <div className="relative z-20 w-full max-w-lg p-8 rounded-3xl bg-[rgba(18,20,24,0.78)] backdrop-blur-2xl border border-[rgba(255,255,255,0.12)] shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-[#FF3B00]" />
            <span className="font-sans text-xs uppercase tracking-[0.2em] font-semibold text-[#7A7E85]">
              02C — DRS ACTUATION & DIFFUSER FLOW
            </span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F7F6F2] leading-tight mb-4">
            Rear Wing Drag Shed & <br />
            <span className="font-editorial italic font-normal text-[#FF3B00]">
              Straight-Line Delta.
            </span>
          </h2>

          <p className="font-sans text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Opening the Drag Reduction System sheds 28% aerodynamic drag along Monza's Rettifilo
            and Curva Grande straights, unlocking a +18.4 km/h velocity advantage and driving
            the 5,000-run Monte Carlo undercut probability.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <div className="p-4 rounded-2xl bg-white/[0.04]">
              <span className="block font-sans text-xs text-[#7A7E85] mb-1 uppercase font-semibold">
                DRS Flap Lift
              </span>
              <span className="font-numeric text-2xl font-bold text-[#FF3B00]">
                85 mm
              </span>
              <span className="block font-sans text-[11px] text-[#9CA3AF] mt-1">
                FIA Regulation Max Gap
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04]">
              <span className="block font-sans text-xs text-[#7A7E85] mb-1 uppercase font-semibold">
                Overtake Delta
              </span>
              <span className="font-numeric text-2xl font-bold text-[#F7F6F2]">
                +18.4 KM/H
              </span>
              <span className="block font-sans text-[11px] text-[#9CA3AF] mt-1">
                Straight-Line Surplus
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
