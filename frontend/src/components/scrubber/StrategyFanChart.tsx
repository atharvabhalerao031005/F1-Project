// frontend/src/components/scrubber/StrategyFanChart.tsx
/**
 * AERO-SPEC F1 // ZONE 4: STRATEGY FAN CHART (ML_STRATEGY_ORACLE MODE)
 * Standard: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.5
 * Research Sources:
 * - PHASE_5_STRATEGY_FAN_CHART_STINT_PACE_AND_DEGRADATION_RESEARCH.md
 * - PHASE_5_MONTE_CARLO_FAN_POLYGON_AND_UNDERCUT_CROSSOVER_RESEARCH.md
 * - PHASE_5_SCRUBBING_DRAG_COALESCING_AND_HOVER_INSPECTOR_RESEARCH.md
 * - PHASE_5_AEROSPACE_STYLING_CRT_SCANLINES_AND_GEOMETRY_SPECIFICATION.md
 *
 * TECHNICAL INVARIANTS:
 * 1. Two-Band Canvas Partitioning (h * 0.48 divider seam):
 *    - Background fill: Canvas Void #090D14
 *    - Vertical lap gridlines: #141C2B stroke every 5 laps with L5, L10...
 *    - Seam divider: #1B2230 1px horizontal rule at midY = h * 0.48
 * 2. Top Band: Stint Pace Degradation Curves & Pit Stop Handling:
 *    - Driver A (#00E5FF, 2.0*dpr) and Driver B (#B000FF, 2.0*dpr)
 *    - Pit Stop Discontinuity Clamping: nominal pit loss (19.5s) subtracted on pit laps
 *    - Vertical Pit Stop Callouts: vertical reticle hairline + pill callout badge BOX L19 [H]
 * 3. Bottom Band: Cumulative Race Gap & Monte Carlo Uncertainty Fan:
 *    - Zero-gap baseline at zeroY = midY + (h - midY) * 0.52 with dashed line #1E293B [4*dpr, 4*dpr]
 *    - Gap scaling clamped to [-18.0s, +18.0s]
 *    - Shaded P10-P90 Confidence Fan Polygon: rgba(0, 229, 255, 0.14) with border rgba(0, 229, 255, 0.28)
 *    - Median Cumulative Gap Curve: #00FF66 Neon Green stroke (2.2*dpr, round cap/join)
 * 4. Sub-Lap Undercut Zero-Crossover Detection & Pulsing Reticle:
 *    - First discrete interval where cumulative gap transitions from negative to positive
 *    - Sub-lap root: l_cross = lapNumber[i - 1] + (-gap[i - 1]) / (gap[i] - gap[i - 1])
 *    - Pulsing green radar diamond and clamped HUD badge
 * 5. Pointer Scrubbing across 53 Laps:
 *    - Local X -> normalized ratio -> race lap index
 *    - Direct-DOM hover tooltip showing Lap, Stint Times, Compound, Cumulative Gap
 * 6. Zero-VDOM Subscription Contract (Gate 5 Compliance):
 *    - 0 reactive subscriptions to currentDistance or isPlaying
 *    - Authorized selectors: strategyResult, sessionPayload
 *    - Wrapped in React.memo with displayName = 'StrategyFanChart'
 */

import React, { useEffect, useRef, useCallback, memo } from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type {
  TyreCompound,
  LapByLapStrategyTrace,
  MlStrategySimulationResult,
  SessionTelemetryPayload,
} from '../../types/telemetry';

// ============================================================================
// CONSTANTS & PALETTES
// ============================================================================

export const COMPOUND_ACCENT_COLORS: Record<TyreCompound, string> = {
  S: '#FF1801', // Crimson Red
  M: '#FFE600', // Cyber Yellow
  H: '#FFFFFF', // Titanium White
  I: '#39B54A', // Intermediate Green
  W: '#00AEEF', // Wet Blue
};

