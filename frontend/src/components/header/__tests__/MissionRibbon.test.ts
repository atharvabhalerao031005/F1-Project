// frontend/src/components/header/__tests__/MissionRibbon.test.ts
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  MissionRibbon,
  SESSION_PRESETS,
  computeRollingFps,
  formatClockReadout,
  handleMissionRibbonHotkey,
} from '../MissionRibbon';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { CockpitMode, SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 3: MissionRibbon (Zone 0) Test Suite', () => {
  // Locate telemetry fixture directory robustly regardless of cwd
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  // Load real telemetry test fixture bundles
  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const silverstonePath = path.resolve(telemetryDir, '2024_silverstone_q3_ver_nor.json');
  const silverstoneBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(silverstonePath, 'utf8'));

  const monacoPath = path.resolve(telemetryDir, '2024_monaco_q3_lec_pia.json');
  const monacoBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monacoPath, 'utf8'));

  beforeEach(() => {
    // Reset store state
    useTelemetryStore.setState({
      sessionPayload: null,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: true,
      playbackSpeed: 1.0,
      cameraMode: 'ISO',
      trackColorMode: 'PEDAL',
      elevationScale: 3.5,
      loopSector: 'ALL',
    });
  });

  // ==========================================================================
  // 1. ROLLING FPS CALCULATION
  // ==========================================================================
  describe('Rolling FPS Calculation (computeRollingFps)', () => {
    test('accurately calculates 60.0 FPS when 30 frames pass in 500ms', () => {
      const fps = computeRollingFps(30, 500, 120.0);
      assert.strictEqual(fps, 60.0);
    });

    test('accurately calculates 120.0 FPS when 60 frames pass in 500ms', () => {
      const fps = computeRollingFps(60, 500, 120.0);
      assert.strictEqual(fps, 120.0);
    });

    test('accurately calculates 59.8 FPS with fractional rounding', () => {
      // 30 frames in 502ms = 59.76... FPS
      const fps = computeRollingFps(30, 502, 120.0);
      assert.strictEqual(fps.toFixed(1), '59.8');
    });

    test('clamps FPS to maxFps ceiling (e.g. 120 FPS)', () => {
      // 100 frames in 500ms = 200 FPS -> clamped to 120.0
      const fps = computeRollingFps(100, 500, 120.0);
      assert.strictEqual(fps, 120.0);
    });

    test('handles zero and negative intervals safely', () => {
      assert.strictEqual(computeRollingFps(10, 0), 0);
      assert.strictEqual(computeRollingFps(10, -50), 0);
      assert.strictEqual(computeRollingFps(0, 500), 0);
    });
  });

  // ==========================================================================
  // 2. DIRECT-DOM DISTANCE & LAP CLOCK READOUT
  // ==========================================================================
  describe('Direct-DOM Distance & Lap Clock Readout (formatClockReadout)', () => {
    test('returns zero fallback when sessionPayload is null', () => {
      const readout = formatClockReadout(0, null);
      assert.strictEqual(readout, '0000m // 0:00.000');
      assert.strictEqual(readout.length, 17, 'CLS contract: 17 characters');
    });

    test('formats start line distance (0m) on Monza bundle', () => {
      const readout = formatClockReadout(0, monzaBundle);
      assert.strictEqual(readout, '0000m // 0:00.000');
      assert.strictEqual(readout.length, 17);
    });

    test('formats Turn 1 braking zone (850m) on Monza bundle', () => {
      const readout = formatClockReadout(850, monzaBundle);
      const expectedT = monzaBundle.driverA.t[850];
      assert.ok(expectedT > 0);
      assert.match(readout, /^0850m \/\/ [0-9]:[0-9]{2}\.[0-9]{3}$/);
      assert.strictEqual(readout.length, 17);
    });

    test('formats end of lap (5,793m) on Monza bundle', () => {
      const readout = formatClockReadout(5793, monzaBundle);
      const lapEndT = monzaBundle.driverA.t[5793];
      assert.ok(lapEndT >= 79.0 && lapEndT <= 80.0, `Expected Monza lap time ~79s, got ${lapEndT}`);
      assert.strictEqual(readout, `5793m // 1:19.311`);
      assert.strictEqual(readout.length, 17);
    });

    test('clamps distance bounds safely within [0, gridLength]', () => {
      // Negative distance clamped to 0
      const readoutNeg = formatClockReadout(-100, monzaBundle);
      assert.strictEqual(readoutNeg, '0000m // 0:00.000');

      // Overflow distance clamped to gridLength
      const readoutOver = formatClockReadout(9999, monzaBundle);
      assert.strictEqual(readoutOver, '9999m // 1:19.311');
    });

    test('formats Silverstone and Monaco bundle finish lines with exact 17-char width', () => {
      const sReadout = formatClockReadout(silverstoneBundle.gridLength, silverstoneBundle);
      assert.strictEqual(sReadout.length, 17);
      assert.match(sReadout, /^5891m \/\/ 1:25\.[0-9]{3}$/);

      const mReadout = formatClockReadout(monacoBundle.gridLength, monacoBundle);
      assert.strictEqual(mReadout.length, 17);
      assert.match(mReadout, /^3337m \/\/ 1:10\.[0-9]{3}$/);
    });
  });

  // ==========================================================================
  // 3. HOTKEY BINDING COORDINATION
  // ==========================================================================
  describe('Hotkey Binding Coordination (handleMissionRibbonHotkey)', () => {
    function createMockKeyboardEvent(code: string, opts: { key?: string; shiftKey?: boolean; target?: any } = {}) {
      let defaultPrevented = false;
      return {
        code,
        key: opts.key ?? code,
        shiftKey: opts.shiftKey ?? false,
        target: opts.target ?? null,
        preventDefault: () => {
          defaultPrevented = true;
        },
        get defaultPrevented() {
          return defaultPrevented;
        },
      } as unknown as KeyboardEvent;
    }

    test('Space toggles playback and prevents default page scroll', () => {
      let playToggled = false;
      const storeMock = {
        togglePlay: () => {
          playToggled = true;
        },
        stepDistance: () => {},
        setDistance: () => {},
        setCockpitMode: () => {},
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const event = createMockKeyboardEvent('Space');
      const handled = handleMissionRibbonHotkey(event, storeMock);

      assert.strictEqual(handled, true);
      assert.strictEqual(playToggled, true);
      assert.strictEqual(event.defaultPrevented, true);
    });

    test('ArrowLeft steps distance backward by -10m (normal) and -50m (Shift)', () => {
      let stepDelta = 0;
      const storeMock = {
        togglePlay: () => {},
        stepDistance: (d: number) => {
          stepDelta = d;
        },
        setDistance: () => {},
        setCockpitMode: () => {},
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const ev1 = createMockKeyboardEvent('ArrowLeft');
      assert.strictEqual(handleMissionRibbonHotkey(ev1, storeMock), true);
      assert.strictEqual(stepDelta, -10);

      const ev2 = createMockKeyboardEvent('ArrowLeft', { shiftKey: true });
      assert.strictEqual(handleMissionRibbonHotkey(ev2, storeMock), true);
      assert.strictEqual(stepDelta, -50);
    });

    test('ArrowRight steps distance forward by +10m (normal) and +50m (Shift)', () => {
      let stepDelta = 0;
      const storeMock = {
        togglePlay: () => {},
        stepDistance: (d: number) => {
          stepDelta = d;
        },
        setDistance: () => {},
        setCockpitMode: () => {},
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const ev1 = createMockKeyboardEvent('ArrowRight');
      assert.strictEqual(handleMissionRibbonHotkey(ev1, storeMock), true);
      assert.strictEqual(stepDelta, 10);

      const ev2 = createMockKeyboardEvent('ArrowRight', { shiftKey: true });
      assert.strictEqual(handleMissionRibbonHotkey(ev2, storeMock), true);
      assert.strictEqual(stepDelta, 50);
    });

    test('Key M toggles mode between TELEMETRY_LAB and ML_STRATEGY_ORACLE', () => {
      let nextMode: CockpitMode | '' = '';
      const storeMock = {
        togglePlay: () => {},
        stepDistance: () => {},
        setDistance: () => {},
        setCockpitMode: (m: CockpitMode) => {
          nextMode = m;
        },
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const evM = createMockKeyboardEvent('KeyM', { key: 'm' });
      assert.strictEqual(handleMissionRibbonHotkey(evM, storeMock), true);
      assert.strictEqual(nextMode, 'ML_STRATEGY_ORACLE');

      storeMock.cockpitMode = 'ML_STRATEGY_ORACLE';
      assert.strictEqual(handleMissionRibbonHotkey(evM, storeMock), true);
      assert.strictEqual(nextMode, 'TELEMETRY_LAB');
    });

    test('Keys 1 and 2 select specific modes directly', () => {
      let selectedMode: CockpitMode | '' = '';
      const storeMock = {
        togglePlay: () => {},
        stepDistance: () => {},
        setDistance: () => {},
        setCockpitMode: (m: CockpitMode) => {
          selectedMode = m;
        },
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const ev2 = createMockKeyboardEvent('Digit2', { key: '2' });
      assert.strictEqual(handleMissionRibbonHotkey(ev2, storeMock), true);
      assert.strictEqual(selectedMode, 'ML_STRATEGY_ORACLE');

      const ev1 = createMockKeyboardEvent('Digit1', { key: '1' });
      assert.strictEqual(handleMissionRibbonHotkey(ev1, storeMock), true);
      assert.strictEqual(selectedMode, 'TELEMETRY_LAB');
    });

    test('Key R resets cursor distance to 0', () => {
      let resetDist = -1;
      const storeMock = {
        togglePlay: () => {},
        stepDistance: () => {},
        setDistance: (d: number) => {
          resetDist = d;
        },
        setCockpitMode: () => {},
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      const evR = createMockKeyboardEvent('KeyR', { key: 'r' });
      assert.strictEqual(handleMissionRibbonHotkey(evR, storeMock), true);
      assert.strictEqual(resetDist, 0);
    });

    test('ignores hotkeys when typing in input, textarea, or select elements', () => {
      let playToggled = false;
      const storeMock = {
        togglePlay: () => {
          playToggled = true;
        },
        stepDistance: () => {},
        setDistance: () => {},
        setCockpitMode: () => {},
        cockpitMode: 'TELEMETRY_LAB' as CockpitMode,
      };

      // Form inputs
      for (const tag of ['input', 'INPUT', 'textarea', 'TEXTAREA', 'select', 'SELECT']) {
        const ev = createMockKeyboardEvent('Space', { target: { tagName: tag } });
        const handled = handleMissionRibbonHotkey(ev, storeMock);
        assert.strictEqual(handled, false, `Failed to ignore hotkey on ${tag}`);
        assert.strictEqual(playToggled, false);
      }
    });
  });

  // ==========================================================================
  // 4. REACT COMPONENT RENDERING & MARKUP INTEGRITY
  // ==========================================================================
  describe('React Component Rendering (renderToString)', () => {
    test('renders Zone 0 header with height 36px and aero-spec system identifier', () => {
      const html = renderToString(React.createElement(MissionRibbon));

      assert.ok(html.includes('data-testid="mission-ribbon"'));
      assert.ok(html.includes('height:36px') || html.includes('height: 36px'));
      assert.ok(html.includes('AERO-SPEC'));
      assert.ok(html.includes('v5.0'));
    });

    test('renders session selector with all 3 canonical Grand Prix options', () => {
      const html = renderToString(React.createElement(MissionRibbon));

      assert.ok(html.includes('data-testid="session-selector"'));
      for (const preset of SESSION_PRESETS) {
        assert.ok(html.includes(`value="${preset.id}"`), `Missing preset option value: ${preset.id}`);
        assert.ok(html.includes(preset.label), `Missing preset option label: ${preset.label}`);
      }
    });

    test('renders dual-engine mode switcher with Electric Cyan active on TELEMETRY_LAB', () => {
      const html = renderToString(React.createElement(MissionRibbon, { cockpitMode: 'TELEMETRY_LAB' }));

      assert.ok(html.includes('data-testid="cockpit-mode-toggle"'));
      assert.ok(html.includes('[1] 60 FPS TELEMETRY LAB'));
      assert.ok(
        html.includes('[2] ML STRATEGY &amp; MONTE CARLO ORACLE') ||
          html.includes('[2] ML STRATEGY & MONTE CARLO ORACLE')
      );

      // In TELEMETRY_LAB, mode 1 button has electric cyan background #00E5FF
      assert.ok(html.includes('#00E5FF'), 'Should have Electric Cyan #00E5FF on Telemetry Lab button');
      assert.ok(html.includes('aria-pressed="true"'));
    });

    test('renders dual-engine mode switcher with Active Green active on ML_STRATEGY_ORACLE', () => {
      const html = renderToString(React.createElement(MissionRibbon, { cockpitMode: 'ML_STRATEGY_ORACLE' }));

      // In ML_STRATEGY_ORACLE, mode 2 button has active green background #00FF66
      assert.ok(html.includes('#00FF66'), 'Should have Active Green #00FF66 on Oracle button');
    });

    test('renders environmental sensor badges with live telemetry weather data', () => {
      const html = renderToString(React.createElement(MissionRibbon, { sessionPayload: monzaBundle }));

      assert.ok(html.includes('data-testid="environmental-sensors"'));
      // Track temp: 42.4°C
      assert.ok(html.includes('42.4°C'), 'Missing Monza track temperature badge');
      // Air temp: 28.6°C
      assert.ok(html.includes('28.6°C'), 'Missing Monza air temperature badge');
      // Wind speed: 1.8 M/S
      assert.ok(html.includes('1.8 M/S'), 'Missing Monza wind speed badge');
      // Wind direction: SSE
      assert.ok(html.includes('SSE'), 'Missing Monza wind direction badge');
      // FIA Track status: GREEN
      assert.ok(html.includes('GREEN'), 'Missing FIA status badge');
    });

    test('renders direct-DOM spans for decoupled RAF clock and rolling FPS', () => {
      const html = renderToString(React.createElement(MissionRibbon));

      assert.ok(html.includes('data-testid="direct-dom-clock"'));
      assert.ok(html.includes('0000m // 0:00.000'));

      assert.ok(html.includes('data-testid="rolling-fps-badge"'));
      assert.ok(html.includes('60.0 FPS'));
    });

    test('displays loading indicator pill when isLoading is true', () => {
      const htmlLoading = renderToString(React.createElement(MissionRibbon, { isLoading: true }));
      assert.ok(htmlLoading.includes('data-testid="loading-indicator"'));
      assert.ok(htmlLoading.includes('SYNCING TELEMETRY...'));

      const htmlReady = renderToString(React.createElement(MissionRibbon, { isLoading: false }));
      assert.ok(!htmlReady.includes('data-testid="loading-indicator"'));
    });
  });
});
