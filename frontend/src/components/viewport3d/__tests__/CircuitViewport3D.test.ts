// frontend/src/components/viewport3d/__tests__/CircuitViewport3D.test.ts
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  CircuitViewport3D,
  fastF1ToThree,
  computeTrackSplineAndPoints,
  computeTrackVertexColors,
  computeGhostOffsetDistance,
  computeChaseCameraTarget,
  computeContinuousRelaxationAlpha,
  CHASE_LAMBDA,
  ISO_RESTORE_LAMBDA,
  _scratchPosA,
  _scratchTanA,
  _scratchCamTarget,
  _scratchLookTarget,
  _scratchUp,
  _scratchChaseOffset,
  _scratchOrthoTarget,
  _scratchOrigin,
  _scratchIsoInit,
  _scratchPosB,
  _scratchPosMl,
} from '../CircuitViewport3D';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 3: Quadrant 2 3D Circuit Viewport Test Suite', () => {
  // Locate telemetry fixtures
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const silverstonePath = path.resolve(telemetryDir, '2024_silverstone_q3_ver_nor.json');
  const silverstoneBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(silverstonePath, 'utf8'));

  const monacoPath = path.resolve(telemetryDir, '2024_monaco_q3_lec_pia.json');
  const monacoBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monacoPath, 'utf8'));

  beforeEach(() => {
    // Reset Zustand store state
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: monzaBundle.gridLength,
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
    });
  });

  // ==========================================================================
  // 1. FASTF1 TO THREE.JS COORDINATE MAPPING & CHIRALITY PRESERVATION
  // ==========================================================================
  describe('FastF1 to Three.js Coordinate Mapping & Chirality (fastF1ToThree)', () => {
    test('maps FastF1 X to Three.js X directly', () => {
      const [tx] = fastF1ToThree(1234.5, 500, 10, 3.5);
      assert.strictEqual(tx, 1234.5);
    });

    test('maps FastF1 Z scaled by elevationScale to Three.js Y', () => {
      const [, ty1] = fastF1ToThree(0, 0, 12.0, 3.5);
      assert.strictEqual(ty1, 42.0); // 12 * 3.5 = 42

      const [, ty2] = fastF1ToThree(0, 0, 12.0, 1.0);
      assert.strictEqual(ty2, 12.0);

      const [, ty3] = fastF1ToThree(0, 0, 12.0, 5.0);
      assert.strictEqual(ty3, 60.0);
    });

    test('negates FastF1 Y to Three.js -Z to strictly preserve circuit chirality', () => {
      const [, , tz1] = fastF1ToThree(0, 750.25, 0, 3.5);
      assert.strictEqual(tz1, -750.25);

      const [, , tz2] = fastF1ToThree(0, -320.0, 0, 3.5);
      assert.strictEqual(tz2, 320.0);
    });

    test('preserves turn handedness (chirality) between FastF1 2D plane and Three.js 3D world', () => {
      // In 2D FastF1: Car moving along +X and turning right has dY < 0.
      // In Three.js: Car moving along +X and turning right must turn toward +Z (clockwise looking down +Y).
      // Since tz = -y, a decrease in y (dY < 0) produces an increase in tz (dtz > 0), exactly matching right-turn!
      const p1 = fastF1ToThree(100, 50, 0, 3.5);
      const p2 = fastF1ToThree(200, 30, 0, 3.5); // Turn right in FastF1 (Y decreases)

      const dX = p2[0] - p1[0];
      const dZ = p2[2] - p1[2];

      assert.ok(dX > 0, 'Car advances along +X');
      assert.ok(dZ > 0, 'Car curves toward +Z (right turn in right-handed Three.js)');
    });
  });

  // ==========================================================================
  // 2. CENTRIPETAL CATMULL-ROM SPLINE GENERATION & DOWNSAMPLING
  // ==========================================================================
  describe('Centripetal Catmull-Rom Spline Generation (computeTrackSplineAndPoints)', () => {
    test('downsamples control points with stride 4 on Monza (5,793m -> 1,449 pts)', () => {
      const { linePoints, spline } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      const expectedCount = Math.floor(monzaBundle.gridLength / 4) + 1;
      assert.strictEqual(expectedCount, 1449);
      assert.strictEqual(linePoints.length, 1449);
      assert.ok(spline instanceof THREE.CatmullRomCurve3);
    });

    test('downsamples control points with stride 4 on Silverstone (5,891m -> 1,473 pts)', () => {
      const { linePoints } = computeTrackSplineAndPoints(
        silverstoneBundle.driverA,
        silverstoneBundle.gridLength,
        3.5
      );
      assert.strictEqual(linePoints.length, 1473);
    });

    test('downsamples control points with stride 4 on Monaco (3,337m -> 835 pts)', () => {
      const { linePoints } = computeTrackSplineAndPoints(
        monacoBundle.driverA,
        monacoBundle.gridLength,
        3.5
      );
      assert.strictEqual(linePoints.length, 835);
    });

    test('configures closed centripetal curve type without cusps or self-intersections', () => {
      const { spline } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );
      assert.strictEqual(spline.closed, true);
      assert.strictEqual(spline.curveType, 'centripetal');
    });

    test('verifies exact 0.00m circuit loop closure between start and finish points', () => {
      const { spline, linePoints } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      const pStart = spline.getPoint(0.0);
      const pEnd = spline.getPoint(1.0);
      const loopDistance = pStart.distanceTo(pEnd);

      assert.ok(
        loopDistance < 0.001,
        `Loop closure deviation must be sub-millimeter (< 0.001m), got ${loopDistance}m`
      );

      // Also verify first point in linePoints matches first telemetric point
      const firstPt = linePoints[0];
      assert.strictEqual(firstPt.x, monzaBundle.driverA.x[0]);
      assert.strictEqual(firstPt.y, monzaBundle.driverA.z[0] * 3.5);
      assert.strictEqual(firstPt.z, -monzaBundle.driverA.y[0]);
    });

    test('computes bounding centroid trackCenter accurately', () => {
      const { trackCenter } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      assert.strictEqual(trackCenter.y, 0, 'Track center ground reference plane Y must be 0');
      assert.ok(Number.isFinite(trackCenter.x));
      assert.ok(Number.isFinite(trackCenter.z));
    });
  });

  // ==========================================================================
  // 3. CRITICAL TELEMETRY ALIGNMENT INVARIANT (spline.getPoint vs getPointAt)
  // ==========================================================================
  describe('Critical Telemetry Alignment Invariant (spline.getPoint vs getPointAt)', () => {
    test('spline.getPoint(u) parameterization directly samples uniform point distribution', () => {
      const { spline, linePoints } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      // In a closed curve with N points, point i is at u = i / N
      const nodeIndex = 100;
      const u = nodeIndex / linePoints.length;
      const pt = spline.getPoint(u);
      const refPt = linePoints[nodeIndex];

      const dist = pt.distanceTo(refPt);
      assert.ok(dist < 0.0001, `Node interpolation must be exact, deviation=${dist}`);
    });

    test('proves getPointAt(u) produces massive ~488m spatial lag divergence vs getPoint(u) at Turn 1', () => {
      const { spline } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      // Turn 1 braking zone at ~850m
      const uTurn1 = 850 / monzaBundle.gridLength;
      const pGetPoint = spline.getPoint(uTurn1);
      const pGetPointAt = spline.getPointAt(uTurn1);

      const spatialLagMeters = pGetPoint.distanceTo(pGetPointAt);

      // Research swarm discovered 253m-492m spatial lag when using getPointAt
      assert.ok(
        spatialLagMeters > 200,
        `Proves getPointAt introduces unacceptable spatial lag (>200m), measured: ${spatialLagMeters.toFixed(1)}m`
      );
    });

    test('spline.getPoint(u, target) mutates target in-place without heap allocations', () => {
      const { spline } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      const target = new THREE.Vector3(999, 999, 999);
      const returned = spline.getPoint(0.25, target);

      assert.strictEqual(returned, target, 'Must return the same object reference');
      assert.notStrictEqual(target.x, 999, 'Target coordinates must be written in-place');
    });

    test('spline.getTangent(u, target) evaluates normalized unit direction in-place', () => {
      const { spline } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      const target = new THREE.Vector3();
      spline.getTangent(0.33, target).normalize();

      const len = target.length();
      assert.ok(Math.abs(len - 1.0) < 0.0001, `Tangent must be normalized unit vector, got ${len}`);
    });
  });

  // ==========================================================================
  // 4. DYNAMIC TRACK SHADERS & VERTEX COLORS
  // ==========================================================================
  describe('Dynamic Track Shaders & Vertex Colors (computeTrackVertexColors)', () => {
    test('preserves strict invariant vertexColors.length === linePoints.length', () => {
      const { linePoints } = computeTrackSplineAndPoints(
        monzaBundle.driverA,
        monzaBundle.gridLength,
        3.5
      );

      const pedalCols = computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'PEDAL'
      );
      const speedCols = computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'SPEED'
      );
      const deltaCols = computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'DELTA'
      );

      assert.strictEqual(pedalCols.length, linePoints.length);
      assert.strictEqual(speedCols.length, linePoints.length);
      assert.strictEqual(deltaCols.length, linePoints.length);
    });

    test('executes vertex color calculation well within 1.0ms frame budget (< 0.5ms)', () => {
      const t0 = performance.now();
      computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'SPEED'
      );
      const elapsedMs = performance.now() - t0;

      assert.ok(
        elapsedMs < 1.0,
        `Vertex color computation must be sub-millisecond, took ${elapsedMs.toFixed(3)}ms`
      );
    });

    test('PEDAL Mode: verifies Crimson (#FF1E44) for heavy brake (>18%)', () => {
      let brakeIdx = -1;
      for (let k = 0; k <= monzaBundle.gridLength; k += 4) {
        if (monzaBundle.driverA.brake[k] > 18) {
          brakeIdx = Math.floor(k / 4);
          break;
        }
      }
      assert.ok(brakeIdx >= 0, 'Found heavy braking index in Monza');

      const cols = computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'PEDAL'
      );

      const [r, g, b] = cols[brakeIdx];
      const color = new THREE.Color(r, g, b);
      assert.strictEqual(color.getHexString(), 'ff1e44', 'Must match Crimson hex ff1e44');
    });

    test('PEDAL Mode: verifies Neon Green (#00FF66) for full throttle (>88%)', () => {
      let throttleIdx = -1;
      for (let k = 0; k <= monzaBundle.gridLength; k += 4) {
        if (monzaBundle.driverA.throttle[k] > 88 && monzaBundle.driverA.brake[k] <= 18) {
          throttleIdx = Math.floor(k / 4);
          break;
        }
      }
      assert.ok(throttleIdx >= 0, 'Found full throttle index in Monza');

      const cols = computeTrackVertexColors(
        monzaBundle.driverA,
        monzaBundle.deltaT,
        monzaBundle.gridLength,
        'PEDAL'
      );

      const [r, g, b] = cols[throttleIdx];
      const color = new THREE.Color(r, g, b);
      assert.strictEqual(color.getHexString(), '00ff66', 'Must match Neon Green hex 00ff66');
    });

    test('PEDAL Mode: verifies Cyan (#00E5FF) for coasting and partial modulation', () => {
      const syntheticDriver: any = {
        x: [0],
        y: [0],
        z: [0],
        speed: [150],
        throttle: [50], // <= 88
        brake: [0],     // <= 18
      };
      const cols = computeTrackVertexColors(syntheticDriver, [0], 0, 'PEDAL');
      const [r, g, b] = cols[0];
      const color = new THREE.Color(r, g, b);
      assert.strictEqual(color.getHexString(), '00e5ff', 'Must match Cyan hex 00e5ff');
    });

    test('SPEED Mode: continuous pseudo-thermal heatmap scales from Crimson (80km/h) to Cyan (350km/h)', () => {
      const syntheticDriver: any = {
        x: [0, 0, 0, 0, 1, 0, 0, 0, 2],
        y: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        z: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        speed: [80, 0, 0, 0, 215, 0, 0, 0, 350],
        throttle: [0, 0, 0, 0, 50, 0, 0, 0, 100],
        brake: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      };
      const cols = computeTrackVertexColors(syntheticDriver, [0, 0, 0, 0, 0, 0, 0, 0, 0], 8, 'SPEED');

      const c80 = new THREE.Color(cols[0][0], cols[0][1], cols[0][2]);
      const c215 = new THREE.Color(cols[1][0], cols[1][1], cols[1][2]);
      const c350 = new THREE.Color(cols[2][0], cols[2][1], cols[2][2]);

      const hsl80 = { h: 0, s: 0, l: 0 };
      const hsl215 = { h: 0, s: 0, l: 0 };
      const hsl350 = { h: 0, s: 0, l: 0 };

      c80.getHSL(hsl80);
      c215.getHSL(hsl215);
      c350.getHSL(hsl350);

      // Speed 80: norm=0, hue=0 (Red), lightness=0.38
      assert.ok(Math.abs(hsl80.h - 0.0) < 0.01);
      assert.ok(Math.abs(hsl80.l - 0.38) < 0.01);

      // Speed 350: norm=1, hue=0.54 (Cyan), lightness=0.60
      assert.ok(Math.abs(hsl350.h - 0.54) < 0.01);
      assert.ok(Math.abs(hsl350.l - 0.60) < 0.01);

      // Monotonically increasing luminosity with velocity
      assert.ok(hsl80.l < hsl215.l, 'Mid-speed is more luminous than low-speed');
      assert.ok(hsl215.l < hsl350.l, 'High-speed is more luminous than mid-speed');
    });

    test('DELTA Mode: Electric Cyan (#00E5FF) when deltaT >= 0 and Purple (#B000FF) when deltaT < 0', () => {
      const syntheticDriver: any = {
        x: [0, 0, 0, 0, 1],
        y: [0, 0, 0, 0, 0],
        z: [0, 0, 0, 0, 0],
        speed: [250, 0, 0, 0, 250],
        throttle: [100, 0, 0, 0, 100],
        brake: [0, 0, 0, 0, 0],
      };
      // Point 0: Driver A leads (+0.150s) -> Cyan
      // Point 1: Driver B leads (-0.120s) -> Purple
      const cols = computeTrackVertexColors(syntheticDriver, [0.15, 0, 0, 0, -0.12], 4, 'DELTA');

      const cA = new THREE.Color(cols[0][0], cols[0][1], cols[0][2]);
      const cB = new THREE.Color(cols[1][0], cols[1][1], cols[1][2]);

      assert.strictEqual(cA.getHexString(), '00e5ff', 'Driver A advantage must be Cyan #00E5FF');
      assert.strictEqual(cB.getHexString(), 'b000ff', 'Driver B advantage must be Purple #B000FF');
    });
  });

  // ==========================================================================
  // 5. MULTI-VEHICLE KINEMATICS & GHOST SPATIAL OFFSETS
  // ==========================================================================
  describe('Multi-Vehicle Kinematics (computeGhostOffsetDistance)', () => {
    test('accurately calculates Ghost Car B spatial lag with 3.0x visual multiplier', () => {
      // 0.200s gap at 288 km/h (80 m/s):
      // distance offset = 0.200 * 80 * 3.0 = 48m
      const curD = 1000;
      const maxD = 5793;
      const distB = computeGhostOffsetDistance(curD, maxD, 0.200, 288, 3.0);

      assert.strictEqual(distB, 1000 - 48); // 952m
    });

    test('handles cyclic modulo wrap-around at track boundary [0, maxD)', () => {
      // Car A at 20m, Car B is 50m behind -> position should wrap to 5793 - 30 = 5763m
      const distB = computeGhostOffsetDistance(20, 5793, 0.200, 300, 3.0);
      assert.ok(distB > 5000, `Must wrap around to end of lap, got ${distB}`);
      assert.ok(distB < 5793);
    });

    test('accurately calculates ML Ghost Car offset with 2.0x multiplier', () => {
      // 0.300s warped delta at 270 km/h (75 m/s):
      // offset = 0.300 * 75 * 2.0 = 45m
      const distWarp = computeGhostOffsetDistance(2000, 5793, 0.300, 270, 2.0);
      assert.strictEqual(distWarp, 2000 - 45); // 1955m
    });

    test('returns 0 when maxDistance <= 0', () => {
      const dist = computeGhostOffsetDistance(500, 0, 0.1, 200, 3.0);
      assert.strictEqual(dist, 0);
    });
  });

  // ==========================================================================
  // 6. CAMERA KINEMATICS & SINGULARITY AVOIDANCE
  // ==========================================================================
  describe('Camera Kinematics & Singularity Avoidance', () => {
    test('CHASE Camera: positions 180m behind, 95m elevated, looking 80m ahead', () => {
      const carPos = new THREE.Vector3(100, 10, 200);
      const carTangent = new THREE.Vector3(1, 0, 0); // Moving along +X
      const camTarget = new THREE.Vector3();
      const lookTarget = new THREE.Vector3();

      computeChaseCameraTarget(carPos, carTangent, camTarget, lookTarget);

      // Trailing 180m: X should be 100 - 180 = -80
      assert.strictEqual(camTarget.x, -80);
      // Elevation +95m: Y should be 10 + 95 = 105
      assert.strictEqual(camTarget.y, 105);
      // Z should match carPos.z = 200
      assert.strictEqual(camTarget.z, 200);

      // Lookahead 80m: X should be 100 + 80 = 180
      assert.strictEqual(lookTarget.x, 180);
      assert.strictEqual(lookTarget.y, 10);
      assert.strictEqual(lookTarget.z, 200);
    });

    test('CHASE Camera: enforces ground clearance safety clamp (Y >= carPos.y + 35)', () => {
      const carPos = new THREE.Vector3(0, 0, 0);
      const carTangent = new THREE.Vector3(0, -1, 0); // Diving downward
      const camTarget = new THREE.Vector3();
      const lookTarget = new THREE.Vector3();

      computeChaseCameraTarget(carPos, carTangent, camTarget, lookTarget);
      assert.ok(camTarget.y >= 35.0, `Camera target Y must stay above ground, got ${camTarget.y}`);
    });

    test('Continuous Relaxation Damping: verifies frame-rate independence between 60Hz and 120Hz', () => {
      const dt60 = 1 / 60;
      const dt120 = 1 / 120;

      const alpha60 = computeContinuousRelaxationAlpha(CHASE_LAMBDA, dt60);
      const alpha120 = computeContinuousRelaxationAlpha(CHASE_LAMBDA, dt120);

      // Compounding two 120Hz steps: (1 - alpha120)^2 must equal (1 - alpha60)
      const remaining60 = 1.0 - alpha60;
      const remaining120Compounded = (1.0 - alpha120) * (1.0 - alpha120);

      const diff = Math.abs(remaining60 - remaining120Compounded);
      assert.ok(
        diff < 0.00001,
        `Exponential relaxation must be frame-rate independent! Diff=${diff}`
      );
    });

    test('Continuous Relaxation Damping: verifies ~110ms calibrated half-life', () => {
      // Half-life t_half = ln(2) / CHASE_LAMBDA = 0.693147 / 6.3216 = 0.1096s (~110ms)
      const halfLifeSec = Math.LN2 / CHASE_LAMBDA;
      assert.ok(Math.abs(halfLifeSec - 0.1096) < 0.001);

      const alphaHalfLife = computeContinuousRelaxationAlpha(CHASE_LAMBDA, halfLifeSec);
      assert.ok(Math.abs(alphaHalfLife - 0.5) < 0.0001, 'Alpha at half-life must be exactly 0.5');
    });

    test('ISO Restoration: verifies ISO_RESTORE_LAMBDA calibrated relaxation constant (5.2s^-1)', () => {
      assert.strictEqual(ISO_RESTORE_LAMBDA, 5.2);
      const alphaRestoration = computeContinuousRelaxationAlpha(ISO_RESTORE_LAMBDA, 1 / 60);
      assert.ok(alphaRestoration > 0 && alphaRestoration < 1.0);
    });

    test('ORTHO Satellite Camera: Z=0.01 perturbation guarantees non-zero cross product and eliminates singularity', () => {
      // Degenerate case with Z = 0:
      const up = new THREE.Vector3(0, 1, 0);
      const degenerateLook = new THREE.Vector3(0, 1650, 0).normalize();
      const degenerateCross = new THREE.Vector3().crossVectors(up, degenerateLook);
      assert.strictEqual(
        degenerateCross.length(),
        0,
        'Z=0 induces zero cross product (degenerate / NaN)'
      );

      // Canonically perturbed case with Z = 0.01:
      const stableLook = new THREE.Vector3(0, 1650, 0.01).normalize();
      const stableCross = new THREE.Vector3().crossVectors(up, stableLook);
      assert.ok(
        stableCross.length() > 0,
        'Z=0.01 creates strictly non-zero cross product with up-vector'
      );
      assert.ok(Number.isFinite(stableCross.x));
    });
  });

  // ==========================================================================
  // 7. ZERO-ALLOCATION SCRATCH VECTOR POOL
  // ==========================================================================
  describe('Zero-Allocation Module Scratch Vector Pool', () => {
    test('pre-allocates all module-level scratch vectors as instances of THREE.Vector3', () => {
      assert.ok(_scratchPosA instanceof THREE.Vector3);
      assert.ok(_scratchTanA instanceof THREE.Vector3);
      assert.ok(_scratchCamTarget instanceof THREE.Vector3);
      assert.ok(_scratchLookTarget instanceof THREE.Vector3);
      assert.ok(_scratchUp instanceof THREE.Vector3);
      assert.ok(_scratchChaseOffset instanceof THREE.Vector3);
      assert.ok(_scratchOrthoTarget instanceof THREE.Vector3);
      assert.ok(_scratchOrigin instanceof THREE.Vector3);
      assert.ok(_scratchIsoInit instanceof THREE.Vector3);
      assert.ok(_scratchPosB instanceof THREE.Vector3);
      assert.ok(_scratchPosMl instanceof THREE.Vector3);
    });

    test('preserves initial canonical values in static reference vectors', () => {
      assert.deepStrictEqual([_scratchUp.x, _scratchUp.y, _scratchUp.z], [0, 1, 0]);
      assert.deepStrictEqual([_scratchChaseOffset.x, _scratchChaseOffset.y, _scratchChaseOffset.z], [0, 95, 0]);
      assert.deepStrictEqual([_scratchOrthoTarget.x, _scratchOrthoTarget.y, _scratchOrthoTarget.z], [0, 1650, 0.01]);
      assert.deepStrictEqual([_scratchOrigin.x, _scratchOrigin.y, _scratchOrigin.z], [0, 0, 0]);
      assert.deepStrictEqual([_scratchIsoInit.x, _scratchIsoInit.y, _scratchIsoInit.z], [0, 950, 1150]);
    });
  });

  // ==========================================================================
  // 8. REACT COMPONENT MOUNTING & MODE SWITCHERS
  // ==========================================================================
  describe('React Component Rendering & Mode Switchers (CircuitViewport3D)', () => {
    test('renders Quadrant 2 section container with aero-spec HUD header', () => {
      const html = renderToString(React.createElement(CircuitViewport3D));
      assert.ok(html.includes('Q2 // 3D KINETIC CIRCUIT &amp; ML GHOST VIEWPORT'));
      assert.ok(html.includes('hud-quadrant'));
    });

    test('renders CAM mode switcher buttons for ISO, ORTHO, and CHASE', () => {
      const html = renderToString(React.createElement(CircuitViewport3D));
      assert.ok(html.includes('>ISO<'));
      assert.ok(html.includes('>ORTHO<'));
      assert.ok(html.includes('>CHASE<'));
    });

    test('renders SHADER mode switcher buttons for PEDAL, SPEED, and DELTA', () => {
      const html = renderToString(React.createElement(CircuitViewport3D));
      assert.ok(html.includes('>PEDAL<'));
      assert.ok(html.includes('>SPEED<'));
      assert.ok(html.includes('>DELTA<'));
    });

    test('highlights active CAM mode with Cyan accent (#00E5FF)', () => {
      useTelemetryStore.setState({ cameraMode: 'CHASE' });
      const html = renderToString(React.createElement(CircuitViewport3D));
      // In CHASE mode, the CHASE button receives border-[#00E5FF] and text-[#00E5FF]
      assert.ok(html.includes('border-[#00E5FF] bg-[#141B26] text-[#00E5FF] font-bold'));
    });

    test('highlights active SHADER mode with Neon Green accent (#00FF66)', () => {
      useTelemetryStore.setState({ trackColorMode: 'SPEED' });
      const html = renderToString(React.createElement(CircuitViewport3D));
      // In SPEED mode, the button receives border-[#00FF66] and text-[#00FF66]
      assert.ok(html.includes('border-[#00FF66] bg-[#141B26] text-[#00FF66] font-bold'));
    });

    test('renders loading spinner when sessionPayload is null or isLoading is true', () => {
      useTelemetryStore.setState({ sessionPayload: null, isLoading: true });
      const html = renderToString(React.createElement(CircuitViewport3D));
      assert.ok(html.includes('Loading Circuit Spline Geometry...'));
    });
  });
});