export const MID_Y_RATIO = 0.48;
export const ZERO_Y_OFFSET_RATIO = 0.52;
export const MAX_GAP_CLAMP_SEC = 18.0;
export const NOMINAL_PIT_LOSS_SEC = 19.5;
export const SPAN_FACTOR_RATIO = 0.42;
export const TOP_BAND_PAD_TOP_RATIO = 0.08;
export const TOP_BAND_PAD_BOTTOM_RATIO = 0.14;
export const T_PULSE_MS = 1600;

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface UndercutCrossoverResult {
  hasCrossover: boolean;
  lapNumber: number;          // Fractional continuous lap (e.g. 21.83)
  lapIndex: number;           // Integer lap index where sign change completed
  xCanvas: number;            // Exact canvas X in backing pixels
  yCanvas: number;            // Exact canvas Y (identically zeroY)
  undercutGainSec: number;    // Net time gained across pit window
  prevGapSec: number;
  currGapSec: number;
  direction: 'UNDERCUT_SUCCESS' | 'OVERCUT_DEFENSE';
}

export interface StrategyFanChartProps {
  strategyResult?: MlStrategySimulationResult | null;
  sessionPayload?: SessionTelemetryPayload | null;
}

// ============================================================================
// PURE MATHEMATICAL & GEOMETRIC HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates vertical Y coordinate in backing pixels for stint lap time.
 */
export function computeLapTimeY(
  sec: number,
  baseSec: number,
  h: number,
  midY: number
): number {
  const minLap = baseSec + 0.2;
  const maxLap = baseSec + 5.8;
  const clamped = Math.max(minLap, Math.min(maxLap, sec));
  const norm = (clamped - minLap) / (maxLap - minLap);
  return h * TOP_BAND_PAD_TOP_RATIO + norm * (midY - h * TOP_BAND_PAD_BOTTOM_RATIO);
}

/**
 * Calculates vertical Y coordinate in backing pixels for cumulative race gap.
 */
export function computeGapY(
  gapSec: number,
  zeroY: number,
  h: number,
  midY: number
): number {
  const clamped = Math.max(-MAX_GAP_CLAMP_SEC, Math.min(MAX_GAP_CLAMP_SEC, gapSec));
  const span = (h - midY) * SPAN_FACTOR_RATIO;
  return zeroY - (clamped / MAX_GAP_CLAMP_SEC) * span;
}

/**
 * Converts a normalized horizontal ratio [0, 1] into a discrete lap index and 1-based lap number.
 */
export function projectRatioToLap(
  ratio: number,
  totalRaceLaps: number
): { lapIndex: number; lapNumber: number } {
  const total = Math.max(1, totalRaceLaps);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const lapIndex = Math.min(total - 1, Math.max(0, Math.floor(clampedRatio * total)));
  const lapNumber = Math.min(total, Math.max(1, Math.round(clampedRatio * total)));
  return { lapIndex, lapNumber };
}

/**
 * Formats a lap time in seconds to mm:ss.sss string.
 */
export function formatLapTime(sec: number): string {
  if (isNaN(sec) || sec <= 0) return '--:--.---';
  const minutes = Math.floor(sec / 60);
  const remSec = sec % 60;
  const sStr = remSec.toFixed(3).padStart(6, '0');
  return `${minutes}:${sStr}`;
}

/**
 * Detects the first discrete interval where cumulative race gap transitions across zero.
 * Solves the sub-lap linear root:
 * l_cross = lapNumber[i - 1] + (-gap[i - 1]) / (gap[i] - gap[i - 1])
 */
