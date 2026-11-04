// frontend/src/components/flankRight/GGTractionRadar.tsx
/**
 * AERO-SPEC F1 // QUADRANT 3: SUB-PANEL 3A - G-G TRACTION RADAR
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.4, 5.8
 * Research: docs/research/PHASE_4_GG_TRACTION_RADAR_KINEMATICS_AND_POLAR_PHYSICS_RESEARCH.md
 *
 * ARCHITECTURAL CONTRACT:
 * - 60 FPS Canvas 2D Polar Acceleration Radar (200x200 CSS / HiDPI DPR scaled backing store).
 * - Dual-Layer Architecture: Pre-render static concentric reticle circles (1G to 6G, crosshairs,
 *   radial guides, labels) once onto an offscreen canvas; blit per frame in 0.02ms.
 * - Dynamic C1 Continuous Pear-Shaped Aero Friction Ellipse:
 *   * v_ms = v_kmh / 3.6
 *   * mu_lat(v) = min(5.80, 1.95 + 0.00045 * v_ms^2)
 *   * mu_brake(v) = min(6.00, 2.20 + 0.00040 * v_ms^2)
 *   * mu_accel = 2.20 G
 *   * Dashed yellow #FFE600 contour with subtle glow fill.
 * - 45-Frame Circular Ring Buffer Comet Tail (Float32Array):
 *   * Stores historical (gLat, gLong) for Driver A (#00E5FF) and Driver B (#B000FF).
 *   * Decaying alpha gradient (1.0 -> 0.04).
 *   * Seek threshold detection: if delta dist > 15m, resets tail buffer to eliminate jump lines.
 * - Direct-DOM Digital Readouts (Zero-VDOM):
 *   * Resultant Total G, Signed Lateral G, Longitudinal G, and Grip Utilization %.
 *   * Driven via useDistanceSubscriber and direct DOM textContent refs (0 React re-renders).
 * - GATE 5 AST INVARIANT: NO reactive subscriptions to currentDistance or isPlaying.
 *   Subscribes strictly only to sessionPayload and mlWarpParams.enabled.
 * - Component wrapped with React.memo.
 */

