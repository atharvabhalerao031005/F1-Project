// frontend/src/components/scrubber/__tests__/TelemetryOscillograph.test.ts
/**
 * AERO-SPEC F1 // ZONE 4 TELEMETRY OSCILLOGRAPH TEST SUITE
 * Standard: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.6 & Gate 5 Conformance
 *
 * Comprehensive Test Coverage:
 * 1. Dual Canvas DOM Mounting & HiDPI Backing Store Scaling
 * 2. 4-Band Vertical Layout Coordinate Math & Band Spans (32%, 16%, 18%, 14%)
 * 3. Static AST Gate 5 Conformance (Zero-VDOM Subscription Contract)
 * 4. Aerospace Design Tokens & Geometry Standards
 * 5. ML Physics-Warp Ghost Trace Overlay Activation
 * 6. W3C Pointer Scrubbing Math & Spatial Distance Clamping
 * 7. Strided Decimation (m += 2) & Microsecond Canvas Rendering Benchmark (< 0.25ms)
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  TelemetryOscillograph,
  BAND_LAYOUT,
  HORIZONTAL_DIVIDER_PCTS,
  OSCILLOGRAPH_TOKENS,
  computeBandY,
  projectPointerToDistance,
  configureHiDpiCanvas,
  drawStridedTrace,
  renderBackgroundCanvas,
  renderForegroundCanvas,
  formatHudMetrics,
} from '../TelemetryOscillograph';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import { buildSpatialCornerLut } from '../../../utils/cornerProximity';
import { computeMlPhysicsWarp } from '../../../utils/clientMlSimulator';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 5: TelemetryOscillograph (Zone 4) Test Suite', () => {
  // Locate real telemetry fixtures robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const silverstonePath = path.resolve(telemetryDir, '2024_silverstone_q3_ver_nor.json');
  const silverstoneBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(silverstonePath, 'utf8'));

  const componentPath = fs.existsSync(
    path.resolve(process.cwd(), 'src/components/scrubber/TelemetryOscillograph.tsx')
  )
    ? path.resolve(process.cwd(), 'src/components/scrubber/TelemetryOscillograph.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/scrubber/TelemetryOscillograph.tsx');

  // Mock canvas helper for headless rendering tests and benchmarks
  function createMockCanvas(width = 1920, height = 236, recordOps = true) {
    const operations: string[] = [];
    const strokeStyles: string[] = [];
    const fillStyles: string[] = [];
    const lineDashes: number[][] = [];

    const ctx = {
      canvas: { width, height },
      width,
      height,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'left',
      shadowColor: 'transparent',
      shadowBlur: 0,
      fillRect: (x: number, y: number, w: number, h: number) => {
        if (recordOps) operations.push(`fillRect:${x},${y},${w},${h}`);
        fillStyles.push(ctx.fillStyle as string);
      },
      strokeRect: (x: number, y: number, w: number, h: number) => {
        if (recordOps) operations.push(`strokeRect:${x},${y},${w},${h}`);
      },
      clearRect: (x: number, y: number, w: number, h: number) => {
        if (recordOps) operations.push(`clearRect:${x},${y},${w},${h}`);
      },
      beginPath: () => {
        if (recordOps) operations.push('beginPath');
      },
      moveTo: (x: number, y: number) => {
        if (recordOps) operations.push(`moveTo:${Math.round(x)},${Math.round(y)}`);
      },
      lineTo: (x: number, y: number) => {
        if (recordOps) operations.push(`lineTo:${Math.round(x)},${Math.round(y)}`);
      },
      stroke: () => {
        if (recordOps) operations.push('stroke');
        strokeStyles.push(ctx.strokeStyle as string);
      },
      fill: () => {
        if (recordOps) operations.push('fill');
      },
      closePath: () => {
        if (recordOps) operations.push('closePath');
      },
      setLineDash: (d: number[]) => {
        lineDashes.push([...d]);
      },
      fillText: (text: string, x: number, y: number) => {
        if (recordOps) operations.push(`fillText:${text}:${Math.round(x)},${Math.round(y)}`);
      },
      drawImage: (_img: unknown, x: number, y: number) => {
        if (recordOps) operations.push(`drawImage:${x},${y}`);
      },
      save: () => {
        if (recordOps) operations.push('save');
      },
      restore: () => {
        if (recordOps) operations.push('restore');
      },
    };

    const canvas = {
      width,
      height,
      style: { width: `${width}px`, height: `${height}px` },
      getContext: (type: string) => (type === '2d' ? ctx : null),
      operations,
      strokeStyles,
      fillStyles,
      lineDashes,
      ctx,
    };

    return canvas as unknown as HTMLCanvasElement & {
      operations: string[];
      strokeStyles: string[];
      fillStyles: string[];
      lineDashes: number[][];
      ctx: CanvasRenderingContext2D;
    };
  }

  beforeEach(() => {
    // Reset Zustand store state before each test
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: monzaBundle.gridLength,
      isPlaying: false,
      playbackSpeed: 1.0,
      cameraMode: 'ISO',
      trackColorMode: 'PEDAL',
      elevationScale: 3.5,
      loopSector: 'ALL',
      mlWarpParams: {
        enabled: false,
        compound: 'S',
        tyreAgeLaps: 18,
        fuelLoadKg: 45,
        trackTempC: 42.4,
      },
      mlWarpOutput: null,
    });
  });

  // ==========================================================================
  // SUITE 1: DUAL CANVAS DOM MOUNTING & HIDPI SCALING
  // ==========================================================================
  describe('Suite 1: Dual Canvas DOM Mounting & HiDPI Scaling', () => {
    test('renders dual canvas elements in DOM with exact IDs (#bg-oscillograph, #fg-oscillograph)', () => {
      const html = renderToString(React.createElement(TelemetryOscillograph));

      assert.ok(html.includes('id="bg-oscillograph"'), 'Must contain canvas #bg-oscillograph');
      assert.ok(html.includes('id="fg-oscillograph"'), 'Must contain canvas #fg-oscillograph');
      assert.ok(html.includes('data-testid="bg-oscillograph"'), 'Must contain data-testid="bg-oscillograph"');
      assert.ok(html.includes('data-testid="fg-oscillograph"'), 'Must contain data-testid="fg-oscillograph"');
    });

    test('renders outer container with touch-action: none and relative layout', () => {
      const html = renderToString(React.createElement(TelemetryOscillograph));

      assert.ok(html.includes('data-testid="telemetry-oscillograph-container"'));
      assert.ok(html.includes('touch-action:none') || html.includes('touch-action: none'));
      assert.ok(html.includes('relative'));
      assert.ok(html.includes('overflow-hidden'));
    });

    test('HiDPI scaling correctly configures 1.0x DPR canvas dimensions', () => {
      const mock = { width: 0, height: 0, style: { width: '', height: '' } } as HTMLCanvasElement;
      const res = configureHiDpiCanvas(mock, 1920, 236, 1.0);

      assert.strictEqual(res.width, 1920);
      assert.strictEqual(res.height, 236);
      assert.strictEqual(mock.width, 1920);
      assert.strictEqual(mock.height, 236);
      assert.strictEqual(mock.style.width, '1920px');
      assert.strictEqual(mock.style.height, '236px');
    });

    test('HiDPI scaling correctly configures 2.0x Retina DPR canvas dimensions', () => {
      const mock = { width: 0, height: 0, style: { width: '', height: '' } } as HTMLCanvasElement;
      const res = configureHiDpiCanvas(mock, 1920, 236, 2.0);

      assert.strictEqual(res.width, 3840);
      assert.strictEqual(res.height, 472);
      assert.strictEqual(mock.width, 3840);
      assert.strictEqual(mock.height, 472);
      assert.strictEqual(mock.style.width, '1920px');
      assert.strictEqual(mock.style.height, '236px');
    });

    test('HiDPI scaling handles fractional 1.25x and 1.5x display scaling smoothly', () => {
      const mock = { width: 0, height: 0, style: { width: '', height: '' } } as HTMLCanvasElement;
      const res125 = configureHiDpiCanvas(mock, 1600, 240, 1.25);
      assert.strictEqual(res125.width, 2000);
      assert.strictEqual(res125.height, 300);

      const res15 = configureHiDpiCanvas(mock, 1600, 240, 1.5);
      assert.strictEqual(res15.width, 2400);
      assert.strictEqual(res15.height, 360);
    });
  });

  // ==========================================================================
  // SUITE 2: 4-BAND VERTICAL LAYOUT COORDINATE MATH & BAND SPANS
  // ==========================================================================
  describe('Suite 2: 4-Band Vertical Layout Coordinate Math & Band Spans', () => {
    test('enforces exact architectural band percentage spans (32%, 16%, 18%, 14%)', () => {
      assert.strictEqual(BAND_LAYOUT.speed.span, 0.32, 'Band 1 Speed span must be 32%');
      assert.strictEqual(BAND_LAYOUT.deltaT.span, 0.16, 'Band 2 Delta-T span must be 16%');
      assert.strictEqual(BAND_LAYOUT.throttle.span, 0.18, 'Band 3 Throttle span must be 18%');
      assert.strictEqual(BAND_LAYOUT.brake.span, 0.14, 'Band 4 Brake span must be 14%');

      // 4 bands + 5 gutters (4% each) = 100.0%
      const totalBandSpan =
        BAND_LAYOUT.speed.span +
        BAND_LAYOUT.deltaT.span +
        BAND_LAYOUT.throttle.span +
        BAND_LAYOUT.brake.span;
      const totalGutters = 5 * 0.04;
      assert.strictEqual(
        Math.round((totalBandSpan + totalGutters) * 100) / 100,
        1.0,
        'Bands and gutters must partition 100% of vertical height'
      );
    });

    test('verifies horizontal divider percentages matrix', () => {
      assert.strictEqual(HORIZONTAL_DIVIDER_PCTS.length, 8);
      assert.deepStrictEqual(HORIZONTAL_DIVIDER_PCTS, [0.04, 0.36, 0.40, 0.56, 0.60, 0.78, 0.82, 0.96]);
    });

    test('Band 1 Speed coordinate math maps 60-360 km/h accurately', () => {
      const H = 200;
      const { minV, maxV, topPct, botPct } = BAND_LAYOUT.speed;

      // 360 km/h maps to top boundary: 0.04 * 200 = 8px
      const yMax = computeBandY(maxV, minV, maxV, topPct, botPct, H);
      assert.strictEqual(yMax, 8);

      // 60 km/h maps to bottom boundary: 0.36 * 200 = 72px
      const yMin = computeBandY(minV, minV, maxV, topPct, botPct, H);
      assert.strictEqual(yMin, 72);

      // Midpoint (210 km/h) maps to 0.20 * 200 = 40px
      const yMid = computeBandY(210, minV, maxV, topPct, botPct, H);
      assert.strictEqual(yMid, 40);

      // Clamps out-of-range values
      assert.strictEqual(computeBandY(400, minV, maxV, topPct, botPct, H), 8);
      assert.strictEqual(computeBandY(20, minV, maxV, topPct, botPct, H), 72);
    });

    test('Band 2 Delta-T anchors zero reference line at geometric center in baseline mode', () => {
      const H = 200;
      const { topPct, botPct, minVBase, maxVBase } = BAND_LAYOUT.deltaT;

      // In baseline mode [-0.5s, +0.5s], delta=0 is at 50% of the 16% span -> y = 0.48 * H
      const zeroY = computeBandY(0.0, minVBase, maxVBase, topPct, botPct, H);
      assert.strictEqual(zeroY, 0.48 * H); // 96px
    });

    test('Band 2 Delta-T anchors zero line lower in ML Warped mode to provide +3.5s positive headroom', () => {
      const H = 200;
      const { topPct, botPct, minVWarp, maxVWarp } = BAND_LAYOUT.deltaT;

      // In warped mode [-0.5s, +3.5s], delta=0 is at (0 - (-0.5)) / 4.0 = 0.125 from bottom -> y = 0.54 * H
      const zeroY = computeBandY(0.0, minVWarp, maxVWarp, topPct, botPct, H);
      assert.strictEqual(zeroY, 0.54 * H); // 108px
      assert.ok(zeroY > 0.48 * H, 'Zero line must shift down to provide headroom for positive time loss');
    });

    test('Band 3 Throttle coordinate math maps 0-100% accurately', () => {
      const H = 200;
      const { minV, maxV, topPct, botPct } = BAND_LAYOUT.throttle;

      // 100% throttle maps to top: 0.60 * 200 = 120px
      assert.strictEqual(computeBandY(100, minV, maxV, topPct, botPct, H), 120);
      // 0% throttle maps to bottom: 0.78 * 200 = 156px
      assert.strictEqual(computeBandY(0, minV, maxV, topPct, botPct, H), 156);
      // 50% throttle maps to midpoint: 138px
      assert.strictEqual(computeBandY(50, minV, maxV, topPct, botPct, H), 138);
    });

    test('Band 4 Brake line pressure maps 0-100 bar accurately', () => {
      const H = 200;
      const { minV, maxV, topPct, botPct } = BAND_LAYOUT.brake;

      // 100 bar maps to top: 0.82 * 200 = 164px
      assert.strictEqual(computeBandY(100, minV, maxV, topPct, botPct, H), 164);
      // 0 bar maps to bottom: 0.96 * 200 = 192px
      assert.strictEqual(computeBandY(0, minV, maxV, topPct, botPct, H), 192);
    });
  });

  // ==========================================================================
  // SUITE 3: STATIC AST GATE 5 CONFORMANCE (ZERO-VDOM SUBSCRIPTIONS)
  // ==========================================================================
  describe('Suite 3: Static AST Gate 5 Conformance (Zero-VDOM Subscription Contract)', () => {
    test('source code strictly contains ZERO reactive subscriptions to currentDistance', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(source),
        'Forbidden reactive selector: (s) => s.currentDistance'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.currentDistance\s*\)/.test(source),
        'Forbidden reactive selector: (state) => state.currentDistance'
      );
      assert.ok(
        !/const\s*\{\s*[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(\s*\)/.test(source),
        'Forbidden destructuring of currentDistance from useTelemetryStore'
      );
    });

    test('source code strictly contains ZERO reactive subscriptions to isPlaying', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(source),
        'Forbidden reactive selector in Zone 4: (s) => s.isPlaying'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.isPlaying\s*\)/.test(source),
        'Forbidden reactive selector in Zone 4: (state) => state.isPlaying'
      );
    });

    test('source code accesses high-frequency cursor via useTelemetryStore.getState()', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        source.includes('useTelemetryStore.getState().currentDistance') ||
        source.includes('useTelemetryStore.getState()'),
        'Must access currentDistance imperatively via getState()'
      );
    });

    test('component is wrapped in React.memo with explicit TelemetryOscillograph.displayName', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        source.includes('memo(') || source.includes('React.memo('),
        'Component must be wrapped in memo'
      );
      assert.ok(
        source.includes("TelemetryOscillograph.displayName = 'TelemetryOscillograph'") ||
        source.includes('TelemetryOscillograph.displayName = "TelemetryOscillograph"'),
        'Must assign explicit displayName for React DevTools and performance profiling'
      );
      assert.strictEqual(TelemetryOscillograph.displayName, 'TelemetryOscillograph');
    });

    test('component only selects authorized reactive properties (sessionPayload, mlWarpParams, mlWarpOutput)', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(source.includes('s.sessionPayload'), 'Authorized selector: sessionPayload');
      assert.ok(source.includes('s.mlWarpParams'), 'Authorized selector: mlWarpParams');
      assert.ok(source.includes('s.mlWarpOutput'), 'Authorized selector: mlWarpOutput');
    });
  });

  // ==========================================================================
  // SUITE 4: AEROSPACE DESIGN TOKENS & GEOMETRY STANDARDS
  // ==========================================================================
  describe('Suite 4: Aerospace Design Tokens & Geometry Standards', () => {
    test('enforces authoritative Void Carbon and Canvas Void background tokens', () => {
      assert.strictEqual(OSCILLOGRAPH_TOKENS.bgVoid, '#05070B');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.bgCanvas, '#090D14');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.borderSeam, '#1B2230');
    });

    test('enforces exact kinetic telemetry color palette tokens', () => {
      assert.strictEqual(OSCILLOGRAPH_TOKENS.speedA, '#00E5FF', 'Speed A must be Electric Cyan #00E5FF');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.speedB, '#B000FF', 'Speed B must be Neon Purple #B000FF');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.mlWarp, '#FFE600', 'ML Physics Warp must be Solar Amber #FFE600');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.throttle, '#00FF66', 'Throttle must be Neon Green #00FF66');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.brake, '#FF1E44', 'Brake must be Crimson #FF1E44');
      assert.strictEqual(OSCILLOGRAPH_TOKENS.zeroBaseline, '#334155', 'Zero baseline must be #334155');
    });

    test('rendered HTML container enforces zero border-radius and void background', () => {
      const html = renderToString(React.createElement(TelemetryOscillograph));

      assert.ok(html.includes('bg-[#05070B]'), 'Container must have #05070B void background');
      assert.ok(!html.includes('rounded-md') && !html.includes('rounded-lg'), 'Zero border-radius invariant');
    });
  });

  // ==========================================================================
  // SUITE 5: ML PHYSICS-WARP GHOST TRACE OVERLAY ACTIVATION
  // ==========================================================================
  describe('Suite 5: ML Physics-Warp Ghost Trace Overlay Activation', () => {
    test('when mlWarpParams.enabled is false, ML warped trace is not drawn', () => {
      const canvas = createMockCanvas(1000, 200);
      const disabledWarp = {
        enabled: false,
        compound: 'S' as const,
        tyreAgeLaps: 0,
        fuelLoadKg: 8,
        trackTempC: 38,
      };

      renderBackgroundCanvas(canvas, monzaBundle, disabledWarp, null, 1.0);

      // Verify that Solar Amber (#FFE600) was NOT used as a stroke style
      const hadAmberStroke = canvas.strokeStyles.some((s) => s.toLowerCase() === '#ffe600');
      assert.strictEqual(hadAmberStroke, false, 'ML ghost trace should not be stroked when disabled');
    });

    test('when mlWarpParams.enabled is true, ML warped traces are drawn in Solar Amber (#FFE600)', () => {
      const canvas = createMockCanvas(1000, 200);
      const enabledWarp = {
        enabled: true,
        compound: 'M' as const,
        tyreAgeLaps: 22,
        fuelLoadKg: 45,
        trackTempC: 42,
      };

      const warpOutput = computeMlPhysicsWarp(
        monzaBundle.driverA,
        monzaBundle.meta.driverA.lapTimeSec,
        enabledWarp
      );

      renderBackgroundCanvas(canvas, monzaBundle, enabledWarp, warpOutput, 1.0);

      // Verify Solar Amber (#FFE600) was stroked for warped speed and delta-T
      const amberCount = canvas.strokeStyles.filter((s) => s.toLowerCase() === '#ffe600').length;
      assert.ok(amberCount >= 2, `Expected at least 2 amber traces (speed + delta-T), got ${amberCount}`);
    });

    test('formatHudMetrics formats active corner name and telemetry correctly', () => {
      const lut = buildSpatialCornerLut(monzaBundle.corners, monzaBundle.gridLength);
      const metrics = formatHudMetrics(
        850,
        monzaBundle,
        lut,
        { enabled: false, compound: 'S', tyreAgeLaps: 0, fuelLoadKg: 8, trackTempC: 38 },
        null
      );

      assert.strictEqual(metrics.distanceStr, '850m');
      assert.ok(metrics.speedA > 0);
      assert.ok(metrics.speedB > 0);
      assert.strictEqual(typeof metrics.deltaV, 'number');
      assert.strictEqual(typeof metrics.deltaT, 'number');
      assert.strictEqual(typeof metrics.cornerName, 'string');
    });
  });

  // ==========================================================================
  // SUITE 6: POINTER SCRUBBING MATH & SPATIAL DISTANCE CLAMPING
  // ==========================================================================
  describe('Suite 6: Pointer Scrubbing Math & Spatial Distance Clamping', () => {
    const maxD = 5793;

    test('projectPointerToDistance maps 0.0 client ratio to start line 0m', () => {
      const dist = projectPointerToDistance(100, 100, 1000, maxD);
      assert.strictEqual(dist, 0);
    });

    test('projectPointerToDistance maps 1.0 client ratio to finish line maxDistance', () => {
      const dist = projectPointerToDistance(1100, 100, 1000, maxD);
      assert.strictEqual(dist, maxD);
    });

    test('projectPointerToDistance maps 0.5 ratio to exact halfway distance', () => {
      const dist = projectPointerToDistance(600, 100, 1000, maxD);
      assert.strictEqual(dist, Math.round(maxD * 0.5)); // 2897m
    });

    test('projectPointerToDistance safely clamps negative off-canvas coordinates to 0m', () => {
      const dist = projectPointerToDistance(-500, 100, 1000, maxD);
      assert.strictEqual(dist, 0);
    });

    test('projectPointerToDistance safely clamps overflow off-canvas coordinates to maxDistance', () => {
      const dist = projectPointerToDistance(2500, 100, 1000, maxD);
      assert.strictEqual(dist, maxD);
    });

    test('handles degenerate zero-width or zero-distance containers safely without NaN', () => {
      assert.strictEqual(projectPointerToDistance(100, 100, 0, maxD), 0);
      assert.strictEqual(projectPointerToDistance(100, 100, 1000, 0), 0);
      assert.strictEqual(projectPointerToDistance(100, 100, -10, -50), 0);
    });
  });

  // ==========================================================================
  // SUITE 7: STRIDED SAMPLING (m += 2) & MICROSECOND CANVAS BENCHMARKS
  // ==========================================================================
  describe('Suite 7: Strided Sampling (m += 2) & Microsecond Canvas Benchmarks (< 0.25ms)', () => {
    test('strided trace sampling m += 2 achieves exactly 50% vertex decimation on Monza (5,794 pts)', () => {
      const canvas = createMockCanvas(1600, 200);
      const speedArr = monzaBundle.driverA.speed;
      assert.strictEqual(speedArr.length, 5794);

      const vertexCount = drawStridedTrace(
        canvas.ctx as unknown as CanvasRenderingContext2D,
        speedArr,
        60,
        360,
        0.04,
        0.36,
        1600,
        200,
        monzaBundle.gridLength,
        '#00E5FF',
        1.0
      );

      // Length 5794 -> 0, 2, 4, ... 5792 (2897 pts) + final point 5793 (1 pt) = 2898 pts
      assert.strictEqual(vertexCount, 2898);
      const compression = vertexCount / speedArr.length;
      assert.ok(
        compression >= 0.49 && compression <= 0.51,
        `Compression ratio ${compression.toFixed(3)} should be ~50%`
      );
    });

    test('strided trace sampling preserves exact start and finish spatial coordinates', () => {
      const canvas = createMockCanvas(1000, 200);
      drawStridedTrace(
        canvas.ctx as unknown as CanvasRenderingContext2D,
        monzaBundle.driverA.speed,
        60,
        360,
        0.04,
        0.36,
        1000,
        200,
        monzaBundle.gridLength,
        '#00E5FF',
        1.0
      );

      // Verify first moveTo is at x = 0
      const firstMove = canvas.operations.find((op) => op.startsWith('moveTo:'));
      assert.ok(firstMove?.startsWith('moveTo:0,'));

      // Verify last lineTo is at x = 1000 (finish line)
      const lineTos = canvas.operations.filter((op) => op.startsWith('lineTo:'));
      const lastLine = lineTos[lineTos.length - 1];
      assert.ok(lastLine?.startsWith('lineTo:1000,'));
    });

    test('path construction benchmark executes in < 0.05ms (< 50 µs) per trace', () => {
      const canvas = createMockCanvas(1920, 236, false);
      const ctx = canvas.ctx as unknown as CanvasRenderingContext2D;
      const speedArr = monzaBundle.driverA.speed;

      // JIT warm-up
      for (let i = 0; i < 50; i++) {
        drawStridedTrace(ctx, speedArr, 60, 360, 0.04, 0.36, 1920, 236, monzaBundle.gridLength, '#00E5FF', 1.0);
      }

      const iterations = 500;
      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        drawStridedTrace(ctx, speedArr, 60, 360, 0.04, 0.36, 1920, 236, monzaBundle.gridLength, '#00E5FF', 1.0);
      }
      const elapsedMs = performance.now() - t0;
      const perCallMs = elapsedMs / iterations;

      assert.ok(
        perCallMs < 0.05,
        `Strided trace path construction ${perCallMs.toFixed(4)}ms exceeded 0.05ms budget`
      );
    });

    test('foreground cursor and HUD readout render executes in < 0.25ms', () => {
      const fgCanvas = createMockCanvas(1920, 236, false);
      const lut = buildSpatialCornerLut(monzaBundle.corners, monzaBundle.gridLength);

      // JIT warm-up
      for (let i = 0; i < 50; i++) {
        renderForegroundCanvas(
          fgCanvas,
          i * 50,
          monzaBundle,
          lut,
          { enabled: false, compound: 'S', tyreAgeLaps: 0, fuelLoadKg: 8, trackTempC: 38 },
          null,
          1.0
        );
      }

      const iterations = 500;
      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        renderForegroundCanvas(
          fgCanvas,
          (i * 10) % monzaBundle.gridLength,
          monzaBundle,
          lut,
          { enabled: false, compound: 'S', tyreAgeLaps: 0, fuelLoadKg: 8, trackTempC: 38 },
          null,
          1.0
        );
      }
      const elapsedMs = performance.now() - t0;
      const perCallMs = elapsedMs / iterations;

      assert.ok(
        perCallMs < 0.25,
        `Foreground cursor frame render ${perCallMs.toFixed(4)}ms exceeded 0.25ms budget`
      );
    });

    test('Silverstone circuit (5,892 pts) processes cleanly with strided decimation', () => {
      const canvas = createMockCanvas(1920, 236);
      const vCount = drawStridedTrace(
        canvas.ctx as unknown as CanvasRenderingContext2D,
        silverstoneBundle.driverA.speed,
        60,
        360,
        0.04,
        0.36,
        1920,
        236,
        silverstoneBundle.gridLength,
        '#00E5FF',
        1.0
      );

      assert.strictEqual(silverstoneBundle.driverA.speed.length, 5892);
      // Length 5892 (0 to 5891): 2946 even points + 1 final endpoint 5891 = 2947 points
      assert.strictEqual(vCount, 2947);
    });
  });
});