export function detectUndercutZeroCrossover(
  traces: readonly LapByLapStrategyTrace[],
  w: number,
  zeroY: number,
  undercutGainSec: number
): UndercutCrossoverResult | null {
  const L = traces.length;
  if (L < 2) return null;

  // 1. Primary detection: Undercut crossover where gap transitions from negative to non-negative
  for (let i = 1; i < L; i++) {
    const prev = traces[i - 1].cumulativeGapMedianSec;
    const curr = traces[i].cumulativeGapMedianSec;

    if (prev < 0 && curr >= 0) {
      const denom = curr - prev;
      const frac = denom === 0 ? 0 : (0 - prev) / denom;
      const lapNumber = traces[i - 1].lapNumber + frac;
      const xCanvas = ((lapNumber - 0.5) / L) * w;

      return {
        hasCrossover: true,
        lapNumber,
        lapIndex: i,
        xCanvas,
        yCanvas: zeroY,
        undercutGainSec,
        prevGapSec: prev,
        currGapSec: curr,
        direction: 'UNDERCUT_SUCCESS',
      };
    }
  }

  // 2. Secondary fallback: Overcut defense where gap transitions from positive to non-positive
  for (let i = 1; i < L; i++) {
    const prev = traces[i - 1].cumulativeGapMedianSec;
    const curr = traces[i].cumulativeGapMedianSec;

    if (prev > 0 && curr <= 0) {
      const denom = curr - prev;
      const frac = denom === 0 ? 0 : (0 - prev) / denom;
      const lapNumber = traces[i - 1].lapNumber + frac;
      const xCanvas = ((lapNumber - 0.5) / L) * w;

      return {
        hasCrossover: true,
        lapNumber,
        lapIndex: i,
        xCanvas,
        yCanvas: zeroY,
        undercutGainSec,
        prevGapSec: prev,
        currGapSec: curr,
        direction: 'OVERCUT_DEFENSE',
      };
    }
  }

  return null;
}

/**
 * Computes all 2*L polygon coordinates bounding the P10-P90 Monte Carlo confidence envelope.
 */
export function computeFanPolygonPoints(
  traces: readonly LapByLapStrategyTrace[],
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  const L = traces.length;
  if (L < 2) return [];

  const midY = Math.floor(h * MID_Y_RATIO);
  const zeroY = midY + (h - midY) * ZERO_Y_OFFSET_RATIO;
  const xOf = (lapIdx: number) => ((lapIdx + 0.5) / L) * w;

  const points: Array<{ x: number; y: number }> = [];

  // Forward traversal along P90 (upper boundary)
  for (let i = 0; i < L; i++) {
    points.push({
      x: xOf(i),
      y: computeGapY(traces[i].cumulativeGapP90Sec, zeroY, h, midY),
    });
  }

  // Reverse traversal along P10 (lower boundary)
  for (let i = L - 1; i >= 0; i--) {
    points.push({
      x: xOf(i),
      y: computeGapY(traces[i].cumulativeGapP10Sec, zeroY, h, midY),
    });
  }

  return points;
}

// ============================================================================
// COMPLETE STANDALONE CANVAS 2D RENDER PIPELINE
// ============================================================================

/**
 * Full Canvas 2D render pass for Strategy Fan Chart (Top and Bottom Bands).
 * Completely decoupled from React lifecycle for standalone benchmarking and unit testing.
 */
