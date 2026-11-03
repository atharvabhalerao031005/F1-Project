// frontend/src/components/flankLeft/__tests__/TimingTower.test.ts
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  TimingTower,
  sortDriverProbabilities,
  formatTimingLapGap,
  formatConfidenceBand,
  COMPOUND_COLORS,
  SECTOR_COLORS,
  SECTOR_FALLBACK_COLOR,
} from '../TimingTower';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type {
  MonteCarloDriverProbability,
  SessionTelemetryPayload,
  TimingTowerDriver,
} from '../../../types/telemetry';

describe('Aero-Spec Phase 3: TimingTower (Quadrant 1) Test Suite', () => {
  // Locate telemetry fixture directory robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const sourceFile = fs.existsSync(path.resolve(process.cwd(), 'src/components/flankLeft/TimingTower.tsx'))
    ? path.resolve(process.cwd(), 'src/components/flankLeft/TimingTower.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankLeft/TimingTower.tsx');

  beforeEach(() => {
    // Reset telemetry store to clean state
    useTelemetryStore.setState({
      sessionPayload: null,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      strategyResult: null,
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
    });
  });

  // ==========================================================================
  // 1. PURE FUNCTION FORMATTERS & SORTING INVARIANTS
  // ==========================================================================
  describe('Probability Sorting Invariant (sortDriverProbabilities)', () => {
    test('sorts driver probabilities ascending by expectedPosition', () => {
      const input: MonteCarloDriverProbability[] = [
        {
          code: 'NOR',
          teamColor: '#FF8000',
          winProbPct: 15.0,
          podiumProbPct: 80.0,
          pointsProbPct: 100.0,
          expectedPosition: 2.3,
          p10Position: 1,
          p90Position: 3,
          expectedRaceTimeSec: 4370.0,
        },
        {
          code: 'VER',
          teamColor: '#3671C6',
          winProbPct: 80.0,
          podiumProbPct: 98.0,
          pointsProbPct: 100.0,
          expectedPosition: 1.1,
          p10Position: 1,
          p90Position: 2,
          expectedRaceTimeSec: 4360.0,
        },
        {
          code: 'LEC',
          teamColor: '#E8002D',
          winProbPct: 5.0,
          podiumProbPct: 60.0,
          pointsProbPct: 99.0,
          expectedPosition: 3.1,
          p10Position: 2,
          p90Position: 5,
          expectedRaceTimeSec: 4380.0,
        },
      ];

      const sorted = sortDriverProbabilities(input);
      assert.strictEqual(sorted[0].code, 'VER', 'Lowest expectedPosition should be P1');
      assert.strictEqual(sorted[1].code, 'NOR', 'Second lowest should be P2');
      assert.strictEqual(sorted[2].code, 'LEC', 'Highest should be P3');
      // Ensure immutability
      assert.notStrictEqual(sorted, input, 'Should return a newly allocated array');
      assert.strictEqual(input[0].code, 'NOR', 'Input array must not be mutated');
    });

    test('handles empty and single-element probability arrays', () => {
      assert.deepStrictEqual(sortDriverProbabilities([]), []);
      const single = [
        {
          code: 'VER',
          teamColor: '#3671C6',
          winProbPct: 100,
          podiumProbPct: 100,
          pointsProbPct: 100,
          expectedPosition: 1.0,
          p10Position: 1,
          p90Position: 1,
          expectedRaceTimeSec: 4000,
        },
      ];
      assert.deepStrictEqual(sortDriverProbabilities(single), single);
    });
  });

  describe('LAP / GAP Formatting (formatTimingLapGap)', () => {
    const baseDriver: TimingTowerDriver = {
      position: 1,
      code: 'VER',
      number: 1,
      teamName: 'Red Bull Racing',
      teamColor: '#3671C6',
      compound: 'S',
      tyreAgeLaps: 3,
      bestLapTimeStr: '1:19.311',
      bestLapTimeSec: 79.311,
      gapToLeaderStr: 'INTERVAL',
      sectors: ['PURPLE', 'PURPLE', 'GREEN'],
      sectorTimesSec: [26.411, 26.886, 26.014],
    };

    test('formats P1 leader with bestLapTimeStr and Electric Cyan text', () => {
      const res = formatTimingLapGap(baseDriver, false);
      assert.strictEqual(res.text, '1:19.311');
      assert.strictEqual(res.colorClass, 'text-[#00E5FF]');
    });

    test('formats Driver B with gapToLeaderStr and Neon Purple text', () => {
      const driverB: TimingTowerDriver = {
        ...baseDriver,
        position: 2,
        code: 'NOR',
        bestLapTimeStr: '1:19.420',
        bestLapTimeSec: 79.42,
        gapToLeaderStr: '+0.109',
      };
      const res = formatTimingLapGap(driverB, true);
      assert.strictEqual(res.text, '+0.109');
      assert.strictEqual(res.colorClass, 'text-[#B000FF]');
    });

    test('formats regular driver with gapToLeaderStr and Slate/Light text', () => {
      const driverP3: TimingTowerDriver = {
        ...baseDriver,
        position: 3,
        code: 'LEC',
        bestLapTimeStr: '1:19.550',
        bestLapTimeSec: 79.55,
        gapToLeaderStr: '+0.239',
      };
      const res = formatTimingLapGap(driverP3, false);
      assert.strictEqual(res.text, '+0.239');
      assert.strictEqual(res.colorClass, 'text-[#E2E8F0]');
    });

    test('formats DNF / DNS / bestLapTimeSec <= 0 with NO TIME in #64748B', () => {
      const dnfDriver: TimingTowerDriver = {
        ...baseDriver,
        position: 20,
        code: 'SAR',
        bestLapTimeStr: '',
        bestLapTimeSec: 0,
        gapToLeaderStr: '',
      };
      const res = formatTimingLapGap(dnfDriver, false);
      assert.strictEqual(res.text, 'NO TIME');
      assert.strictEqual(res.colorClass, 'text-[#64748B]');

      const negativeDriver: TimingTowerDriver = {
        ...baseDriver,
        position: 19,
        code: 'ZHO',
        bestLapTimeSec: -1,
      };
      const resNeg = formatTimingLapGap(negativeDriver, false);
      assert.strictEqual(resNeg.text, 'NO TIME');
      assert.strictEqual(resNeg.colorClass, 'text-[#64748B]');
    });
  });

  describe('Confidence Band Formatting (formatConfidenceBand)', () => {
    test('formats distinct P10 and P90 positions as P{p10}–P{p90}', () => {
      assert.strictEqual(formatConfidenceBand(1, 4), 'P1–P4');
      assert.strictEqual(formatConfidenceBand(2, 6), 'P2–P6');
    });

    test('formats identical P10 and P90 positions as P{pos}', () => {
      assert.strictEqual(formatConfidenceBand(1, 1), 'P1');
      assert.strictEqual(formatConfidenceBand(18, 18), 'P18');
    });
  });

  describe('Constants & Colors Verification', () => {
    test('verifies Pirelli tyre compound colors', () => {
      assert.strictEqual(COMPOUND_COLORS.S, '#FF1E44');
      assert.strictEqual(COMPOUND_COLORS.M, '#FFE600');
      assert.strictEqual(COMPOUND_COLORS.H, '#E2E8F0');
      assert.strictEqual(COMPOUND_COLORS.I, '#00FF66');
      assert.strictEqual(COMPOUND_COLORS.W, '#00E5FF');
    });

    test('verifies sector micro-bar colors', () => {
      assert.strictEqual(SECTOR_COLORS.PURPLE, '#B000FF');
      assert.strictEqual(SECTOR_COLORS.GREEN, '#00FF66');
      assert.strictEqual(SECTOR_COLORS.AMBER, '#FFE600');
      assert.strictEqual(SECTOR_FALLBACK_COLOR, '#1B2230');
    });
  });

  // ==========================================================================
  // 2. ARCHITECTURAL ZERO-RENDER INVARIANT AUDIT
  // ==========================================================================
  describe('Zero-VDOM Re-Render & Subscription Invariant', () => {
    test('TimingTower source code strictly does NOT subscribe to currentDistance or isPlaying', () => {
      const sourceCode = fs.readFileSync(sourceFile, 'utf8');

      // Must NOT contain subscription to currentDistance
      assert.strictEqual(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(sourceCode),
        false,
        'CRITICAL: TimingTower must NOT subscribe to s.currentDistance!'
      );

      // Must NOT contain subscription to isPlaying
      assert.strictEqual(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(sourceCode),
        false,
        'CRITICAL: TimingTower must NOT subscribe to s.isPlaying!'
      );

      // Must be wrapped in React.memo
      assert.match(sourceCode, /export const TimingTower = React\.memo\(/);
    });
  });

  // ==========================================================================
  // 3. SKELETON LOADING STATE (renderToString)
  // ==========================================================================
  describe('Loading State (when sessionPayload is null)', () => {
    test('renders 20 skeleton rows maintaining CLS = 0 in TELEMETRY_LAB mode', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: null, cockpitMode: 'TELEMETRY_LAB' })
      );

      // Header checks
      assert.match(html, /Q1 \/\/ LIVE TIMING &amp; SECTOR MATRIX|Q1 \/\/ LIVE TIMING & SECTOR MATRIX/);
      assert.match(html, /\[20 DRV \/\/ Q3\]/);
      assert.match(html, /POS/);
      assert.match(html, /DRV/);
      assert.match(html, /TYRE/);
      assert.match(html, /LAP \/ GAP/);
      assert.match(html, /S1 \/ S2 \/ S3/);

      // Count 20 skeleton placeholder rows
      const matches = html.match(/animate-pulse/g);
      assert.ok(matches && matches.length >= 20, 'Should render at least 20 skeleton placeholders');
    });

    test('renders skeleton with oracle header in ML_STRATEGY_ORACLE mode', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: null, cockpitMode: 'ML_STRATEGY_ORACLE' })
      );

      assert.match(html, /Q1 \/\/ MONTE CARLO WIN &amp; PODIUM ORACLE|Q1 \/\/ MONTE CARLO WIN & PODIUM ORACLE/);
      assert.match(html, /\[-- SIMS\]/);
      assert.match(html, /EXP/);
      assert.match(html, /WIN %/);
      assert.match(html, /POD %/);
      assert.match(html, /P10–P90 BAND/);
    });
  });

  // ==========================================================================
  // 4. TELEMETRY LAB MODE RENDERING (renderToString)
  // ==========================================================================
  describe('TELEMETRY_LAB Mode Full Rendering', () => {
    test('renders 20 drivers with 2-digit padded positions', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.match(html, />01</);
      assert.match(html, />02</);
      assert.match(html, />20</);
      assert.match(html, />VER</);
      assert.match(html, />NOR</);
      assert.match(html, />LEC</);
    });

    test('renders P1 leader with best lap time in Electric Cyan (#00E5FF)', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      // VER is P1 in Monza fixture with 1:19.311
      assert.match(html, /text-\[#00E5FF\][^>]*>1:19\.311</);
    });

    test('renders Driver A and Driver B highlighted borders', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      // Driver A = VER (#00E5FF border)
      assert.match(html, /border-l-\[#00E5FF\]/);
      // Driver B = NOR (#B000FF border)
      assert.match(html, /border-l-\[#B000FF\]/);
    });

    test('renders Driver B delta in Neon Purple (#B000FF)', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      // NOR gap is +0.109 in Neon Purple
      assert.match(html, /text-\[#B000FF\][^>]*>\+0\.109</);
    });

    test('renders tyre compounds and tyre age for drivers', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      // Compound S with tyre age L3
      assert.match(html, />S</);
      assert.match(html, />L3</);
    });

    test('renders 3 sector micro-bars per driver with correct colors', () => {
      const html = renderToString(
        React.createElement(TimingTower, { sessionPayload: monzaBundle, cockpitMode: 'TELEMETRY_LAB' })
      );

      // VER has PURPLE, PURPLE, GREEN
      assert.match(html, /data-sector="1"/);
      assert.match(html, /data-sector="2"/);
      assert.match(html, /data-sector="3"/);
      assert.match(html, /rgb\(176, 0, 255\)|#B000FF/i); // PURPLE
      assert.match(html, /rgb\(0, 255, 102\)|#00FF66/i); // GREEN
    });
  });

  // ==========================================================================
  // 5. ML_STRATEGY_ORACLE MODE RENDERING (renderToString)
  // ==========================================================================
  describe('ML_STRATEGY_ORACLE Mode Full Rendering', () => {
    test('renders defaultStrategyOracle probabilities when strategyResult is null', () => {
      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: monzaBundle,
          cockpitMode: 'ML_STRATEGY_ORACLE',
          strategyResult: null,
        })
      );

      // Header checks
      assert.match(html, /Q1 \/\/ MONTE CARLO WIN &amp; PODIUM ORACLE|Q1 \/\/ MONTE CARLO WIN & PODIUM ORACLE/);
      assert.match(html, /\[5000 SIMS\]/);

      // VER win prob 88.8% (>25% => green text-[#00FF66])
      assert.match(html, /text-\[#00FF66\][^>]*>88\.8(?:<!-- -->)?%/);
      // Podium prob
      assert.match(html, /100\.0(?:<!-- -->)?%/);
      // P10-P90 band
      assert.match(html, /P1–P2/);
      assert.match(html, /\(1\.1\)/);
    });

    test('renders custom strategyResult with dynamic simulation count and sorted ranking', () => {
      const customProbabilities: MonteCarloDriverProbability[] = [
        {
          code: 'NOR',
          teamColor: '#FF8000',
          winProbPct: 45.0,
          podiumProbPct: 90.0,
          pointsProbPct: 100.0,
          expectedPosition: 1.8,
          p10Position: 1,
          p90Position: 2,
          expectedRaceTimeSec: 4365.0,
        },
        {
          code: 'VER',
          teamColor: '#3671C6',
          winProbPct: 52.0,
          podiumProbPct: 95.0,
          pointsProbPct: 100.0,
          expectedPosition: 1.3,
          p10Position: 1,
          p90Position: 2,
          expectedRaceTimeSec: 4362.0,
        },
      ];

      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: monzaBundle,
          cockpitMode: 'ML_STRATEGY_ORACLE',
          strategyResult: {
            executionTimeMs: 42,
            numSimulations: 10000,
            optimalPitLapA: 19,
            undercutGainSec: 1.84,
            verdictHeadline: 'BOX LAP 19',
            verdictDetail: 'Test detail',
            pitExitGapMeters: 45.2,
            driverProbabilities: customProbabilities,
            lapTraces: [],
          },
        })
      );

      // Custom simulations tag
      assert.match(html, /\[10000 SIMS\]/);
      // Sorted VER (1.3) first as P1, then NOR (1.8) as P2
      const verIdx = html.indexOf('>VER<');
      const norIdx = html.indexOf('>NOR<');
      assert.ok(verIdx !== -1 && norIdx !== -1, 'Both drivers must render');
      assert.ok(verIdx < norIdx, 'VER (expectedPosition 1.3) must render before NOR (1.8)');
    });
  });

  // ==========================================================================
  // 6. RESILIENCY & EDGE CASE HANDLING
  // ==========================================================================
  describe('Resiliency & Edge Cases', () => {
    test('handles missing sectors gracefully without crashing', () => {
      const corruptedDriver: TimingTowerDriver = {
        ...monzaBundle.timingTower[0],
        sectors: undefined as unknown as [any, any, any],
      };
      const testBundle: SessionTelemetryPayload = {
        ...monzaBundle,
        timingTower: [corruptedDriver],
      };

      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: testBundle,
          cockpitMode: 'TELEMETRY_LAB',
        })
      );
      assert.match(html, /data-status="NONE"/);
    });

    test('handles missing tyre age with fallback L-', () => {
      const corruptedDriver: TimingTowerDriver = {
        ...monzaBundle.timingTower[0],
        tyreAgeLaps: undefined as unknown as number,
      };
      const testBundle: SessionTelemetryPayload = {
        ...monzaBundle,
        timingTower: [corruptedDriver],
      };

      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: testBundle,
          cockpitMode: 'TELEMETRY_LAB',
        })
      );
      assert.match(html, />L-</);
    });

    test('handles DNF driver with bestLapTimeSec <= 0', () => {
      const dnfDriver: TimingTowerDriver = {
        ...monzaBundle.timingTower[0],
        code: 'BOT',
        bestLapTimeSec: 0,
        bestLapTimeStr: '',
      };
      const testBundle: SessionTelemetryPayload = {
        ...monzaBundle,
        timingTower: [dnfDriver],
      };

      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: testBundle,
          cockpitMode: 'TELEMETRY_LAB',
        })
      );
      assert.match(html, />NO TIME</);
    });

    test('handles empty timingTower array cleanly', () => {
      const emptyBundle: SessionTelemetryPayload = {
        ...monzaBundle,
        timingTower: [],
      };

      const html = renderToString(
        React.createElement(TimingTower, {
          sessionPayload: emptyBundle,
          cockpitMode: 'TELEMETRY_LAB',
        })
      );
      assert.match(html, /Q1 \/\/ LIVE TIMING &amp; SECTOR MATRIX|Q1 \/\/ LIVE TIMING & SECTOR MATRIX/);
    });
  });
});
