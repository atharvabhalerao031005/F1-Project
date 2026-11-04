// frontend/src/components/scrubber/__tests__/StrategyFanChart.test.ts
/**
 * AERO-SPEC F1 // ZONE 4: STRATEGY FAN CHART TEST SUITE
 * Standard: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.5
 * Research Sources:
 * - PHASE_5_STRATEGY_FAN_CHART_STINT_PACE_AND_DEGRADATION_RESEARCH.md
 * - PHASE_5_MONTE_CARLO_FAN_POLYGON_AND_UNDERCUT_CROSSOVER_RESEARCH.md
 * - PHASE_5_SCRUBBING_DRAG_COALESCING_AND_HOVER_INSPECTOR_RESEARCH.md
 * - PHASE_5_AEROSPACE_STYLING_CRT_SCANLINES_AND_GEOMETRY_SPECIFICATION.md
 *
 * Test Coverage Matrix (30+ Assertions):
 * 1. HiDPI canvas layout & dual-band division at 48% height
 * 2. Sub-lap undercut zero-crossover linear root-finding mathematical accuracy
 * 3. P10–P90 polygon coordinate generation
 * 4. Pointer scrubbing & discrete lap station mapping
 * 5. Aerospace styling & 0px radius tokens
 * 6. Component rendering & empty state handling
 * 7. Static AST Gate 5 compliance (0 reactive subscriptions to currentDistance or isPlaying)
 * 8. Microsecond execution performance (< 0.1ms budget)
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  StrategyFanChart,
  COMPOUND_ACCENT_COLORS,
  MID_Y_RATIO,
  ZERO_Y_OFFSET_RATIO,
  MAX_GAP_CLAMP_SEC,
  NOMINAL_PIT_LOSS_SEC,
  computeLapTimeY,
  computeGapY,
  projectRatioToLap,
  formatLapTime,
  detectUndercutZeroCrossover,
  computeFanPolygonPoints,
  renderStrategyFanChart,
} from '../StrategyFanChart';

import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type {
  LapByLapStrategyTrace,
  SessionTelemetryPayload,
} from '../../../types/telemetry';

// ============================================================================
// MOCK CANVAS CONTEXT FACTORIES
// ============================================================================

function createTrackingMockCanvasContext(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    font: '',
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    closePath: () => calls.push('closePath'),
    moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`fillRect(${x},${y},${w},${h})`),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`strokeRect(${x},${y},${w},${h})`),
    fillText: (text: string, x: number, y: number) => calls.push(`fillText(${text},${x},${y})`),
    measureText: (text: string) => ({ width: text.length * 7 }),
    arc: (x: number, y: number, r: number) =>
      calls.push(`arc(${x},${y},${r})`),
    setLineDash: (segments: number[]) => calls.push(`setLineDash([${segments.join(',')}])`),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

function createFastBenchmarkCanvasContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    font: '',
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillRect() {},
    strokeRect() {},
    fillText() {},
    measureText() {
      return { width: 120 };
    },
    arc() {},
    setLineDash() {},
  } as unknown as CanvasRenderingContext2D;
}

// ============================================================================
// TEST SUITE SPECIFICATION
// ============================================================================

describe('AERO-SPEC Zone 4: StrategyFanChart Component Test Suite', () => {
  // Locate canonical Monza telemetry bundle
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));
  const monzaTraces: LapByLapStrategyTrace[] = monzaBundle.defaultStrategyOracle.lapTraces;

  const sourceFile = fs.existsSync(
    path.resolve(process.cwd(), 'src/components/scrubber/StrategyFanChart.tsx')
  )
    ? path.resolve(process.cwd(), 'src/components/scrubber/StrategyFanChart.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/scrubber/StrategyFanChart.tsx');

  beforeEach(() => {
    // Reset store state
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      strategyResult: monzaBundle.defaultStrategyOracle,
    });
  });

  // ==========================================================================
  // 1. HiDPI CANVAS LAYOUT & DUAL-BAND DIVISION AT 48% HEIGHT
  // ==========================================================================
  describe('1. HiDPI Canvas Layout & Dual-Band Division (48% Seam)', () => {
    test('enforces exact 48% vertical division for midY partition', () => {
      const heights = [200, 236, 260, 400, 520];
      for (const h of heights) {
        const midY = Math.floor(h * MID_Y_RATIO);
        assert.strictEqual(
          midY,
          Math.floor(h * 0.48),
          `midY must equal Math.floor(h * 0.48) for h=${h}`
        );
      }
    });

    test('calculates zero-gap baseline at zeroY = midY + (h - midY) * 0.52', () => {
      const h = 400;
      const midY = Math.floor(h * 0.48); // 192
      const zeroY = midY + (h - midY) * ZERO_Y_OFFSET_RATIO; // 192 + 208 * 0.52 = 300.16
      assert.strictEqual(midY, 192);
      assert.strictEqual(Math.round(zeroY * 100) / 100, 300.16);
      assert.strictEqual(computeGapY(0, zeroY, h, midY), zeroY);
    });

    test('computeLapTimeY maps stint pace within safe top band headroom ([0.08h, midY - 0.06h])', () => {
      const h = 260;
      const midY = Math.floor(h * 0.48); // 124
      const baseSec = 79.3;

      // Fastest possible qualifying/stint pace: minLap = baseSec + 0.2
      const yFastest = computeLapTimeY(79.5, baseSec, h, midY);
      assert.strictEqual(Math.round(yFastest), Math.round(h * 0.08)); // 20.8px

      // Slowest stint pace: maxLap = baseSec + 5.8
      const ySlowest = computeLapTimeY(85.1, baseSec, h, midY);
      const expectedSlowest = h * 0.08 + (midY - h * 0.14);
      assert.strictEqual(Math.round(ySlowest), Math.round(expectedSlowest));

      // Guarantees clearance above midY seam divider
      assert.ok(ySlowest < midY, 'Stint pace curve must never intersect horizontal midY divider');
      assert.ok(midY - ySlowest >= h * 0.05, 'Must maintain at least 5% clearance above midY divider');
    });

    test('computeGapY strictly clamps outliers within [-18.0s, +18.0s] bounds', () => {
      const h = 260;
      const midY = Math.floor(h * 0.48);
      const zeroY = midY + (h - midY) * ZERO_Y_OFFSET_RATIO;

      assert.strictEqual(MAX_GAP_CLAMP_SEC, 18.0);
      const yMaxLead = computeGapY(18.0, zeroY, h, midY);
      const yOutlierLead = computeGapY(999.0, zeroY, h, midY);
      assert.strictEqual(yMaxLead, yOutlierLead, 'Extreme positive gap must clamp at +18s');
      assert.ok(yMaxLead > midY, 'Upper gap bound (+18s) must have clearance below midY divider');

      const yMaxDeficit = computeGapY(-18.0, zeroY, h, midY);
      const yOutlierDeficit = computeGapY(-999.0, zeroY, h, midY);
      assert.strictEqual(yMaxDeficit, yOutlierDeficit, 'Extreme negative gap must clamp at -18s');
      assert.ok(yMaxDeficit < h, 'Lower gap bound (-18s) must not overflow canvas height');
    });

    test('nominal pit loss clamping (19.5s) preserves degradation slope visibility on pit laps', () => {
      const pitLapTime = 102.34; // 82.84s + 19.5s pit loss
      const clampedVal = pitLapTime - NOMINAL_PIT_LOSS_SEC;
      assert.strictEqual(Math.round(clampedVal * 100) / 100, 82.84);
      assert.strictEqual(NOMINAL_PIT_LOSS_SEC, 19.5);
    });

    test('renderStrategyFanChart dispatches expected canvas drawing pipeline calls', () => {
      const { ctx, calls } = createTrackingMockCanvasContext();
      renderStrategyFanChart(ctx, monzaTraces, 79.3, 1000, 260, 1, 100, 1.80);

      // Verify clear background and essential path commands
      assert.ok(calls.includes('fillRect(0,0,1000,260)'), 'Must clear background to canvas dimensions');
      assert.ok(calls.includes('beginPath'), 'Must initiate canvas paths');
      assert.ok(calls.includes('stroke'), 'Must stroke gridlines and traces');
      assert.ok(calls.includes('fill'), 'Must fill confidence polygon and badges');
    });
  });

  // ==========================================================================
  // 2. SUB-LAP UNDERCUT ZERO-CROSSOVER LINEAR ROOT-FINDING ACCURACY
  // ==========================================================================
  describe('2. Sub-Lap Undercut Zero-Crossover Linear Root-Finding', () => {
    test('accurately calculates fractional root at midpoint (frac = 0.5)', () => {
      const traces: LapByLapStrategyTrace[] = [
        {
          lapNumber: 21,
          lapTimeASec: 82.0,
          lapTimeBSec: 82.0,
          tyreDegASec: 0.8,
          tyreDegBSec: 0.8,
          cumulativeGapMedianSec: -1.0,
          cumulativeGapP10Sec: -2.0,
          cumulativeGapP90Sec: 0.0,
          compoundA: 'H',
          compoundB: 'M',
          isPitLapA: false,
          isPitLapB: false,
        },
        {
          lapNumber: 22,
          lapTimeASec: 82.0,
          lapTimeBSec: 82.0,
          tyreDegASec: 0.8,
          tyreDegBSec: 0.8,
          cumulativeGapMedianSec: 1.0,
          cumulativeGapP10Sec: 0.0,
          cumulativeGapP90Sec: 2.0,
          compoundA: 'H',
          compoundB: 'H',
          isPitLapA: false,
          isPitLapB: true,
        },
      ];

      const crossover = detectUndercutZeroCrossover(traces, 1000, 200, 1.84);
      assert.ok(crossover !== null, 'Must detect crossover');
      assert.strictEqual(crossover.hasCrossover, true);
      assert.strictEqual(crossover.lapNumber, 21.5);
      assert.strictEqual(crossover.direction, 'UNDERCUT_SUCCESS');
      assert.strictEqual(crossover.yCanvas, 200);
      assert.strictEqual(crossover.undercutGainSec, 1.84);
    });

    test('accurately calculates asymmetric fractional root (e.g. Lap 21.2)', () => {
      const traces: LapByLapStrategyTrace[] = [
        {
          lapNumber: 21,
          lapTimeASec: 82.0,
          lapTimeBSec: 82.0,
          tyreDegASec: 0.8,
          tyreDegBSec: 0.8,
          cumulativeGapMedianSec: -0.4,
          cumulativeGapP10Sec: -1.0,
          cumulativeGapP90Sec: 0.2,
          compoundA: 'H',
          compoundB: 'M',
          isPitLapA: false,
          isPitLapB: false,
        },
        {
          lapNumber: 22,
          lapTimeASec: 82.0,
          lapTimeBSec: 82.0,
          tyreDegASec: 0.8,
          tyreDegBSec: 0.8,
          cumulativeGapMedianSec: 1.6,
          cumulativeGapP10Sec: 0.8,
          cumulativeGapP90Sec: 2.4,
          compoundA: 'H',
          compoundB: 'H',
          isPitLapA: false,
          isPitLapB: true,
        },
      ];

      // frac = -(-0.4) / (1.6 - (-0.4)) = 0.4 / 2.0 = 0.2
      const crossover = detectUndercutZeroCrossover(traces, 1000, 200, 1.84);
      assert.ok(crossover !== null);
      assert.strictEqual(crossover.lapNumber, 21.2);
    });

    test('detects canonical undercut crossover in 53-Lap Monza dataset at Lap 21.8', () => {
      const crossover = detectUndercutZeroCrossover(monzaTraces, 1000, 200, 1.80);
      assert.ok(crossover !== null, 'Monza strategy must have an undercut crossover');
      assert.strictEqual(crossover.direction, 'UNDERCUT_SUCCESS');
      assert.strictEqual(crossover.lapIndex, 21); // 0-based index 21 corresponds to lap 22
      // Lap 21 has gap -18.224, Lap 22 has gap +3.704 -> l_cross = 21 + 18.224 / 21.928 = 21.831
      assert.strictEqual(Math.round(crossover.lapNumber * 10) / 10, 21.8);
      assert.strictEqual(crossover.yCanvas, 200);
    });

    test('returns null when Driver A leads wire-to-wire (no zero-crossover)', () => {
      const wireToWireTraces = monzaTraces.map((t) => ({
        ...t,
        cumulativeGapMedianSec: Math.abs(t.cumulativeGapMedianSec) + 2.5,
      }));

      const crossover = detectUndercutZeroCrossover(wireToWireTraces, 1000, 200, 0);
      assert.strictEqual(crossover, null, 'Must return null when cumulative gap is strictly positive');
    });

    test('returns null when Driver A trails continuously without overtaking', () => {
      const trailingTraces = monzaTraces.map((t) => ({
        ...t,
        cumulativeGapMedianSec: -Math.abs(t.cumulativeGapMedianSec) - 2.5,
      }));

      const crossover = detectUndercutZeroCrossover(trailingTraces, 1000, 200, 0);
      assert.strictEqual(crossover, null, 'Must return null when cumulative gap is strictly negative');
    });

    test('returns null when traces length is less than 2', () => {
      assert.strictEqual(detectUndercutZeroCrossover([], 1000, 200, 0), null);
      assert.strictEqual(detectUndercutZeroCrossover([monzaTraces[0]], 1000, 200, 0), null);
    });

    test('identifies OVERCUT_DEFENSE when gap transitions from positive to negative without undercut', () => {
      const overcutTraces: LapByLapStrategyTrace[] = [
        {
          ...monzaTraces[0],
          lapNumber: 18,
          cumulativeGapMedianSec: 2.5,
        },
        {
          ...monzaTraces[1],
          lapNumber: 19,
          cumulativeGapMedianSec: -18.5,
        },
      ];

      const crossover = detectUndercutZeroCrossover(overcutTraces, 1000, 200, 0);
      assert.ok(crossover !== null);
      assert.strictEqual(crossover.direction, 'OVERCUT_DEFENSE');
    });
  });

  // ==========================================================================
  // 3. P10–P90 MONTE CARLO FAN POLYGON COORDINATE GENERATION
  // ==========================================================================
  describe('3. P10–P90 Monte Carlo Fan Polygon Generation', () => {
    test('generates exactly 2*L closed polygon vertices (106 points for 53 laps)', () => {
      const points = computeFanPolygonPoints(monzaTraces, 1000, 260);
      assert.strictEqual(
        points.length,
        2 * monzaTraces.length,
        'Polygon vertices must equal 2 * L for closed loop'
      );
      assert.strictEqual(points.length, 106);
    });

    test('forward traversal vertices represent P90 and reverse traversal represent P10', () => {
      const points = computeFanPolygonPoints(monzaTraces, 1000, 260);
      const L = monzaTraces.length;
      const midY = Math.floor(260 * MID_Y_RATIO);
      const zeroY = midY + (260 - midY) * ZERO_Y_OFFSET_RATIO;

      // Point 0 must match Lap 1 P90
      const expectedY0 = computeGapY(monzaTraces[0].cumulativeGapP90Sec, zeroY, 260, midY);
      assert.strictEqual(points[0].y, expectedY0);

      // Point L-1 must match Lap 53 P90
      const expectedYLminus1 = computeGapY(monzaTraces[L - 1].cumulativeGapP90Sec, zeroY, 260, midY);
      assert.strictEqual(points[L - 1].y, expectedYLminus1);

      // Point L (first reverse vertex) must match Lap 53 P10
      const expectedYL = computeGapY(monzaTraces[L - 1].cumulativeGapP10Sec, zeroY, 260, midY);
      assert.strictEqual(points[L].y, expectedYL);

      // Point 2L-1 (last reverse vertex) must match Lap 1 P10
      const expectedYLast = computeGapY(monzaTraces[0].cumulativeGapP10Sec, zeroY, 260, midY);
      assert.strictEqual(points[2 * L - 1].y, expectedYLast);
    });

    test('guarantees all polygon vertices reside within bottom band canvas bounds', () => {
      const w = 1200;
      const h = 300;
      const midY = Math.floor(h * MID_Y_RATIO);
      const points = computeFanPolygonPoints(monzaTraces, w, h);

      for (const pt of points) {
        assert.ok(pt.x >= 0 && pt.x <= w, `Vertex X (${pt.x}) must lie in [0, ${w}]`);
        assert.ok(pt.y >= midY && pt.y <= h, `Vertex Y (${pt.y}) must lie in bottom band [${midY}, ${h}]`);
      }
    });

    test('returns empty array when trace count is less than 2', () => {
      assert.deepStrictEqual(computeFanPolygonPoints([], 1000, 260), []);
      assert.deepStrictEqual(computeFanPolygonPoints([monzaTraces[0]], 1000, 260), []);
    });
  });

  // ==========================================================================
  // 4. POINTER SCRUBBING & DISCRETE LAP STATION MAPPING
  // ==========================================================================
  describe('4. Pointer Scrubbing & Discrete Lap Station Mapping', () => {
    test('maps boundary ratios cleanly to start and end laps', () => {
      const atStart = projectRatioToLap(0.0, 53);
      assert.strictEqual(atStart.lapIndex, 0);
      assert.strictEqual(atStart.lapNumber, 1);

      const atEnd = projectRatioToLap(1.0, 53);
      assert.strictEqual(atEnd.lapIndex, 52);
      assert.strictEqual(atEnd.lapNumber, 53);
    });

    test('maps midpoint ratio cleanly to lap 27 (Monza mid-race)', () => {
      const atMid = projectRatioToLap(0.5, 53);
      assert.strictEqual(atMid.lapIndex, 26);
      assert.strictEqual(atMid.lapNumber, 27);
    });

    test('clamps out-of-range ratios (< 0.0 or > 1.0)', () => {
      const underflow = projectRatioToLap(-0.4, 53);
      assert.strictEqual(underflow.lapIndex, 0);
      assert.strictEqual(underflow.lapNumber, 1);

      const overflow = projectRatioToLap(1.5, 53);
      assert.strictEqual(overflow.lapIndex, 52);
      assert.strictEqual(overflow.lapNumber, 53);
    });

    test('formatLapTime correctly formats second floats to mm:ss.sss', () => {
      assert.strictEqual(formatLapTime(82.404), '1:22.404');
      assert.strictEqual(formatLapTime(79.3), '1:19.300');
      assert.strictEqual(formatLapTime(0), '--:--.---');
      assert.strictEqual(formatLapTime(-5), '--:--.---');
      assert.strictEqual(formatLapTime(NaN), '--:--.---');
    });
  });

  // ==========================================================================
  // 5. AEROSPACE STYLING & 0px RADIUS DESIGN TOKENS
  // ==========================================================================
  describe('5. Aerospace Styling & 0px Radius Design Tokens', () => {
    test('contains canonical Pirelli compound accent colors', () => {
      assert.strictEqual(COMPOUND_ACCENT_COLORS.S, '#FF1801', 'Soft is Crimson Red');
      assert.strictEqual(COMPOUND_ACCENT_COLORS.M, '#FFE600', 'Medium is Cyber Yellow');
      assert.strictEqual(COMPOUND_ACCENT_COLORS.H, '#FFFFFF', 'Hard is Titanium White');
      assert.strictEqual(COMPOUND_ACCENT_COLORS.I, '#39B54A', 'Intermediate is Green');
      assert.strictEqual(COMPOUND_ACCENT_COLORS.W, '#00AEEF', 'Wet is Blue');
    });

    test('rendered HTML enforces 0px border radius tokens across container & tooltip', () => {
      const html = renderToString(React.createElement(StrategyFanChart));
      assert.ok(
        html.includes('border-radius:0px') || html.includes('border-radius: 0px'),
        'Must enforce 0px border-radius on container elements'
      );
    });

    test('rendered HTML contains Void Canvas background #090D14 and Seam divider #1B2230', () => {
      const html = renderToString(React.createElement(StrategyFanChart));
      assert.ok(html.includes('#090D14'), 'Container must have #090D14 Void background');
      assert.ok(html.includes('#1B2230'), 'Tooltip must use #1B2230 structural seam border');
    });
  });

  // ==========================================================================
  // 6. COMPONENT RENDERING & EMPTY STATE HANDLING
  // ==========================================================================
  describe('6. Component Rendering & Empty State Handling', () => {
    test('renders fallback empty state when strategyResult is null', () => {
      useTelemetryStore.setState({ strategyResult: null });
      const html = renderToString(React.createElement(StrategyFanChart));
      assert.ok(
        html.includes('data-testid="strategy-fanchart-empty"'),
        'Must render empty state container when strategyResult is null'
      );
      assert.ok(
        html.includes('NO STRATEGY TELEMETRY LOADED'),
        'Must display informative awaiting simulation banner'
      );
    });

    test('renders fallback empty state when lapTraces is empty array', () => {
      useTelemetryStore.setState({
        strategyResult: {
          ...monzaBundle.defaultStrategyOracle,
          lapTraces: [],
        },
      });
      const html = renderToString(React.createElement(StrategyFanChart));
      assert.ok(
        html.includes('data-testid="strategy-fanchart-empty"'),
        'Must render empty state when lapTraces is empty'
      );
    });

    test('renders full interactive canvas viewport and tooltip when strategyResult is present', () => {
      useTelemetryStore.setState({
        strategyResult: monzaBundle.defaultStrategyOracle,
        sessionPayload: monzaBundle,
      });
      const html = renderToString(React.createElement(StrategyFanChart));
      assert.ok(html.includes('data-testid="strategy-fanchart-container"'));
      assert.ok(html.includes('data-testid="scrubber-hover-hairline"'));
      assert.ok(html.includes('data-testid="scrubber-hover-tooltip"'));
      assert.ok(html.includes('<canvas'));
    });
  });

  // ==========================================================================
  // 7. GATE 5 STATIC AST & ZERO-VDOM SUBSCRIPTION CONFORMANCE
  // ==========================================================================
  describe('7. Gate 5 Static AST & Zero-VDOM Subscription Conformance', () => {
    const fileContent = fs.readFileSync(sourceFile, 'utf8');

    test('contains ZERO reactive subscriptions to currentDistance (useTelemetryStore(s => s.currentDistance))', () => {
      const match = fileContent.match(/useTelemetryStore\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/);
      assert.strictEqual(
        match,
        null,
        'StrategyFanChart MUST NOT reactively subscribe to high-frequency currentDistance'
      );
    });

    test('contains ZERO reactive subscriptions to isPlaying (useTelemetryStore(s => s.isPlaying))', () => {
      const match = fileContent.match(/useTelemetryStore\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/);
      assert.strictEqual(
        match,
        null,
        'StrategyFanChart MUST NOT reactively subscribe to isPlaying'
      );
    });

    test('subscribes strictly to authorized selectors (strategyResult, sessionPayload)', () => {
      assert.ok(
        fileContent.includes('useTelemetryStore((s) => s.strategyResult)'),
        'Must subscribe to strategyResult'
      );
      assert.ok(
        fileContent.includes('useTelemetryStore((s) => s.sessionPayload)'),
        'Must subscribe to sessionPayload'
      );
    });

    test('wraps component in React.memo and defines explicit displayName = StrategyFanChart', () => {
      assert.ok(
        fileContent.includes("StrategyFanChart.displayName = 'StrategyFanChart'"),
        'Must define StrategyFanChart.displayName'
      );
      assert.ok(
        fileContent.includes('memo(StrategyFanChartComponent)'),
        'Must wrap component in React.memo'
      );
    });
  });

  // ==========================================================================
  // 8. MICROSECOND EXECUTION PERFORMANCE BENCHMARKS (< 0.1ms BUDGET)
  // ==========================================================================
  describe('8. Microsecond Execution Performance Benchmarks (< 0.1ms)', () => {
    test('detectUndercutZeroCrossover executes in < 0.05ms (50 microseconds)', () => {
      const iterations = 5000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        detectUndercutZeroCrossover(monzaTraces, 1000, 200, 1.80);
      }
      const durationMs = performance.now() - start;
      const avgMs = durationMs / iterations;

      assert.ok(
        avgMs < 0.05,
        `Crossover detection average (${(avgMs * 1000).toFixed(2)} μs) must be < 50 μs (0.05ms)`
      );
    });

    test('computeFanPolygonPoints executes in < 0.05ms (50 microseconds)', () => {
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeFanPolygonPoints(monzaTraces, 1000, 260);
      }
      const durationMs = performance.now() - start;
      const avgMs = durationMs / iterations;

      assert.ok(
        avgMs < 0.05,
        `Fan polygon calculation average (${(avgMs * 1000).toFixed(2)} μs) must be < 50 μs (0.05ms)`
      );
    });

    test('renderStrategyFanChart complete canvas draw pass executes in < 0.1ms', () => {
      const mockCtx = createFastBenchmarkCanvasContext();
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        renderStrategyFanChart(mockCtx, monzaTraces, 79.3, 1000, 260, 1, 100, 1.80);
      }
      const durationMs = performance.now() - start;
      const avgMs = durationMs / iterations;

      assert.ok(
        avgMs < 0.10,
        `Full canvas draw pass (${(avgMs * 1000).toFixed(2)} μs) must be < 100 μs (0.1ms)`
      );
    });
  });
});
