// frontend/src/store/__tests__/useTelemetryStore.test.ts
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { useTelemetryStore } from '../useTelemetryStore';
import type { SessionTelemetryPayload } from '../../types/telemetry';

describe('Aero-Spec useTelemetryStore & Kinetic Engine Test Suite', () => {
  // Load canonical Monza telemetry bundle from disk for mock fetch testing
  const monzaPath = path.resolve(process.cwd(), 'frontend/public/telemetry/2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset store state to initial conditions
    useTelemetryStore.setState({
      sessionPayload: null,
      isLoading: true,
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
      mlWarpParams: {
        enabled: false,
        compound: 'S',
        tyreAgeLaps: 18,
        fuelLoadKg: 45,
        trackTempC: 42.4,
      },
      mlWarpOutput: null,
      strategyInput: {
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
      },
      strategyResult: null,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ==========================================================================
  // 1. Initial State Defaults Verification
  // ==========================================================================
  describe('Initial State Defaults (Section 5.1 Conformance)', () => {
    test('initializes with all 13 mandatory state properties and correct defaults', () => {
      const s = useTelemetryStore.getState();

      assert.equal(s.sessionPayload, null);
      assert.equal(s.isLoading, true);
      assert.equal(s.error, null);
      assert.equal(s.cockpitMode, 'TELEMETRY_LAB');
      assert.equal(s.currentDistance, 0);
      assert.equal(s.maxDistance, 5793);
      assert.equal(s.isPlaying, true);
      assert.equal(s.playbackSpeed, 1.0);
      assert.equal(s.cameraMode, 'ISO');
      assert.equal(s.trackColorMode, 'PEDAL');
      assert.equal(s.elevationScale, 3.5);
      assert.equal(s.loopSector, 'ALL');

      // ML Physics Warp defaults
      assert.deepEqual(s.mlWarpParams, {
        enabled: false,
        compound: 'S',
        tyreAgeLaps: 18,
        fuelLoadKg: 45,
        trackTempC: 42.4,
      });
      assert.equal(s.mlWarpOutput, null);

      // ML Strategy defaults
      assert.equal(s.strategyInput.totalRaceLaps, 53);
      assert.equal(s.strategyInput.numSimulations, 5000);
      assert.equal(s.strategyInput.strategyA.driverCode, 'VER');
      assert.equal(s.strategyInput.strategyB.driverCode, 'NOR');
      assert.equal(s.strategyResult, null);
    });
  });

  // ==========================================================================
  // 2. State Setters & Transport Controls
  // ==========================================================================
  describe('State Setters & Transport Controls', () => {
    test('setCockpitMode switches between TELEMETRY_LAB and ML_STRATEGY_ORACLE', () => {
      const store = useTelemetryStore.getState();
      store.setCockpitMode('ML_STRATEGY_ORACLE');
      assert.equal(useTelemetryStore.getState().cockpitMode, 'ML_STRATEGY_ORACLE');

      useTelemetryStore.getState().setCockpitMode('TELEMETRY_LAB');
      assert.equal(useTelemetryStore.getState().cockpitMode, 'TELEMETRY_LAB');
    });

    test('togglePlay and setIsPlaying update playback status correctly', () => {
      const store = useTelemetryStore.getState();
      assert.equal(store.isPlaying, true);

      store.togglePlay();
      assert.equal(useTelemetryStore.getState().isPlaying, false);

      store.togglePlay();
      assert.equal(useTelemetryStore.getState().isPlaying, true);

      store.setIsPlaying(false);
      assert.equal(useTelemetryStore.getState().isPlaying, false);

      store.setIsPlaying(true);
      assert.equal(useTelemetryStore.getState().isPlaying, true);
    });

    test('setPlaybackSpeed updates playback multiplier', () => {
      const speeds = [0.25, 0.5, 1.0, 2.0, 4.0] as const;
      for (const spd of speeds) {
        useTelemetryStore.getState().setPlaybackSpeed(spd);
        assert.equal(useTelemetryStore.getState().playbackSpeed, spd);
      }
    });

    test('setCameraMode updates camera projection', () => {
      const modes = ['ORTHO', 'ISO', 'CHASE'] as const;
      for (const m of modes) {
        useTelemetryStore.getState().setCameraMode(m);
        assert.equal(useTelemetryStore.getState().cameraMode, m);
      }
    });

    test('setTrackColorMode updates track coloring mode', () => {
      const modes = ['PEDAL', 'SPEED', 'DELTA'] as const;
      for (const m of modes) {
        useTelemetryStore.getState().setTrackColorMode(m);
        assert.equal(useTelemetryStore.getState().trackColorMode, m);
      }
    });

    test('setElevationScale updates 3D vertical exaggeration', () => {
      useTelemetryStore.getState().setElevationScale(5.0);
      assert.equal(useTelemetryStore.getState().elevationScale, 5.0);
      useTelemetryStore.getState().setElevationScale(1.0);
      assert.equal(useTelemetryStore.getState().elevationScale, 1.0);
    });

    test('setLoopSector updates looping boundary mode', () => {
      const sectors = ['ALL', 'S1', 'S2', 'S3'] as const;
      for (const sec of sectors) {
        useTelemetryStore.getState().setLoopSector(sec);
        assert.equal(useTelemetryStore.getState().loopSector, sec);
      }
    });
  });

  // ==========================================================================
  // 3. Distance Scrubbing & Stepping Modulo Boundary Math
  // ==========================================================================
  describe('Distance Scrubbing & Modulo Mathematics', () => {
    test('setDistance clamps and normalizes within [0, maxDistance)', () => {
      const store = useTelemetryStore.getState();

      store.setDistance(1500);
      assert.equal(useTelemetryStore.getState().currentDistance, 1500);

      // Exact maxDistance wraps to 0
      store.setDistance(5793);
      assert.equal(useTelemetryStore.getState().currentDistance, 0);

      // Overflow wraps modulo maxDistance
      store.setDistance(6000);
      assert.equal(useTelemetryStore.getState().currentDistance, 6000 % 5793);

      // Negative values wrap around from end
      store.setDistance(-100);
      assert.equal(useTelemetryStore.getState().currentDistance, 5793 - 100);

      store.setDistance(-6000);
      assert.equal(useTelemetryStore.getState().currentDistance, ((-6000 % 5793) + 5793) % 5793);
    });

    test('stepDistance increments and decrements with safe modulo wrapping', () => {
      const store = useTelemetryStore.getState();
      store.setDistance(100);

      store.stepDistance(50);
      assert.equal(useTelemetryStore.getState().currentDistance, 150);

      store.stepDistance(-200);
      assert.equal(useTelemetryStore.getState().currentDistance, 5793 - 50);

      store.stepDistance(100);
      assert.equal(useTelemetryStore.getState().currentDistance, 50);
    });
  });

  // ==========================================================================
  // 4. loadSession Action & Static Telemetry Hydration
  // ==========================================================================
  describe('loadSession & Subsystem Auto-Hydration', () => {
    test('successfully hydrates session bundle, computes mlWarpOutput and strategyResult', async () => {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(JSON.stringify(monzaBundle)),
        } as unknown as Response;
      };

      await useTelemetryStore.getState().loadSession('2024_monza_q3_ver_nor');
      const state = useTelemetryStore.getState();

      assert.equal(state.isLoading, false);
      assert.equal(state.error, null);
      assert.notEqual(state.sessionPayload, null);
      assert.equal(state.maxDistance, 5793);
      assert.equal(state.currentDistance, 0);

      // ML Physics Warp Auto-Computation Check
      assert.notEqual(state.mlWarpOutput, null);
      const warp = state.mlWarpOutput!;
      assert.ok(warp.predictedLapTimeSec > 75.0 && warp.predictedLapTimeSec < 100.0);
      assert.equal(warp.warpedSpeed.length, 5794);
      assert.equal(warp.warpedDeltaT.length, 5794);
      assert.ok(warp.gripMultiplier > 0.8 && warp.gripMultiplier < 1.1);

      // Strategy Oracle Hydration Check
      assert.notEqual(state.strategyResult, null);
      const strat = state.strategyResult!;
      assert.equal(strat.driverProbabilities.length, 20);
      assert.equal(strat.lapTraces.length, 53);
      assert.ok(typeof strat.verdictHeadline === 'string' && strat.verdictHeadline.length > 0);
      assert.equal(state.strategyInput.strategyA.driverCode, 'VER');
      assert.equal(state.strategyInput.strategyB.driverCode, 'NOR');
    });

    test('handles fetch network errors gracefully without crashing', async () => {
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 404,
        } as unknown as Response;
      };

      await useTelemetryStore.getState().loadSession('invalid_session_id');
      const state = useTelemetryStore.getState();

      assert.equal(state.isLoading, false);
      assert.ok(state.error !== null);
      assert.match(state.error, /HTTP 404/);
    });

    test('monotonic token drops stale out-of-order async responses', async () => {
      let resolveFirst: (v: any) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        if (callCount === 1) {
          await firstPromise;
          return {
            ok: true,
            status: 200,
            json: async () => ({ ...monzaBundle, sessionId: 'STALE_FIRST_SESSION' }),
          } as unknown as Response;
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ...monzaBundle, sessionId: 'LATEST_SECOND_SESSION' }),
          } as unknown as Response;
        }
      };

      // Dispatch request 1 (slow)
      const p1 = useTelemetryStore.getState().loadSession('session_1');
      // Dispatch request 2 (fast)
      const p2 = useTelemetryStore.getState().loadSession('session_2');

      await p2;
      assert.equal(useTelemetryStore.getState().sessionPayload?.sessionId, 'LATEST_SECOND_SESSION');

      // Now resolve request 1
      resolveFirst!(null);
      await p1;

      // Stale response must have been dropped
      assert.equal(useTelemetryStore.getState().sessionPayload?.sessionId, 'LATEST_SECOND_SESSION');
    });
  });

  // ==========================================================================
  // 5. advanceFrame 60Hz Dynamic Kinematics & Sector Looping
  // ==========================================================================
  describe('advanceFrame 60Hz Playback & Sector Looping', () => {
    beforeEach(async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => JSON.parse(JSON.stringify(monzaBundle)),
      } as unknown as Response);
      await useTelemetryStore.getState().loadSession('2024_monza_q3_ver_nor');
    });

    test('advances distance based on exact speed at current distance index', () => {
      const store = useTelemetryStore.getState();
      store.setDistance(100);
      const vKmh = monzaBundle.driverA.speed[100]; // e.g. 330 km/h
      const vMs = vKmh / 3.6;
      const dt = 0.016; // 60 FPS

      store.advanceFrame(dt);
      const expectedDist = 100 + vMs * dt * 1.0;
      const actualDist = useTelemetryStore.getState().currentDistance;
      assert.ok(Math.abs(actualDist - expectedDist) < 1e-4, `Expected ${expectedDist}, got ${actualDist}`);
    });

    test('clamps dtSeconds to 0.05s maximum to prevent tunneling on tab suspension', () => {
      const store = useTelemetryStore.getState();
      store.setDistance(500);
      const vMs = monzaBundle.driverA.speed[500] / 3.6;

      // Call advanceFrame with huge dt (1.5s)
      store.advanceFrame(1.5);

      // Distance advanced must be clamped to dt = 0.05
      const expectedDist = 500 + vMs * 0.05;
      const actualDist = useTelemetryStore.getState().currentDistance;
      assert.ok(Math.abs(actualDist - expectedDist) < 1e-4, `Clamped advance mismatch: ${actualDist} vs ${expectedDist}`);
    });

    test('scales distance proportionally with playbackSpeed multiplier', () => {
      const store = useTelemetryStore.getState();
      store.setDistance(200);
      const vMs = monzaBundle.driverA.speed[200] / 3.6;
      const dt = 0.02;

      store.setPlaybackSpeed(2.0);
      store.advanceFrame(dt);

      const expectedDist = 200 + vMs * dt * 2.0;
      const actualDist = useTelemetryStore.getState().currentDistance;
      assert.ok(Math.abs(actualDist - expectedDist) < 1e-4);
    });

    test('does not advance when isPlaying is false', () => {
      const store = useTelemetryStore.getState();
      store.setDistance(300);
      store.setIsPlaying(false);

      store.advanceFrame(0.016);
      assert.equal(useTelemetryStore.getState().currentDistance, 300);
    });

    test('handles Sector 1 looping bounds [0, s1End)', () => {
      const [s1End] = monzaBundle.meta.sectorSplitM; // 1820m
      const store = useTelemetryStore.getState();
      store.setLoopSector('S1');

      // Place cursor right near end of Sector 1
      store.setDistance(s1End - 0.5);
      const vMs = monzaBundle.driverA.speed[Math.floor(s1End - 0.5)] / 3.6;

      // Advance past s1End
      store.advanceFrame(0.05);

      const curDist = useTelemetryStore.getState().currentDistance;
      assert.ok(curDist >= 0 && curDist < s1End, `Sector 1 loop overflow: ${curDist}`);
    });

    test('handles Sector 2 looping bounds [s1End, s2End) and snaps if outside', () => {
      const [s1End, s2End] = monzaBundle.meta.sectorSplitM; // [1820, 3950]
      const store = useTelemetryStore.getState();
      store.setLoopSector('S2');

      // 1. If currently outside S2 (e.g. at 500m), next frame gently snaps into S2
      store.setDistance(500);
      store.advanceFrame(0.016);
      let curDist = useTelemetryStore.getState().currentDistance;
      assert.ok(curDist >= s1End && curDist < s2End, `Did not snap into S2: ${curDist}`);

      // 2. Advancing past s2End wraps back to s1End
      store.setDistance(s2End - 0.2);
      store.advanceFrame(0.05);
      curDist = useTelemetryStore.getState().currentDistance;
      assert.ok(curDist >= s1End && curDist < s2End, `Sector 2 wrap overflow: ${curDist}`);
    });

    test('handles Sector 3 looping bounds [s2End, maxDistance)', () => {
      const [, s2End] = monzaBundle.meta.sectorSplitM; // 3950m
      const maxDist = monzaBundle.gridLength; // 5793m
      const store = useTelemetryStore.getState();
      store.setLoopSector('S3');

      // Advance past end of lap wraps to s2End
      store.setDistance(maxDist - 0.2);
      store.advanceFrame(0.05);
      const curDist = useTelemetryStore.getState().currentDistance;
      assert.ok(curDist >= s2End && curDist < maxDist, `Sector 3 wrap overflow: ${curDist}`);
    });

    test('handles ALL sector looping [0, maxDistance)', () => {
      const maxDist = monzaBundle.gridLength; // 5793m
      const store = useTelemetryStore.getState();
      store.setLoopSector('ALL');

      store.setDistance(maxDist - 0.2);
      store.advanceFrame(0.05);
      const curDist = useTelemetryStore.getState().currentDistance;
      assert.ok(curDist >= 0 && curDist < maxDist, `ALL loop overflow: ${curDist}`);
    });
  });

  // ==========================================================================
  // 6. Interactive ML Sandbox Actions
  // ==========================================================================
  describe('Interactive ML Actions (Physics Warp & Strategy Oracle)', () => {
    beforeEach(async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => JSON.parse(JSON.stringify(monzaBundle)),
      } as unknown as Response);
      await useTelemetryStore.getState().loadSession('2024_monza_q3_ver_nor');
    });

    test('updateMlWarpParams updates params and immediately recalculates mlWarpOutput', () => {
      const initialWarp = useTelemetryStore.getState().mlWarpOutput!;
      const initialLapTime = initialWarp.predictedLapTimeSec;

      // Degrade tyres to 35 laps on Hard compound
      useTelemetryStore.getState().updateMlWarpParams({
        compound: 'H',
        tyreAgeLaps: 35,
        fuelLoadKg: 85,
      });

      const updatedState = useTelemetryStore.getState();
      assert.equal(updatedState.mlWarpParams.compound, 'H');
      assert.equal(updatedState.mlWarpParams.tyreAgeLaps, 35);
      assert.equal(updatedState.mlWarpParams.fuelLoadKg, 85);

      const updatedWarp = updatedState.mlWarpOutput!;
      // Heavily worn hard tyres with 85kg fuel must yield slower lap time than baseline
      assert.ok(updatedWarp.predictedLapTimeSec > initialLapTime);
      assert.ok(updatedWarp.lapDeltaVsBaseSec > 2.0);
      assert.ok(updatedWarp.gripMultiplier < 0.95);
      assert.ok(updatedWarp.brakingExtensionM > 5.0);
    });

    test('updateStrategyInput updates strategy params and recalculates Monte Carlo result', () => {
      const initialResult = useTelemetryStore.getState().strategyResult!;

      // Change Driver A pit lap to 12
      useTelemetryStore.getState().updateStrategyInput({
        strategyA: {
          ...useTelemetryStore.getState().strategyInput.strategyA,
          pitLap1: 12,
        },
      });

      const updatedState = useTelemetryStore.getState();
      assert.equal(updatedState.strategyInput.strategyA.pitLap1, 12);
      assert.notEqual(updatedState.strategyResult, null);
      assert.notEqual(updatedState.strategyResult, initialResult);
    });

    test('runMonteCarloSimulation re-evaluates stochastic distribution', () => {
      useTelemetryStore.getState().runMonteCarloSimulation();
      const res = useTelemetryStore.getState().strategyResult;
      assert.notEqual(res, null);
      assert.equal(res!.numSimulations, 5000);
      assert.equal(res!.driverProbabilities.length, 20);
    });

    test('jumpToPitExitBattle sets currentDistance to Turn 1 pit exit merge and camera to CHASE', () => {
      useTelemetryStore.getState().jumpToPitExitBattle();
      const state = useTelemetryStore.getState();

      const t1Apex = monzaBundle.corners[0]?.apexDistanceM ?? 850;
      const expectedMerge = Math.max(150, t1Apex - 240);

      assert.equal(state.currentDistance, expectedMerge);
      assert.equal(state.cameraMode, 'CHASE');
      assert.equal(state.isPlaying, false);
    });
  });

  // ==========================================================================
  // 7. Zustand subscribeWithSelector & Zero-VDOM Decoupling
  // ==========================================================================
  describe('Zustand subscribeWithSelector & Decoupled Observability', () => {
    test('notifies subscribers on currentDistance changes and passes new & previous values', () => {
      let notifiedNew = -1;
      let notifiedPrev = -1;
      let callCount = 0;

      const unsubscribe = useTelemetryStore.subscribe(
        (state) => state.currentDistance,
        (current, previous) => {
          callCount++;
          notifiedNew = current;
          notifiedPrev = previous;
        }
      );

      useTelemetryStore.getState().setDistance(450);
      assert.equal(callCount, 1);
      assert.equal(notifiedNew, 450);
      assert.equal(notifiedPrev, 0);

      useTelemetryStore.getState().setDistance(890);
      assert.equal(callCount, 2);
      assert.equal(notifiedNew, 890);
      assert.equal(notifiedPrev, 450);

      // Mutating an orthogonal reactive state must NOT trigger the distance subscriber
      useTelemetryStore.getState().setCameraMode('ORTHO');
      useTelemetryStore.getState().setPlaybackSpeed(2.0);
      assert.equal(callCount, 2);

      // Unsubscribing ceases notifications
      unsubscribe();
      useTelemetryStore.getState().setDistance(1200);
      assert.equal(callCount, 2);
    });

    test('supports fine-grained reactive selectors with equality checks', () => {
      let modeCalls = 0;
      const unsub = useTelemetryStore.subscribe(
        (s) => s.cockpitMode,
        () => {
          modeCalls++;
        }
      );

      // Mutating currentDistance 100 times should trigger 0 mode subscriber calls
      for (let i = 0; i < 100; i++) {
        useTelemetryStore.getState().setDistance(i * 10);
      }
      assert.equal(modeCalls, 0);

      // Changing cockpit mode triggers subscriber exactly once
      useTelemetryStore.getState().setCockpitMode('ML_STRATEGY_ORACLE');
      assert.equal(modeCalls, 1);

      unsub();
    });
  });
});
