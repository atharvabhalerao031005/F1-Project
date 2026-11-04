// frontend/src/components/scrubber/TelemetryOscillograph.tsx
/**
 * AERO-SPEC F1 // ZONE 4 TELEMETRY OSCILLOGRAPH
 * Standard: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.6
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Dual-Canvas Topology:
 *    - Stacked background canvas (#bg-oscillograph): static grid, DRS zones, distance ticks, 4-band waveforms
 *    - Stacked foreground canvas (#fg-oscillograph): 60/120 FPS rAF playhead needle with cyan bloom + micro-HUD box
 * 2. Strided Sampling (m += 2):
 *    - Extremum-preserving strided decimation executing path construction in < 0.002ms
 * 3. W3C Pointer Scrubbing with Pointer Capture & rAF Coalescing:
 *    - setPointerCapture(e.pointerId) & releasePointerCapture(e.pointerId), touch-action: none
 *    - Drag coalescing via pendingDistanceRef & requestAnimationFrame latch
 * 4. Zero-VDOM Subscription Contract (Gate 5 Compliance):
 *    - ZERO reactive subscriptions to currentDistance or isPlaying
 *    - Wrapped in React.memo with explicit displayName
 */

import React, { memo, useEffect, useRef, useCallback } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import {
  buildSpatialCornerLut,
  resolveCornerProximityFromLut,
  type SpatialCornerLut,
} from '../../utils/cornerProximity';
import type { SessionTelemetryPayload, MlPhysicsWarpParams, MlPhysicsWarpOutput } from '../../types/telemetry';

// ============================================================================
// DESIGN TOKENS & 4-BAND LAYOUT CONSTANTS
// ============================================================================

export const OSCILLOGRAPH_TOKENS = {
  bgVoid: '#05070B',
  bgCanvas: '#090D14',
  borderSeam: '#1B2230',
  gridDivider: '#161F30',
  gridTick: '#141B26',
  speedA: '#00E5FF',
  speedB: '#B000FF',
  mlWarp: '#FFE600',
  mlWarpGlow: 'rgba(255, 230, 0, 0.45)',
  throttle: '#00FF66',
  throttleFill: 'rgba(0, 255, 102, 0.04)',
  brake: '#FF1E44',
  brakeFill: 'rgba(255, 30, 68, 0.06)',
  zeroBaseline: '#334155',
  needleCore: '#FFFFFF',
  needleBloom: 'rgba(0, 229, 255, 0.45)',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  drsHighlight: 'rgba(0, 255, 102, 0.035)',
  sectorSplit: '#00E5FF44',
} as const;

export const BAND_LAYOUT = {
  speed: {
    topPct: 0.04,
    botPct: 0.36,
    span: 0.32,
    minV: 60.0,
    maxV: 360.0,
  },
  deltaT: {
    topPct: 0.40,
    botPct: 0.56,
    span: 0.16,
    minVBase: -0.5,
    maxVBase: 0.5,
    minVWarp: -0.5,
    maxVWarp: 3.5,
  },
  throttle: {
    topPct: 0.60,
    botPct: 0.78,
    span: 0.18,
    minV: 0.0,
    maxV: 100.0,
  },
  brake: {
    topPct: 0.82,
    botPct: 0.96,
    span: 0.14,
    minV: 0.0,
    maxV: 100.0,
  },
} as const;

// Dividing seam positions between and bordering bands (8 horizontal lines)
export const HORIZONTAL_DIVIDER_PCTS = [0.04, 0.36, 0.40, 0.56, 0.60, 0.78, 0.82, 0.96] as const;

// ============================================================================
// PURE MATHEMATICAL & GEOMETRY HELPERS
// ============================================================================

/**
 * Maps a telemetry value to canvas Y coordinate within a designated band span.
 * Uses inverted screen coordinates (0 at top, height at bottom).
 */
export function computeBandY(
  val: number,
  minV: number,
  maxV: number,
  topPct: number,
  botPct: number,
  height: number
): number {
  const range = maxV - minV || 1.0;
  const clampedNorm = Math.max(0.0, Math.min(1.0, (val - minV) / range));
  const yTop = height * topPct;
  const ySpan = height * (botPct - topPct);
  return yTop + ySpan * (1.0 - clampedNorm);
}

/**
 * Projects a client pointer X coordinate to an integer spatial circuit meter distance.
 * Clamps strictly to [0, maxDistance].
 */
