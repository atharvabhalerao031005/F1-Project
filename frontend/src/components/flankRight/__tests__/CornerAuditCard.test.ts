// frontend/src/components/flankRight/__tests__/CornerAuditCard.test.ts
/**
 * AERO-SPEC F1 // SUB-PANEL 3C: CORNER APEX PROXIMITY & TELEMETRY AUDIT CARD
 * Test Suite: Multi-Gate Comprehensive Verification
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.8
 *
 * Automated Test Coverage:
 * 1. Spatial LUT Generation and Chicane Boundary Bisector Resolution
 * 2. Comparative Telemetry Metrics Extraction (Driver A vs Driver B)
 * 3. In-Card ML Physics-Warp Closed-Form Recalculation
 * 4. Zero-VDOM Subscription & Gate 5 AST Conformance
 * 5. Full Component Rendering & UI State Verification
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  CornerAuditCard,
  calculateCornerMlWarp,
} from '../CornerAuditCard';
import {
  buildSpatialCornerLut,
  extractCornerMetrics,
  resolveCornerProximityFromLut,
} from '../../../utils/cornerProximity';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type {
  CornerApexMeta,
  SessionTelemetryPayload,
  TyreCompound,
} from '../../../types/telemetry';

describe('Aero-Spec Phase 4: Sub-Panel 3C CornerAuditCard Test Suite', () => {
  // Locate telemetry fixtures robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const silverstonePath = path.resolve(telemetryDir, '2024_silverstone_q3_ver_nor.json');
  const silverstoneBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(silverstonePath, 'utf8'));

  const componentPath = fs.existsSync(
    path.resolve(process.cwd(), 'src/components/flankRight/CornerAuditCard.tsx')
  )
    ? path.resolve(process.cwd(), 'src/components/flankRight/CornerAuditCard.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankRight/CornerAuditCard.tsx');

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
    });
  });

  // ============================================================================
  // GATE 1: SPATIAL LUT GENERATION & CHICANE BOUNDARY BISECTORS
  // ============================================================================
  describe('Gate 1: Spatial LUT Generation and Chicane Boundary Bisector Resolution', () => {
    const corners = monzaBundle.corners;
    const gridLength = monzaBundle.gridLength;
    const lut = buildSpatialCornerLut(corners, gridLength);

    test('constructs O(1) Look-Up Table with correct array lengths and < 12 KB memory', () => {
      assert.strictEqual(lut.cornerIndex.length, gridLength + 1);
      assert.strictEqual(lut.isActive.length, gridLength + 1);
      assert.strictEqual(lut.gridLength, gridLength);

      const byteSize = lut.cornerIndex.byteLength + lut.isActive.byteLength;
      assert.ok(byteSize <= 12288, `LUT size ${byteSize} bytes exceeds 12 KB limit`);
    });

    test('identifies active braking/apex zone when inside Turn 1 window (400m)', () => {
      // Monza T1: apex 450m, entry 236m, exit 504m
      const prox = resolveCornerProximityFromLut(400, corners, lut);
      assert.strictEqual(prox.corner.id, 'T1');
      assert.strictEqual(prox.isActiveZone, true);
      assert.strictEqual(prox.distanceToApexM, -50); // 400 - 450 = -50m
      assert.strictEqual(prox.cornerIndex, 0);
      assert.strictEqual(prox.nextCornerIndex, 1);
    });

    test('cleanly bisects Variante del Rettifilo chicane between T1 and T2 at midpoint', () => {
      // T1 apex: 450m, T2 apex: 560m -> midpoint: 505m
      const resBefore = resolveCornerProximityFromLut(500, corners, lut);
      assert.strictEqual(resBefore.corner.id, 'T1');
      assert.strictEqual(resBefore.isActiveZone, true);

      const resAfter = resolveCornerProximityFromLut(510, corners, lut);
      assert.strictEqual(resAfter.corner.id, 'T2');
      assert.strictEqual(resAfter.isActiveZone, true);
    });

    test('cleanly bisects Variante della Roggia chicane between T4 and T5', () => {
      const t4 = corners.find((c) => c.id === 'T4')!;
      const t5 = corners.find((c) => c.id === 'T5')!;
      assert.ok(t4 && t5, 'Monza T4 and T5 must exist');

      const midpoint = Math.round((t4.apexDistanceM + t5.apexDistanceM) / 2);
      const resT4 = resolveCornerProximityFromLut(midpoint - 5, corners, lut);
      assert.strictEqual(resT4.corner.id, 'T4');

      const resT5 = resolveCornerProximityFromLut(midpoint + 5, corners, lut);
      assert.strictEqual(resT5.corner.id, 'T5');
    });

    test('correctly wraps around Start/Finish line approaching Turn 1 across line', () => {
      // Parabolica ends around ~5205m; at 5500m the car is approaching T1 across the line
      const res = resolveCornerProximityFromLut(5500, corners, lut);
      assert.strictEqual(res.corner.id, 'T1');
      assert.strictEqual(res.isActiveZone, false);

      // Wrap-around countdown calculation: (5793 - 5500) + 450 = 293 + 450 = 743m
      const expectedCountdown = ((450 - 5500) % gridLength + gridLength) % gridLength;
      assert.strictEqual(res.countdownM, expectedCountdown);
      assert.strictEqual(res.countdownM, 743);
    });

    test('spatial LUT array resolution executes in < 100 ns per O(1) query', () => {
      let checksum = 0;
      // JIT warm-up
      for (let i = 0; i < 5000; i++) {
        const d = Math.floor((i * 1.37) % gridLength);
        checksum += lut.cornerIndex[d] + lut.isActive[d];
      }

      const t0 = performance.now();
      const iterations = 50000;

      for (let i = 0; i < iterations; i++) {
        const dist = Math.floor((i * 1.37) % gridLength);
        checksum += lut.cornerIndex[dist] + lut.isActive[dist];
      }

      const durationMs = performance.now() - t0;
      const perCallNs = (durationMs / iterations) * 1e6;
      assert.ok(checksum > 0);
      assert.ok(perCallNs < 100, `Raw LUT lookup ${perCallNs.toFixed(2)} ns exceeded 100 ns threshold`);
    });

    test('spatial LUT full proximity resolution executes in < 250 ns per query', () => {
      // JIT warm-up
      for (let i = 0; i < 5000; i++) {
        resolveCornerProximityFromLut((i * 1.7) % gridLength, corners, lut);
      }

      const t0 = performance.now();
      const iterations = 50000;
      let checksum = 0;

      for (let i = 0; i < iterations; i++) {
        const dist = (i * 1.7) % gridLength;
        const res = resolveCornerProximityFromLut(dist, corners, lut);
        checksum += res.cornerIndex + (res.isActiveZone ? 1 : 0);
      }

      const durationMs = performance.now() - t0;
      const perCallNs = (durationMs / iterations) * 1e6;
      assert.ok(checksum > 0);
      assert.ok(perCallNs < 250, `LUT lookup ${perCallNs.toFixed(2)} ns exceeded 250 ns threshold`);
    });
  });

  // ============================================================================
  // GATE 2: COMPARATIVE TELEMETRY METRICS EXTRACTION
  // ============================================================================
  describe('Gate 2: Comparative Telemetry Metrics Extraction (Driver A vs Driver B)', () => {
    test('extracts metrics for Monza Turn 1 accurately without NaNs', () => {
      const t1 = monzaBundle.corners[0];
      const metrics = extractCornerMetrics(t1, monzaBundle);

      assert.strictEqual(typeof metrics.deltaVMin, 'number');
      assert.strictEqual(typeof metrics.brakingDistA, 'number');
      assert.strictEqual(typeof metrics.brakingDistB, 'number');
      assert.strictEqual(typeof metrics.deltaBrakingDist, 'number');
      assert.strictEqual(typeof metrics.gearA, 'number');
      assert.strictEqual(typeof metrics.gearB, 'number');
      assert.strictEqual(typeof metrics.isGearMismatch, 'boolean');
      assert.strictEqual(typeof metrics.apexDeltaTSec, 'number');

      // Monza T1: vMinA = 54.0, vMinB = 54.3 -> deltaVMin = -0.3
      assert.strictEqual(metrics.deltaVMin, -0.3);

      // Braking distances: apex 450m, brakeMarkerA = 246m, brakeMarkerB = 246m
      assert.strictEqual(metrics.brakingDistA, 204);
      assert.strictEqual(metrics.brakingDistB, 204);
      assert.strictEqual(metrics.deltaBrakingDist, 0);
    });

    test('detects gear match and mismatch conditions correctly', () => {
      const mockCorner: CornerApexMeta = {
        id: 'T_TEST',
        name: 'Test Hairpin',
        apexDistanceM: 500,
        entryDistanceM: 300,
        exitDistanceM: 600,
        x: 0,
        y: 0,
        z: 0,
        brakeMarkerA: 350,
        brakeMarkerB: 340,
        vMinA: 75.0,
        vMinB: 72.0,
        throttlePickupA: 520,
        throttlePickupB: 530,
        cornerDeltaSec: -0.05,
      };

      // Case 1: Match (both gear 2)
      const mockPayloadMatch: Partial<SessionTelemetryPayload> = {
        gridLength: 1000,
        deltaT: new Array(1001).fill(0.05),
        driverA: { gear: new Array(1001).fill(2) } as any,
        driverB: { gear: new Array(1001).fill(2) } as any,
      };
      const resMatch = extractCornerMetrics(mockCorner, mockPayloadMatch as SessionTelemetryPayload);
      assert.strictEqual(resMatch.gearA, 2);
      assert.strictEqual(resMatch.gearB, 2);
      assert.strictEqual(resMatch.isGearMismatch, false);

      // Case 2: Mismatch (Driver A G3 vs Driver B G2)
      const mockPayloadMismatch: Partial<SessionTelemetryPayload> = {
        gridLength: 1000,
        deltaT: new Array(1001).fill(-0.02),
        driverA: { gear: new Array(1001).fill(3) } as any,
        driverB: { gear: new Array(1001).fill(2) } as any,
      };
      const resMismatch = extractCornerMetrics(
        mockCorner,
        mockPayloadMismatch as SessionTelemetryPayload
      );
      assert.strictEqual(resMismatch.gearA, 3);
      assert.strictEqual(resMismatch.gearB, 2);
      assert.strictEqual(resMismatch.isGearMismatch, true);
    });

    test('accurately calculates late braking advantage delta', () => {
      const mockCorner: CornerApexMeta = {
        id: 'T_BRAKE',
        name: 'Braking Test',
        apexDistanceM: 600,
        entryDistanceM: 400,
        exitDistanceM: 700,
        x: 0,
        y: 0,
        z: 0,
        brakeMarkerA: 450, // Braked 150m before apex
        brakeMarkerB: 420, // Braked 180m before apex (earlier)
        vMinA: 80,
        vMinB: 80,
        throttlePickupA: 610,
        throttlePickupB: 610,
        cornerDeltaSec: 0,
      };

      const mockPayload: Partial<SessionTelemetryPayload> = {
        gridLength: 1000,
        deltaT: new Array(1001).fill(0),
        driverA: { gear: new Array(1001).fill(2) } as any,
        driverB: { gear: new Array(1001).fill(2) } as any,
      };

      const metrics = extractCornerMetrics(mockCorner, mockPayload as SessionTelemetryPayload);
      assert.strictEqual(metrics.brakingDistA, 150);
      assert.strictEqual(metrics.brakingDistB, 180);
      // deltaBrakingDist = 150 - 180 = -30m (Driver A braked 30m later)
      assert.strictEqual(metrics.deltaBrakingDist, -30);
    });
  });

  // ============================================================================
  // GATE 3: IN-CARD ML PHYSICS-WARP CLOSED-FORM RECALCULATION
  // ============================================================================
  describe('Gate 3: In-Card ML Physics-Warp Closed-Form Recalculation Engine', () => {
    test('calculates nominal fresh Soft tyre physics at qualifying baseline', () => {
      const res = calculateCornerMlWarp(
        100.0, // base vMin = 100 km/h
        300,   // base brake marker = 300m
        'S',   // Soft compound
        0,     // 0 laps tyre age
        8.0,   // 8 kg qualifying fuel load
        38.0   // 38 C optimal track temp
      );

      // Grip multiplier mu_eff for fresh Soft at qual baseline: 1.000
      assert.strictEqual(res.gripMultiplier, 1.0);
      assert.strictEqual(res.projectedVMin, 100.0);
      assert.strictEqual(res.deltaVMinWarp, 0.0);
      assert.strictEqual(res.brakingExtensionM, 0.0);
      assert.strictEqual(res.warpedBrakeMarker, 300);
      assert.strictEqual(res.degOnlySec, 0.0);
    });

    test('evaluates tyre degradation penalty and velocity reduction on worn tyres', () => {
      const resFresh = calculateCornerMlWarp(100.0, 300, 'S', 0, 8.0, 38.0);
      const resWorn = calculateCornerMlWarp(100.0, 300, 'S', 28, 45.0, 38.0);

      // Worn tyres must produce lower grip multiplier
      assert.ok(
        resWorn.gripMultiplier < resFresh.gripMultiplier,
        'Worn tyre grip must be lower than fresh tyre grip'
      );
      // Projected vMin must be lower
      assert.ok(
        resWorn.projectedVMin < resFresh.projectedVMin,
        'Worn tyre vMin must be lower than fresh tyre vMin'
      );
      // Delta vMin must be negative
      assert.ok(resWorn.deltaVMinWarp < 0, 'Delta vMin must be negative for worn tyres');
      // Braking extension must be positive (must brake earlier)
      assert.ok(
        resWorn.brakingExtensionM > 0,
        'Braking extension must be positive for worn tyres'
      );
      assert.ok(
        resWorn.warpedBrakeMarker < 300,
        'Warped brake marker must be earlier on track'
      );
    });

    test('evaluates fuel load penalty on braking extension', () => {
      const resLight = calculateCornerMlWarp(100.0, 300, 'M', 10, 8.0, 41.0);
      const resHeavy = calculateCornerMlWarp(100.0, 300, 'M', 10, 100.0, 41.0);

      // Heavy fuel extends braking distance significantly
      assert.ok(
        resHeavy.brakingExtensionM > resLight.brakingExtensionM,
        'Heavy fuel must require greater braking extension'
      );
      // Warped brake marker must be moved earlier on track
      assert.ok(
        resHeavy.warpedBrakeMarker < resLight.warpedBrakeMarker,
        'Heavy car must brake earlier on track'
      );
    });

    test('strictly clamps effective grip multiplier within [0.82, 1.03]', () => {
      // Extreme worn + heavy setup
      const resWorst = calculateCornerMlWarp(100.0, 300, 'W', 80, 110.0, 60.0);
      assert.ok(
        resWorst.gripMultiplier >= 0.82,
        `Grip ${resWorst.gripMultiplier} fell below 0.82 lower clamp`
      );

      // Hypothetical super-optimal setup
      const resBest = calculateCornerMlWarp(100.0, 300, 'S', 0, 5.0, 38.0);
      assert.ok(
        resBest.gripMultiplier <= 1.03,
        `Grip ${resBest.gripMultiplier} exceeded 1.03 upper clamp`
      );
    });

    test('recalculates corner physics in sub-microsecond time (< 0.5 µs/call budget)', () => {
      // JIT warm-up
      for (let i = 0; i < 5000; i++) {
        calculateCornerMlWarp(100.0, 300, 'S', 10, 20.0, 38.0);
      }

      const iterations = 50000;
      const t0 = performance.now();
      let sum = 0;

      for (let i = 0; i < iterations; i++) {
        const res = calculateCornerMlWarp(
          120.0 + (i % 80),
          400,
          i % 2 === 0 ? 'M' : 'H',
          i % 38,
          8.0 + (i % 95),
          42.0
        );
        sum += res.projectedVMin;
      }

      const durationMs = performance.now() - t0;
      const perCallUs = (durationMs / iterations) * 1000;
      assert.ok(sum > 0);
      assert.ok(
        perCallUs < 0.5,
        `Recalculation speed ${perCallUs.toFixed(4)} µs exceeded 0.5 µs budget`
      );
    });
  });

  // ============================================================================
  // GATE 4: ZERO-VDOM RE-RENDER DECOUPLING & GATE 5 AST CONFORMANCE
  // ============================================================================
  describe('Gate 4: Zero-VDOM Subscription Invariant & Gate 5 AST Conformance', () => {
    test('CornerAuditCard source code strictly does NOT subscribe to currentDistance', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(source),
        'Forbidden subscription: (s) => s.currentDistance'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.currentDistance\s*\)/.test(source),
        'Forbidden subscription: (state) => state.currentDistance'
      );
      assert.ok(
        !/const\s*\{\s*[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(\s*\)/.test(source),
        'Forbidden destructuring of currentDistance from useTelemetryStore'
      );
    });

    test('CornerAuditCard source code strictly does NOT subscribe to isPlaying', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(source),
        'Forbidden subscription: (s) => s.isPlaying'
      );
    });

    test('CornerAuditCard uses useDistanceSubscriber for direct-DOM 60 Hz updates', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        source.includes('useDistanceSubscriber'),
        'CornerAuditCard must use useDistanceSubscriber'
      );
      assert.ok(
        source.includes('countdownRef.current'),
        'CornerAuditCard must mutate countdown via direct DOM ref'
      );
    });

    test('CornerAuditCard is wrapped in React.memo', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        source.includes('React.memo(CornerAuditCardComponent)') ||
        source.includes('React.memo('),
        'CornerAuditCard must be wrapped in React.memo'
      );
      assert.ok(
        source.includes("CornerAuditCard.displayName = 'CornerAuditCard'"),
        'CornerAuditCard must set explicit displayName'
      );
    });
  });

  // ============================================================================
  // GATE 5: FULL COMPONENT RENDERING & UI STATE VERIFICATION
  // ============================================================================
  describe('Gate 5: UI Component Rendering & Static Markup Verification', () => {
    test('renders clean skeleton fallback maintaining CLS = 0 when sessionPayload is null', () => {
      useTelemetryStore.setState({ sessionPayload: null });
      const html = renderToString(React.createElement(CornerAuditCard, { sessionPayload: null }));

      assert.ok(html.includes('CORNER APEX TELEMETRY AUDIT'));
      assert.ok(html.includes('AWAITING TELEMETRY...'));
      assert.ok(html.includes('INITIALIZING SPATIAL CORNER LUT'));
    });

    test('renders complete CornerAuditCard with Monza Turn 1 telemetry data', () => {
      const html = renderToString(React.createElement(CornerAuditCard, { sessionPayload: monzaBundle }));

      // Header components
      assert.ok(html.includes('[T1]'), 'Must render corner badge [T1]');
      assert.ok(html.includes('VARIANTE DEL RETTIFILO T1'), 'Must render corner name');
      assert.ok(html.includes('APEX 450m'), 'Must render apex station');

      // Drivers
      assert.ok(html.includes('VER'), 'Must render Driver A code VER');
      assert.ok(html.includes('NOR'), 'Must render Driver B code NOR');

      // V_min velocities
      assert.ok(html.includes('54.0'), 'Must render Driver A vMin 54.0');
      assert.ok(html.includes('54.3'), 'Must render Driver B vMin 54.3');
      assert.ok(html.includes('DEFICIT'), 'Must render delta deficit badge');

      // Braking distances
      assert.ok(html.includes('204m'), 'Must render braking distance 204m');
      assert.ok(html.includes('PARITY (SAME MARKER)'), 'Must render parity marker badge');

      // Apex gears
      assert.ok(html.includes('G2'), 'Must render gear G2');
      assert.ok(html.includes('GEAR 2 (MATCH)'), 'Must render gear match badge');

      // ML Physics controls
      assert.ok(html.includes('ML PHYSICS-WARP CORNER TUNING'));
      assert.ok(html.includes('STANDBY'), 'Must render STANDBY toggle button');
      assert.ok(html.includes('PREDICTED V_MIN:'));
      assert.ok(html.includes('BRAKE EXT:'));
      assert.ok(html.includes('EFFECTIVE GRIP µ:'));
      assert.ok(html.includes('DEG PENALTY:'));
    });

    test('renders Silverstone Maggotts / Becketts corner data when session switches', () => {
      useTelemetryStore.setState({ sessionPayload: silverstoneBundle });
      const html = renderToString(
        React.createElement(CornerAuditCard, { sessionPayload: silverstoneBundle })
      );

      // Silverstone T1: Abbey
      const firstCorner = silverstoneBundle.corners[0];
      assert.ok(html.includes(`[${firstCorner.id}]`), `Must render [${firstCorner.id}]`);
      assert.ok(
        html.includes(firstCorner.name.toUpperCase()),
        `Must render ${firstCorner.name.toUpperCase()}`
      );
    });

    test('reflects active ML Physics-Warp status when enabled in store', () => {
      const warpParams = {
        enabled: true,
        compound: 'M' as TyreCompound,
        tyreAgeLaps: 24,
        fuelLoadKg: 70,
        trackTempC: 44.0,
      };
      useTelemetryStore.setState({
        sessionPayload: monzaBundle,
        mlWarpParams: warpParams,
      });

      const html = renderToString(
        React.createElement(CornerAuditCard, {
          sessionPayload: monzaBundle,
          mlWarpParams: warpParams,
        })
      );

      assert.ok(html.includes('ACTIVE'), 'Toggle button must show ACTIVE');
      assert.ok(html.includes('24 LAPS'), 'Tyre age readout must show 24 LAPS');
      assert.ok(html.includes('70 KG'), 'Fuel load readout must show 70 KG');
    });
  });
});
