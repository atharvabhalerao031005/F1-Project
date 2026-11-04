// frontend/src/components/flankRight/SteeringWheelHUD.tsx
import React, { useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useDistanceSubscriber } from '../../store/telemetrySubscriber';
import { formatRpm, formatSpeedKmh, GEAR_LUT } from '../../utils/formatters';

// -----------------------------------------------------------------------------
// CANONICAL RPM THRESHOLDS (15 LEDs)
// Bank 1 (Green): LEDs 0-4 (10,500 to 11,300 RPM, step 160)
// Bank 2 (Red):   LEDs 5-9 (11,300 to 12,100 RPM, step 160)
// Bank 3 (Blue):  LEDs 10-14 (12,100 to 12,500 RPM, step 80)
// -----------------------------------------------------------------------------
export const RPM_THRESHOLDS = new Float32Array([
  10500, 10660, 10820, 10980, 11140, // Bank 1: Green
  11300, 11460, 11620, 11780, 11940, // Bank 2: Red
  12100, 12180, 12260, 12340, 12420, // Bank 3: Blue
]);

export const SHIFT_FLASH_RPM = 12450;
export const FLASH_PERIOD_MS = 75.0; // 13.33 Hz
export const FLASH_HALF_PERIOD_MS = 37.5;

/**
 * Computes 15-bit integer bitmask for shift lights array.
 * Bit i is 1 if rpm >= RPM_THRESHOLDS[i], else 0.
 * Executes in ~50-98 ns with zero heap allocations.
 */
export function calculateShiftBitmask(rpm: number): number {
  let mask = 0;
  for (let i = 0; i < 15; i++) {
    if (rpm >= RPM_THRESHOLDS[i]) {
      mask |= (1 << i);
    }
  }
  return mask;
}

/**
 * Determines whether stroboscopic flash is currently in the 'ON' phase.
 * 13.33 Hz cycle with 50% duty cycle (37.5ms ON / 37.5ms OFF).
 */
export function isStrobeFlashOn(timeMs: number): boolean {
  return (timeMs % FLASH_PERIOD_MS) < FLASH_HALF_PERIOD_MS;
}

/**
 * Resolves FastF1 and official FIA DRS status bitmask into HUD badge states.
 * - 0: Inactive
 * - 8: Detected / Available
 * - 1, 10, 12, 14: Active / Deployed
 */
export function getDrsStatus(drs: number): {
  state: 'INACTIVE' | 'AVAIL' | 'ACTIVE';
  label: string;
  className: string;
} {
  if (drs === 1 || drs >= 10) {
    return {
      state: 'ACTIVE',
      label: '⮝ DRS ACTIVE',
      className: 'drs-hud-badge drs-active',
    };
  }
  if (drs === 8) {
    return {
      state: 'AVAIL',
      label: '⚑ DRS AVAIL',
      className: 'drs-hud-badge drs-avail',
    };
  }
  return {
    state: 'INACTIVE',
    label: '— DRS OFF',
    className: 'drs-hud-badge drs-inactive',
  };
}

/**
 * Calculates end coordinates for gauge needles.
 * Center (cx, cy) = (100, 68), Radius R = 48.
 * Angle convention: 0° is top dead center, negative is left, positive is right.
 */
