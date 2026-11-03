/**
 * AERO-SPEC F1 // UNIT TEST SUITE FOR HIGH-FREQUENCY TELEMETRY FORMATTERS
 * File: frontend/src/utils/__tests__/formatters.test.ts
 * Specification: docs/research/AEROSPACE_TELEMETRY_FORMATTERS_AND_TABULAR_TYPOGRAPHY_SPECIFICATION.md
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDistanceM,
  formatLapClock,
  formatDeltaSec,
  formatDeltaSecTabular,
  formatSpeedKmh,
  formatGForce,
  formatPercentage,
  formatThrottlePct,
  formatBrakePct,
  formatRpm,
  formatGear,
  formatDrs,
  formatSectorTime,
  formatTrackTemp,
  HUD_CHAR_WIDTHS,
  HUD_TYPOGRAPHY_CONTRACT,
} from '../formatters.ts';

describe('Aero-Spec Telemetry Formatters & Tabular Typography Test Suite', () => {

  // ==========================================================================
  // 1. formatDistanceM (distM: number)
  // ==========================================================================
  describe('formatDistanceM', () => {
    test('formats nominal distances with 4-digit zero-padding and "m" suffix', () => {
      assert.equal(formatDistanceM(0), '0000m');
      assert.equal(formatDistanceM(42), '0042m');
      assert.equal(formatDistanceM(1520), '1520m');
      assert.equal(formatDistanceM(5793), '5793m');
      assert.equal(formatDistanceM(9999), '9999m');
    });

    test('truncates/floors floating-point spatial interpolation coordinates', () => {
      assert.equal(formatDistanceM(1520.48), '1520m');
      assert.equal(formatDistanceM(5793.99), '5793m');
      assert.equal(formatDistanceM(0.999), '0000m');
    });

    test('enforces fixed 5-character contract width for standard circuits', () => {
      for (const dist of [0, 1, 9, 10, 99, 100, 999, 1000, 5793, 7004]) {
        const out = formatDistanceM(dist);
        assert.equal(out.length, HUD_CHAR_WIDTHS.DISTANCE_M, `Expected length ${HUD_CHAR_WIDTHS.DISTANCE_M} for dist ${dist}`);
      }
    });

    test('handles ultra-long tracks exceeding 9999m gracefully', () => {
      assert.equal(formatDistanceM(12500), '12500m');
      assert.equal(formatDistanceM(20832), '20832m'); // Nürburgring Nordschleife
    });

    test('clamps negative distances to start-line 0000m', () => {
      assert.equal(formatDistanceM(-1), '0000m');
      assert.equal(formatDistanceM(-500), '0000m');
    });

    test('returns fallback representation for NaN and non-finite inputs', () => {
      assert.equal(formatDistanceM(NaN), '----m');
      assert.equal(formatDistanceM(Infinity), '----m');
      assert.equal(formatDistanceM(-Infinity), '----m');
    });
  });

  // ==========================================================================
  // 2. formatLapClock (lapTimeSec: number)
  // ==========================================================================
  describe('formatLapClock', () => {
    test('formats high-precision lap clocks in M:SS.fff format', () => {
      assert.equal(formatLapClock(0), '0:00.000');
      assert.equal(formatLapClock(79.301), '1:19.301');
      assert.equal(formatLapClock(85.819), '1:25.819');
      assert.equal(formatLapClock(60.000), '1:00.000');
      assert.equal(formatLapClock(125.042), '2:05.042');
      assert.equal(formatLapClock(9.005), '0:09.005');
    });

    test('enforces strict 8-character width contract for sub-10-minute laps', () => {
      const samples = [0, 0.001, 1.234, 59.999, 60.000, 79.301, 85.819, 599.999];
      for (const t of samples) {
        const out = formatLapClock(t);
        assert.equal(out.length, HUD_CHAR_WIDTHS.LAP_CLOCK, `Expected length ${HUD_CHAR_WIDTHS.LAP_CLOCK} for time ${t}: got "${out}"`);
      }
    });

    test('correctly handles sub-millisecond rollovers at boundary (e.g. 59.9996s -> 1:00.000)', () => {
      assert.equal(formatLapClock(59.9996), '1:00.000');
      assert.equal(formatLapClock(59.9994), '0:59.999');
      assert.equal(formatLapClock(119.9996), '2:00.000');
    });

    test('guards against negative times and non-finite inputs', () => {
      assert.equal(formatLapClock(-10), '0:00.000');
      assert.equal(formatLapClock(NaN), '--:--.---');
      assert.equal(formatLapClock(Infinity), '--:--.---');
      assert.equal(formatLapClock(-Infinity), '--:--.---');
    });
  });

  // ==========================================================================
  // 3. formatDeltaSec (deltaSec: number, options?: DeltaFormatOptions)
  // ==========================================================================
  describe('formatDeltaSec', () => {
    test('formats trailing (positive) and leading (negative) deltas with explicit sign', () => {
      assert.equal(formatDeltaSec(0.109), '+0.109s');
      assert.equal(formatDeltaSec(-0.042), '-0.042s');
      assert.equal(formatDeltaSec(1.234), '+1.234s');
      assert.equal(formatDeltaSec(-2.500), '-2.500s');
    });

    test('formats zero delta as "0.000s" by default', () => {
      assert.equal(formatDeltaSec(0), '0.000s');
    });

    test('eliminates negative zero IEEE-754 artifact for sub-millisecond values', () => {
      assert.equal(formatDeltaSec(-0.0001), '0.000s');
      assert.equal(formatDeltaSec(-0.00049), '0.000s');
      assert.equal(formatDeltaSec(-0.0006), '-0.001s');
      assert.equal(formatDeltaSec(-0.001), '-0.001s');
    });

    test('supports options: fixedWidth (pads zero with leading space: " 0.000s")', () => {
      assert.equal(formatDeltaSec(0, { fixedWidth: true }), ' 0.000s');
      assert.equal(formatDeltaSec(0, { fixedWidth: true }).length, HUD_CHAR_WIDTHS.DELTA_SEC);
    });

    test('supports options: zeroSign ("+" -> "+0.000s", " " -> " 0.000s")', () => {
      assert.equal(formatDeltaSec(0, { zeroSign: '+' }), '+0.000s');
      assert.equal(formatDeltaSec(0, { zeroSign: ' ' }), ' 0.000s');
    });

    test('formatDeltaSecTabular always outputs exactly 7 characters (CLS = 0)', () => {
      const testDeltas = [0, 0.001, -0.001, 0.109, -0.042, 1.5, -3.2, 9.999, -9.999];
      for (const d of testDeltas) {
        const out = formatDeltaSecTabular(d);
        assert.equal(out.length, HUD_CHAR_WIDTHS.DELTA_SEC, `Expected 7ch for delta ${d}: got "${out}"`);
      }
    });

    test('guards against NaN and non-finite values', () => {
      assert.equal(formatDeltaSec(NaN), '--.---s');
      assert.equal(formatDeltaSec(Infinity), '--.---s');
    });
  });

  // ==========================================================================
  // 4. formatSpeedKmh (speedKmh: number)
  // ==========================================================================
  describe('formatSpeedKmh', () => {
    test('formats 3-digit zero-padded speed with " KM/H" suffix', () => {
      assert.equal(formatSpeedKmh(352), '352 KM/H');
      assert.equal(formatSpeedKmh(74), '074 KM/H');
      assert.equal(formatSpeedKmh(0), '000 KM/H');
      assert.equal(formatSpeedKmh(8), '008 KM/H');
      assert.equal(formatSpeedKmh(99), '099 KM/H');
      assert.equal(formatSpeedKmh(100), '100 KM/H');
    });

    test('rounds floating point speeds accurately', () => {
      assert.equal(formatSpeedKmh(351.6), '352 KM/H');
      assert.equal(formatSpeedKmh(73.4), '073 KM/H');
      assert.equal(formatSpeedKmh(73.6), '074 KM/H');
    });

    test('enforces strict 8-character contract width across full operating range', () => {
      for (let s = 0; s <= 375; s += 25) {
        const out = formatSpeedKmh(s);
        assert.equal(out.length, HUD_CHAR_WIDTHS.SPEED_KMH, `Expected 8ch for speed ${s}: got "${out}"`);
      }
    });

    test('clamps negative speeds to "000 KM/H"', () => {
      assert.equal(formatSpeedKmh(-10), '000 KM/H');
    });

    test('guards against NaN and non-finite values', () => {
      assert.equal(formatSpeedKmh(NaN), '--- KM/H');
      assert.equal(formatSpeedKmh(Infinity), '--- KM/H');
    });
  });

  // ==========================================================================
  // 5. formatGForce (g: number)
  // ==========================================================================
  describe('formatGForce', () => {
    test('formats signed acceleration with 2 decimal places and " G" suffix', () => {
      assert.equal(formatGForce(1.84), '+1.84 G');
      assert.equal(formatGForce(-5.50), '-5.50 G');
      assert.equal(formatGForce(0), '+0.00 G');
      assert.equal(formatGForce(0.05), '+0.05 G');
      assert.equal(formatGForce(-0.05), '-0.05 G');
      assert.equal(formatGForce(4.00), '+4.00 G');
    });

    test('enforces strict 7-character contract width in standard range [-6.00, +6.00]', () => {
      const gValues = [-5.5, -4.2, -1.0, -0.05, 0, 0.05, 1.84, 3.5, 5.0];
      for (const g of gValues) {
        const out = formatGForce(g);
        assert.equal(out.length, HUD_CHAR_WIDTHS.G_FORCE, `Expected 7ch for G ${g}: got "${out}"`);
      }
    });

    test('eliminates negative zero IEEE-754 artifact', () => {
      assert.equal(formatGForce(-0.001), '+0.00 G');
      assert.equal(formatGForce(-0.0049), '+0.00 G');
    });

    test('handles extreme crash/impact impulses (|g| > 6.00 G)', () => {
      assert.equal(formatGForce(8.25), '+8.25 G');
      assert.equal(formatGForce(-9.12), '-9.12 G');
    });

    test('guards against NaN and non-finite values', () => {
      assert.equal(formatGForce(NaN), '--.-- G');
      assert.equal(formatGForce(Infinity), '--.-- G');
    });
  });

  // ==========================================================================
  // 6. formatPercentage (pct: number, decimals?: number)
  // ==========================================================================
  describe('formatPercentage', () => {
    test('formats probability percentages with 2-digit zero-padded integer and 1 decimal place', () => {
      assert.equal(formatPercentage(79.8), '79.8%');
      assert.equal(formatPercentage(6.7), '06.7%');
      assert.equal(formatPercentage(0), '00.0%');
      assert.equal(formatPercentage(100), '100.0%');
    });

    test('enforces 5-character contract width for <100% and 6 characters for 100.0%', () => {
      assert.equal(formatPercentage(6.7).length, 5);
      assert.equal(formatPercentage(79.8).length, 5);
      assert.equal(formatPercentage(0).length, 5);
      assert.equal(formatPercentage(100).length, 6);
    });

    test('supports 0 decimal places option', () => {
      assert.equal(formatPercentage(79.8, 0), '80%');
      assert.equal(formatPercentage(6.7, 0), '07%');
      assert.equal(formatPercentage(0, 0), '00%');
      assert.equal(formatPercentage(100, 0), '100%');
    });

    test('supports 2 decimal places option', () => {
      assert.equal(formatPercentage(6.72, 2), '06.72%');
      assert.equal(formatPercentage(79.84, 2), '79.84%');
    });

    test('clamps out-of-domain percentages (pct < 0 or pct > 100)', () => {
      assert.equal(formatPercentage(-5), '00.0%');
      assert.equal(formatPercentage(105), '100.0%');
    });

    test('guards against NaN and non-finite values', () => {
      assert.equal(formatPercentage(NaN), '--.-%');
      assert.equal(formatPercentage(Infinity), '--.-%');
    });
  });

  // ==========================================================================
  // 7. Auxiliary Cockpit & Telemetry Formatters
  // ==========================================================================
  describe('Auxiliary Cockpit Formatters', () => {
    test('formatThrottlePct and formatBrakePct format 3-digit percentages', () => {
      assert.equal(formatThrottlePct(100), '100%');
      assert.equal(formatThrottlePct(42), '042%');
      assert.equal(formatThrottlePct(0), '000%');
      assert.equal(formatThrottlePct(5), '005%');

      assert.equal(formatBrakePct(100), '100%');
      assert.equal(formatBrakePct(85), '085%');
      assert.equal(formatBrakePct(0), '000%');
    });

    test('formatRpm formats 5-digit zero-padded RPM with " RPM" suffix', () => {
      assert.equal(formatRpm(12450), '12450 RPM');
      assert.equal(formatRpm(8200), '08200 RPM');
      assert.equal(formatRpm(0), '00000 RPM');
      assert.equal(formatRpm(12450).length, HUD_CHAR_WIDTHS.RPM);
    });

    test('formatGear formats transmission gear glyph', () => {
      assert.equal(formatGear(0), 'N');
      assert.equal(formatGear(1), '1');
      assert.equal(formatGear(7), '7');
      assert.equal(formatGear(8), '8');
      assert.equal(formatGear(-1), 'R');
      assert.equal(formatGear(NaN), '-');
    });

    test('formatDrs formats DRS activation state with fixed 7-character width', () => {
      assert.equal(formatDrs(true), 'DRS ON ');
      assert.equal(formatDrs(false), 'DRS OFF');
      assert.equal(formatDrs(1), 'DRS ON ');
      assert.equal(formatDrs(0), 'DRS OFF');
      assert.equal(formatDrs(true).length, HUD_CHAR_WIDTHS.DRS);
      assert.equal(formatDrs(false).length, HUD_CHAR_WIDTHS.DRS);
    });

    test('formatSectorTime formats sector split times in SS.fffs', () => {
      assert.equal(formatSectorTime(24.182), '24.182s');
      assert.equal(formatSectorTime(18.905), '18.905s');
      assert.equal(formatSectorTime(9.405), '09.405s');
      assert.equal(formatSectorTime(24.182).length, HUD_CHAR_WIDTHS.SECTOR_TIME);
    });

    test('formatTrackTemp formats signed Celsius temperatures', () => {
      assert.equal(formatTrackTemp(32.4), '+32.4°C');
      assert.equal(formatTrackTemp(-2.1), '-02.1°C');
      assert.equal(formatTrackTemp(0.0), '+00.0°C');
      assert.equal(formatTrackTemp(32.4).length, HUD_CHAR_WIDTHS.TRACK_TEMP);
    });
  });

  // ==========================================================================
  // 8. Typography Contract Integrity
  // ==========================================================================
  describe('HUD Typography Contract Integrity', () => {
    test('all registered contract fields exist and match expected character widths', () => {
      for (const [key, contract] of Object.entries(HUD_TYPOGRAPHY_CONTRACT)) {
        assert.ok(contract.id, `Contract ${key} must have id`);
        assert.ok(contract.charWidth > 0, `Contract ${key} must have charWidth > 0`);
        assert.equal(contract.cssFontVariant, 'tabular-nums slashed-zero');
        assert.equal(contract.sampleOutput.length, contract.charWidth,
          `Contract ${key} sampleOutput "${contract.sampleOutput}" length does not match charWidth ${contract.charWidth}`);
      }
    });
  });

  // ==========================================================================
  // 9. High-Throughput & Zero-Allocation Stress Verification
  // ==========================================================================
  describe('High-Throughput Hot-Path Verification', () => {
    test('executes 100,000 formatting operations in under 50ms', () => {
      const start = performance.now();
      for (let i = 0; i < 100000; i++) {
        const d = (i % 5793);
        const s = (i % 350);
        const g = ((i % 1000) - 500) / 100;
        formatDistanceM(d);
        formatSpeedKmh(s);
        formatGForce(g);
        formatLapClock(79.301);
        formatPercentage(79.8);
      }
      const elapsed = performance.now() - start;
      assert.ok(elapsed < 100, `Expected 100,000 ops < 100ms, took ${elapsed.toFixed(2)}ms`);
    });
  });
});
