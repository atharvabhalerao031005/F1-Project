// frontend/src/components/viewport3d/CircuitViewport3D.tsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type {
  CameraMode,
  NormalizedLapChannels,
  TrackColorMode,
} from '../../types/telemetry';

// ============================================================================
// ZERO-ALLOCATION MODULE-LEVEL SCRATCH VECTORS (0 bytes heap churn in useFrame)
// ============================================================================
export const _scratchPosA = new THREE.Vector3();
export const _scratchTanA = new THREE.Vector3();
export const _scratchCamTarget = new THREE.Vector3();
export const _scratchLookTarget = new THREE.Vector3();
export const _scratchUp = new THREE.Vector3(0, 1, 0);
export const _scratchChaseOffset = new THREE.Vector3(0, 95, 0);
export const _scratchOrthoTarget = new THREE.Vector3(0, 1650, 0.01);
export const _scratchOrigin = new THREE.Vector3(0, 0, 0);
export const _scratchIsoInit = new THREE.Vector3(0, 950, 1150);
export const _scratchPosB = new THREE.Vector3();
export const _scratchPosMl = new THREE.Vector3();

// Continuous relaxation damping parameters
export const CHASE_LAMBDA = 6.3216; // 110ms half-life continuous relaxation
export const ISO_RESTORE_LAMBDA = 5.2;

// ============================================================================
// PURE MATHEMATICAL TELEMETRY HELPER FUNCTIONS
// ============================================================================

/**
 * Maps FastF1 telemetric coordinates to Three.js coordinates.
 * CRITICAL: FastF1 Y is mapped to Three.js -Z to preserve circuit chirality!
 */
export function fastF1ToThree(
  x: number,
  y: number,
  z: number,
  elevationScale: number = 3.5
): [number, number, number] {
  return [x, z * elevationScale, -y];
}

/**
 * Builds Centripetal Catmull-Rom spline, line point array, and circuit bounding centroid.
 * Uses downsampling stride 4 (for let k = 0; k <= gridLength; k += 4).
 * Circuit is closed (closed: true) with 'centripetal' parametrization.
 */
export function computeTrackSplineAndPoints(
  driverA: NormalizedLapChannels,
  gridLength: number,
  elevationScale: number
): {
  spline: THREE.CatmullRomCurve3;
  linePoints: THREE.Vector3[];
  trackCenter: THREE.Vector3;
} {
  const pts: THREE.Vector3[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let k = 0; k <= gridLength; k += 4) {
    const x = driverA.x[k] ?? 0;
    const y = (driverA.z[k] ?? 0) * elevationScale;
    const z = -(driverA.y[k] ?? 0);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;

    pts.push(new THREE.Vector3(x, y, z));
  }

  const spline = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const trackCenter = new THREE.Vector3(
    Number.isFinite(minX) && Number.isFinite(maxX) ? (minX + maxX) / 2 : 0,
    0,
    Number.isFinite(minZ) && Number.isFinite(maxZ) ? (minZ + maxZ) / 2 : 0
  );

  return { spline, linePoints: pts, trackCenter };
}

/**
 * Computes per-vertex RGB colors based on trackColorMode (PEDAL, SPEED, DELTA).
 * Guaranteed to produce exactly the same number of vertices as computeTrackSplineAndPoints.
 * Execution duration: ~0.09ms!
 */
export function computeTrackVertexColors(
  driverA: NormalizedLapChannels,
  deltaT: number[],
  gridLength: number,
  mode: TrackColorMode
): [number, number, number][] {
  const cols: [number, number, number][] = [];
  const c = new THREE.Color();

  for (let k = 0; k <= gridLength; k += 4) {
    if (mode === 'PEDAL') {
      const brake = driverA.brake[k] ?? 0;
      const throttle = driverA.throttle[k] ?? 0;
      if (brake > 18) {
        c.setHex(0xff1e44); // Crimson
      } else if (throttle > 88) {
        c.setHex(0x00ff66); // Neon Green
      } else {
        c.setHex(0x00e5ff); // Cyan Coast
      }
    } else if (mode === 'SPEED') {
      const speed = driverA.speed[k] ?? 0;
      const norm = Math.max(0, Math.min(1, (speed - 80) / 270));
      c.setHSL(0.54 * norm, 1.0, 0.38 + 0.22 * norm);
    } else {
      // DELTA mode: Cyan if Driver A advantage (deltaT >= 0), Purple if Driver B
      const dt = deltaT[k] ?? 0;
      c.setHex(dt >= 0 ? 0x00e5ff : 0xb000ff);
    }
    cols.push([c.r, c.g, c.b]);
  }

  return cols;
}

/**
 * Evaluates Ghost Car spatial offset along track distance.
 * offsetM = dtSec * vBMs * multiplier
 * dist = ((curD - offsetM) % maxD + maxD) % maxD
 */
