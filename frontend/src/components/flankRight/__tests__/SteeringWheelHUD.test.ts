// frontend/src/components/flankRight/__tests__/SteeringWheelHUD.test.ts
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  SteeringWheelHUD,
  RPM_THRESHOLDS,
  SHIFT_FLASH_RPM,
  FLASH_PERIOD_MS,
  FLASH_HALF_PERIOD_MS,
  calculateShiftBitmask,
  isStrobeFlashOn,
  getDrsStatus,
  calculateNeedleCoords,
  calculateSweptArcPath,
  formatSteeringAngle,
  formatSteeringDelta,
  getRpmBandColor,
} from '../SteeringWheelHUD';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 4: SteeringWheelHUD (Quadrant 3, Sub-Panel 3B) Test Suite', () => {
  // Locate telemetry fixtures
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const sourceFile = fs.existsSync(path.resolve(process.cwd(), 'src/components/flankRight/SteeringWheelHUD.tsx'))
    ? path.resolve(process.cwd(), 'src/components/flankRight/SteeringWheelHUD.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankRight/SteeringWheelHUD.tsx');

  beforeEach(() => {
    // Reset telemetry store state
    useTelemetryStore.setState({
      sessionPayload: null,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
    });
  });

  // ==========================================================================
  // 1. 15-LED SHIFT ARRAY THRESHOLD VECTOR VERIFICATION
  // ==========================================================================
  describe('Canonical Shift Light RPM Threshold Vector', () => {
    test('contains exactly 15 sequential thresholds matching FIA PCU-8D specification', () => {
      assert.strictEqual(RPM_THRESHOLDS.length, 15);
      const expected = [
        10500, 10660, 10820, 10980, 11140, // Bank 1: 5 Green
        11300, 11460, 11620, 11780, 11940, // Bank 2: 5 Red
        12100, 12180, 12260, 12340, 12420, // Bank 3: 5 Blue
      ];
      for (let i = 0; i < 15; i++) {
        assert.strictEqual(RPM_THRESHOLDS[i], expected[i], `Threshold mismatch at LED index ${i}`);
      }
    });

    test('Bank 1 (Green LEDs 0-4) operates from 10,500 to 11,300 RPM with 160 RPM delta', () => {
      for (let i = 0; i < 5; i++) {
        const expectedThreshold = 10500 + i * 160;
        assert.strictEqual(RPM_THRESHOLDS[i], expectedThreshold);
      }
      assert.strictEqual(RPM_THRESHOLDS[4] + 160, 11300);
    });

    test('Bank 2 (Red LEDs 5-9) operates from 11,300 to 12,100 RPM with 160 RPM delta', () => {
      for (let i = 5; i < 10; i++) {
        const expectedThreshold = 11300 + (i - 5) * 160;
        assert.strictEqual(RPM_THRESHOLDS[i], expectedThreshold);
      }
      assert.strictEqual(RPM_THRESHOLDS[9] + 160, 12100);
    });

    test('Bank 3 (Blue LEDs 10-14) operates from 12,100 to 12,500 RPM with 80 RPM progressive delta', () => {
      for (let i = 10; i < 15; i++) {
        const expectedThreshold = 12100 + (i - 10) * 80;
        assert.strictEqual(RPM_THRESHOLDS[i], expectedThreshold);
      }
      assert.strictEqual(RPM_THRESHOLDS[14] + 80, 12500);
    });
  });

  // ==========================================================================
  // 2. 15-BIT BITMASK CALCULATION & CACHING LOGIC
  // ==========================================================================
  describe('15-Bit Shift Array Bitmask Calculation (calculateShiftBitmask)', () => {
    test('returns bitmask 0 when RPM is below the first threshold (< 10,500 RPM)', () => {
      assert.strictEqual(calculateShiftBitmask(0), 0);
      assert.strictEqual(calculateShiftBitmask(9000), 0);
      assert.strictEqual(calculateShiftBitmask(10499), 0);
    });

    test('activates LED 0 (bit 0) at exactly 10,500 RPM', () => {
      const mask = calculateShiftBitmask(10500);
      assert.strictEqual(mask, 1);
      assert.strictEqual(mask & (1 << 0), 1);
      assert.strictEqual(mask & (1 << 1), 0);
    });

    test('activates all 5 Bank 1 Green LEDs (bits 0-4 = 0x1F = 31) across 11,140 - 11,299 RPM', () => {
      const mask1 = calculateShiftBitmask(11140);
      assert.strictEqual(mask1, 0b11111);
      assert.strictEqual(mask1, 31);

      const mask2 = calculateShiftBitmask(11299);
      assert.strictEqual(mask2, 0b11111);
    });

    test('activates Bank 2 Red LEDs progressively across 11,300 - 12,099 RPM', () => {
      const maskFirstRed = calculateShiftBitmask(11300);
      assert.strictEqual(maskFirstRed, 0b111111); // 6 LEDs (5 green + 1 red)
      assert.strictEqual(maskFirstRed, 63);

      const maskAllRed = calculateShiftBitmask(11940);
      assert.strictEqual(maskAllRed, 0b1111111111); // 10 LEDs (5 green + 5 red)
      assert.strictEqual(maskAllRed, 1023);
    });

    test('activates Bank 3 Blue LEDs up to all 15 LEDs (0x7FFF = 32767) at 12,420 RPM', () => {
      const maskFirstBlue = calculateShiftBitmask(12100);
      assert.strictEqual(maskFirstBlue, 0b11111111111); // 11 LEDs
      assert.strictEqual(maskFirstBlue, 2047);

      const maskAll15 = calculateShiftBitmask(12420);
      assert.strictEqual(maskAll15, 0x7fff);
      assert.strictEqual(maskAll15, 32767);
      assert.strictEqual(maskAll15, (1 << 15) - 1);
    });

    test('monotonically increases bitmask value as RPM increases', () => {
      let prevMask = -1;
      for (let rpm = 10000; rpm <= 13000; rpm += 20) {
        const mask = calculateShiftBitmask(rpm);
        assert.ok(mask >= prevMask, `Bitmask should not decrease at RPM ${rpm}`);
        prevMask = mask;
      }
    });
  });

  // ==========================================================================
  // 3. STROBOSCOPIC UPSHIFT FLASH LOGIC (>= 12,450 RPM)
  // ==========================================================================
  describe('Stroboscopic Limiter Flash Logic (isStrobeFlashOn)', () => {
    test('defines flash trigger threshold at 12,450 RPM with 13.33 Hz frequency (75ms period)', () => {
      assert.strictEqual(SHIFT_FLASH_RPM, 12450);
      assert.strictEqual(FLASH_PERIOD_MS, 75.0);
      assert.strictEqual(FLASH_HALF_PERIOD_MS, 37.5);
    });

    test('alternates between ON and OFF at exact 37.5ms intervals', () => {
      // First cycle: 0 to 75ms
      assert.strictEqual(isStrobeFlashOn(0), true);
      assert.strictEqual(isStrobeFlashOn(10), true);
      assert.strictEqual(isStrobeFlashOn(37.4), true);
      assert.strictEqual(isStrobeFlashOn(37.5), false);
      assert.strictEqual(isStrobeFlashOn(50), false);
      assert.strictEqual(isStrobeFlashOn(74.9), false);

      // Second cycle: 75 to 150ms
      assert.strictEqual(isStrobeFlashOn(75), true);
      assert.strictEqual(isStrobeFlashOn(100), true);
      assert.strictEqual(isStrobeFlashOn(112.5), false);
      assert.strictEqual(isStrobeFlashOn(149.9), false);
      assert.strictEqual(isStrobeFlashOn(150), true);
    });
  });

  // ==========================================================================
  // 4. REV-BAND CHROMATIC COLOR RESOLUTION
  // ==========================================================================
  describe('Rev-Band Chromatic Color Resolution (getRpmBandColor)', () => {
    test('returns Slate (#94A3B8) below 10,500 RPM', () => {
      assert.strictEqual(getRpmBandColor(5000, false, false), '#94A3B8');
      assert.strictEqual(getRpmBandColor(10490, false, false), '#94A3B8');
    });

    test('returns Neon Green (#00FF66) for Bank 1 (10,500 - 11,299 RPM)', () => {
      assert.strictEqual(getRpmBandColor(10500, false, false), '#00FF66');
      assert.strictEqual(getRpmBandColor(11200, false, false), '#00FF66');
    });

    test('returns Racing Red (#FF1E44) for Bank 2 (11,300 - 12,099 RPM)', () => {
      assert.strictEqual(getRpmBandColor(11300, false, false), '#FF1E44');
      assert.strictEqual(getRpmBandColor(12000, false, false), '#FF1E44');
    });

    test('returns Electric Cyan (#00E5FF) for Bank 3 (12,100 - 12,449 RPM)', () => {
      assert.strictEqual(getRpmBandColor(12100, false, false), '#00E5FF');
      assert.strictEqual(getRpmBandColor(12400, false, false), '#00E5FF');
    });

    test('returns Radiant White (#FFFFFF) during shift flash ON phase', () => {
      assert.strictEqual(getRpmBandColor(12450, true, true), '#FFFFFF');
      assert.strictEqual(getRpmBandColor(12600, true, true), '#FFFFFF');
    });

    test('returns Electric Cyan (#00E5FF) during shift flash OFF phase', () => {
      assert.strictEqual(getRpmBandColor(12450, true, false), '#00E5FF');
    });
  });

  // ==========================================================================
  // 5. DRS BADGE STATE RESOLUTION (FASTF1 BITMASKS)
  // ==========================================================================
  describe('DRS Status Badge State Resolution (getDrsStatus)', () => {
    test('maps drs = 0 to INACTIVE state', () => {
      const res = getDrsStatus(0);
      assert.strictEqual(res.state, 'INACTIVE');
      assert.strictEqual(res.label, '— DRS OFF');
      assert.strictEqual(res.className, 'drs-hud-badge drs-inactive');
    });

    test('maps drs = 8 to AVAILABLE state (detection zone trigger)', () => {
      const res = getDrsStatus(8);
      assert.strictEqual(res.state, 'AVAIL');
      assert.strictEqual(res.label, '⚑ DRS AVAIL');
      assert.strictEqual(res.className, 'drs-hud-badge drs-avail');
    });

    test('maps drs = 1 to ACTIVE state', () => {
      const res = getDrsStatus(1);
      assert.strictEqual(res.state, 'ACTIVE');
      assert.strictEqual(res.label, '⮝ DRS ACTIVE');
      assert.strictEqual(res.className, 'drs-hud-badge drs-active');
    });

    test('maps FastF1 open bitmasks (10, 12, 14) to ACTIVE state', () => {
      for (const code of [10, 12, 14]) {
        const res = getDrsStatus(code);
        assert.strictEqual(res.state, 'ACTIVE');
        assert.strictEqual(res.label, '⮝ DRS ACTIVE');
        assert.strictEqual(res.className, 'drs-hud-badge drs-active');
      }
    });

    test('handles unexpected codes safely as INACTIVE', () => {
      assert.strictEqual(getDrsStatus(-1).state, 'INACTIVE');
      assert.strictEqual(getDrsStatus(3).state, 'INACTIVE');
    });
  });

  // ==========================================================================
  // 6. BIPOLAR STEERING NEEDLE TRIGONOMETRY & SWEPT ARC GEOMETRY
  // ==========================================================================
  describe('Steering Visualizer Geometry & Trigonometry', () => {
    test('computes needle coordinates at 0° (top dead center)', () => {
      // Radius R = 48, Center (100, 68)
      // At 0°, rad = -90° = -pi/2 -> x = 100, y = 68 - 48 = 20
      const coords = calculateNeedleCoords(0, 48, 100, 68);
      assert.strictEqual(Math.round(coords.x), 100);
      assert.strictEqual(Math.round(coords.y), 20);
    });

    test('computes needle coordinates at -90° (hard left lock)', () => {
      // At -90°, rad = -180° = -pi -> x = 100 - 48 = 52, y = 68
      const coords = calculateNeedleCoords(-90, 48, 100, 68);
      assert.strictEqual(Math.round(coords.x), 52);
      assert.strictEqual(Math.round(coords.y), 68);
    });

    test('computes needle coordinates at +90° (hard right lock)', () => {
      // At +90°, rad = 0° = 0 -> x = 100 + 48 = 148, y = 68
      const coords = calculateNeedleCoords(90, 48, 100, 68);
      assert.strictEqual(Math.round(coords.x), 148);
      assert.strictEqual(Math.round(coords.y), 68);
    });

    test('generates collapsed arc path for near-zero steering angle (< 0.5°)', () => {
      const path0 = calculateSweptArcPath(0.0);
      assert.strictEqual(path0, 'M 100 24 L 100 24');

      const pathSmall = calculateSweptArcPath(0.3);
      assert.strictEqual(pathSmall, 'M 100 24 L 100 24');
    });

    test('generates valid SVG arc path for positive and negative steering lock', () => {
      const pathRight = calculateSweptArcPath(45.0);
      assert.ok(pathRight.startsWith('M 100 24 A 44 44 0 0 1'));

      const pathLeft = calculateSweptArcPath(-45.0);
      assert.ok(pathLeft.startsWith('M 100 24 A 44 44 0 0 0'));
    });
  });

  // ==========================================================================
  // 7. STEERING ANGLE & DELTA FORMATTERS
  // ==========================================================================
  describe('Steering Angle & Delta Formatters', () => {
    test('formatSteeringAngle prefixes left lock with "L "', () => {
      assert.strictEqual(formatSteeringAngle(-34.2), 'L 34.2°');
      assert.strictEqual(formatSteeringAngle(-90.0), 'L 90.0°');
    });

    test('formatSteeringAngle prefixes right lock with "R "', () => {
      assert.strictEqual(formatSteeringAngle(18.5), 'R 18.5°');
      assert.strictEqual(formatSteeringAngle(75.3), 'R 75.3°');
    });

    test('formatSteeringAngle formats centered wheel within deadband with double-space', () => {
      assert.strictEqual(formatSteeringAngle(0.0), '  0.0°');
      assert.strictEqual(formatSteeringAngle(0.2), '  0.2°');
      assert.strictEqual(formatSteeringAngle(-0.3), '  0.3°');
    });

    test('formatSteeringDelta formats positive and negative deltas with explicit sign', () => {
      assert.strictEqual(formatSteeringDelta(4.2), 'Δ +4.2°');
      assert.strictEqual(formatSteeringDelta(-2.8), 'Δ -2.8°');
      assert.strictEqual(formatSteeringDelta(0.0), 'Δ +0.0°');
    });
  });

  // ==========================================================================
  // 8. REACT COMPONENT STATIC RENDERING (SSR / renderToString)
  // ==========================================================================
  describe('React Component Rendering (renderToString)', () => {
    test('renders full HUD container with PCU-8D eyebrow array and cluster', () => {
      useTelemetryStore.setState({ sessionPayload: monzaBundle });

      const html = renderToString(React.createElement(SteeringWheelHUD));
      assert.ok(html.includes('steering-hud-card'));
      assert.ok(html.includes('steering-led-array'));
      assert.ok(html.includes('steering-cluster-grid'));
      assert.ok(html.includes('steering-yoke-container'));
    });

    test('renders exactly 15 shift LED elements split into 3 banks', () => {
      useTelemetryStore.setState({ sessionPayload: monzaBundle });

      const html = renderToString(React.createElement(SteeringWheelHUD));
      const greenLeds = (html.match(/led-green/g) || []).length;
      const redLeds = (html.match(/led-red/g) || []).length;
      const blueLeds = (html.match(/led-blue/g) || []).length;

      assert.strictEqual(greenLeds, 5, 'Should have exactly 5 Green LEDs');
      assert.strictEqual(redLeds, 5, 'Should have exactly 5 Red LEDs');
      assert.strictEqual(blueLeds, 5, 'Should have exactly 5 Blue LEDs');
    });

    test('renders Driver A and Driver B driver codes in HUD headers', () => {
      useTelemetryStore.setState({ sessionPayload: monzaBundle });

      const html = renderToString(React.createElement(SteeringWheelHUD));
      assert.ok(html.includes('VER SPEED'));
      assert.ok(html.includes('GHOST NOR'));
    });
  });

  // ==========================================================================
  // 9. ZERO-VDOM SUBSCRIPTION & GATE 5 AST CONFORMANCE AUDIT
  // ==========================================================================
  describe('Gate 5 AST & Zero-VDOM Subscription Conformance', () => {
    test('source code adheres to strict Gate 5 AST rules (0 reactive subscriptions to cursor)', () => {
      assert.ok(fs.existsSync(sourceFile), `Source file missing: ${sourceFile}`);
      const content = fs.readFileSync(sourceFile, 'utf8');

      // 1. Must NOT subscribe reactively to currentDistance
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(content),
        'Forbidden subscription to currentDistance found'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.currentDistance\s*\)/.test(content),
        'Forbidden subscription to state.currentDistance found'
      );
      assert.ok(
        !/const\s*\{\s*[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(\s*\)/.test(content),
        'Forbidden destructuring of currentDistance found'
      );

      // 2. Must NOT subscribe reactively to isPlaying
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(content),
        'Forbidden subscription to isPlaying found'
      );

      // 3. Must use useDistanceSubscriber for direct-DOM updates
      assert.ok(
        content.includes('useDistanceSubscriber'),
        'Must use useDistanceSubscriber for high-frequency updates'
      );

      // 4. Must wrap with React.memo
      assert.ok(
        content.includes('React.memo'),
        'Component must be wrapped with React.memo'
      );
    });
  });

  // ==========================================================================
  // 10. KINEMATIC COMPUTATION PERFORMANCE BENCHMARK
  // ==========================================================================
  describe('High-Frequency Execution Micro-Benchmark', () => {
    test('50,000 bitmask calculations execute in under 1 µs/call', () => {
      const iterations = 50000;
      const t0 = performance.now();
      let sum = 0;
      for (let i = 0; i < iterations; i++) {
        const rpm = 10000 + (i % 2600);
        sum += calculateShiftBitmask(rpm);
      }
      const durationMs = performance.now() - t0;
      const perCallUs = (durationMs / iterations) * 1000;

      assert.ok(sum > 0);
      assert.ok(
        perCallUs < 1.0,
        `Bitmask calculation took ${perCallUs.toFixed(3)} µs/call (budget: < 1.0 µs)`
      );
    });
  });
});