export function renderStrategyFanChart(
  ctx: CanvasRenderingContext2D,
  traces: readonly LapByLapStrategyTrace[],
  baseSec: number,
  w: number,
  h: number,
  dpr: number,
  timestampMs: number = 0,
  undercutGainSec: number = 0
): void {
  const L = traces.length;
  if (L < 2 || w <= 0 || h <= 0) return;

  // 1. Clear background to Canvas Void (#090D14)
  ctx.fillStyle = '#090D14';
  ctx.fillRect(0, 0, w, h);

  const midY = Math.floor(h * MID_Y_RATIO);
  const zeroY = midY + (h - midY) * ZERO_Y_OFFSET_RATIO;
  const xOf = (lapIdx: number) => ((lapIdx + 0.5) / L) * w;

  // 2. Draw vertical lap gridlines every 5 laps
  ctx.strokeStyle = '#141C2B';
  ctx.lineWidth = 1 * dpr;
  for (let l = 5; l < L; l += 5) {
    const x = Math.floor(xOf(l - 1)) + 0.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Lap Index Numeric Label
    ctx.fillStyle = '#475569';
    ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
    ctx.fillText(`L${l}`, x + 3 * dpr, midY - 6 * dpr);
  }

  // 3. Seam Divider Line at midY
  ctx.strokeStyle = '#1B2230';
  ctx.lineWidth = 1.0 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();

  // Splitter Sub-Header Labels
  ctx.fillStyle = '#334155';
  ctx.font = `${8 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillText('TOP BAND // STINT PACE & TYRE DEGRADATION (s)', 8 * dpr, 14 * dpr);
  ctx.fillText('BOTTOM BAND // CUMULATIVE GAP & P10-P90 MC FAN (s)', 8 * dpr, midY + 12 * dpr);

  // =========================================================================
  // 4. TOP BAND: STINT PACE & TIRE DEGRADATION CURVES
  // =========================================================================

  const drawStintCurve = (
    key: 'lapTimeASec' | 'lapTimeBSec',
    pitKey: 'isPitLapA' | 'isPitLapB',
    strokeColor: string
  ) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0 * dpr;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 0; i < L; i++) {
      const tr = traces[i];
      const x = xOf(i);
      // Pit Stop Discontinuity Clamping: on pit laps, subtract nominal pit loss (19.5s)
      const displayVal = tr[pitKey] ? tr[key] - NOMINAL_PIT_LOSS_SEC : tr[key];
      const y = computeLapTimeY(displayVal, baseSec, h, midY);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  // Render Driver A (#00E5FF) and Driver B (#B000FF)
  drawStintCurve('lapTimeASec', 'isPitLapA', '#00E5FF');
  drawStintCurve('lapTimeBSec', 'isPitLapB', '#B000FF');

  // =========================================================================
  // 5. VERTICAL PIT STOP CALLOUT RETICLES & BADGES
  // =========================================================================
  for (let i = 0; i < L; i++) {
    const tr = traces[i];
    if (tr.isPitLapA || tr.isPitLapB) {
      const x = xOf(i);
      const isA = tr.isPitLapA;
      const calloutColor = isA ? '#00E5FF' : '#B000FF';
      const targetCompound = isA ? tr.compoundA : tr.compoundB;

      // Vertical optical hairline spanning entire canvas
      ctx.strokeStyle = calloutColor;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Vertical stagger to prevent overlap: Driver A at 18*dpr, Driver B at 32*dpr
      const badgeY = (isA ? 18 : 32) * dpr;
      const badgeText = `BOX L${tr.lapNumber} [${targetCompound}]`;
      ctx.font = `bold ${9 * dpr}px "JetBrains Mono", monospace`;
      const textMetrics = ctx.measureText(badgeText);
      const badgeWidth = textMetrics.width + 12 * dpr;
      const badgeHeight = 12 * dpr;

      // Background Box (0px radius)
      ctx.fillStyle = 'rgba(9, 13, 20, 0.90)';
      ctx.fillRect(x + 2 * dpr, badgeY - 9 * dpr, badgeWidth, badgeHeight);

      // Border Box
      ctx.strokeStyle = calloutColor;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(x + 2 * dpr, badgeY - 9 * dpr, badgeWidth, badgeHeight);

      // Badge Monospace Text
      ctx.fillStyle = calloutColor;
      ctx.fillText(badgeText, x + 5 * dpr, badgeY);

      // Compound Accent Dot
      const accentCol = COMPOUND_ACCENT_COLORS[targetCompound] || '#FFFFFF';
      ctx.fillStyle = accentCol;
      ctx.beginPath();
      ctx.arc(x + badgeWidth - 4 * dpr, badgeY - 3 * dpr, 2.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // 6. BOTTOM BAND: ZERO-GAP BASELINE & P10-P90 UNCERTAINTY FAN
  // =========================================================================

  // Zero-gap dashed baseline
  ctx.save();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.0 * dpr;
  ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.beginPath();
  ctx.moveTo(0, zeroY);
  ctx.lineTo(w, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Zero-line parity label
  ctx.fillStyle = '#475569';
  ctx.font = `${8 * dpr}px "JetBrains Mono", monospace`;
  ctx.fillText('0.0s (PARITY)', w - 65 * dpr, zeroY - 3 * dpr);
  ctx.restore();

  // Shaded P10-P90 Confidence Fan Polygon
  ctx.save();
  ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
  ctx.beginPath();
  for (let i = 0; i < L; i++) {
    const x = xOf(i);
    const y = computeGapY(traces[i].cumulativeGapP90Sec, zeroY, h, midY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = L - 1; i >= 0; i--) {
    const x = xOf(i);
    const y = computeGapY(traces[i].cumulativeGapP10Sec, zeroY, h, midY);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Subtle border around fan polygon
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
  ctx.lineWidth = 1.0 * dpr;
  ctx.stroke();
  ctx.restore();

  // Median Cumulative Gap Curve (#00FF66 Neon Green)
  ctx.save();
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2.2 * dpr;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < L; i++) {
    const x = xOf(i);
    const y = computeGapY(traces[i].cumulativeGapMedianSec, zeroY, h, midY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // =========================================================================
  // 7. SUB-LAP UNDERCUT ZERO-CROSSOVER DETECTION & RETICLE
  // =========================================================================
  const crossover = detectUndercutZeroCrossover(traces, w, zeroY, undercutGainSec);
  if (crossover && crossover.direction === 'UNDERCUT_SUCCESS') {
    ctx.save();
    const { xCanvas, yCanvas, lapNumber, undercutGainSec: gain } = crossover;

    // A. Expanding Concentric Pulse Ring
    const phase = ((timestampMs % T_PULSE_MS) / T_PULSE_MS);
    const rCurrent = (4.0 + phase * 12.0) * dpr;
    const alphaPulse = Math.pow(1.0 - phase, 1.4) * 0.75;

    ctx.strokeStyle = `rgba(0, 255, 102, ${alphaPulse.toFixed(3)})`;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(xCanvas, yCanvas, rCurrent, 0, Math.PI * 2);
    ctx.stroke();

    // B. Central Diamond Reticle
    const dSize = 3.5 * dpr;
    ctx.fillStyle = '#00FF66';
    ctx.beginPath();
    ctx.moveTo(xCanvas, yCanvas - dSize);
    ctx.lineTo(xCanvas + dSize, yCanvas);
    ctx.lineTo(xCanvas, yCanvas + dSize);
    ctx.lineTo(xCanvas - dSize, yCanvas);
    ctx.closePath();
    ctx.fill();

    // C. Vertical Leader Line
    const pinTopY = yCanvas - 28 * dpr;
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(xCanvas, yCanvas - dSize);
    ctx.lineTo(xCanvas, pinTopY);
    ctx.stroke();

    // D. Clamped Callout Badge Box
    const sign = gain >= 0 ? '+' : '';
    const textStr = `▲ UNDERCUT CROSSOVER AT LAP ${lapNumber.toFixed(1)} (${sign}${gain.toFixed(2)}s GAIN)`;
    ctx.font = `bold ${9.5 * dpr}px "JetBrains Mono", monospace`;
    const textWidth = ctx.measureText(textStr).width;
    const boxW = textWidth + 16 * dpr;
    const boxH = 18 * dpr;
    const boxY = pinTopY - boxH;

    // Viewport clamp so badge never overflows canvas margins
    const halfW = boxW / 2;
    const boxX = Math.max(8 * dpr, Math.min(w - boxW - 8 * dpr, xCanvas - halfW));

    // Badge Background (#0C1017, 94% opacity, 0px radius)
    ctx.fillStyle = 'rgba(12, 16, 23, 0.94)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Badge Border (#00FF66, 1px)
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 1.0 * dpr;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Badge Text
    ctx.fillStyle = '#00FF66';
    ctx.fillText(textStr, boxX + 8 * dpr, boxY + 12.5 * dpr);

    ctx.restore();
  }
}

// ============================================================================
// SAFE POINTER CAPTURE UTILITIES
// ============================================================================

function safelyAcquirePointerCapture(element: HTMLElement | null, pointerId: number): void {
  try {
    if (element && typeof element.setPointerCapture === 'function') {
      element.setPointerCapture(pointerId);
    }
  } catch {
    // Ignore DOMExceptions on disconnected or terminated pointers
  }
}

function safelyReleasePointerCapture(element: HTMLElement | null, pointerId: number): void {
  try {
    if (element && typeof element.hasPointerCapture === 'function' && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Ignore DOMExceptions
  }
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

const StrategyFanChartComponent: React.FC<StrategyFanChartProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hairlineRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Tooltip leaf element direct references
  const lapBadgeRef = useRef<HTMLSpanElement | null>(null);
  const pitBadgeRef = useRef<HTMLSpanElement | null>(null);
  const driverAPaceRef = useRef<HTMLSpanElement | null>(null);
  const driverBPaceRef = useRef<HTMLSpanElement | null>(null);
  const gapValRef = useRef<HTMLSpanElement | null>(null);
  const fanRangeRef = useRef<HTMLSpanElement | null>(null);

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);

  // GATE 5 COMPLIANCE: Strictly authorized selectors
  const storeStrategyResult = useTelemetryStore((s) => s.strategyResult);
  const storeSessionPayload = useTelemetryStore((s) => s.sessionPayload);

  // In SSR / renderToString test environments, fallback to useTelemetryStore.getState()
  const isSsr = typeof window === 'undefined';
  const currentStoreState = isSsr ? useTelemetryStore.getState() : null;

  const strategyResult = props.strategyResult !== undefined
    ? props.strategyResult
    : (currentStoreState?.strategyResult !== undefined ? currentStoreState.strategyResult : storeStrategyResult);

  const sessionPayload = props.sessionPayload !== undefined
    ? props.sessionPayload
    : (currentStoreState?.sessionPayload !== undefined ? currentStoreState.sessionPayload : storeSessionPayload);

  // Synchronous draw frame execution
  const drawFrame = useCallback(
    (timestampMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !strategyResult || !strategyResult.lapTraces || !strategyResult.lapTraces.length) {
        return;
      }

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);

      if (w <= 0 || h <= 0) return;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const baseSec = sessionPayload?.meta.driverA.lapTimeSec ?? 79.3;
      const gain = strategyResult.undercutGainSec ?? 0;

      renderStrategyFanChart(
        ctx,
        strategyResult.lapTraces,
        baseSec,
        w,
        h,
        dpr,
        timestampMs,
        gain
      );
    },
    [strategyResult, sessionPayload]
  );

  // Continuous animation loop for pulsing acoustic crossover reticle
  useEffect(() => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    let isSubscribed = true;

    const loop = (time: number) => {
      if (!isSubscribed) return;
      drawFrame(time);
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [drawFrame]);

  // Pointer scrubbing and Direct-DOM inspector handlers
  const updateHoverInspector = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container || !strategyResult || !strategyResult.lapTraces || !strategyResult.lapTraces.length) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const width = Math.max(1, rect.width);
      const ratio = Math.max(0, Math.min(1, localX / width));

      const traces = strategyResult.lapTraces;
      const L = traces.length;
      const { lapIndex, lapNumber } = projectRatioToLap(ratio, L);
      const tr = traces[lapIndex];
      if (!tr) return;

      // 1. Position hairline guide
      if (hairlineRef.current) {
        hairlineRef.current.style.display = 'block';
        hairlineRef.current.style.transform = `translate3d(${localX}px, 0, 0)`;
      }

      // 2. Position tooltip with edge clamping
      if (tooltipRef.current) {
        const tooltipW = 210;
        const tooltipH = 110;
        let tipX = localX + 14;
        if (tipX + tooltipW > rect.width - 8) {
          tipX = localX - tooltipW - 14;
        }
        tipX = Math.max(8, Math.min(rect.width - tooltipW - 8, tipX));
        const tipY = Math.max(8, Math.min(rect.height - tooltipH - 8, localY - tooltipH / 2));

        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.transform = `translate3d(${tipX}px, ${tipY}px, 0)`;
      }

      // 3. Mutate leaf text content directly (CLS = 0, 0 React re-renders)
      if (lapBadgeRef.current) {
        lapBadgeRef.current.textContent = `LAP ${lapNumber} / ${L}`;
      }

      if (pitBadgeRef.current) {
        if (tr.isPitLapA && tr.isPitLapB) {
          pitBadgeRef.current.textContent = 'BOX A & B';
          pitBadgeRef.current.style.display = 'inline';
        } else if (tr.isPitLapA) {
          const codeA = sessionPayload?.meta.driverA.code || 'A';
          pitBadgeRef.current.textContent = `BOX ${codeA} [${tr.compoundA}]`;
          pitBadgeRef.current.style.display = 'inline';
        } else if (tr.isPitLapB) {
          const codeB = sessionPayload?.meta.driverB.code || 'B';
          pitBadgeRef.current.textContent = `BOX ${codeB} [${tr.compoundB}]`;
          pitBadgeRef.current.style.display = 'inline';
        } else {
          pitBadgeRef.current.style.display = 'none';
        }
      }

      if (driverAPaceRef.current) {
        driverAPaceRef.current.textContent = `${formatLapTime(tr.lapTimeASec)} [${tr.compoundA}]`;
      }

      if (driverBPaceRef.current) {
        driverBPaceRef.current.textContent = `${formatLapTime(tr.lapTimeBSec)} [${tr.compoundB}]`;
      }

      if (gapValRef.current) {
        const gapSign = tr.cumulativeGapMedianSec >= 0 ? '+' : '';
        const codeA = sessionPayload?.meta.driverA.code || 'A';
        const codeB = sessionPayload?.meta.driverB.code || 'B';
        const leader = tr.cumulativeGapMedianSec >= 0 ? `${codeA} LEADS` : `${codeB} LEADS`;
        gapValRef.current.textContent = `${gapSign}${tr.cumulativeGapMedianSec.toFixed(2)}s (${leader})`;
        gapValRef.current.style.color = tr.cumulativeGapMedianSec >= 0 ? '#00FF66' : '#FF1E44';
      }

      if (fanRangeRef.current) {
        const p10Sign = tr.cumulativeGapP10Sec >= 0 ? '+' : '';
        const p90Sign = tr.cumulativeGapP90Sec >= 0 ? '+' : '';
        fanRangeRef.current.textContent = `P10: ${p10Sign}${tr.cumulativeGapP10Sec.toFixed(2)}s | P90: ${p90Sign}${tr.cumulativeGapP90Sec.toFixed(2)}s`;
      }
    },
    [strategyResult, sessionPayload]
  );

  const hideHoverInspector = useCallback(() => {
    if (hairlineRef.current) hairlineRef.current.style.display = 'none';
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.buttons !== 1) return;
      isDraggingRef.current = true;
      safelyAcquirePointerCapture(containerRef.current, e.pointerId);
      updateHoverInspector(e.clientX, e.clientY);
    },
    [updateHoverInspector]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      updateHoverInspector(e.clientX, e.clientY);
    },
    [updateHoverInspector]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    safelyReleasePointerCapture(containerRef.current, e.pointerId);
  }, []);

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      safelyReleasePointerCapture(containerRef.current, e.pointerId);
      hideHoverInspector();
    },
    [hideHoverInspector]
  );

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      hideHoverInspector();
    }
  }, [hideHoverInspector]);

  // EMPTY STATE HANDLING: Render fallback when strategyResult is null or lapTraces empty
  if (!strategyResult || !strategyResult.lapTraces || !strategyResult.lapTraces.length) {
    return (
      <div
        data-testid="strategy-fanchart-empty"
        className="w-full h-full flex items-center justify-center bg-[#090D14] border border-[#1B2230] text-[11px] font-telemetry text-[#64748B]"
        style={{ borderRadius: '0px' }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="w-2 h-2 bg-[#FFE600]/80 inline-block shadow-[0_0_6px_#FFE600]" />
          <span className="font-bold text-[#94A3B8] tracking-wider uppercase">
            NO STRATEGY TELEMETRY LOADED // RUN MONTE CARLO SIMULATION
          </span>
          <span className="text-[9px] text-[#475569]">
            Awaiting 53-Lap Lap Traces from ML Strategy Oracle
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="strategy-fanchart-container"
      className="w-full h-full relative overflow-hidden bg-[#090D14] select-none touch-none"
      style={{ borderRadius: '0px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* DIRECT-DOM HOVER RETICLE HAIRLINE */}
      <div
        ref={hairlineRef}
        data-testid="scrubber-hover-hairline"
        className="absolute top-0 bottom-0 w-[1px] pointer-events-none hidden bg-[#00E5FF]/70 z-20 shadow-[0_0_4px_#00E5FF]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />

      {/* DIRECT-DOM HOVER INSPECTOR TOOLTIP HUD */}
      <div
        ref={tooltipRef}
        data-testid="scrubber-hover-tooltip"
        className="absolute pointer-events-none hidden z-30 bg-[#0C1017]/95 border border-[#1B2230] p-2 text-[10px] font-telemetry shadow-lg backdrop-blur-sm min-w-[210px]"
        style={{ borderRadius: '0px', transform: 'translate3d(0, 0, 0)' }}
      >
        {/* Header: Lap & Pit Tag */}
        <div className="flex items-center justify-between border-b border-[#1B2230] pb-1 mb-1.5">
          <span ref={lapBadgeRef} className="font-bold text-[#E2E8F0] tracking-wide">
            LAP -- / 53
          </span>
          <span
            ref={pitBadgeRef}
            className="hidden font-bold text-[9px] px-1 py-0.5 bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/40"
          >
            BOX
          </span>
        </div>

        {/* Driver Stint Pace Grid */}
        <div className="flex flex-col gap-1 text-[9.5px]">
          <div className="flex items-center justify-between">
            <span className="text-[#00E5FF] font-semibold">
              {sessionPayload?.meta.driverA.code || 'VER'} (A):
            </span>
            <span ref={driverAPaceRef} className="text-[#E2E8F0] tabular-nums font-mono">
              --:--.--- [-]
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#B000FF] font-semibold">
              {sessionPayload?.meta.driverB.code || 'NOR'} (B):
            </span>
            <span ref={driverBPaceRef} className="text-[#E2E8F0] tabular-nums font-mono">
              --:--.--- [-]
            </span>
          </div>
        </div>

        {/* Cumulative Race Gap Section */}
        <div className="mt-1.5 pt-1.5 border-t border-[#1B2230]">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="text-[#94A3B8] font-medium">CUMULATIVE GAP:</span>
            <span ref={gapValRef} className="font-bold tabular-nums font-mono text-[#00FF66]">
              0.00s (PARITY)
            </span>
          </div>
          <div className="mt-0.5 text-[8.5px] text-[#64748B] tabular-nums font-mono text-right">
            <span ref={fanRangeRef}>P10: -- | P90: --</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StrategyFanChart: React.FC<StrategyFanChartProps> = memo(StrategyFanChartComponent);
StrategyFanChart.displayName = 'StrategyFanChart';

export default StrategyFanChart;