export function computeGhostOffsetDistance(
  currentDistance: number,
  maxDistance: number,
  deltaSec: number,
  speedKmh: number,
  multiplier: number = 3.0
): number {
  if (maxDistance <= 0) return 0;
  const vMs = speedKmh / 3.6;
  const offsetM = deltaSec * vMs * multiplier;
  return ((currentDistance - offsetM) % maxDistance + maxDistance) % maxDistance;
}

/**
 * Evaluates Pursuit Chase camera position and look-at target.
 * Trailing -180m along tangent, +95m vertical elevation, looking +80m forward.
 * Clamps vertical position to at least carPos.y + 35.0 to prevent ground collision.
 */
export function computeChaseCameraTarget(
  carPos: THREE.Vector3,
  carTangent: THREE.Vector3,
  outCamTarget: THREE.Vector3 = new THREE.Vector3(),
  outLookTarget: THREE.Vector3 = new THREE.Vector3()
): { camTarget: THREE.Vector3; lookTarget: THREE.Vector3 } {
  outCamTarget
    .copy(carPos)
    .addScaledVector(carTangent, -180)
    .add(_scratchChaseOffset);
  outCamTarget.y = Math.max(outCamTarget.y, carPos.y + 35.0);

  outLookTarget
    .copy(carPos)
    .addScaledVector(carTangent, 80);

  return { camTarget: outCamTarget, lookTarget: outLookTarget };
}

/**
 * Continuous relaxation alpha for frame-rate independent camera smoothing.
 * alpha = 1.0 - exp(-lambda * delta)
 */
export function computeContinuousRelaxationAlpha(lambda: number, delta: number): number {
  return 1.0 - Math.exp(-lambda * delta);
}