export function calculateNeedleCoords(
  steerDeg: number,
  radius: number = 48,
  cx: number = 100,
  cy: number = 68
): { x: number; y: number } {
  const rad = ((steerDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/**
 * Generates SVG elliptical arc path for the active steering swept fill.
 * Starts from top dead center (100, 24) and sweeps to the target angle.
 */
export function calculateSweptArcPath(
  steerDeg: number,
  radius: number = 44,
  cx: number = 100,
  cy: number = 68
): string {
  if (Math.abs(steerDeg) < 0.5) {
    return `M ${cx} ${cy - radius} L ${cx} ${cy - radius}`;
  }
  const clamped = Math.max(-90, Math.min(90, steerDeg));
  const rad = ((clamped - 90) * Math.PI) / 180;
  const x = cx + radius * Math.cos(rad);
  const y = cy + radius * Math.sin(rad);
  const sweepFlag = clamped >= 0 ? 1 : 0;
  return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 ${sweepFlag} ${x.toFixed(1)} ${y.toFixed(1)}`;
}

/** Formats steering wheel angle with directional prefix ('L ', 'R ', or '  ') */
export function formatSteeringAngle(steerDeg: number): string {
  const dir = steerDeg < -0.5 ? 'L ' : steerDeg > 0.5 ? 'R ' : '  ';
  return `${dir}${Math.abs(steerDeg).toFixed(1)}°`;
}

/** Formats steering wheel delta with explicit sign ('Δ +04.2°', 'Δ -02.8°') */
export function formatSteeringDelta(deltaDeg: number): string {
  const sign = deltaDeg >= 0 ? '+' : '';
  return `Δ ${sign}${deltaDeg.toFixed(1)}°`;
}

/** Resolves rev-band chromatic color token */
export function getRpmBandColor(rpm: number, isShiftFlash: boolean, flashOn: boolean): string {
  if (isShiftFlash && flashOn) return '#FFFFFF';
  if (rpm >= 12100) return '#00E5FF';
  if (rpm >= 11300) return '#FF1E44';
  if (rpm >= 10500) return '#00FF66';
  return '#94A3B8';
}

/**
 * SteeringWheelHUD (Quadrant 3, Sub-Panel 3B)
 *
 * Replicates modern FIA standard digital display unit (McLaren Applied PCU-8D heritage).
 * Direct-DOM zero-VDOM mutation pipeline with 15-bit bitmask caching.
 * ZERO React component re-renders during playback.
 */
export const SteeringWheelHUD: React.FC = React.memo(() => {
  // DOM References for Zero-VDOM Direct Mutation
  const gearRef = useRef<HTMLSpanElement>(null);
  const rpmRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const drsRef = useRef<HTMLDivElement>(null);
  const steerTextRef = useRef<HTMLSpanElement>(null);
  const steerDeltaRef = useRef<HTMLSpanElement>(null);
  const wheelIconRef = useRef<SVGGElement>(null);
  const ghostWheelIconRef = useRef<SVGGElement>(null);
  const needleARef = useRef<SVGLineElement>(null);
  const needleBRef = useRef<SVGLineElement>(null);
  const arcFillRef = useRef<SVGPathElement>(null);

  // Array of 15 LED element references
  const ledRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Mutation Caching Refs to avoid redundant DOM writes
  const lastBitmaskRef = useRef<number>(-1);
  const lastFlashOnRef = useRef<boolean>(false);
  const lastWasFlashRef = useRef<boolean>(false);
  const lastGearRef = useRef<number>(-999);
  const lastRpmColorRef = useRef<string>('');
  const lastDrsStateRef = useRef<number>(-1);

  // Telemetry Session Metadata for Static Visual Setup (Gate 5 Conformance: Only sessionPayload subscribed)
  const sessionPayload = useTelemetryStore((s) => s.sessionPayload);
  const driverACode = sessionPayload?.meta.driverA.code ?? 'VER';
  const driverBCode = sessionPayload?.meta.driverB.code ?? 'NOR';

  // ---------------------------------------------------------------------------
  // ZERO-VDOM 60 HZ DIRECT-DOM SUBSCRIBER PASS
  // ---------------------------------------------------------------------------
  useDistanceSubscriber((distM) => {
    const state = useTelemetryStore.getState();
    const payload = state.sessionPayload;
    if (!payload) return;

    const maxDist = state.maxDistance ?? (payload.gridLength ? payload.gridLength - 1 : 5793);
    const clampedDist = Math.max(0, Math.min(distM, maxDist));
    const k = Math.floor(clampedDist);
    const alpha = clampedDist - k;
    const kNext = Math.min(k + 1, maxDist);

    const dA = payload.driverA;
    const dB = payload.driverB;

    // 1. Interpolated Channels
    const rpm = (1 - alpha) * (dA.rpm[k] ?? 0) + alpha * (dA.rpm[kNext] ?? dA.rpm[k] ?? 0);
    const speed = (1 - alpha) * (dA.speed[k] ?? 0) + alpha * (dA.speed[kNext] ?? dA.speed[k] ?? 0);
    const gear = dA.gear[k] ?? 0;
    const drs = dA.drs[k] ?? 0;
    const steerA = (1 - alpha) * (dA.steerDeg[k] ?? 0) + alpha * (dA.steerDeg[kNext] ?? dA.steerDeg[k] ?? 0);
    const steerB = (1 - alpha) * (dB.steerDeg[k] ?? 0) + alpha * (dB.steerDeg[kNext] ?? dB.steerDeg[k] ?? 0);

    const now = performance.now();
    const isShiftFlash = rpm >= SHIFT_FLASH_RPM;
    const flashOn = isShiftFlash ? isStrobeFlashOn(now) : false;

    // 2. Central Gear Character
    if (gearRef.current) {
      const isFlashActive = isShiftFlash && flashOn;
      const gearChanged = lastGearRef.current !== gear;

      if (gearChanged || isShiftFlash) {
        lastGearRef.current = gear;
        const gGlyph = GEAR_LUT[gear] ?? String(gear);
        gearRef.current.textContent = gGlyph;

        if (gear === 0) {
          gearRef.current.style.color = '#00FF66';
          gearRef.current.style.textShadow = '0 0 16px rgba(0, 255, 102, 0.6)';
        } else if (gear === -1) {
          gearRef.current.style.color = '#FF1E44';
          gearRef.current.style.textShadow = '0 0 16px rgba(255, 30, 68, 0.6)';
        } else if (isFlashActive) {
          gearRef.current.style.color = '#FFFFFF';
          gearRef.current.style.textShadow = '0 0 24px #FFFFFF';
        } else {
          gearRef.current.style.color = '#00E5FF';
          gearRef.current.style.textShadow = '0 0 16px rgba(0, 229, 255, 0.6)';
        }
      }
    }

    // 3. Engine RPM Readout & Dynamic Chromatic Band
    if (rpmRef.current) {
      rpmRef.current.textContent = formatRpm(rpm);
      const rpmColor = getRpmBandColor(rpm, isShiftFlash, flashOn);
      if (lastRpmColorRef.current !== rpmColor) {
        lastRpmColorRef.current = rpmColor;
        rpmRef.current.style.color = rpmColor;
      }
    }

    // 4. Speed Readout
    if (speedRef.current) {
      speedRef.current.textContent = formatSpeedKmh(speed);
    }

    // 5. DRS Status Badge
    if (drsRef.current && lastDrsStateRef.current !== drs) {
      lastDrsStateRef.current = drs;
      const drsInfo = getDrsStatus(drs);
      drsRef.current.className = drsInfo.className;
      drsRef.current.textContent = drsInfo.label;
    }

    // 6. Steering Readouts & Delta Metric
    if (steerTextRef.current) {
      steerTextRef.current.textContent = formatSteeringAngle(steerA);
    }

    if (steerDeltaRef.current) {
      steerDeltaRef.current.textContent = formatSteeringDelta(steerA - steerB);
    }

    // 7. Dynamic Steering Yoke & Needles
    const rotA = steerA.toFixed(1);
    const rotB = steerB.toFixed(1);

    if (wheelIconRef.current) {
      wheelIconRef.current.style.transform = `rotate(${rotA}deg)`;
    }
    if (ghostWheelIconRef.current) {
      ghostWheelIconRef.current.style.transform = `rotate(${rotB}deg)`;
    }

    const coordsA = calculateNeedleCoords(steerA, 48, 100, 68);
    const coordsB = calculateNeedleCoords(steerB, 48, 100, 68);

    if (needleARef.current) {
      needleARef.current.setAttribute('x2', coordsA.x.toFixed(1));
      needleARef.current.setAttribute('y2', coordsA.y.toFixed(1));
    }
    if (needleBRef.current) {
      needleBRef.current.setAttribute('x2', coordsB.x.toFixed(1));
      needleBRef.current.setAttribute('y2', coordsB.y.toFixed(1));
    }

    if (arcFillRef.current) {
      arcFillRef.current.setAttribute('d', calculateSweptArcPath(steerA, 44, 100, 68));
    }

    // 8. 15-LED Shift Light Array (15-Bit Bitmask Caching)
    if (isShiftFlash) {
      if (lastFlashOnRef.current !== flashOn || !lastWasFlashRef.current) {
        lastFlashOnRef.current = flashOn;
        lastWasFlashRef.current = true;
        for (let i = 0; i < 15; i++) {
          const el = ledRefs.current[i];
          if (!el) continue;
          el.style.opacity = flashOn ? '1.0' : '0.12';
          el.style.backgroundColor = flashOn ? '#FFFFFF' : '';
          el.style.boxShadow = flashOn ? '0 0 10px #FFFFFF' : 'none';
        }
      }
    } else {
      const bitmask = calculateShiftBitmask(rpm);
      if (lastWasFlashRef.current || lastBitmaskRef.current !== bitmask) {
        lastWasFlashRef.current = false;
        lastBitmaskRef.current = bitmask;
        for (let i = 0; i < 15; i++) {
          const el = ledRefs.current[i];
          if (!el) continue;
          const isLit = (bitmask & (1 << i)) !== 0;
          el.style.opacity = isLit ? '1.0' : '0.12';
          el.style.backgroundColor = '';
          el.style.boxShadow = '';
        }
      }
    }
  });

  return (
    <div className="steering-hud-card hud-panel-bracket">
      {/* ----------------------------------------------------------------- */}
      {/* 1. 15-LED SEQUENTIAL SHIFT LIGHT ARRAY                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="steering-led-array">
        {/* Bank 1: 5 Green LEDs (10,500 - 11,300 RPM) */}
        <div className="flex gap-[3px] flex-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              ref={(el) => {
                ledRefs.current[i] = el;
              }}
              className="shift-led led-green"
              title={`LED ${i + 1}: ${RPM_THRESHOLDS[i]} RPM`}
            />
          ))}
        </div>

        {/* Separator Gap */}
        <div className="w-[4px] h-[10px] bg-[#0C1017]" />

        {/* Bank 2: 5 Red LEDs (11,300 - 12,100 RPM) */}
        <div className="flex gap-[3px] flex-1">
          {[5, 6, 7, 8, 9].map((i) => (
            <span
              key={i}
              ref={(el) => {
                ledRefs.current[i] = el;
              }}
              className="shift-led led-red"
              title={`LED ${i + 1}: ${RPM_THRESHOLDS[i]} RPM`}
            />
          ))}
        </div>

        {/* Separator Gap */}
        <div className="w-[4px] h-[10px] bg-[#0C1017]" />

        {/* Bank 3: 5 Blue LEDs (12,100 - 12,500 RPM) */}
        <div className="flex gap-[3px] flex-1">
          {[10, 11, 12, 13, 14].map((i) => (
            <span
              key={i}
              ref={(el) => {
                ledRefs.current[i] = el;
              }}
              className="shift-led led-blue"
              title={`LED ${i + 1}: ${RPM_THRESHOLDS[i]} RPM`}
            />
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. DIGITAL INSTRUMENT CLUSTER BODY                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="steering-cluster-grid">
        {/* Left Column: Speed & DRS */}
        <div className="flex flex-col justify-between items-start pl-2 py-1">
          <div>
            <div className="text-[8px] font-telemetry text-muted tracking-wider">
              {`${driverACode} SPEED`}
            </div>
            <span
              ref={speedRef}
              className="font-telemetry font-bold text-[14px] text-cyan tabular-nums tracking-tight"
            >
              000 KM/H
            </span>
          </div>

          <div
            ref={drsRef}
            className="drs-hud-badge drs-inactive mt-1"
          >
            — DRS OFF
          </div>
        </div>

        {/* Center Column: Massive Central Gear & RPM */}
        <div className="flex flex-col items-center justify-center py-0.5">
          <div className="relative flex items-center justify-center h-[52px]">
            <span
              ref={gearRef}
              className="font-telemetry font-black text-[54px] leading-none text-cyan tabular-nums tracking-tighter"
            >
              N
            </span>
          </div>

          <span
            ref={rpmRef}
            className="font-telemetry font-semibold text-[11px] text-slate-300 tabular-nums tracking-wider mt-0.5"
          >
            00000 RPM
          </span>
        </div>

        {/* Right Column: Steering Lock & Driver B Delta */}
        <div className="flex flex-col justify-between items-end pr-2 py-1">
          <div className="text-right">
            <div className="text-[8px] font-telemetry text-muted tracking-wider">STEER LOCK</div>
            <span
              ref={steerTextRef}
              className="font-telemetry font-bold text-[14px] text-cyan tabular-nums tracking-tight"
            >
              0.0°
            </span>
          </div>

          <div className="text-right mt-1">
            <div className="text-[7.5px] font-telemetry text-muted tracking-widest">
              {`GHOST ${driverBCode}`}
            </div>
            <span
              ref={steerDeltaRef}
              className="font-telemetry font-bold text-[10px] text-purple tabular-nums"
            >
              Δ +0.0°
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. DYNAMIC BIPOLAR STEERING YOKE & ARC GAUGE                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="steering-yoke-container">
        <svg
          viewBox="0 0 200 115"
          className="w-full h-[95px] overflow-visible select-none"
        >
          {/* Background Reference Track Arc (-90° to +90°) */}
          <path
            d="M 56 68 A 44 44 0 0 1 144 68"
            fill="none"
            stroke="#1B2230"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Active Swept Arc Fill (Driver A) */}
          <path
            ref={arcFillRef}
            d="M 100 24 L 100 24"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Scale Markings: -90°, -45°, 0°, +45°, +90° */}
          <line x1="56" y1="68" x2="50" y2="68" stroke="#64748B" strokeWidth="1" />
          <line x1="68" y1="37" x2="64" y2="33" stroke="#64748B" strokeWidth="1" />
          <line x1="100" y1="24" x2="100" y2="18" stroke="#FFE600" strokeWidth="1.5" />
          <line x1="132" y1="37" x2="136" y2="33" stroke="#64748B" strokeWidth="1" />
          <line x1="144" y1="68" x2="150" y2="68" stroke="#64748B" strokeWidth="1" />

          {/* Numerical Degree Labels */}
          <text x="46" y="71" fill="#64748B" fontSize="6.5" fontFamily="monospace" textAnchor="end">-90°</text>
          <text x="100" y="14" fill="#FFE600" fontSize="7" fontFamily="monospace" textAnchor="middle">0°</text>
          <text x="154" y="71" fill="#64748B" fontSize="6.5" fontFamily="monospace" textAnchor="start">+90°</text>

          {/* Driver B Ghost Needle */}
          <line
            ref={needleBRef}
            x1="100"
            y1="68"
            x2="100"
            y2="20"
            stroke="#B000FF"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.75"
          />

          {/* Driver A Primary Needle */}
          <line
            ref={needleARef}
            x1="100"
            y1="68"
            x2="100"
            y2="20"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Driver B Ghost Yoke Silhouette */}
          <g
            ref={ghostWheelIconRef}
            style={{ transformOrigin: '100px 68px', transform: 'rotate(0deg)' }}
            className="transition-transform duration-75 ease-out"
          >
            <path
              d="M 66 38 C 58 46 50 62 52 82 C 54 94 60 102 68 100 C 73 98 76 88 78 86 L 122 86 C 124 88 127 98 132 100 C 140 102 146 94 148 82 C 150 62 142 46 134 38 C 126 32 74 32 66 38 Z"
              fill="none"
              stroke="#B000FF"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              opacity="0.45"
            />
          </g>

          {/* Driver A Primary Steering Yoke Silhouette */}
          <g
            ref={wheelIconRef}
            style={{ transformOrigin: '100px 68px', transform: 'rotate(0deg)' }}
            className="transition-transform duration-75 ease-out"
          >
            {/* Carbon Composite Yoke Body */}
            <path
              d="M 66 38 C 58 46 50 62 52 82 C 54 94 60 102 68 100 C 73 98 76 88 78 86 L 122 86 C 124 88 127 98 132 100 C 140 102 146 94 148 82 C 150 62 142 46 134 38 C 126 32 74 32 66 38 Z"
              fill="#06090E"
              stroke="#00E5FF"
              strokeWidth="1.4"
            />

            {/* Left & Right Ergonomic Alcantara Grip Textures */}
            <path d="M 53 66 C 52 75 54 84 58 90" fill="none" stroke="#00E5FF" strokeWidth="3" opacity="0.4" />
            <path d="M 147 66 C 148 75 146 84 142 90" fill="none" stroke="#00E5FF" strokeWidth="3" opacity="0.4" />

            {/* Central Display Screen Pocket */}
            <rect x="83" y="46" width="34" height="20" fill="#0C1017" stroke="#1B2230" strokeWidth="1" />

            {/* Rotary Selector Dials (Left & Right) */}
            <circle cx="75" cy="56" r="3.5" fill="#141B26" stroke="#FFE600" strokeWidth="0.8" />
            <circle cx="125" cy="56" r="3.5" fill="#141B26" stroke="#00FF66" strokeWidth="0.8" />
          </g>

          {/* Center Hub Pivot */}
          <circle cx="100" cy="68" r="4.5" fill="#0C1017" stroke="#00E5FF" strokeWidth="1.5" />
          <circle cx="100" cy="68" r="1.5" fill="#00E5FF" />
        </svg>
      </div>
    </div>
  );
});

SteeringWheelHUD.displayName = 'SteeringWheelHUD';
