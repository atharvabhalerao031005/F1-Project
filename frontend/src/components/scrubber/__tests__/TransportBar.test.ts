// frontend/src/components/scrubber/__tests__/TransportBar.test.ts
/**
 * AERO-SPEC F1 // ZONE 5 TRANSPORT BAR TEST SUITE
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.4 & Zone 5
 * Technical Research: docs/research/PHASE_5_TRANSPORT_BAR_PLAYBACK_CONTROLS_AND_SECTOR_LOOPING_RESEARCH.md
 *
 * Automated Multi-Gate Verification:
 * 1. Fast Typography & Zero-Allocation Formatters
 * 2. Sector Looping & Context-Aware Reset Kinematics
 * 3. Playback Speed Multipliers & Looping Modes Matrix
 * 4. Gate 5 AST Static Analysis Conformance (Zero-VDOM currentDistance subscriptions)
 * 5. Full Component Rendering & Static Markup Verification (renderToString)
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  TransportBar,
  formatThousandsM,
  formatDistanceTicker,
  getSectorResetDistance,
  PLAYBACK_SPEEDS,
  SECTOR_OPTIONS,
} from '../TransportBar';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('AERO-SPEC Phase 5 // Zone 5 TransportBar Test Suite', { concurrency: 1 }, () => {
  // Locate telemetry fixtures robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const componentPath = fs.existsSync(
    path.resolve(process.cwd(), 'src/components/scrubber/TransportBar.tsx')
  )
    ? path.resolve(process.cwd(), 'src/components/scrubber/TransportBar.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/scrubber/TransportBar.tsx');

  beforeEach(() => {
    // Reset Zustand store state before each test
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
      playbackSpeed: 1.0,
      cameraMode: 'ISO',
      trackColorMode: 'PEDAL',
      elevationScale: 3.5,
      loopSector: 'ALL',
    });
  });

  // ==========================================================================
  // GATE 1: FAST TYPOGRAPHY & ZERO-ALLOCATION FORMATTERS
  // ==========================================================================
  describe('Gate 1: Fast Typography & Zero-Allocation Formatters', () => {
    test('formats thousands meters correctly with zero-padding for under 1000m', () => {
      assert.strictEqual(formatThousandsM(0), '0,000');
      assert.strictEqual(formatThousandsM(5), '0,005');
      assert.strictEqual(formatThousandsM(42), '0,042');
      assert.strictEqual(formatThousandsM(150), '0,150');
      assert.strictEqual(formatThousandsM(999), '0,999');
    });

    test('formats thousands meters correctly for values above 1000m', () => {
      assert.strictEqual(formatThousandsM(1000), '1,000');
      assert.strictEqual(formatThousandsM(1820), '1,820');
      assert.strictEqual(formatThousandsM(3950), '3,950');
      assert.strictEqual(formatThousandsM(5793), '5,793');
    });

    test('formats distance ticker with exact tabular pattern and percentage', () => {
      const output0 = formatDistanceTicker(0, 5793);
      assert.strictEqual(output0, 'DISTANCE: 0,000m / 5,793m [00.0%]');

      const outputS1 = formatDistanceTicker(1820, 5793);
      assert.strictEqual(outputS1, 'DISTANCE: 1,820m / 5,793m [31.4%]');

      const outputS2 = formatDistanceTicker(3950, 5793);
      assert.strictEqual(outputS2, 'DISTANCE: 3,950m / 5,793m [68.2%]');

      const outputFinish = formatDistanceTicker(5793, 5793);
      assert.strictEqual(outputFinish, 'DISTANCE: 5,793m / 5,793m [100.0%]');
    });

    test('clamps negative distance gracefully to 0m in ticker output', () => {
      const clamped = formatDistanceTicker(-50, 5793);
      assert.strictEqual(clamped, 'DISTANCE: 0,000m / 5,793m [00.0%]');
    });

    test('clamps overshoot distance to track maximum in ticker output', () => {
      const clamped = formatDistanceTicker(6000, 5793);
      assert.strictEqual(clamped, 'DISTANCE: 5,793m / 5,793m [100.0%]');
    });

    test('handles zero max distance guard safely without NaN or infinite values', () => {
      const clamped = formatDistanceTicker(100, 0);
      assert.strictEqual(typeof clamped, 'string');
      assert.strictEqual(clamped.includes('NaN'), false);
    });
  });

  // ==========================================================================
  // GATE 2: SECTOR LOOPING & CONTEXT-AWARE RESET KINEMATICS
  // ==========================================================================
  describe('Gate 2: Sector Looping & Reset Kinematics', () => {
    const monzaSplits: [number, number] = [1820, 3950];
    const monzaMax = 5793;

    test('returns 0m reset distance for ALL and S1 modes on Monza', () => {
      assert.strictEqual(getSectorResetDistance('ALL', monzaSplits, monzaMax), 0);
      assert.strictEqual(getSectorResetDistance('S1', monzaSplits, monzaMax), 0);
    });

    test('returns Sector 1 split boundary (1820m) for S2 reset on Monza', () => {
      assert.strictEqual(getSectorResetDistance('S2', monzaSplits, monzaMax), 1820);
    });

    test('returns Sector 2 split boundary (3950m) for S3 reset on Monza', () => {
      assert.strictEqual(getSectorResetDistance('S3', monzaSplits, monzaMax), 3950);
    });

    test('returns accurate split reset distances for Silverstone [1650, 4200]', () => {
      const silverstoneSplits: [number, number] = [1650, 4200];
      const silverstoneMax = 5891;

      assert.strictEqual(getSectorResetDistance('ALL', silverstoneSplits, silverstoneMax), 0);
      assert.strictEqual(getSectorResetDistance('S1', silverstoneSplits, silverstoneMax), 0);
      assert.strictEqual(getSectorResetDistance('S2', silverstoneSplits, silverstoneMax), 1650);
      assert.strictEqual(getSectorResetDistance('S3', silverstoneSplits, silverstoneMax), 4200);
    });

    test('handles undefined or malformed splits cleanly without throwing', () => {
      assert.strictEqual(getSectorResetDistance('S2', undefined, monzaMax), 0);
      assert.strictEqual(getSectorResetDistance('S3', undefined, monzaMax), 0);
      assert.strictEqual(getSectorResetDistance('S2', [] as unknown as [number, number], monzaMax), 0);
    });
  });

  // ==========================================================================
  // GATE 3: PLAYBACK SPEED MULTIPLIERS & SECTOR OPTIONS
  // ==========================================================================
  describe('Gate 3: Playback Speeds & Segmented Options', () => {
    test('defines exactly 5 approved playback speed multipliers', () => {
      assert.deepStrictEqual(PLAYBACK_SPEEDS, [0.25, 0.5, 1.0, 2.0, 4.0]);
      assert.strictEqual(PLAYBACK_SPEEDS.length, 5);
    });

    test('defines exactly 4 approved sector looping modes', () => {
      assert.deepStrictEqual(SECTOR_OPTIONS, ['ALL', 'S1', 'S2', 'S3']);
      assert.strictEqual(SECTOR_OPTIONS.length, 4);
    });
  });

  // ==========================================================================
  // GATE 4: ZERO-VDOM SUBSCRIPTION INVARIANT & GATE 5 AST CONFORMANCE
  // ==========================================================================
  describe('Gate 4: Zero-VDOM Subscription Invariant & Gate 5 AST Conformance', () => {
    test('verifies absence of reactive subscriptions to currentDistance in TransportBar.tsx', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      // Static AST regex patterns as enforced by verification harness
      const forbiddenPattern1 = /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.currentDistance\s*\)/;
      const forbiddenPattern2 = /const\s*\{[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(/;
      const forbiddenPattern3 = /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/;

      assert.strictEqual(forbiddenPattern1.test(source), false, 'Must not reactively select currentDistance');
      assert.strictEqual(forbiddenPattern2.test(source), false, 'Must not destructure currentDistance from store');
      assert.strictEqual(forbiddenPattern3.test(source), false, 'Must not select s.currentDistance');
    });

    test('verifies direct-DOM subscription via useTelemetryStore.subscribe in TransportBar.tsx', () => {
      const source = fs.readFileSync(componentPath, 'utf8');
      assert.strictEqual(source.includes('useTelemetryStore.subscribe'), true, 'Must use direct subscription');
      assert.strictEqual(source.includes('distanceTickerRef.current.textContent'), true, 'Must mutate distanceTicker textContent directly');
      assert.strictEqual(source.includes('liveClockRef.current.textContent'), true, 'Must mutate liveClock textContent directly');
      assert.strictEqual(source.includes('sectorBadgeRef.current.textContent'), true, 'Must mutate sectorBadge textContent directly');
    });

    test('verifies component is wrapped in React.memo and has explicit displayName', () => {
      const source = fs.readFileSync(componentPath, 'utf8');
      assert.strictEqual(source.includes('React.memo'), true, 'Must be wrapped in React.memo');
      assert.strictEqual(source.includes("TransportBar.displayName = 'TransportBar'"), true, 'Must declare displayName');
    });

    test('verifies strict 28px height and 0px border-radius styling tokens in source', () => {
      const source = fs.readFileSync(componentPath, 'utf8');
      assert.strictEqual(source.includes('h-[28px]'), true, 'Must contain exact h-[28px]');
      assert.strictEqual(source.includes('min-h-[28px]'), true, 'Must contain min-h-[28px]');
      assert.strictEqual(source.includes('max-h-[28px]'), true, 'Must contain max-h-[28px]');
      assert.strictEqual(source.includes('leading-[28px]'), true, 'Must contain leading-[28px]');
      assert.strictEqual(source.includes('rounded-none'), true, 'Must enforce rounded-none border radius');
      assert.strictEqual(source.includes('bg-[#05070B]'), true, 'Must use Void Carbon #05070B background');
      assert.strictEqual(source.includes('border-[#1E293B]'), true, 'Must use Hairline Seam #1E293B border');
    });
  });

  // ==========================================================================
  // GATE 5: STATIC MARKUP & SSR VERIFICATION
  // ==========================================================================
  describe('Gate 5: UI Component Rendering & Static Markup Verification', () => {
    test('renders transport bar footer with data-testid="transport-bar" and exact height classes', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="transport-bar"'));
      assert.ok(html.includes('h-[28px]'));
      assert.ok(html.includes('min-h-[28px]'));
      assert.ok(html.includes('max-h-[28px]'));
      assert.ok(html.includes('leading-[28px]'));
      assert.ok(html.includes('rounded-none'));
    });

    test('renders Play/Pause button with PLAY label and PAUSED status when not playing', () => {
      useTelemetryStore.setState({ isPlaying: false });
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="btn-play-pause"'));
      assert.ok(html.includes('PLAY'));
      assert.ok(html.includes('data-testid="playback-status-label"'));
      assert.ok(html.includes('PAUSED'));
    });

    test('renders Pause button with PAUSE label and PLAYING status when playing', () => {
      useTelemetryStore.setState({ isPlaying: true });
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="btn-play-pause"'));
      assert.ok(html.includes('PAUSE'));
      assert.ok(html.includes('data-testid="playback-status-label"'));
      assert.ok(html.includes('PLAYING'));
      assert.ok(html.includes('shadow-[0_0_8px_rgba(0,255,102,0.25)]'));
    });

    test('renders Reset button with data-testid="btn-reset"', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="btn-reset"'));
      assert.ok(html.includes('RESET'));
    });

    test('renders all 4 tactical stepper buttons (-100m, -10m, +10m, +100m)', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="btn-step-backward-macro"'));
      assert.ok(html.includes('-100m'));
      assert.ok(html.includes('data-testid="btn-step-backward-micro"'));
      assert.ok(html.includes('-10m'));
      assert.ok(html.includes('data-testid="btn-step-forward-micro"'));
      assert.ok(html.includes('+10m'));
      assert.ok(html.includes('data-testid="btn-step-forward-macro"'));
      assert.ok(html.includes('+100m'));
    });

    test('renders distance ticker element with pre-allocated 34ch container for CLS = 0', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="distance-ticker"'));
      assert.ok(html.includes('w-[34ch]'));
      assert.ok(html.includes('DISTANCE: 0,000m / 5,793m [00.0%]'));
    });

    test('renders active sector traversal indicator and all 4 sector loop buttons', () => {
      useTelemetryStore.setState({ loopSector: 'S1' });
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="active-sector-indicator"'));
      assert.ok(html.includes('SECTOR 1'));
      assert.ok(html.includes('data-testid="btn-loop-all"'));
      assert.ok(html.includes('data-testid="btn-loop-s1"'));
      assert.ok(html.includes('data-testid="btn-loop-s2"'));
      assert.ok(html.includes('data-testid="btn-loop-s3"'));
    });

    test('renders playback speed multiplier buttons for all 5 speeds', () => {
      useTelemetryStore.setState({ playbackSpeed: 2.0 });
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="btn-speed-0.25x"'));
      assert.ok(html.includes('data-testid="btn-speed-0.5x"'));
      assert.ok(html.includes('data-testid="btn-speed-1x"'));
      assert.ok(html.includes('data-testid="btn-speed-2x"'));
      assert.ok(html.includes('data-testid="btn-speed-4x"'));
    });

    test('renders live lap clock with high precision initial clock readout', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('data-testid="live-lap-clock"'));
      assert.ok(html.includes('0:00.000'));
    });

    test('renders hotkey micro-badges for SPACE, 10M, 100M, MODE, RESET', () => {
      const html = renderToString(React.createElement(TransportBar));
      assert.ok(html.includes('[SPACE]'));
      assert.ok(html.includes('[←/→]'));
      assert.ok(html.includes('[SHIFT+←/→]'));
      assert.ok(html.includes('[M]'));
      assert.ok(html.includes('[R]'));
    });
  });
});