import React, { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { useDistanceSubscriber } from '../../store/telemetrySubscriber';
import type { SessionTelemetryPayload } from '../../types/telemetry';

export const DISPLAY_SIZE = 200; // CSS pixels
export const MAX_G = 6.0;        // 6G outer boundary
export const RADIUS_PAD = 12;    // Outer margin padding in px
export const TAIL_CAPACITY = 45; // ~0.75 seconds at 60 FPS
export const SEEK_RESET_THRESHOLD_M = 15; // Reset comet tail if distance jump > 15m

export interface AeroFrictionLimits {
  muLat: number;
  muBrake: number;
  muAccel: number;
}

/**
 * Calculates dynamic aerodynamic friction capacities as a quadratic function of velocity.
 * Incorporates aerodynamic downforce scaling F_downforce \propto v^2.
 */
export function calculateAeroLimits(speedKmh: number, gripMultiplier: number = 1.0): AeroFrictionLimits {
  const safeSpeed = Math.max(0, speedKmh);
  const v_ms = safeSpeed / 3.6;
  const v_sq = v_ms * v_ms;

  const muLat = Math.min(5.80, 1.95 + 0.00045 * v_sq) * gripMultiplier;
  const muBrake = Math.min(6.00, 2.20 + 0.00040 * v_sq) * gripMultiplier;
  const muAccel = 2.20 * gripMultiplier;

  return { muLat, muBrake, muAccel };
}

/**
 * Calculates instantaneous grip utilization percentage eta_grip.
 * Combines lateral and asymmetric longitudinal acceleration vectors normalized to capacity.
 */
export function calculateGripUtilization(
  gLat: number,
  gLong: number,
  muLat: number,
  muAccel: number,
  muBrake: number
): number {
  if (muLat <= 0) return 0;
  const muLong = gLong >= 0 ? muAccel : muBrake;
  if (muLong <= 0) return 0;

  const latRatio = gLat / muLat;
  const longRatio = gLong / muLong;
  return Math.sqrt(latRatio * latRatio + longRatio * longRatio) * 100;
}

/**
 * Maps Cartesian G-coordinates (gLat, gLong) to Canvas 2D pixel coordinates.
 * Note that Canvas Y is inverted relative to Cartesian +Y.
 */
export function mapGToCanvas(
  gLat: number,
  gLong: number,
  cx: number = DISPLAY_SIZE / 2,
  cy: number = DISPLAY_SIZE / 2,
  scale: number = (DISPLAY_SIZE / 2 - RADIUS_PAD) / MAX_G
): { x: number; y: number } {
  return {
    x: cx + gLat * scale,
    y: cy - gLong * scale,
  };
}

export interface CometTailBuffer {
  readonly capacity: number;
  readonly xA: Float32Array;
  readonly yA: Float32Array;
  readonly xB: Float32Array;
  readonly yB: Float32Array;
  head: number;
  count: number;
  lastDist: number;
}

/**
 * Pre-allocates a zero-heap-allocation circular ring buffer for dual-vehicle comet tails.
 */
export function createCometTailBuffer(capacity: number = TAIL_CAPACITY): CometTailBuffer {
  return {
    capacity,
    xA: new Float32Array(capacity),
    yA: new Float32Array(capacity),
    xB: new Float32Array(capacity),
    yB: new Float32Array(capacity),
    head: 0,
    count: 0,
    lastDist: -1,
  };
}

/**
 * Pushes historical G-G coordinates into the circular ring buffer.
 * Automatically clears history upon detecting scrubber seek discontinuities (> 15m).
 */
export function pushCometPoint(
  buf: CometTailBuffer,
  signedGLatA: number,
  gLongA: number,
  signedGLatB: number,
  gLongB: number,
  distM: number,
  seekThresholdM: number = SEEK_RESET_THRESHOLD_M
): void {
  // Detect scrubber seek jumps > seekThresholdM and flush buffer
  if (buf.lastDist >= 0 && Math.abs(distM - buf.lastDist) > seekThresholdM) {
    buf.count = 0;
    buf.head = 0;
  }
  buf.lastDist = distM;

  buf.xA[buf.head] = signedGLatA;
  buf.yA[buf.head] = gLongA;
  buf.xB[buf.head] = signedGLatB;
  buf.yB[buf.head] = gLongB;

  buf.head = (buf.head + 1) % buf.capacity;
  if (buf.count < buf.capacity) {
    buf.count++;
  }
}

/**
 * Resets circular buffer state.
 */
export function resetCometBuffer(buf: CometTailBuffer): void {
  buf.count = 0;
  buf.head = 0;
  buf.lastDist = -1;
}

/**
 * Pre-renders static polar reticle (concentric 1G-6G circles, crosshairs, radial guides, and labels)
 * once onto an offscreen canvas backing store for zero-cost per-frame blitting.
 */
export function createReticleCanvas(
  dpr: number,
  displaySize: number = DISPLAY_SIZE,
  radiusPad: number = RADIUS_PAD,
  maxG: number = MAX_G
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(displaySize * dpr);
  offscreen.height = Math.round(displaySize * dpr);
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  ctx.scale(dpr, dpr);
  const cx = displaySize / 2;
  const cy = displaySize / 2;
  const rMax = cx - radiusPad;
  const scale = rMax / maxG;

  ctx.clearRect(0, 0, displaySize, displaySize);

  // Crosshairs
  ctx.strokeStyle = '#1b2230';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, radiusPad);
  ctx.lineTo(cx, displaySize - radiusPad);
  ctx.moveTo(radiusPad, cy);
  ctx.lineTo(displaySize - radiusPad, cy);
  ctx.stroke();

  // 45-degree diagonal guides
  ctx.save();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 4]);
  const diagOffset = rMax * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - diagOffset, cy - diagOffset);
  ctx.lineTo(cx + diagOffset, cy + diagOffset);
  ctx.moveTo(cx - diagOffset, cy + diagOffset);
  ctx.lineTo(cx + diagOffset, cy - diagOffset);
  ctx.stroke();
  ctx.restore();

  // Concentric G-rings (1G to 6G)
  for (let g = 1; g <= maxG; g++) {
    const r = g * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (g % 2 === 0) {
      ctx.strokeStyle = '#223048';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#141d2d';
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 2]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Axis Labels
  ctx.fillStyle = '#4a5b78';
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ring Labels
  ctx.fillText('2G', cx + 2 * scale, cy + 7);
  ctx.fillText('4G', cx + 4 * scale, cy + 7);
  ctx.fillText('6G', cx + 6 * scale, cy + 7);

  // Directional Labels
  ctx.fillText('ACCEL', cx, radiusPad - 4);
  ctx.fillText('BRAKE', cx, displaySize - radiusPad + 6);
  ctx.textAlign = 'left';
  ctx.fillText('-LAT G', radiusPad - 2, cy - 6);
  ctx.textAlign = 'right';
  ctx.fillText('+LAT G', displaySize - radiusPad + 2, cy - 6);

  return offscreen;
}