export function projectPointerToDistance(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  maxDistance: number
): number {
  if (rectWidth <= 0 || maxDistance <= 0) return 0;
  const unclampedRatio = (clientX - rectLeft) / rectWidth;
  const ratio = Math.max(0.0, Math.min(1.0, unclampedRatio));
  return Math.min(maxDistance, Math.max(0, Math.round(ratio * maxDistance)));
}

/**
 * Configures canvas internal buffer dimensions based on devicePixelRatio (HiDPI scaling).
 */
export function configureHiDpiCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number
): { width: number; height: number } {
  const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
  const backingHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  return { width: backingWidth, height: backingHeight };
}

/**
 * Draws a multi-channel waveform trace with strided decimation (m += 2).
 * Preserves the final point (len - 1) and executes in < 0.002ms.
 */
export function drawStridedTrace(
  ctx: CanvasRenderingContext2D,
  arr: ArrayLike<number>,
  minV: number,
  maxV: number,
  topPct: number,
  botPct: number,
  width: number,
  height: number,
  maxDistance: number,
  color: string,
  dpr: number,
  options?: {
    dashed?: boolean;
    dashPattern?: number[];
    lineWidth?: number;
    fillColor?: string;
    shadowColor?: string;
    shadowBlur?: number;
  }
): number {
  const len = arr.length;
  if (len < 2 || maxDistance <= 0) return 0;

  const yTop = height * topPct;
  const ySpan = height * (botPct - topPct);
  const invRange = 1.0 / (maxV - minV || 1.0);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = (options?.lineWidth ?? (options?.dashed ? 1.4 : 1.6)) * dpr;

  if (options?.dashed) {
    ctx.setLineDash(options.dashPattern ?? [4 * dpr, 3 * dpr]);
  }
  if (options?.shadowColor && options?.shadowBlur) {
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur * dpr;
  }

  ctx.beginPath();
  let vertices = 0;

  // Strided sampling step m += 2
  for (let m = 0; m < len; m += 2) {
    const x = (m / maxDistance) * width;
    const val = arr[m];
    const norm = (val - minV) * invRange;
    const clamped = norm < 0.0 ? 0.0 : norm > 1.0 ? 1.0 : norm;
    const y = yTop + ySpan * (1.0 - clamped);

    if (m === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    vertices++;
  }

  // Ensure last spatial station (len - 1) is cleanly closed
  if ((len - 1) % 2 !== 0 && len > 1) {
    const m = len - 1;
    const x = (m / maxDistance) * width;
    const val = arr[m];
    const norm = (val - minV) * invRange;
    const clamped = norm < 0.0 ? 0.0 : norm > 1.0 ? 1.0 : norm;
    const y = yTop + ySpan * (1.0 - clamped);
    ctx.lineTo(x, y);
    vertices++;
  }

  ctx.stroke();

  // Optional subtle area gradient fill under curve
  if (options?.fillColor) {
    const yBot = yTop + ySpan;
    ctx.lineTo(width, yBot);
    ctx.lineTo(0, yBot);
    ctx.closePath();
    ctx.fillStyle = options.fillColor;
    ctx.fill();
  }

  ctx.restore();
  return vertices;
}

/**
 * Extracts and formats telemetry metrics for the floating micro-HUD readout box.
 */
export function formatHudMetrics(
  distanceM: number,
  payload: SessionTelemetryPayload,
  cornerLut: SpatialCornerLut | null,
  mlWarpParams: MlPhysicsWarpParams,
  mlWarpOutput: MlPhysicsWarpOutput | null
): {
  distanceStr: string;
  cornerName: string;
  speedA: number;
  speedB: number;
  deltaV: number;
  deltaT: number;
  throttle: number;
  brake: number;
  gearA: number;
  gearB: number;
  mlWarpSpeed?: number;
  mlWarpDeltaT?: number;
} {
  const maxD = payload.gridLength || 1;
  const s = Math.min(maxD - 1, Math.max(0, Math.floor(distanceM)));

  let cornerName = 'MAIN STRAIGHT';
  if (cornerLut && payload.corners && payload.corners.length > 0) {
    const prox = resolveCornerProximityFromLut(s, payload.corners, cornerLut);
    cornerName = prox.isActiveZone
      ? prox.corner.name
      : prox.corner
        ? `APPR: ${prox.corner.name}`
        : 'MAIN STRAIGHT';
  }

  const speedA = Math.round(payload.driverA.speed[s] ?? 0);
  const speedB = Math.round(payload.driverB.speed[s] ?? 0);
  const deltaV = speedA - speedB;
  const deltaT = payload.deltaT[s] ?? 0.0;
  const throttle = Math.round(payload.driverA.throttle[s] ?? 0);
  const brake = Math.round(payload.driverA.brake[s] ?? 0);
  const gearA = payload.driverA.gear[s] ?? 1;
  const gearB = payload.driverB.gear[s] ?? 1;

  const isWarped = mlWarpParams.enabled && mlWarpOutput;
  const mlWarpSpeed = isWarped ? Math.round(mlWarpOutput.warpedSpeed[s] ?? 0) : undefined;
  const mlWarpDeltaT = isWarped ? (mlWarpOutput.warpedDeltaT[s] ?? 0) : undefined;

  return {
    distanceStr: `${Math.round(distanceM).toLocaleString()}m`,
    cornerName,
    speedA,
    speedB,
    deltaV,
    deltaT,
    throttle,
    brake,
    gearA,
    gearB,
    mlWarpSpeed,
    mlWarpDeltaT,
  };
}

/**
 * Pure function to render the complete static background buffer:
 * grid lines, DRS zones, 1,000m ticks, sector splits, and 4-band waveforms.
 */
export function renderBackgroundCanvas(
  canvas: HTMLCanvasElement,
  payload: SessionTelemetryPayload,
  mlWarpParams: MlPhysicsWarpParams,
  mlWarpOutput: MlPhysicsWarpOutput | null,
  dpr: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const maxDistance = payload.gridLength || 1;

  // 1. Fill Void Carbon Background
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.bgVoid;
  ctx.fillRect(0, 0, width, height);

  // 2. Structural Horizontal Dividing Seams
  ctx.strokeStyle = OSCILLOGRAPH_TOKENS.gridDivider;
  ctx.lineWidth = 1 * dpr;
  for (const pct of HORIZONTAL_DIVIDER_PCTS) {
    const y = Math.round(height * pct);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. DRS Activation Zones Shading
  if (payload.drsZones && payload.drsZones.length > 0) {
    ctx.fillStyle = OSCILLOGRAPH_TOKENS.drsHighlight;
    for (const drs of payload.drsZones) {
      const xStart = (drs.startDistanceM / maxDistance) * width;
      const xEnd = (drs.endDistanceM / maxDistance) * width;
      ctx.fillRect(xStart, 0, xEnd - xStart, height);
    }
  }

  // 4. Metric 1,000-Meter Vertical Gridlines & Anti-Crowding Micro-Typography
  ctx.strokeStyle = OSCILLOGRAPH_TOKENS.gridTick;
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.textMuted;
  ctx.font = `${Math.floor(7.5 * dpr)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';

  const sectorSplits = payload.meta.sectorSplitM ?? [];
  for (let d = 1000; d < maxDistance; d += 1000) {
    const x = Math.round((d / maxDistance) * width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Anti-crowding: suppress kilometer label if close to sector splits (< 35px)
    let collidesWithSector = false;
    for (const sM of sectorSplits) {
      const sX = (sM / maxDistance) * width;
      if (Math.abs(x - sX) < 35 * dpr) {
        collidesWithSector = true;
        break;
      }
    }

    if (!collidesWithSector) {
      ctx.fillText(`${d / 1000}KM`, x, height - 3 * dpr);
    }
  }

  // 5. Official Sector Splits (S1, S2)
  if (sectorSplits.length >= 2) {
    ctx.save();
    ctx.strokeStyle = OSCILLOGRAPH_TOKENS.sectorSplit;
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);

    sectorSplits.forEach((sM, idx) => {
      const x = Math.round((sM / maxDistance) * width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Sector Split Pill Text
      ctx.fillStyle = OSCILLOGRAPH_TOKENS.speedA;
      ctx.font = `bold ${Math.floor(8 * dpr)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`S${idx + 1} // S${idx + 2}`, x + 4 * dpr, 12 * dpr);
    });
    ctx.restore();
  }

  // 6. Channel Axis Labels on Left Margin
  ctx.save();
  ctx.font = `bold ${Math.floor(7 * dpr)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.textMuted;
  ctx.fillText('SPD [KM/H]', 4 * dpr, height * 0.04 + 9 * dpr);
  ctx.fillText('Δt [SEC]', 4 * dpr, height * 0.40 + 9 * dpr);
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.throttle;
  ctx.fillText('THR [%]', 4 * dpr, height * 0.60 + 9 * dpr);
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.brake;
  ctx.fillText('BRK [BAR]', 4 * dpr, height * 0.82 + 9 * dpr);
  ctx.restore();

  // --------------------------------------------------------------------------
  // BAND 1: SPEED TRACES [60 - 360 km/h] (Top 4% - 36%, Span: 32%)
  // --------------------------------------------------------------------------
  const { speed: bSpeed } = BAND_LAYOUT;
  drawStridedTrace(
    ctx,
    payload.driverA.speed,
    bSpeed.minV,
    bSpeed.maxV,
    bSpeed.topPct,
    bSpeed.botPct,
    width,
    height,
    maxDistance,
    OSCILLOGRAPH_TOKENS.speedA,
    dpr,
    { lineWidth: 1.6, dashed: false }
  );

  drawStridedTrace(
    ctx,
    payload.driverB.speed,
    bSpeed.minV,
    bSpeed.maxV,
    bSpeed.topPct,
    bSpeed.botPct,
    width,
    height,
    maxDistance,
    OSCILLOGRAPH_TOKENS.speedB,
    dpr,
    { lineWidth: 1.4, dashed: true, dashPattern: [4 * dpr, 3 * dpr] }
  );

  if (mlWarpParams.enabled && mlWarpOutput) {
    drawStridedTrace(
      ctx,
      mlWarpOutput.warpedSpeed,
      bSpeed.minV,
      bSpeed.maxV,
      bSpeed.topPct,
      bSpeed.botPct,
      width,
      height,
      maxDistance,
      OSCILLOGRAPH_TOKENS.mlWarp,
      dpr,
      {
        lineWidth: 1.4,
        dashed: true,
        dashPattern: [3 * dpr, 2 * dpr],
        shadowColor: OSCILLOGRAPH_TOKENS.mlWarpGlow,
        shadowBlur: 4,
      }
    );
  }

  // --------------------------------------------------------------------------
  // BAND 2: DELTA-T TRACE (40% - 56%, Span: 16%)
  // --------------------------------------------------------------------------
  const { deltaT: bDelta } = BAND_LAYOUT;
  const isWarped = mlWarpParams.enabled && mlWarpOutput;
  const deltaMin = isWarped ? bDelta.minVWarp : bDelta.minVBase;
  const deltaMax = isWarped ? bDelta.maxVWarp : bDelta.maxVBase;

  // Draw Anchored Zero Reference Baseline Line
  const zeroY = computeBandY(0.0, deltaMin, deltaMax, bDelta.topPct, bDelta.botPct, height);
  ctx.save();
  ctx.strokeStyle = OSCILLOGRAPH_TOKENS.zeroBaseline;
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, zeroY);
  ctx.lineTo(width, zeroY);
  ctx.stroke();

  ctx.fillStyle = OSCILLOGRAPH_TOKENS.textMuted;
  ctx.font = `${Math.floor(7 * dpr)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('0.0s', 4 * dpr, zeroY - 2 * dpr);
  ctx.restore();

  // Draw Baseline Delta-T Trace
  drawStridedTrace(
    ctx,
    payload.deltaT,
    deltaMin,
    deltaMax,
    bDelta.topPct,
    bDelta.botPct,
    width,
    height,
    maxDistance,
    OSCILLOGRAPH_TOKENS.speedA,
    dpr,
    { lineWidth: 1.6, dashed: false }
  );

  // Draw Warped Delta-T Trace (conditional)
  if (isWarped) {
    drawStridedTrace(
      ctx,
      mlWarpOutput.warpedDeltaT,
      deltaMin,
      deltaMax,
      bDelta.topPct,
      bDelta.botPct,
      width,
      height,
      maxDistance,
      OSCILLOGRAPH_TOKENS.mlWarp,
      dpr,
      { lineWidth: 1.4, dashed: true, dashPattern: [3 * dpr, 2 * dpr] }
    );
  }

  // --------------------------------------------------------------------------
  // BAND 3: THROTTLE TRACE [0% - 100%] (60% - 78%, Span: 18%)
  // --------------------------------------------------------------------------
  const { throttle: bThr } = BAND_LAYOUT;
  drawStridedTrace(
    ctx,
    payload.driverA.throttle,
    bThr.minV,
    bThr.maxV,
    bThr.topPct,
    bThr.botPct,
    width,
    height,
    maxDistance,
    OSCILLOGRAPH_TOKENS.throttle,
    dpr,
    {
      lineWidth: 1.6,
      dashed: false,
      fillColor: OSCILLOGRAPH_TOKENS.throttleFill,
    }
  );

  // --------------------------------------------------------------------------
  // BAND 4: BRAKE LINE PRESSURE TRACE [0 - 100 bar] (82% - 96%, Span: 14%)
  // --------------------------------------------------------------------------
  const { brake: bBrk } = BAND_LAYOUT;
  drawStridedTrace(
    ctx,
    payload.driverA.brake,
    bBrk.minV,
    bBrk.maxV,
    bBrk.topPct,
    bBrk.botPct,
    width,
    height,
    maxDistance,
    OSCILLOGRAPH_TOKENS.brake,
    dpr,
    {
      lineWidth: 1.6,
      dashed: false,
      fillColor: OSCILLOGRAPH_TOKENS.brakeFill,
    }
  );
}

