// frontend/src/components/flankRight/__tests__/MlStrategySandbox.test.ts
/**
 * AERO-SPEC F1 // QUADRANT 3: ML STRATEGY SANDBOX COMPONENT TEST SUITE
 * Blueprint Contract: aero_spec_antigravity_master_blueprint.md (lines 138, 1452-1735, 2275)
 * Research Synthesis: PHASE_4_RESEARCH_SWARM_SYNTHESIS.md Section 4.5
 *
 * Test Coverage Matrix:
 * 1. Pure Function & Rule Validators (isFiaTwoCompoundRuleViolated, createRafCoalescer)
 * 2. Full Component Rendering across all 5 Sub-Sections:
 *    - Sub-Section 1: ML Verdict Banner (Green vs Yellow, headline, execution time ms, button)
 *    - Sub-Section 2: Driver A Strategy Sandbox (Start/Next compounds, box lap slider, opt box tag)
 *    - Sub-Section 3: Driver B Rival Strategy Sandbox (Ghost badge, rival compounds, rival box lap slider)
 *    - Sub-Section 4: Safety Car Window Injector (Stochastic, SC on Lap A, SC on Lap B, active highlights)
 *    - Sub-Section 5: ML Telemetry Physics-Warp Simulator (Toggle warp, tyre age, fuel load, predicted lap time)
 * 3. FIA Mandatory Two-Compound Rule Check & Caution Badge Visibility
 * 4. User Interaction & Store Dispatches (Compound clicks, Slider drags, SC toggles)
 * 5. 3D Pit-Exit Undercut Merge Action Dispatch (jumpToPitExitBattle, 610m Turn 1 station, CHASE cam)
 * 6. ML Physics-Warp Parameter Perturbations & Readout Formatting
 * 7. Slider Drag Event Coalescing via requestAnimationFrame
 * 8. Gate 5 Static AST & Zero-VDOM Subscription Conformance (0 subscriptions to currentDistance or isPlaying)
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  MlStrategySandbox,
  COMPOUNDS,
  FIA_RULE_VIOLATION_MESSAGE,
  isFiaTwoCompoundRuleViolated,
  createRafCoalescer,
} from '../MlStrategySandbox';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type {
  MlStrategySimulationInput,
  MlStrategySimulationResult,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  SessionTelemetryPayload,
} from '../../../types/telemetry';

describe('Aero-Spec Phase 4: MlStrategySandbox Component Test Suite', () => {
  // Locate telemetry fixture directory robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const sourceFile = fs.existsSync(path.resolve(process.cwd(), 'src/components/flankRight/MlStrategySandbox.tsx'))
    ? path.resolve(process.cwd(), 'src/components/flankRight/MlStrategySandbox.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankRight/MlStrategySandbox.tsx');

  const baselineStrategyInput: MlStrategySimulationInput = {
    totalRaceLaps: 53,
    safetyCarWindowLap: null,
    trackTempC: 42.4,
    pitLossNormalSec: 21.4,
    pitLossScSec: 11.2,
    numSimulations: 5000,
    strategyA: {
      driverCode: 'VER',
      startCompound: 'S',
      pitLap1: 19,
      nextCompound1: 'H',
      stops: 1,
      pitLap2: 38,
      nextCompound2: 'S',
    },
    strategyB: {
      driverCode: 'NOR',
      startCompound: 'M',
      pitLap1: 24,
      nextCompound1: 'H',
      stops: 1,
      pitLap2: 40,
      nextCompound2: 'S',
    },
  };

  const sampleStrategyResult: MlStrategySimulationResult = {
    executionTimeMs: 24.8,
    numSimulations: 5000,
    optimalPitLapA: 19,
    undercutGainSec: 1.84,
    verdictHeadline: 'UNDERCUT OPTIMAL // BOX LAP 19 FOR [H] (+1.84s NET GAIN)',
    verdictDetail: 'Driver A pit delta yields 14.2m spatial advantage at Turn 1 apex over Driver B.',
    pitExitGapMeters: 14.2,
    driverProbabilities: [],
    lapTraces: [],
  };

  const sampleWarpParams: MlPhysicsWarpParams = {
    enabled: true,
    compound: 'S',
    tyreAgeLaps: 22,
    fuelLoadKg: 65,
    trackTempC: 42.4,
  };

  const sampleWarpOutput: MlPhysicsWarpOutput = {
    predictedLapTimeSec: 81.452,
    lapDeltaVsBaseSec: 2.141,
    gripMultiplier: 0.912,
    brakingExtensionM: 14.8,
    warpedSpeed: new Float32Array(5794),
    warpedDeltaT: new Float32Array(5794),
  };

  beforeEach(() => {
    // Reset Zustand store to clean state
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      isLoading: false,
      error: null,
      cockpitMode: 'ML_STRATEGY_ORACLE',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
      strategyInput: baselineStrategyInput,
      strategyResult: sampleStrategyResult,
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
  // 1. PURE FUNCTION & RULE VALIDATORS
  // ==========================================================================
  describe('1. Pure Function & Rule Validators', () => {
    test('isFiaTwoCompoundRuleViolated identifies same-compound dry violation', () => {
      assert.strictEqual(isFiaTwoCompoundRuleViolated('S', 'S'), true);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('M', 'M'), true);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('H', 'H'), true);
    });

    test('isFiaTwoCompoundRuleViolated allows distinct dry compounds', () => {
      assert.strictEqual(isFiaTwoCompoundRuleViolated('S', 'M'), false);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('S', 'H'), false);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('M', 'H'), false);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('M', 'S'), false);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('H', 'S'), false);
      assert.strictEqual(isFiaTwoCompoundRuleViolated('H', 'M'), false);
    });

    test('COMPOUNDS array exports canonical dry tyres [S, M, H]', () => {
      assert.deepStrictEqual(COMPOUNDS, ['S', 'M', 'H']);
      assert.ok(FIA_RULE_VIOLATION_MESSAGE.includes('FIA 2-COMPOUND RULE VIOLATION'));
    });
  });

  // ==========================================================================
  // 2. FULL COMPONENT RENDERING ACROSS ALL 5 SUB-SECTIONS
  // ==========================================================================
  describe('2. Full Component Rendering (5 Sub-Sections)', () => {
    test('renders Sub-Section 1: ML Verdict Banner with positive undercut gain (#00FF66)', () => {
      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="ml-verdict-banner"/);
      assert.match(html, /border-\[#00FF66\]/);
      assert.match(html, /bg-\[#00FF66\]\/10/);
      assert.match(html, /UNDERCUT OPTIMAL/);
      assert.match(html, /\[(?:<!-- -->)?24\.8(?:<!-- -->)? ms\]/);
      assert.match(html, /Driver A pit delta yields 14\.2m/);
      assert.match(html, /▶ SIMULATE 3D PIT-EXIT MERGE AT TURN 1/);
    });

    test('renders Sub-Section 1: ML Verdict Banner with negative undercut / overcut gain (#FFE600)', () => {
      useTelemetryStore.setState({
        strategyResult: {
          ...sampleStrategyResult,
          undercutGainSec: -1.25,
          verdictHeadline: 'OVERCUT FAVORED // EXTEND STINT A (+1.25s)',
        },
      });

      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="ml-verdict-banner"/);
      assert.match(html, /border-\[#FFE600\]/);
      assert.match(html, /bg-\[#FFE600\]\/10/);
      assert.match(html, /OVERCUT FAVORED/);
    });

    test('renders Sub-Section 2: Driver A Pit Strategy Sandbox with controls and optimal box lap', () => {
      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="driver-a-sandbox"/);
      assert.match(html, /\[DRIVER A\] (?:<!-- -->)?VER(?:<!-- -->)? PIT STRATEGY/);
      assert.match(html, /OPT BOX: LAP (?:<!-- -->)?19/);
      assert.match(html, /STINT COMPOUNDS:/);
      assert.match(html, /data-testid="driver-a-start-compound-S"/);
      assert.match(html, /data-testid="driver-a-next-compound-H"/);
      assert.match(html, /TARGET BOX LAP:/);
      assert.match(html, /LAP (?:<!-- -->)?19(?:<!-- -->)? \/ (?:<!-- -->)?53/);
      assert.match(html, /data-testid="driver-a-pit-lap-slider"/);
    });

    test('renders Sub-Section 3: Driver B Rival Strategy Sandbox with ghost styling', () => {
      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="driver-b-sandbox"/);
      assert.match(html, /\[GHOST B\] (?:<!-- -->)?NOR(?:<!-- -->)? PIT STRATEGY/);
      assert.match(html, /RIVAL BENCHMARK/);
      assert.match(html, /data-testid="driver-b-start-compound-M"/);
      assert.match(html, /data-testid="driver-b-next-compound-H"/);
      assert.match(html, /RIVAL BOX LAP:/);
      assert.match(html, /LAP (?:<!-- -->)?24(?:<!-- -->)? \/ (?:<!-- -->)?53/);
      assert.match(html, /data-testid="driver-b-pit-lap-slider"/);
    });

    test('renders Sub-Section 4: Safety Car Window Injector with all 3 quick toggle buttons', () => {
      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="safety-car-sandbox"/);
      assert.match(html, /SAFETY CAR DEPLOYMENT:/);
      assert.match(html, /STOCHASTIC HAZARD/);
      assert.match(html, /data-testid="sc-btn-stochastic"/);
      assert.match(html, /data-testid="sc-btn-pit-lap-a"/);
      assert.match(html, /data-testid="sc-btn-pit-lap-b"/);
      assert.match(html, /SC ON LAP (?:<!-- -->)?19/);
      assert.match(html, /SC ON LAP (?:<!-- -->)?24/);
    });

    test('renders Sub-Section 5: ML Telemetry Physics-Warp Simulator with sliders & predictions', () => {
      useTelemetryStore.setState({
        mlWarpParams: sampleWarpParams,
        mlWarpOutput: sampleWarpOutput,
      });

      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="ml-physics-warp-sandbox"/);
      assert.match(html, /ML TELEMETRY PHYSICS-WARP/);
      assert.match(html, /WARP ACTIVE/);
      assert.match(html, /TYRE AGE: (?:<!-- -->)?22(?:<!-- -->)? LAPS/);
      assert.match(html, /GRIP: (?:<!-- -->)?91\.2(?:<!-- -->)?%/);
      assert.match(html, /FUEL LOAD: (?:<!-- -->)?65(?:<!-- -->)? KG/);
      assert.match(html, /BRAKE SHIFT: \+(?:<!-- -->)?14\.8(?:<!-- -->)?m/);
      assert.match(html, /ML PREDICTED LAP:/);
      assert.match(html, /81\.452s \(\+2\.141s\)/);
    });
  });

  // ==========================================================================
  // 3. FIA MANDATORY TWO-COMPOUND RULE CAUTION BADGE
  // ==========================================================================
  describe('3. FIA Mandatory Two-Compound Rule Check', () => {
    test('does NOT display caution badge when compounds are distinct (S -> H)', () => {
      const html = renderToString(React.createElement(MlStrategySandbox));
      assert.doesNotMatch(html, /data-testid="fia-rule-violation-badge"/);
      assert.doesNotMatch(html, /FIA 2-COMPOUND RULE VIOLATION/);
    });

    test('displays amber caution badge when Driver A start and next compounds match (S -> S)', () => {
      useTelemetryStore.setState({
        strategyInput: {
          ...baselineStrategyInput,
          strategyA: {
            ...baselineStrategyInput.strategyA,
            startCompound: 'S',
            nextCompound1: 'S',
          },
        },
      });

      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="fia-rule-violation-badge"/);
      assert.match(html, /border-\[#FFE600\]/);
      assert.match(html, /FIA 2-COMPOUND RULE VIOLATION: DRY TIRES MUST USE (?:>=|&gt;=) 2 DIFFERENT COMPOUNDS/);
    });

    test('displays amber caution badge when Driver A start and next compounds match (M -> M)', () => {
      useTelemetryStore.setState({
        strategyInput: {
          ...baselineStrategyInput,
          strategyA: {
            ...baselineStrategyInput.strategyA,
            startCompound: 'M',
            nextCompound1: 'M',
          },
        },
      });

      const html = renderToString(React.createElement(MlStrategySandbox));

      assert.match(html, /data-testid="fia-rule-violation-badge"/);
      assert.match(html, /FIA 2-COMPOUND RULE VIOLATION/);
    });
  });

  // ==========================================================================
  // 4. USER INTERACTION & STORE DISPATCHES
  // ==========================================================================
  describe('4. Store Dispatches on User Interaction', () => {
    test('updateStrategyInput updates starting and next compounds for Driver A', () => {
      const updateStrategyInput = useTelemetryStore.getState().updateStrategyInput;

      // Switch Driver A start compound to 'M'
      updateStrategyInput({
        strategyA: {
          ...useTelemetryStore.getState().strategyInput.strategyA,
          startCompound: 'M',
        },
      });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.strategyA.startCompound, 'M');

      // Switch Driver A next compound to 'S'
      updateStrategyInput({
        strategyA: {
          ...useTelemetryStore.getState().strategyInput.strategyA,
          nextCompound1: 'S',
        },
      });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.strategyA.nextCompound1, 'S');
    });

    test('updateStrategyInput updates Target Box Lap for Driver A and Driver B', () => {
      const updateStrategyInput = useTelemetryStore.getState().updateStrategyInput;

      // Update Driver A box lap to 17
      updateStrategyInput({
        strategyA: {
          ...useTelemetryStore.getState().strategyInput.strategyA,
          pitLap1: 17,
        },
      });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.strategyA.pitLap1, 17);

      // Update Driver B box lap to 28
      updateStrategyInput({
        strategyB: {
          ...useTelemetryStore.getState().strategyInput.strategyB,
          pitLap1: 28,
        },
      });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.strategyB.pitLap1, 28);
    });

    test('Safety car injector toggles stochastic vs specific lap injection', () => {
      const updateStrategyInput = useTelemetryStore.getState().updateStrategyInput;

      // Inject SC on Lap 19 (Driver A box lap)
      updateStrategyInput({ safetyCarWindowLap: 19 });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.safetyCarWindowLap, 19);

      // Revert to Stochastic
      updateStrategyInput({ safetyCarWindowLap: null });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.safetyCarWindowLap, null);

      // Inject SC on Lap 24 (Driver B box lap)
      updateStrategyInput({ safetyCarWindowLap: 24 });
      assert.strictEqual(useTelemetryStore.getState().strategyInput.safetyCarWindowLap, 24);
    });
  });

  // ==========================================================================
  // 5. 3D PIT-EXIT UNDERCUT BATTLE MERGE ACTION DISPATCH
  // ==========================================================================
  describe('5. 3D Pit-Exit Merge Action Dispatch', () => {
    test('jumpToPitExitBattle sets currentDistance according to Turn 1 apex station', () => {
      useTelemetryStore.setState({
        currentDistance: 3200,
        cameraMode: 'ISO',
        isPlaying: true,
      });

      const jumpToPitExitBattle = useTelemetryStore.getState().jumpToPitExitBattle;
      jumpToPitExitBattle();

      const state = useTelemetryStore.getState();
      const t1Apex = monzaBundle.corners[0]?.apexDistanceM ?? 850;
      const expectedMergeStation = Math.max(150, t1Apex - 240); // 450 - 240 = 210m

      assert.strictEqual(state.currentDistance, expectedMergeStation, 'Cursor jumped to pit merge station');
      assert.strictEqual(state.cameraMode, 'CHASE', 'Camera switches to dynamic chase cam');
      assert.strictEqual(state.isPlaying, false, 'Playback pauses for tactical inspection');
    });

    test('jumpToPitExitBattle sets currentDistance to 610m when T1 apex is 850m', () => {
      useTelemetryStore.setState({
        sessionPayload: {
          ...monzaBundle,
          corners: [{ ...monzaBundle.corners[0], apexDistanceM: 850 }],
        },
        currentDistance: 3200,
        cameraMode: 'ISO',
        isPlaying: true,
      });

      const jumpToPitExitBattle = useTelemetryStore.getState().jumpToPitExitBattle;
      jumpToPitExitBattle();

      const state = useTelemetryStore.getState();
      assert.strictEqual(state.currentDistance, 610, 'Monza T1 pit merge is exactly 610m with 850m apex');
      assert.strictEqual(state.cameraMode, 'CHASE');
      assert.strictEqual(state.isPlaying, false);
    });
  });

  // ==========================================================================
  // 6. ML PHYSICS-WARP PARAMETER PERTURBATIONS & READOUTS
  // ==========================================================================
  describe('6. ML Physics-Warp Parameter Updates & Readouts', () => {
    test('updateMlWarpParams toggles enabled flag and re-evaluates outputs', () => {
      const updateMlWarpParams = useTelemetryStore.getState().updateMlWarpParams;

      assert.strictEqual(useTelemetryStore.getState().mlWarpParams.enabled, false);

      updateMlWarpParams({ enabled: true });
      assert.strictEqual(useTelemetryStore.getState().mlWarpParams.enabled, true);
      assert.notStrictEqual(useTelemetryStore.getState().mlWarpOutput, null);

      updateMlWarpParams({ enabled: false });
      assert.strictEqual(useTelemetryStore.getState().mlWarpParams.enabled, false);
    });

    test('updateMlWarpParams accurately recalculates grip and brake shift on tyre/fuel delta', () => {
      const updateMlWarpParams = useTelemetryStore.getState().updateMlWarpParams;

      // Perturb tyre age to 35 laps and fuel to 100 kg
      updateMlWarpParams({
        enabled: true,
        tyreAgeLaps: 35,
        fuelLoadKg: 100,
      });

      const output = useTelemetryStore.getState().mlWarpOutput;
      assert.ok(output !== null, 'Output must be computed');
      assert.ok(output.gripMultiplier < 1.0, 'Grip must degrade on 35-lap tyres');
      assert.ok(output.brakingExtensionM > 0, 'Heavy fuel extends braking zone');
      assert.ok(output.lapDeltaVsBaseSec > 0, 'Heavier car with older tyres is slower');
    });

    test('renders fallback "--" when mlWarpOutput is null', () => {
      useTelemetryStore.setState({
        mlWarpParams: { ...sampleWarpParams, enabled: false },
        mlWarpOutput: null,
      });

      const html = renderToString(React.createElement(MlStrategySandbox));
      assert.match(html, /data-testid="ml-predicted-lap-readout"[^>]*>--<\/span>/);
    });
  });

  // ==========================================================================
  // 7. SLIDER DRAG EVENT COALESCING VIA RAF
  // ==========================================================================
  describe('7. Slider Drag Event Coalescing via requestAnimationFrame', () => {
    test('createRafCoalescer executes callback immediately when rAF is undefined (Node runtime)', () => {
      let callCount = 0;
      let lastVal = 0;

      const coalescer = createRafCoalescer<number>((val) => {
        callCount++;
        lastVal = val;
      });

      coalescer.trigger(10);
      assert.strictEqual(callCount, 1);
      assert.strictEqual(lastVal, 10);

      coalescer.trigger(20);
      assert.strictEqual(callCount, 2);
      assert.strictEqual(lastVal, 20);
    });

    test('createRafCoalescer coalesces high-frequency updates into single frame when rAF is mocked', () => {
      let rAFCallback: (() => void) | null = null;
      let nextId = 1;

      // Mock requestAnimationFrame
      (globalThis as any).requestAnimationFrame = (cb: () => void) => {
        rAFCallback = cb;
        return nextId++;
      };
      (globalThis as any).cancelAnimationFrame = (_id: number) => {
        rAFCallback = null;
      };

      try {
        let callCount = 0;
        let lastVal = 0;

        const coalescer = createRafCoalescer<number>((val) => {
          callCount++;
          lastVal = val;
        });

        // Rapid drag events within single frame: 15 -> 16 -> 17 -> 18 -> 19
        coalescer.trigger(15);
        coalescer.trigger(16);
        coalescer.trigger(17);
        coalescer.trigger(18);
        coalescer.trigger(19);

        // Before animation frame ticks, callback should NOT have been invoked
        assert.strictEqual(callCount, 0, 'No synchronous dispatches during frame');

        // Simulate frame tick
        assert.ok(rAFCallback !== null, 'RAF callback must be queued');
        const executeTick = rAFCallback as (() => void) | null;
        if (executeTick) {
          executeTick();
        }

        assert.strictEqual(callCount, 1, 'Only 1 coalesced call per animation frame');
        assert.strictEqual(lastVal, 19, 'Must receive latest payload');
      } finally {
        // Cleanup mocks
        delete (globalThis as any).requestAnimationFrame;
        delete (globalThis as any).cancelAnimationFrame;
      }
    });

    test('createRafCoalescer cancel eliminates pending execution', () => {
      let rAFCallback: (() => void) | null = null;
      (globalThis as any).requestAnimationFrame = (cb: () => void) => {
        rAFCallback = cb;
        return 1;
      };
      (globalThis as any).cancelAnimationFrame = () => {
        rAFCallback = null;
      };

      try {
        let called = false;
        const coalescer = createRafCoalescer<number>(() => {
          called = true;
        });

        coalescer.trigger(42);
        coalescer.cancel();

        assert.strictEqual(rAFCallback, null);
        assert.strictEqual(called, false);
      } finally {
        delete (globalThis as any).requestAnimationFrame;
        delete (globalThis as any).cancelAnimationFrame;
      }
    });
  });

  // ==========================================================================
  // 8. GATE 5 STATIC AST & ZERO-VDOM SUBSCRIPTION CONFORMANCE
  // ==========================================================================
  describe('8. Gate 5 Static AST & Zero-VDOM Subscription Conformance', () => {
    test('MlStrategySandbox.tsx contains ZERO reactive subscriptions to currentDistance or isPlaying', () => {
      const fileContent = fs.readFileSync(sourceFile, 'utf8');

      // Static AST regex checks matching test_phase4_state_sync.js
      const forbiddenCurrentDist1 = /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.currentDistance\s*\)/;
      const forbiddenCurrentDist2 = /const\s*\{[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(/;
      const forbiddenIsPlaying1 = /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.isPlaying\s*\)/;
      const forbiddenIsPlaying2 = /const\s*\{[^}]*isPlaying[^}]*\}\s*=\s*useTelemetryStore\s*\(/;

      assert.strictEqual(
        forbiddenCurrentDist1.test(fileContent),
        false,
        'CRITICAL: MlStrategySandbox must NOT subscribe to currentDistance selector'
      );
      assert.strictEqual(
        forbiddenCurrentDist2.test(fileContent),
        false,
        'CRITICAL: MlStrategySandbox must NOT destructure currentDistance from store'
      );
      assert.strictEqual(
        forbiddenIsPlaying1.test(fileContent),
        false,
        'CRITICAL: MlStrategySandbox must NOT subscribe to isPlaying selector'
      );
      assert.strictEqual(
        forbiddenIsPlaying2.test(fileContent),
        false,
        'CRITICAL: MlStrategySandbox must NOT destructure isPlaying from store'
      );
    });

    test('MlStrategySandbox subscribes strictly to authorized strategy and ML channels', () => {
      const fileContent = fs.readFileSync(sourceFile, 'utf8');

      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.strategyInput\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.strategyResult\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.updateStrategyInput\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.jumpToPitExitBattle\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.mlWarpParams\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.mlWarpOutput\s*\)/);
      assert.match(fileContent, /useTelemetryStore\s*\(\s*\([^)]*\)\s*=>\s*[^.]*\.updateMlWarpParams\s*\)/);
    });

    test('MlStrategySandbox component is wrapped with React.memo', () => {
      const fileContent = fs.readFileSync(sourceFile, 'utf8');
      assert.match(fileContent, /React\.memo\(MlStrategySandboxComponent\)/);
    });
  });
});