/**
 * Draws a single frame of the G-G Traction Radar onto the active canvas context.
 */
export function drawRadarFrame(
  ctx: CanvasRenderingContext2D,
  reticleCanvas: HTMLCanvasElement | null,
  buf: CometTailBuffer,
  speedKmh: number,
  signedGLatA: number,
  gLongA: number,
  signedGLatB: number,
  gLongB: number,
  gripMultiplier: number = 1.0,
  displaySize: number = DISPLAY_SIZE,
  radiusPad: number = RADIUS_PAD,
  maxG: number = MAX_G
): void {
  const cx = displaySize / 2;
  const cy = displaySize / 2;
  const rMax = cx - radiusPad;
  const scale = rMax / maxG;

  // Clear display canvas in logical pixels
  ctx.clearRect(0, 0, displaySize, displaySize);

  // 1. Blit pre-rendered static polar reticle (0.02ms)
  if (reticleCanvas) {
    ctx.drawImage(reticleCanvas, 0, 0, displaySize, displaySize);
  }

  // 2. Dynamic C1 Continuous Asymmetric Aero Friction Ellipse
  const limits = calculateAeroLimits(speedKmh, gripMultiplier);
  const rx = limits.muLat * scale;
  const ryAccel = limits.muAccel * scale;
  const ryBrake = limits.muBrake * scale;

  ctx.save();
  ctx.beginPath();
  // Upper semi-ellipse (acceleration: PI to 2*PI in canvas space, Y goes upwards)
  ctx.ellipse(cx, cy, rx, ryAccel, 0, Math.PI, 2 * Math.PI, false);
  // Lower semi-ellipse (braking: 0 to PI in canvas space, Y goes downwards)
  ctx.ellipse(cx, cy, rx, ryBrake, 0, 0, Math.PI, false);
  ctx.closePath();

  // Subtle filled envelope glow
  ctx.fillStyle = 'rgba(255, 230, 0, 0.04)';
  ctx.fill();

  // Dashed border line
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.restore();

  // 3. Driver B Comet Tail (#B000FF, Purple, decaying alpha 1.0 -> 0.04)
  if (buf.count > 1) {
    ctx.save();
    ctx.lineWidth = 1.4;
    for (let j = 1; j < buf.count; j++) {
      const i0 = (buf.head - 1 - (j - 1) + buf.capacity) % buf.capacity;
      const i1 = (buf.head - 1 - j + buf.capacity) % buf.capacity;
      const alpha = Math.max(0.04, ((1.0 - j / buf.capacity) ** 1.3) * 0.7);
      ctx.strokeStyle = `rgba(176, 0, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(cx + buf.xB[i0] * scale, cy - buf.yB[i0] * scale);
      ctx.lineTo(cx + buf.xB[i1] * scale, cy - buf.yB[i1] * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Driver A Comet Tail (#00E5FF, Cyan, decaying alpha 1.0 -> 0.04)
  if (buf.count > 1) {
    ctx.save();
    ctx.lineWidth = 2.0;
    for (let j = 1; j < buf.count; j++) {
      const i0 = (buf.head - 1 - (j - 1) + buf.capacity) % buf.capacity;
      const i1 = (buf.head - 1 - j + buf.capacity) % buf.capacity;
      const alpha = Math.max(0.04, (1.0 - j / buf.capacity) ** 1.3);
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(cx + buf.xA[i0] * scale, cy - buf.yA[i0] * scale);
      ctx.lineTo(cx + buf.xA[i1] * scale, cy - buf.yA[i1] * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Driver B Cursor (Purple Circle)
  const curXB = cx + signedGLatB * scale;
  const curYB = cy - gLongB * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(curXB, curYB, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#B000FF';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.restore();

  // 6. Driver A Cursor (Cyan Circle + Glowing Core)
  const curXA = cx + signedGLatA * scale;
  const curYA = cy - gLongA * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(curXA, curYA, 7.0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(curXA, curYA, 4.0, 0, Math.PI * 2);
  ctx.fillStyle = '#00E5FF';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

export interface GGTractionRadarProps {
  sessionPayload?: SessionTelemetryPayload | null;
}

/**
 * GGTractionRadar Component
 * Renders 60 FPS Canvas polar acceleration radar with dual-vehicle comet tails and zero-VDOM HUD.
 */
export const GGTractionRadar: React.FC<GGTractionRadarProps> = React.memo((props) => {
  // GATE 5 AST INVARIANT:
  // Strictly subscribe only to sessionPayload and mlWarpParams.enabled.
  // Never subscribe reactively to currentDistance or isPlaying!
  const storePayload = useTelemetryStore((s) => s.sessionPayload);
  const sessionPayload = props.sessionPayload !== undefined ? props.sessionPayload : storePayload;
  const mlWarpEnabled = useTelemetryStore((s) => s.mlWarpParams.enabled);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reticleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cometBufferRef = useRef<CometTailBuffer>(createCometTailBuffer(TAIL_CAPACITY));

  // Direct-DOM HUD readout refs (Zero-VDOM bypass)
  const gCombARef = useRef<HTMLSpanElement | null>(null);
  const gLatARef = useRef<HTMLSpanElement | null>(null);
  const gLongARef = useRef<HTMLSpanElement | null>(null);
  const gripUtilARef = useRef<HTMLSpanElement | null>(null);

  const gCombBRef = useRef<HTMLSpanElement | null>(null);
  const gLatBRef = useRef<HTMLSpanElement | null>(null);
  const gLongBRef = useRef<HTMLSpanElement | null>(null);
  const gripUtilBRef = useRef<HTMLSpanElement | null>(null);

  const aeroLimitBadgeRef = useRef<HTMLDivElement | null>(null);

  // Core render function invoked by distance subscriber
  const renderRadarAtDistance = (distM: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = useTelemetryStore.getState();
    const payload: SessionTelemetryPayload | null = state.sessionPayload;
    const buf = cometBufferRef.current;

    // Default fallback values if no payload
    if (!payload || !payload.driverA || !payload.driverB || payload.gridLength <= 0) {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
      if (reticleCanvasRef.current) {
        ctx.drawImage(reticleCanvasRef.current, 0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
      }
      ctx.restore();
      return;
    }

    const idx = Math.min(Math.max(0, Math.floor(distM)), payload.gridLength - 1);

    // Extract telemetry channels for Driver A
    const speedA = payload.driverA.speed[idx] ?? 200;
    const rawGLatA = payload.driverA.gLat[idx] ?? 0;
    const steerA = payload.driverA.steerDeg[idx] ?? 0;
    const signedGLatA = (steerA < -0.1 ? -1 : 1) * rawGLatA;
    const gLongA = payload.driverA.gLong[idx] ?? 0;

    // Extract telemetry channels for Driver B
    const speedB = payload.driverB.speed[idx] ?? 200;
    const rawGLatB = payload.driverB.gLat[idx] ?? 0;
    const steerB = payload.driverB.steerDeg[idx] ?? 0;
    const signedGLatB = (steerB < -0.1 ? -1 : 1) * rawGLatB;
    const gLongB = payload.driverB.gLong[idx] ?? 0;

    // Push into zero-allocation circular ring buffer
    pushCometPoint(buf, signedGLatA, gLongA, signedGLatB, gLongB, distM, SEEK_RESET_THRESHOLD_M);

    // Dynamic ML Physics-Warp Grip Multiplier
    const gripMultiplier = (state.mlWarpParams.enabled && state.mlWarpOutput?.gripMultiplier)
      ? state.mlWarpOutput.gripMultiplier
      : 1.0;

    // Canvas drawing with DPR scaling
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    drawRadarFrame(
      ctx,
      reticleCanvasRef.current,
      buf,
      speedA,
      signedGLatA,
      gLongA,
      signedGLatB,
      gLongB,
      gripMultiplier,
      DISPLAY_SIZE,
      RADIUS_PAD,
      MAX_G
    );
    ctx.restore();

    // Direct-DOM HUD metric updates (Zero-VDOM)
    const gCombA = Math.sqrt(signedGLatA * signedGLatA + gLongA * gLongA);
    const gCombB = Math.sqrt(signedGLatB * signedGLatB + gLongB * gLongB);

    const limitsA = calculateAeroLimits(speedA, gripMultiplier);
    const limitsB = calculateAeroLimits(speedB, 1.0);

    const gripUtilA = calculateGripUtilization(
      signedGLatA,
      gLongA,
      limitsA.muLat,
      limitsA.muAccel,
      limitsA.muBrake
    );
    const gripUtilB = calculateGripUtilization(
      signedGLatB,
      gLongB,
      limitsB.muLat,
      limitsB.muAccel,
      limitsB.muBrake
    );

    if (gCombARef.current) gCombARef.current.textContent = `${gCombA.toFixed(2)}G`;
    if (gLatARef.current) gLatARef.current.textContent = `${signedGLatA >= 0 ? '+' : ''}${signedGLatA.toFixed(2)}G`;
    if (gLongARef.current) gLongARef.current.textContent = `${gLongA >= 0 ? '+' : ''}${gLongA.toFixed(2)}G`;
    if (gripUtilARef.current) gripUtilARef.current.textContent = `${Math.round(gripUtilA)}%`;

    if (gCombBRef.current) gCombBRef.current.textContent = `${gCombB.toFixed(2)}G`;
    if (gLatBRef.current) gLatBRef.current.textContent = `${signedGLatB >= 0 ? '+' : ''}${signedGLatB.toFixed(2)}G`;
    if (gLongBRef.current) gLongBRef.current.textContent = `${gLongB >= 0 ? '+' : ''}${gLongB.toFixed(2)}G`;
    if (gripUtilBRef.current) gripUtilBRef.current.textContent = `${Math.round(gripUtilB)}%`;

    if (aeroLimitBadgeRef.current) {
      aeroLimitBadgeRef.current.textContent = `AERO LIM @ ${Math.round(speedA)} KM/H: ${limitsA.muLat.toFixed(1)}G LAT / ${limitsA.muBrake.toFixed(1)}G BRK | UTIL: ${Math.round(gripUtilA)}%`;
    }
  };

  // High-frequency distance subscriber (Imperative Zero-VDOM callback)
  useDistanceSubscriber((distanceM) => {
    renderRadarAtDistance(distanceM);
  }, [sessionPayload, mlWarpEnabled]);

  // Canvas setup, static reticle pre-render, and initial frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(DISPLAY_SIZE * dpr);
    canvas.height = Math.round(DISPLAY_SIZE * dpr);
    canvas.style.width = `${DISPLAY_SIZE}px`;
    canvas.style.height = `${DISPLAY_SIZE}px`;

    // Cache static background reticle
    reticleCanvasRef.current = createReticleCanvas(dpr, DISPLAY_SIZE, RADIUS_PAD, MAX_G);

    // Reset comet buffer on session load
    resetCometBuffer(cometBufferRef.current);

    // Trigger initial frame
    const curDist = useTelemetryStore.getState().currentDistance;
    renderRadarAtDistance(curDist);
  }, [sessionPayload, mlWarpEnabled]);

  const driverACode = sessionPayload?.meta?.driverA?.code || 'DRIVER A';
  const driverBCode = sessionPayload?.meta?.driverB?.code || 'DRIVER B';

  return (
    <div className="flex flex-col bg-[#06090e] border border-[#1b2230] p-2 select-none">
      {/* Sub-Panel Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1b2230] text-[10px] font-mono tracking-wider text-[#8b9bb4]">
        <span className="flex items-center gap-1.5 font-bold text-white">
          <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block" />
          G-G TRACTION RADAR
        </span>
        <span className="text-[9px] text-[#00E5FF] font-mono">60 FPS POLAR</span>
      </div>

      {/* Radar Canvas Viewport */}
      <div className="relative flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair"
          style={{ width: `${DISPLAY_SIZE}px`, height: `${DISPLAY_SIZE}px` }}
        />
      </div>

      {/* Dynamic Aero Limit Banner */}
      <div
        ref={aeroLimitBadgeRef}
        className="text-[9px] font-mono text-center text-[#FFE600] bg-[#FFE600]/10 border border-[#FFE600]/30 py-0.5 px-1 mb-2 tracking-tight select-none"
      >
        AERO LIM: INITIALIZING...
      </div>

      {/* Dual Driver Telemetry Readout Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        {/* Driver A Readout */}
        <div className="border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-1.5 flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[#00E5FF] font-bold">
            <span>{driverACode}</span>
            <span ref={gCombARef}>0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>LAT:</span>
            <span ref={gLatARef} className="text-white">+0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>LONG:</span>
            <span ref={gLongARef} className="text-white">+0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>GRIP:</span>
            <span ref={gripUtilARef} className="text-[#00E5FF] font-semibold">0%</span>
          </div>
        </div>

        {/* Driver B Readout */}
        <div className="border border-[#B000FF]/30 bg-[#B000FF]/5 p-1.5 flex flex-col gap-0.5">
          <div className="flex justify-between items-center text-[#B000FF] font-bold">
            <span>{driverBCode}</span>
            <span ref={gCombBRef}>0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>LAT:</span>
            <span ref={gLatBRef} className="text-white">+0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>LONG:</span>
            <span ref={gLongBRef} className="text-white">+0.00G</span>
          </div>
          <div className="flex justify-between text-[9px] text-[#8b9bb4]">
            <span>GRIP:</span>
            <span ref={gripUtilBRef} className="text-[#B000FF] font-semibold">0%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

GGTractionRadar.displayName = 'GGTractionRadar';