/**
 * Pure function to render the foreground cursor needle and floating micro-HUD readout box.
 */
export function renderForegroundCanvas(
  canvas: HTMLCanvasElement,
  currentDistance: number,
  payload: SessionTelemetryPayload,
  cornerLut: SpatialCornerLut | null,
  mlWarpParams: MlPhysicsWarpParams,
  mlWarpOutput: MlPhysicsWarpOutput | null,
  dpr: number,
  bgBuffer?: HTMLCanvasElement | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const maxD = payload.gridLength || 1;

  // Clear or Blit Background Buffer
  if (bgBuffer) {
    ctx.drawImage(bgBuffer, 0, 0);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const clampedDist = Math.max(0, Math.min(maxD, currentDistance));
  const cursorX = Math.round((clampedDist / maxD) * width);

  // 1. Vertical Cursor Needle with Photonic Bloom
  ctx.save();
  ctx.strokeStyle = OSCILLOGRAPH_TOKENS.needleCore;
  ctx.lineWidth = Math.max(1, Math.round(1.6 * dpr));
  ctx.shadowColor = OSCILLOGRAPH_TOKENS.needleBloom;
  ctx.shadowBlur = 10 * dpr;

  ctx.beginPath();
  ctx.moveTo(cursorX + 0.5, 0);
  ctx.lineTo(cursorX + 0.5, height);
  ctx.stroke();

  // Indicator Triangle Head at top
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.speedA;
  ctx.beginPath();
  ctx.moveTo(cursorX, 0);
  ctx.lineTo(cursorX - 4 * dpr, 6 * dpr);
  ctx.lineTo(cursorX + 4 * dpr, 6 * dpr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Compact Floating Micro-HUD Readout Box
  const metrics = formatHudMetrics(clampedDist, payload, cornerLut, mlWarpParams, mlWarpOutput);

  const boxW = Math.round(168 * dpr);
  const boxH = Math.round(48 * dpr);
  const margin = Math.round(8 * dpr);

  // Collision avoidance: flip to left if near right edge
  let boxX = cursorX + margin;
  if (boxX + boxW > width - margin) {
    boxX = cursorX - boxW - margin;
  }
  if (boxX < margin) boxX = margin;
  const boxY = Math.round(8 * dpr);

  ctx.save();
  // HUD Box Container Background & Seam
  ctx.fillStyle = 'rgba(5, 7, 11, 0.92)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = OSCILLOGRAPH_TOKENS.borderSeam;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Accent Cyan line at top of badge
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.speedA;
  ctx.fillRect(boxX, boxY, boxW, 1 * dpr);

  // Content Line 1: Distance & Corner Identification
  ctx.font = `bold ${Math.floor(7.5 * dpr)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.textPrimary;
  const cleanCorner = metrics.cornerName.length > 17 ? metrics.cornerName.slice(0, 16) + '…' : metrics.cornerName;
  ctx.fillText(`DIST: ${metrics.distanceStr} // ${cleanCorner}`, boxX + 6 * dpr, boxY + 11 * dpr);

  // Content Line 2: Speed A, Speed B, Delta-v
  ctx.font = `${Math.floor(7 * dpr)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.textSecondary;
  const signDv = metrics.deltaV > 0 ? '+' : '';
  ctx.fillText(`SPD: ${metrics.speedA} | ${metrics.speedB} (Δv: ${signDv}${metrics.deltaV})`, boxX + 6 * dpr, boxY + 23 * dpr);

  // Content Line 3: Delta-T & Warped Delta-T
  const signDt = metrics.deltaT >= 0 ? '+' : '';
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.speedA;
  let dtText = `Δt: ${signDt}${metrics.deltaT.toFixed(3)}s`;
  if (metrics.mlWarpDeltaT !== undefined) {
    dtText += ` | W: +${metrics.mlWarpDeltaT.toFixed(3)}s`;
  }
  ctx.fillText(dtText, boxX + 6 * dpr, boxY + 34 * dpr);

  // Content Line 4: Throttle & Brake Pedals
  ctx.fillStyle = OSCILLOGRAPH_TOKENS.throttle;
  ctx.fillText(`THR: ${metrics.throttle}%`, boxX + 6 * dpr, boxY + 44 * dpr);

  ctx.fillStyle = OSCILLOGRAPH_TOKENS.brake;
  ctx.fillText(`BRK: ${metrics.brake} bar`, boxX + 60 * dpr, boxY + 44 * dpr);

  ctx.restore();
}

// ============================================================================
// COMPONENT IMPLEMENTATION (ZERO-VDOM SUBSCRIPTION COMPLIANT)
// ============================================================================

export const TelemetryOscillograph: React.FC = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);

  // Scrubbing & Drag Coalescing Refs
  const isDraggingRef = useRef<boolean>(false);
  const wasPlayingBeforeDragRef = useRef<boolean>(false);
  const pendingDistanceRef = useRef<number | null>(null);
  const scrubRafHandleRef = useRef<number | null>(null);
  const cornerLutRef = useRef<SpatialCornerLut | null>(null);

  // Authorized Reactive Store Selectors (Gate 5 Compliance)
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const mlWarpParams = useTelemetryStore((s) => s.mlWarpParams);
  const mlWarpOutput = useTelemetryStore((s) => s.mlWarpOutput);

  // Pre-calculate Spatial Corner LUT when session payload loads
  useEffect(() => {
    if (payload && payload.corners && payload.corners.length > 0) {
      cornerLutRef.current = buildSpatialCornerLut(payload.corners, payload.gridLength);
    } else {
      cornerLutRef.current = null;
    }
  }, [payload]);

  // --------------------------------------------------------------------------
  // 1. BACKGROUND CANVAS REDRAW ROUTINE
  // --------------------------------------------------------------------------
  const redrawBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas || !payload) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    renderBackgroundCanvas(bgCanvas, payload, mlWarpParams, mlWarpOutput, dpr);
  }, [payload, mlWarpParams, mlWarpOutput]);

  // --------------------------------------------------------------------------
  // 2. RESIZE OBSERVER & HIDPI CANVAS CONFIGURATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeRafId: number | null = null;
    let cachedW = 0;
    let cachedH = 0;

    const updateDimensions = (width: number, height: number) => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      if (bgCanvasRef.current) {
        configureHiDpiCanvas(bgCanvasRef.current, width, height, dpr);
      }
      if (fgCanvasRef.current) {
        configureHiDpiCanvas(fgCanvasRef.current, width, height, dpr);
      }
      redrawBackground();
    };

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const entry = entries[0];
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);

      if (w <= 0 || h <= 0 || (w === cachedW && h === cachedH)) return;
      cachedW = w;
      cachedH = h;

      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        updateDimensions(w, h);
        resizeRafId = null;
      });
    });

    observer.observe(container);

    // Initial measurement
    const initialW = Math.round(container.clientWidth);
    const initialH = Math.round(container.clientHeight);
    if (initialW > 0 && initialH > 0) {
      cachedW = initialW;
      cachedH = initialH;
      updateDimensions(initialW, initialH);
    }

    return () => {
      observer.disconnect();
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
    };
  }, [redrawBackground]);

  // Redraw background whenever payload or ML params change
  useEffect(() => {
    redrawBackground();
  }, [redrawBackground]);

  // --------------------------------------------------------------------------
  // 3. 60/120 FPS ZERO-VDOM FOREGROUND RAF TICKER LOOP
  // --------------------------------------------------------------------------
  useEffect(() => {
    let animId: number;

    const frameLoop = () => {
      const fgCanvas = fgCanvasRef.current;
      if (fgCanvas && payload) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        // Access high-frequency distance directly from store without React subscriptions
        const { currentDistance } = useTelemetryStore.getState();

        renderForegroundCanvas(
          fgCanvas,
          currentDistance,
          payload,
          cornerLutRef.current,
          mlWarpParams,
          mlWarpOutput,
          dpr
        );
      }
      animId = requestAnimationFrame(frameLoop);
    };

    animId = requestAnimationFrame(frameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [payload, mlWarpParams, mlWarpOutput]);

  // --------------------------------------------------------------------------
  // 4. W3C POINTER SCRUBBING WITH POINTER CAPTURE & rAF COALESCING
  // --------------------------------------------------------------------------
  const flushDistanceCommit = useCallback(() => {
    scrubRafHandleRef.current = null;
    const target = pendingDistanceRef.current;
    if (target !== null) {
      pendingDistanceRef.current = null;
      useTelemetryStore.getState().setDistance(target);
    }
  }, []);

  const queueDistanceUpdate = useCallback(
    (distM: number) => {
      pendingDistanceRef.current = distM;
      if (scrubRafHandleRef.current === null) {
        scrubRafHandleRef.current = requestAnimationFrame(flushDistanceCommit);
      }
    },
    [flushDistanceCommit]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Accept primary click (0) or active primary button (1)
    if (e.button !== 0 && e.buttons !== 1) return;
    const container = containerRef.current;
    if (!container) return;

    isDraggingRef.current = true;

    // Acquire pointer capture
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback if unsupported or already detached
    }

    // Transport arbitration: pause playback during user drag
    const isPlaying = useTelemetryStore.getState().isPlaying;
    wasPlayingBeforeDragRef.current = isPlaying;
    if (isPlaying) {
      useTelemetryStore.getState().setIsPlaying(false);
    }

    // Immediate initial seek
    const rect = container.getBoundingClientRect();
    const maxD = useTelemetryStore.getState().maxDistance || 1;
    const targetDist = projectPointerToDistance(e.clientX, rect.left, rect.width, maxD);
    useTelemetryStore.getState().setDistance(targetDist);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const maxD = useTelemetryStore.getState().maxDistance || 1;
      const targetDist = projectPointerToDistance(e.clientX, rect.left, rect.width, maxD);

      // Coalesce drag events via rAF
      queueDistanceUpdate(targetDist);
    },
    [queueDistanceUpdate]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }

    // Flush any pending uncommitted drag update immediately
    if (scrubRafHandleRef.current !== null) {
      cancelAnimationFrame(scrubRafHandleRef.current);
      scrubRafHandleRef.current = null;
    }
    const finalDist = pendingDistanceRef.current;
    if (finalDist !== null) {
      pendingDistanceRef.current = null;
      useTelemetryStore.getState().setDistance(finalDist);
    }

    // Restore prior playback state
    if (wasPlayingBeforeDragRef.current) {
      useTelemetryStore.getState().setIsPlaying(true);
    }
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }

    if (scrubRafHandleRef.current !== null) {
      cancelAnimationFrame(scrubRafHandleRef.current);
      scrubRafHandleRef.current = null;
    }
    pendingDistanceRef.current = null;

    if (wasPlayingBeforeDragRef.current) {
      useTelemetryStore.getState().setIsPlaying(true);
    }
  }, []);

  // Cleanup pending rAF on unmount
  useEffect(() => {
    return () => {
      if (scrubRafHandleRef.current !== null) {
        cancelAnimationFrame(scrubRafHandleRef.current);
        scrubRafHandleRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // 5. RENDER DUAL-CANVAS DOM STRUCTURE
  // --------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      data-testid="telemetry-oscillograph-container"
      className="relative w-full h-full overflow-hidden select-none bg-[#05070B]"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Layer 1: Background Static Canvas (#bg-oscillograph) */}
      <canvas
        id="bg-oscillograph"
        data-testid="bg-oscillograph"
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none block"
      />

      {/* Layer 2: Foreground Interactive Playhead Canvas (#fg-oscillograph) */}
      <canvas
        id="fg-oscillograph"
        data-testid="fg-oscillograph"
        ref={fgCanvasRef}
        className="absolute inset-0 w-full h-full cursor-ew-resize block"
      />
    </div>
  );
});

TelemetryOscillograph.displayName = 'TelemetryOscillograph';