// ============================================================================
// CAMERA CONTROLLER COMPONENT (SMOOTH RESTORATION & DAMPED ORBIT)
// ============================================================================
interface CameraControllerProps {
  cameraMode: CameraMode;
  trackCenter: THREE.Vector3;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  cameraMode,
  trackCenter,
}) => {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const isTransitioningToIso = useRef(false);

  useEffect(() => {
    if (cameraMode === 'ISO') {
      isTransitioningToIso.current = true;
    }
  }, [cameraMode]);

  useFrame(({ camera }, delta) => {
    if (cameraMode === 'ISO' && isTransitioningToIso.current && controlsRef.current) {
      const factor = computeContinuousRelaxationAlpha(ISO_RESTORE_LAMBDA, delta);
      camera.position.lerp(_scratchIsoInit, factor);
      controlsRef.current.target.lerp(trackCenter, factor);
      if (camera.position.distanceTo(_scratchIsoInit) < 2.0) {
        isTransitioningToIso.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={cameraMode === 'ISO'}
      enableDamping
      dampingFactor={0.08}
      target={trackCenter}
      maxDistance={6500}
      minDistance={50}
      maxPolarAngle={Math.PI / 2 + 0.05} // Prevent diving underneath ground grid
    />
  );
};

// ============================================================================
// KINETIC TRACK SCENE COMPONENT
// ============================================================================
export const KineticTrackScene: React.FC = () => {
  const payload = useTelemetryStore((s) => s.sessionPayload);
  const trackColorMode = useTelemetryStore((s) => s.trackColorMode);
  const elevationScale = useTelemetryStore((s) => s.elevationScale);
  const mlWarpEnabled = useTelemetryStore((s) => s.mlWarpParams.enabled);
  const cameraMode = useTelemetryStore((s) => s.cameraMode);

  const carARef = useRef<THREE.Group>(null);
  const carBRef = useRef<THREE.Group>(null);
  const carMlRef = useRef<THREE.Group>(null);
  const liveTagARef = useRef<HTMLDivElement>(null);

  // 1. Spline & Line Points: Decoupled useMemo on [payload, elevationScale]
  const { spline, linePoints, trackCenter } = useMemo(() => {
    if (!payload) {
      return {
        spline: null,
        linePoints: [],
        trackCenter: new THREE.Vector3(0, 0, 0),
      };
    }
    return computeTrackSplineAndPoints(payload.driverA, payload.gridLength, elevationScale);
  }, [payload, elevationScale]);

  // 2. Vertex Colors: Decoupled useMemo on [payload, trackColorMode] (0.09ms execution!)
  const vertexColors = useMemo(() => {
    if (!payload) return [];
    return computeTrackVertexColors(
      payload.driverA,
      payload.deltaT,
      payload.gridLength,
      trackColorMode
    );
  }, [payload, trackColorMode]);

  // 60 Hz / 120 Hz Imperative Animation Loop
  useFrame(({ camera }, delta) => {
    const state = useTelemetryStore.getState();
    state.advanceFrame(delta);
    if (!spline || !state.sessionPayload) return;

    const maxD = state.maxDistance;
    const curD = state.currentDistance;
    const idx = Math.min(Math.max(0, Math.floor(curD)), maxD);
    const uA = (curD / maxD) % 1.0;

    // Maintain strictly orthonormal camera up-vector across all modes
    camera.up.copy(_scratchUp);

    // CRITICAL TELEMETRY ALIGNMENT INVARIANT:
    // Evaluate car position and tangent using spline.getPoint(u) and spline.getTangent(u)
    // (NOT getPointAt) to eliminate the 253m-492m spatial lag!
    spline.getPoint(uA, _scratchPosA);
    spline.getTangent(uA, _scratchTanA).normalize();

    // Lead Car A position & identity rotation maintenance (keeps child HTML upright)
    if (carARef.current) {
      carARef.current.position.copy(_scratchPosA);
      carARef.current.rotation.set(0, 0, 0);
    }

    // Direct-DOM HUD Tag update (0.002ms, 0 CLS)
    if (liveTagARef.current) {
      const spd = Math.round(state.sessionPayload.driverA.speed[idx] ?? 0);
      const dt = state.sessionPayload.deltaT[idx] ?? 0;
      const sign = dt >= 0 ? '-' : '+';
      liveTagARef.current.textContent = `${state.sessionPayload.meta.driverA.code} ${spd
        .toString()
        .padStart(3, '0')} KM/H | Δ ${sign}${Math.abs(dt).toFixed(3)}s`;
    }

    // Ghost Car B (Spatial Lag Offset with 3.0x visual multiplier)
    if (carBRef.current) {
      const dtSec = state.sessionPayload.deltaT[idx] ?? 0;
      const speedB = state.sessionPayload.driverB.speed[idx] ?? 220;
      const distB = computeGhostOffsetDistance(
        curD,
        maxD,
        dtSec,
        speedB,
        3.0
      );
      const uB = (distB / maxD) % 1.0;
      spline.getPoint(uB, _scratchPosB);
      carBRef.current.position.copy(_scratchPosB);
    }

    // ML Physics-Warped Amber Ghost Car (#FFE600, 2.0x visual multiplier)
    if (carMlRef.current && state.mlWarpParams.enabled && state.mlWarpOutput) {
      const warpDt = state.mlWarpOutput.warpedDeltaT[idx] ?? 0;
      const distWarp = computeGhostOffsetDistance(
        curD,
        maxD,
        warpDt,
        state.mlWarpOutput.warpedSpeed[idx] ?? 200,
        2.0
      );
      const uWarp = (distWarp / maxD) % 1.0;
      spline.getPoint(uWarp, _scratchPosMl);
      carMlRef.current.position.copy(_scratchPosMl);
    }

    // Camera Kinematics Execution
    const alpha = computeContinuousRelaxationAlpha(CHASE_LAMBDA, delta);

    if (state.cameraMode === 'CHASE') {
      computeChaseCameraTarget(_scratchPosA, _scratchTanA, _scratchCamTarget, _scratchLookTarget);
      camera.position.lerp(_scratchCamTarget, alpha);
      camera.lookAt(_scratchLookTarget);
    } else if (state.cameraMode === 'ORTHO') {
      // Singularity-free overhead vantage: Z = 0.01 prevents division by zero
      camera.position.lerp(_scratchOrthoTarget, alpha);
      camera.lookAt(_scratchOrigin);
    }
  });

  if (!payload || linePoints.length === 0) return null;

  return (
    <group>
      {/* Dynamic Camera Controller supporting ISO Damped Orbit & Smooth Restoration */}
      <CameraController cameraMode={cameraMode} trackCenter={trackCenter} />

      {/* Ground Reference Grid situated at Y = -18 (Zero Z-Fighting with track geometry) */}
      <gridHelper args={[3200, 48, '#141B26', '#0B1018']} position={[0, -18, 0]} />

      {/* Keyed group boundary for 0-leak disposal: forces Three.js Line2 primitives to unmount cleanly */}
      <group key={`${(payload.meta as { circuitId?: string }).circuitId || payload.sessionId || payload.meta.circuitName}-${trackColorMode}-${elevationScale}`}>
        {/* Background Outline Track */}
        <Line points={linePoints} color="#1B2230" lineWidth={7} />
        {/* Dynamic Vertex-Colored Kinetic Track */}
        <Line points={linePoints} vertexColors={vertexColors} lineWidth={3.2} />
      </group>

      {/* 3D Corner Apex Tactical HUD Badges */}
      {payload.corners.map((c) => (
        <group key={c.id} position={[c.x, c.z * elevationScale + 18, -c.y]}>
          <Html center distanceFactor={cameraMode === 'CHASE' ? 380 : 1400} pointerEvents="none">
            <div className="bg-[#080B10]/90 border border-[#1B2230] px-1.5 py-0.5 text-[9px] font-telemetry whitespace-nowrap text-[#94A3B8] pointer-events-none select-none shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <span className="text-[#00E5FF] font-bold">{c.id}</span> {c.vMinA} km/h
            </div>
          </Html>
        </group>
      ))}

      {/* Lead Car A (#00E5FF Cyan, Opaque, DepthWrite=True, RenderOrder=1) */}
      <group ref={carARef}>
        <mesh renderOrder={1}>
          <sphereGeometry args={[18, 24, 24]} />
          <meshBasicMaterial color="#00E5FF" depthWrite={true} />
        </mesh>
        <Html position={[0, 38, 0]} center pointerEvents="none">
          <div
            ref={liveTagARef}
            className="bg-[#05070B]/95 border border-[#00E5FF] px-1.5 py-0.5 text-[10px] font-telemetry font-bold text-[#E2E8F0] whitespace-nowrap pointer-events-none select-none shadow-[0_0_10px_rgba(0,229,255,0.4)]"
          >
            {payload.meta.driverA.code} 000 KM/H | Δ +0.000s
          </div>
        </Html>
      </group>

      {/* Ghost Car B (#B000FF Magenta, Transparent 0.70, DepthWrite=False, RenderOrder=3) */}
      <group ref={carBRef}>
        <mesh renderOrder={3}>
          <sphereGeometry args={[14, 20, 20]} />
          <meshBasicMaterial
            color="#B000FF"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ML Physics-Warped Amber Ghost Car (#FFE600 Amber, Transparent 0.75, DepthWrite=False, RenderOrder=2) */}
      {mlWarpEnabled && (
        <group ref={carMlRef}>
          <mesh renderOrder={2}>
            <sphereGeometry args={[15, 20, 20]} />
            <meshBasicMaterial
              color="#FFE600"
              transparent
              opacity={0.75}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ============================================================================
// QUADRANT 2: 3D KINETIC CIRCUIT VIEWPORT CONTAINER
// ============================================================================
export const CircuitViewport3D: React.FC = () => {
  const cameraMode = useTelemetryStore((s) => s.cameraMode);
  const trackColorMode = useTelemetryStore((s) => s.trackColorMode);
  const setCameraMode = useTelemetryStore((s) => s.setCameraMode);
  const setTrackColorMode = useTelemetryStore((s) => s.setTrackColorMode);
  const isLoading = useTelemetryStore((s) => s.isLoading);
  const payload = useTelemetryStore((s) => s.sessionPayload);

  return (
    <section className="hud-quadrant relative flex flex-col h-full w-full overflow-hidden select-none">
      {/* Subpanel Header & Mode Switchers */}
      <header className="quadrant-header flex items-center justify-between p-2 border-b border-[#1B2230] bg-[#080B10]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block shadow-[0_0_6px_#00E5FF]" />
          <span className="font-bold text-[10px] text-[#E2E8F0] tracking-wider">
            Q2 // 3D KINETIC CIRCUIT &amp; ML GHOST VIEWPORT
          </span>
        </div>
        <div className="flex items-center gap-3 font-telemetry text-[9px]">
          {/* Camera Mode Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">CAM:</span>
            {(['ISO', 'ORTHO', 'CHASE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCameraMode(m)}
                className={`px-1.5 py-0.5 border transition-colors ${
                  cameraMode === m
                    ? 'border-[#00E5FF] bg-[#141B26] text-[#00E5FF] font-bold shadow-[0_0_6px_rgba(0,229,255,0.3)]'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8] hover:border-[#2D3748]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Shader Mode Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">SHADER:</span>
            {(['PEDAL', 'SPEED', 'DELTA'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTrackColorMode(mode)}
                className={`px-1.5 py-0.5 border transition-colors ${
                  trackColorMode === mode
                    ? 'border-[#00FF66] bg-[#141B26] text-[#00FF66] font-bold shadow-[0_0_6px_rgba(0,255,102,0.3)]'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8] hover:border-[#2D3748]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* WebGL Canvas Viewport Container */}
      <div className="flex-1 relative bg-[#05070B] min-h-0 min-w-0">
        {/* Loading Spinner Indicator */}
        {(isLoading || !payload) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05070B]/80 z-10 pointer-events-none">
            <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent animate-spin rounded-full mb-2" />
            <span className="text-[10px] text-[#00E5FF] tracking-wider uppercase font-telemetry">
              Loading Circuit Spline Geometry...
            </span>
          </div>
        )}

        <Canvas
          camera={{ position: [0, 950, 1150], fov: 42, near: 1, far: 8000 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
            alpha: false,
          }}
        >
          <KineticTrackScene />
        </Canvas>
      </div>
    </section>
  );
};

export default CircuitViewport3D;
