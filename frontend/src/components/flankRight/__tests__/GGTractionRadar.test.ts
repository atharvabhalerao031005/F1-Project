// frontend/src/components/flankRight/__tests__/GGTractionRadar.test.ts
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  GGTractionRadar,
  calculateAeroLimits,
  calculateGripUtilization,
  mapGToCanvas,
  createCometTailBuffer,
  pushCometPoint,
  resetCometBuffer,
  createReticleCanvas,
  drawRadarFrame,
  DISPLAY_SIZE,
  MAX_G,
  RADIUS_PAD,
  TAIL_CAPACITY,
  SEEK_RESET_THRESHOLD_M,
  type CometTailBuffer,
} from '../GGTractionRadar';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 4: GGTractionRadar (Sub-Panel 3A) Test Suite', () => {
  // Locate telemetry fixture directory robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const sourceFile = fs.existsSync(path.resolve(process.cwd(), 'src/components/flankRight/GGTractionRadar.tsx'))
    ? path.resolve(process.cwd(), 'src/components/flankRight/GGTractionRadar.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankRight/GGTractionRadar.tsx');

  beforeEach(() => {
    // Reset telemetry store to clean state
    useTelemetryStore.setState({
      sessionPayload: null,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
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
  // 1. DYNAMIC C1 CONTINUOUS AERO FRICTION ENVELOPE CALCULATION
  // ==========================================================================
  describe('Dynamic C1 Continuous Aero Friction Limits (calculateAeroLimits)', () => {
    test('computes static mechanical tire grip at 0 km/h (pure adhesion)', () => {
      const limits = calculateAeroLimits(0);
      assert.strictEqual(limits.muLat, 1.95, 'At 0 km/h, lateral grip must equal baseline 1.95G');
      assert.strictEqual(limits.muBrake, 2.20, 'At 0 km/h, braking grip must equal baseline 2.20G');
      assert.strictEqual(limits.muAccel, 2.20, 'At 0 km/h, accel grip must equal 2.20G');
    });

    test('computes low-speed downforce envelope at 80 km/h (Turn 1 / Turn 4)', () => {
      // 80 km/h = 22.22 m/s, v^2 = 493.827
      // muLat = 1.95 + 0.00045 * 493.827 = 2.1722G
      // muBrake = 2.20 + 0.00040 * 493.827 = 2.3975G
      const limits = calculateAeroLimits(80);
      assert.ok(
        Math.abs(limits.muLat - 2.1722) < 0.005,
        `Expected muLat ~2.172G at 80 km/h, got ${limits.muLat}`
      );
      assert.ok(
        Math.abs(limits.muBrake - 2.3975) < 0.005,
        `Expected muBrake ~2.398G at 80 km/h, got ${limits.muBrake}`
      );
      assert.strictEqual(limits.muAccel, 2.20, 'Forward acceleration must stay at 2.20G');
    });

    test('computes medium-speed downforce envelope at 180 km/h (Lesmo 1 / Ascari)', () => {
      // 180 km/h = 50.0 m/s, v^2 = 2500
      // muLat = 1.95 + 0.00045 * 2500 = 3.075G
      // muBrake = 2.20 + 0.00040 * 2500 = 3.200G
      const limits = calculateAeroLimits(180);
      assert.ok(
        Math.abs(limits.muLat - 3.075) < 0.001,
        `Expected muLat 3.075G at 180 km/h, got ${limits.muLat}`
      );
      assert.ok(
        Math.abs(limits.muBrake - 3.200) < 0.001,
        `Expected muBrake 3.200G at 180 km/h, got ${limits.muBrake}`
      );
      assert.strictEqual(limits.muAccel, 2.20);
    });

    test('computes high-speed downforce envelope at 340 km/h (Curva Grande / Rettifilo end)', () => {
      // 340 km/h = 94.444 m/s, v^2 = 8919.75
      // muLat = min(5.80, 1.95 + 0.00045 * 8919.75) = min(5.80, 5.9639) = 5.80G (clamped!)
      // muBrake = min(6.00, 2.20 + 0.00040 * 8919.75) = min(6.00, 5.7679) = 5.768G
      const limits = calculateAeroLimits(340);
      assert.strictEqual(limits.muLat, 5.80, 'muLat must be clamped to ceiling 5.80G at 340 km/h');
      assert.ok(
        Math.abs(limits.muBrake - 5.768) < 0.01,
        `Expected muBrake ~5.768G at 340 km/h, got ${limits.muBrake}`
      );
      assert.strictEqual(limits.muAccel, 2.20);
    });

    test('enforces strict ceiling clamping on extreme velocities (400 km/h)', () => {
      const limits = calculateAeroLimits(400);
      assert.strictEqual(limits.muLat, 5.80, 'muLat must not exceed 5.80G limit');
      assert.strictEqual(limits.muBrake, 6.00, 'muBrake must not exceed 6.00G limit');
      assert.strictEqual(limits.muAccel, 2.20);
    });

    test('scales envelope proportionally when ML physics warp grip multiplier is active', () => {
      const gripMult = 0.94; // 6% tyre wear penalty
      const limits = calculateAeroLimits(180, gripMult);
      assert.ok(
        Math.abs(limits.muLat - 3.075 * gripMult) < 0.001,
        'Lateral limit must scale by ML grip multiplier'
      );
      assert.ok(
        Math.abs(limits.muBrake - 3.200 * gripMult) < 0.001,
        'Braking limit must scale by ML grip multiplier'
      );
      assert.ok(
        Math.abs(limits.muAccel - 2.20 * gripMult) < 0.001,
        'Accel limit must scale by ML grip multiplier'
      );
    });
  });

  // ==========================================================================
  // 2. POLAR COORDINATE TRANSFORMATION & CANVAS MAPPING
  // ==========================================================================
  describe('Polar Coordinate Mapping & Geometry (mapGToCanvas)', () => {
    const cx = DISPLAY_SIZE / 2; // 100
    const cy = DISPLAY_SIZE / 2; // 100
    const scale = (DISPLAY_SIZE / 2 - RADIUS_PAD) / MAX_G; // (100 - 12) / 6 = 88 / 6 = 14.66666...

    test('maps neutral (0, 0) G to exact center of canvas', () => {
      const pt = mapGToCanvas(0, 0, cx, cy, scale);
      assert.strictEqual(pt.x, 100);
      assert.strictEqual(pt.y, 100);
    });

    test('maps positive acceleration upward on canvas (-Y direction)', () => {
      const pt = mapGToCanvas(0, 2.0, cx, cy, 15.0);
      assert.strictEqual(pt.x, 100);
      assert.strictEqual(pt.y, 100 - 2.0 * 15.0); // 70
    });

    test('maps heavy braking downward on canvas (+Y direction)', () => {
      const pt = mapGToCanvas(0, -5.0, cx, cy, 15.0);
      assert.strictEqual(pt.x, 100);
      assert.strictEqual(pt.y, 100 - (-5.0) * 15.0); // 175
    });

    test('maps left turn negative lateral G to the left (-X direction)', () => {
      const pt = mapGToCanvas(-3.0, 0, cx, cy, 15.0);
      assert.strictEqual(pt.x, 100 + (-3.0) * 15.0); // 55
      assert.strictEqual(pt.y, 100);
    });

    test('maps right turn positive lateral G to the right (+X direction)', () => {
      const pt = mapGToCanvas(3.0, 0, cx, cy, 15.0);
      assert.strictEqual(pt.x, 100 + 3.0 * 15.0); // 145
      assert.strictEqual(pt.y, 100);
    });
  });

  // ==========================================================================
  // 3. 45-FRAME CIRCULAR RING BUFFER COMET TAIL & SEEK RESET INVARIANTS
  // ==========================================================================
  describe('45-Frame Comet Tail Circular Ring Buffer (pushCometPoint)', () => {
    test('verifies default architectural constants', () => {
      assert.strictEqual(DISPLAY_SIZE, 200);
      assert.strictEqual(MAX_G, 6.0);
      assert.strictEqual(RADIUS_PAD, 12);
      assert.strictEqual(TAIL_CAPACITY, 45);
      assert.strictEqual(SEEK_RESET_THRESHOLD_M, 15);
    });

    test('allocates pre-sized typed arrays with zero heap allocation during lifecycle', () => {
      const buf: CometTailBuffer = createCometTailBuffer(TAIL_CAPACITY);
      assert.strictEqual(buf.capacity, 45);
      assert.strictEqual(buf.head, 0);
      assert.strictEqual(buf.count, 0);
      assert.strictEqual(buf.lastDist, -1);
      assert.ok(buf.xA instanceof Float32Array);
      assert.ok(buf.yA instanceof Float32Array);
      assert.ok(buf.xB instanceof Float32Array);
      assert.ok(buf.yB instanceof Float32Array);
      assert.strictEqual(buf.xA.length, 45);
    });

    test('pushes elements sequentially incrementing head and count', () => {
      const buf = createCometTailBuffer(45);
      pushCometPoint(buf, 1.5, -2.0, 1.4, -2.1, 10.0, 15.0);

      assert.strictEqual(buf.head, 1);
      assert.strictEqual(buf.count, 1);
      assert.strictEqual(buf.lastDist, 10.0);
      assert.ok(Math.abs(buf.xA[0] - 1.5) < 1e-4);
      assert.ok(Math.abs(buf.yA[0] - (-2.0)) < 1e-4);
      assert.ok(Math.abs(buf.xB[0] - 1.4) < 1e-4);
      assert.ok(Math.abs(buf.yB[0] - (-2.1)) < 1e-4);
    });

    test('wraps head circularly modulo 45 without exceeding capacity', () => {
      const buf = createCometTailBuffer(45);
      for (let i = 0; i < 50; i++) {
        pushCometPoint(buf, i * 0.1, -i * 0.1, i * 0.05, -i * 0.05, 100 + i * 0.2, 15.0);
      }

      assert.strictEqual(buf.count, 45, 'Count must saturate at capacity 45');
      assert.strictEqual(buf.head, 5, 'Head must wrap to 50 % 45 = 5');
    });

    test('seek detection resets buffer when distance jump exceeds 15m threshold', () => {
      const buf = createCometTailBuffer(45);
      // Push 10 smooth points
      for (let i = 0; i < 10; i++) {
        pushCometPoint(buf, 1.0, 0.5, 1.0, 0.5, 100 + i * 1.0, 15.0);
      }
      assert.strictEqual(buf.count, 10);
      assert.strictEqual(buf.head, 10);

      // Scrubber jump from 109m to 250m (delta = 141m > 15m)
      pushCometPoint(buf, 2.0, -3.0, 1.8, -2.9, 250.0, 15.0);

      assert.strictEqual(buf.count, 1, 'Buffer count must reset to 1 on seek jump');
      assert.strictEqual(buf.head, 1, 'Buffer head must reset to 1 on seek jump');
      assert.strictEqual(buf.xA[0], 2.0);
      assert.strictEqual(buf.lastDist, 250.0);
    });

    test('small smooth distance step (<= 15m) does NOT trigger seek reset', () => {
      const buf = createCometTailBuffer(45);
      pushCometPoint(buf, 1.0, 0.5, 1.0, 0.5, 100.0, 15.0);
      pushCometPoint(buf, 1.1, 0.5, 1.1, 0.5, 114.0, 15.0); // delta = 14m <= 15m

      assert.strictEqual(buf.count, 2, 'Buffer count should be 2 for <= 15m delta');
      assert.strictEqual(buf.head, 2);
    });

    test('resetCometBuffer clears count, head and lastDist', () => {
      const buf = createCometTailBuffer(45);
      pushCometPoint(buf, 1.0, 0.5, 1.0, 0.5, 100.0, 15.0);
      resetCometBuffer(buf);

      assert.strictEqual(buf.count, 0);
      assert.strictEqual(buf.head, 0);
      assert.strictEqual(buf.lastDist, -1);
    });
  });

  // ==========================================================================
  // 4. INSTANTANEOUS GRIP UTILIZATION METRIC eta_grip
  // ==========================================================================
  describe('Instantaneous Grip Utilization Metric (calculateGripUtilization)', () => {
    const limits: { muLat: number; muAccel: number; muBrake: number } = {
      muLat: 3.0,
      muAccel: 2.2,
      muBrake: 4.0,
    };

    test('returns 0% when car is stationary or at neutral inertial zero', () => {
      const util = calculateGripUtilization(0, 0, limits.muLat, limits.muAccel, limits.muBrake);
      assert.strictEqual(util, 0);
    });

    test('returns 100% at pure lateral grip adhesion boundary', () => {
      const util = calculateGripUtilization(3.0, 0, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(Math.abs(util - 100) < 0.001, `Expected 100%, got ${util}%`);
    });

    test('returns 100% at pure forward acceleration traction boundary', () => {
      const util = calculateGripUtilization(0, 2.2, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(Math.abs(util - 100) < 0.001, `Expected 100%, got ${util}%`);
    });

    test('returns 100% at pure maximum braking deceleration boundary', () => {
      const util = calculateGripUtilization(0, -4.0, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(Math.abs(util - 100) < 0.001, `Expected 100%, got ${util}%`);
    });

    test('returns 100% on ideal trail-braking ellipse contour (combined grip)', () => {
      // (gLat / muLat)^2 + (gLong / muBrake)^2 = (1/sqrt(2))^2 + (1/sqrt(2))^2 = 1.0 -> 100%
      const gLat = limits.muLat * Math.SQRT1_2;
      const gLong = -limits.muBrake * Math.SQRT1_2;
      const util = calculateGripUtilization(gLat, gLong, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(
        Math.abs(util - 100) < 0.001,
        `Expected 100% on combined ellipse perimeter, got ${util}%`
      );
    });

    test('correctly calculates under-utilization (< 100%) and micro-slip (> 100%)', () => {
      const underUtil = calculateGripUtilization(1.5, 0, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(Math.abs(underUtil - 50) < 1e-5, 'Half lateral grip should be exactly 50%');

      const overLimit = calculateGripUtilization(3.3, 0, limits.muLat, limits.muAccel, limits.muBrake);
      assert.ok(Math.abs(overLimit - 110) < 1e-5, '10% over boundary should be 110%');
    });

    test('handles edge case of zero or negative capacity gracefully without NaN', () => {
      assert.strictEqual(calculateGripUtilization(2, 2, 0, 2, 2), 0);
      assert.strictEqual(calculateGripUtilization(2, 2, 2, 0, 2), 0);
    });
  });

  // ==========================================================================
  // 5. ARCHITECTURAL ZERO-RENDER INVARIANT (GATE 5 AST CONFORMANCE)
  // ==========================================================================
  describe('Gate 5 AST Conformance & Zero-VDOM Subscription Audit', () => {
    test('GGTractionRadar source code strictly does NOT subscribe to currentDistance or isPlaying', () => {
      const sourceCode = fs.readFileSync(sourceFile, 'utf8');

      // 1. Must NOT contain reactive subscription to currentDistance
      assert.strictEqual(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(sourceCode),
        false,
        'CRITICAL: GGTractionRadar must NOT reactively subscribe to s.currentDistance!'
      );
      assert.strictEqual(
        /useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.currentDistance\s*\)/.test(sourceCode),
        false,
        'CRITICAL: GGTractionRadar must NOT reactively subscribe to state.currentDistance!'
      );

      // 2. Must NOT contain reactive subscription to isPlaying
      assert.strictEqual(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(sourceCode),
        false,
        'CRITICAL: GGTractionRadar must NOT reactively subscribe to s.isPlaying!'
      );

      // 3. Must NOT destructure currentDistance from store
      assert.strictEqual(
        /const\s*\{\s*[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(\s*\)/.test(sourceCode),
        false,
        'CRITICAL: GGTractionRadar must NOT destructure currentDistance from useTelemetryStore()!'
      );

      // 4. Must use useDistanceSubscriber for high-frequency imperative updates
      assert.ok(
        sourceCode.includes('useDistanceSubscriber'),
        'GGTractionRadar must use useDistanceSubscriber for 60Hz updates'
      );

      // 5. Must wrap component in React.memo
      assert.ok(
        sourceCode.includes('React.memo'),
        'GGTractionRadar must be wrapped in React.memo'
      );
    });
  });

  // ==========================================================================
  // 6. REACT COMPONENT MOUNTING & ZERO-VDOM HUD STRUCTURAL AUDIT
  // ==========================================================================
  describe('React Component Rendering & Micro-Typography Layout (GGTractionRadar)', () => {
    test('renders Sub-Panel 3A container with title and 60 FPS POLAR badge', () => {
      const html = renderToString(React.createElement(GGTractionRadar));
      assert.ok(html.includes('G-G TRACTION RADAR'), 'Must render G-G TRACTION RADAR header');
      assert.ok(html.includes('60 FPS POLAR'), 'Must render 60 FPS POLAR badge');
    });

    test('renders canvas element with exact 200px CSS dimensions and crosshair cursor', () => {
      const html = renderToString(React.createElement(GGTractionRadar));
      assert.ok(html.includes('<canvas'), 'Must render canvas element');
      assert.ok(html.includes('width:200px'), 'Canvas must specify 200px width');
      assert.ok(html.includes('height:200px'), 'Canvas must specify 200px height');
      assert.ok(html.includes('cursor-crosshair'), 'Canvas should specify cursor-crosshair class');
    });

    test('renders Dynamic Aero Limit banner in initial or standby state', () => {
      const html = renderToString(React.createElement(GGTractionRadar));
      assert.ok(
        html.includes('AERO LIM: INITIALIZING...'),
        'Must render initial aero limit banner'
      );
    });

    test('renders fallback DRIVER A and DRIVER B labels when sessionPayload is null', () => {
      const html = renderToString(React.createElement(GGTractionRadar));
      assert.ok(html.includes('DRIVER A'), 'Must include DRIVER A label fallback');
      assert.ok(html.includes('DRIVER B'), 'Must include DRIVER B label fallback');
      assert.ok(html.includes('0.00G'), 'Must include 0.00G default value');
    });

    test('renders custom driver codes (VER and NOR) when sessionPayload is populated', () => {
      useTelemetryStore.setState({ sessionPayload: monzaBundle });
      const html = renderToString(React.createElement(GGTractionRadar, { sessionPayload: monzaBundle }));
      assert.ok(html.includes('>VER<') || html.includes('VER'), 'Must include Driver A code VER');
      assert.ok(html.includes('>NOR<') || html.includes('NOR'), 'Must include Driver B code NOR');
    });

    test('renders dual readout grid with LAT, LONG, and GRIP labels', () => {
      const html = renderToString(React.createElement(GGTractionRadar));
      assert.ok(html.includes('LAT:'), 'Must include LAT label');
      assert.ok(html.includes('LONG:'), 'Must include LONG label');
      assert.ok(html.includes('GRIP:'), 'Must include GRIP label');
    });
  });

  // ==========================================================================
  // 7. CANVAS RADAR FRAME DRAWING & RETICLE GENERATION MOCK AUDIT
  // ==========================================================================
  describe('Canvas 2D Reticle & Frame Rendering Logic (Mock Context)', () => {
    // Create mock 2D context to verify API calls without a headless browser
    function createMock2DContext(): {
      ctx: CanvasRenderingContext2D;
      calls: string[];
    } {
      const calls: string[] = [];
      const ctx = {
        save: () => calls.push('save'),
        restore: () => calls.push('restore'),
        scale: (x: number, y: number) => calls.push(`scale(${x},${y})`),
        clearRect: (x: number, y: number, w: number, h: number) =>
          calls.push(`clearRect(${x},${y},${w},${h})`),
        drawImage: () => calls.push('drawImage'),
        beginPath: () => calls.push('beginPath'),
        closePath: () => calls.push('closePath'),
        moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
        lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
        arc: (x: number, y: number, r: number) => calls.push(`arc(${x},${y},${r})`),
        ellipse: (x: number, y: number, rx: number, ry: number) =>
          calls.push(`ellipse(${x},${y},${rx.toFixed(1)},${ry.toFixed(1)})`),
        fill: () => calls.push('fill'),
        stroke: () => calls.push('stroke'),
        setLineDash: (d: number[]) => calls.push(`setLineDash([${d.join(',')}])`),
        fillText: (t: string, x: number, y: number) => calls.push(`fillText(${t},${x},${y})`),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
      } as unknown as CanvasRenderingContext2D;

      return { ctx, calls };
    }

    test('createReticleCanvas returns null safely when running outside DOM environment', () => {
      const res = createReticleCanvas(1);
      assert.ok(res === null || typeof res === 'object');
    });

    test('drawRadarFrame issues clearRect and blits reticle canvas', () => {
      const { ctx, calls } = createMock2DContext();
      const mockReticle = {} as HTMLCanvasElement;
      const buf = createCometTailBuffer(45);

      drawRadarFrame(
        ctx,
        mockReticle,
        buf,
        200, // speedKmh
        1.5, // signedGLatA
        -2.0, // gLongA
        1.2, // signedGLatB
        -1.8, // gLongB
        1.0 // gripMultiplier
      );

      assert.ok(calls.includes('clearRect(0,0,200,200)'), 'Must clear logical 200x200 canvas');
      assert.ok(calls.includes('drawImage'), 'Must blit cached reticle canvas');
      assert.ok(
        calls.some((c) => c.startsWith('ellipse')),
        'Must draw asymmetric dynamic friction ellipse'
      );
      assert.ok(
        calls.some((c) => c.startsWith('arc')),
        'Must draw cursor arcs for Driver A and Driver B'
      );
    });

    test('drawRadarFrame draws comet tail segments when buffer has count > 1', () => {
      const { ctx, calls } = createMock2DContext();
      const mockReticle = {} as HTMLCanvasElement;
      const buf = createCometTailBuffer(45);

      // Push 5 points
      for (let i = 0; i < 5; i++) {
        pushCometPoint(buf, i * 0.5, -i * 0.5, i * 0.4, -i * 0.4, 100 + i * 2, 15);
      }

      drawRadarFrame(ctx, mockReticle, buf, 150, 2.0, -1.0, 1.8, -0.9, 1.0);

      const lineToCalls = calls.filter((c) => c.startsWith('lineTo'));
      assert.ok(
        lineToCalls.length >= 8,
        `Expected at least 8 lineTo calls for dual comet tails, got ${lineToCalls.length}`
      );
    });
  });
});
