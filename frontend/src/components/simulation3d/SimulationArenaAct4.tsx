// frontend/src/components/simulation3d/SimulationArenaAct4.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Sun,
  CloudRain,
  Moon,
  Activity,
  X,
} from 'lucide-react';
import { RealisticTrackMesh, type WeatherMode } from './RealisticTrackMesh';
import { F1CarGlbModel } from '../showcase3d/F1CarGlbModel';
import { SculptedF1Fallback } from '../showcase3d/SculptedF1Fallback';
import { f1AudioEngine } from '../../utils/f1AudioEngine';
import { TelemetryOscillograph } from '../scrubber/TelemetryOscillograph';
import { GGTractionRadar } from '../flankRight/GGTractionRadar';
import type {
  CameraMode,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationResult,
  PlaybackSpeed,
  SessionTelemetryPayload,
} from '../../types/telemetry';

export type VeloceCamType = 'CHASE' | 'ONBOARD' | 'HELICOPTER' | 'OVERVIEW';

interface SimulationArenaAct4Props {
  sessionPayload: SessionTelemetryPayload | null;
  currentDistance: number;
  maxDistance: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeekDistance: (dist: number) => void;
  onReset: () => void;
  cameraMode: CameraMode;
  onSelectCamera: (mode: CameraMode) => void;
  activeCircuit?: string;
  onSelectCircuit?: (circuit: string) => void;
  playbackSpeed?: PlaybackSpeed;
  onSetPlaybackSpeed?: (speed: PlaybackSpeed) => void;
  mlWarpOutput?: MlPhysicsWarpOutput | null;
  mlWarpParams?: MlPhysicsWarpParams;
  strategyResult?: MlStrategySimulationResult | null;
}

/**
 * Calculates a physics-correct 3D orientation quaternion with elevation pitch and body roll.
 * In our model coordinate system, +Z is forward, +Y is up, and +X is right.
 */
function computeCarOrientationQuaternion(
  tangent: THREE.Vector3,
  lateralG: number = 0
): THREE.Quaternion {
  const up = new THREE.Vector3(0, 1, 0);
  const Z = tangent.clone().normalize();
  const X = new THREE.Vector3().crossVectors(up, Z).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize();

  // Lateral G-force induces body roll: theta_roll ~ -G_lat * 0.035 rad
  const roll = -lateralG * 0.035;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);

  // Rotate X and Y axes around the forward Z axis by roll angle
  const Xr = X.clone().multiplyScalar(cosR).add(Y.clone().multiplyScalar(sinR));
  const Yr = X.clone().multiplyScalar(-sinR).add(Y.clone().multiplyScalar(cosR));

  const mat = new THREE.Matrix4().makeBasis(Xr, Yr, Z);
  return new THREE.Quaternion().setFromRotationMatrix(mat);
}

function ArenaSceneRig({
  sessionPayload,
  currentDistance,
  cameraView,
  weatherMode,
  isPlaying,
  isAudioMuted,
  mlWarpOutput,
}: {
  sessionPayload: SessionTelemetryPayload | null;
  currentDistance: number;
  cameraView: VeloceCamType;
  weatherMode: WeatherMode;
  isPlaying: boolean;
  isAudioMuted: boolean;
  mlWarpOutput?: MlPhysicsWarpOutput | null;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Extract track spline coordinates and driver 3D telemetry
  const {
    centerlinePoints,
    driverAPos,
    driverBPos,
    ghostPos,
    tangentA,
    quatA,
    quatB,
    quatGhost,
    steerA,
    steerB,
    brakeEmissiveA,
    brakeEmissiveB,
    speedA,
    speedB,
    throttleA,
    gearA,
    isDrsA,
    isDrsB,
  } = useMemo(() => {
    if (!sessionPayload) {
      // Fallback synthetic Monza oval loop
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 240; i++) {
        const phi = (i / 240) * Math.PI * 2;
        const x = 700 * Math.cos(phi) + 200 * Math.sin(2 * phi);
        const z = 350 * Math.sin(phi);
        const y = 4 * Math.sin(3 * phi);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const dummyQuat = new THREE.Quaternion();
      const dummyVec = new THREE.Vector3(0, 0, 1);
      return {
        centerlinePoints: pts,
        driverAPos: new THREE.Vector3(0, 0, 0),
        driverBPos: new THREE.Vector3(0, 0, -18),
        ghostPos: new THREE.Vector3(1.2, 0, 0),
        tangentA: dummyVec,
        quatA: dummyQuat,
        quatB: dummyQuat,
        quatGhost: dummyQuat,
        steerA: 0,
        steerB: 0,
        brakeEmissiveA: 0,
        brakeEmissiveB: 0,
        speedA: 310,
        speedB: 308,
        throttleA: 95,
        gearA: 7,
        isDrsA: false,
        isDrsB: false,
      };
    }

    const { driverA, driverB, gridLength, drsZones } = sessionPayload;
    const pts: THREE.Vector3[] = [];
    const step = 8;
    const count = driverA.x.length;

    for (let i = 0; i < count; i += step) {
      pts.push(new THREE.Vector3(driverA.x[i], driverA.z[i] * 0.4, -driverA.y[i]));
    }
    if (pts.length > 0) {
      pts.push(pts[0].clone());
    }

    // 1. Driver A (P1 Leader) Kinematics
    const idxA = Math.floor(THREE.MathUtils.clamp(currentDistance, 0, count - 1));
    const nextIdxA = (idxA + 4) % count;
    const posA = new THREE.Vector3(driverA.x[idxA], driverA.z[idxA] * 0.4, -driverA.y[idxA]);
    const nextPosA = new THREE.Vector3(driverA.x[nextIdxA], driverA.z[nextIdxA] * 0.4, -driverA.y[nextIdxA]);
    const tanA = new THREE.Vector3().subVectors(nextPosA, posA).normalize();
    const gLatA = driverA.gLat?.[idxA] || 0;
    const qA = computeCarOrientationQuaternion(tanA, gLatA);
    const sA = THREE.MathUtils.clamp(gLatA * 0.08, -0.45, 0.45);
    const brkA = (driverA.brake?.[idxA] || 0) > 10 ? (driverA.brake[idxA] / 100) * 2.2 : 0;
    const spdA = driverA.speed?.[idxA] || 310;
    const thrA = driverA.throttle?.[idxA] || 90;
    const grA = driverA.gear?.[idxA] || 7;

    // Check DRS for Driver A
    const inDrsA = (drsZones || []).some(
      (z) => currentDistance >= z.startDistanceM && currentDistance <= z.endDistanceM
    ) || (currentDistance > 500 && currentDistance < 1300) || (currentDistance > 4100 && currentDistance < 4900);

    // 2. Driver B (P2 Chaser) Kinematics
    const deltaSec = sessionPayload.deltaT?.[idxA] ?? 0.109;
    const spatialGapB = Math.max(10, Math.min(45, deltaSec * (spdA / 3.6) + 12));
    const distB = ((currentDistance - spatialGapB) % gridLength + gridLength) % gridLength;
    const idxB = Math.floor(THREE.MathUtils.clamp(distB, 0, count - 1));
    const nextIdxB = (idxB + 4) % count;
    const posB = new THREE.Vector3(driverB.x[idxB], driverB.z[idxB] * 0.4, -driverB.y[idxB]);
    const nextPosB = new THREE.Vector3(driverB.x[nextIdxB], driverB.z[nextIdxB] * 0.4, -driverB.y[nextIdxB]);
    const tanB = new THREE.Vector3().subVectors(nextPosB, posB).normalize();
    const gLatB = driverB.gLat?.[idxB] || 0;
    const qB = computeCarOrientationQuaternion(tanB, gLatB);
    const sB = THREE.MathUtils.clamp(gLatB * 0.08, -0.45, 0.45);
    const brkB = (driverB.brake?.[idxB] || 0) > 10 ? (driverB.brake[idxB] / 100) * 2.2 : 0;
    const spdB = driverB.speed?.[idxB] || 308;

    const inDrsB = (drsZones || []).some(
      (z) => distB >= z.startDistanceM && distB <= z.endDistanceM
    ) || (distB > 500 && distB < 1300) || (distB > 4100 && distB < 4900);

    // 3. ML Strategy Ghost F1 Car Kinematics
    let ghostDist = currentDistance;
    if (mlWarpOutput && mlWarpOutput.warpedDeltaT && mlWarpOutput.warpedDeltaT[idxA] !== undefined) {
      const warpDeltaT = mlWarpOutput.warpedDeltaT[idxA];
      const spatialLagM = warpDeltaT * (spdA / 3.6);
      ghostDist = ((currentDistance - spatialLagM) % gridLength + gridLength) % gridLength;
    }
    const idxG = Math.floor(THREE.MathUtils.clamp(ghostDist, 0, count - 1));
    const nextIdxG = (idxG + 4) % count;
    let posG = new THREE.Vector3(driverA.x[idxG], driverA.z[idxG] * 0.4, -driverA.y[idxG]);
    const nextPosG = new THREE.Vector3(driverA.x[nextIdxG], driverA.z[nextIdxG] * 0.4, -driverA.y[nextIdxG]);
    const tanG = new THREE.Vector3().subVectors(nextPosG, posG).normalize();

    if (Math.abs(ghostDist - currentDistance) < 2) {
      const normalG = new THREE.Vector3().crossVectors(tanG, new THREE.Vector3(0, 1, 0)).normalize();
      posG = posG.addScaledVector(normalG, 0.55);
    }

    const qG = computeCarOrientationQuaternion(tanG, gLatA);

    return {
      centerlinePoints: pts,
      driverAPos: posA,
      driverBPos: posB,
      ghostPos: posG,
      tangentA: tanA,
      quatA: qA,
      quatB: qB,
      quatGhost: qG,
      steerA: sA,
      steerB: sB,
      brakeEmissiveA: brkA,
      brakeEmissiveB: brkB,
      speedA: spdA,
      speedB: spdB,
      throttleA: thrA,
      gearA: grA,
      isDrsA: inDrsA,
      isDrsB: inDrsB,
    };
  }, [sessionPayload, currentDistance, mlWarpOutput]);

  // Update Broadcast Camera Rigs & Live Synthetic Sound Engine
  useFrame((_, delta) => {
    // 1. Audio Engine Reactive Update
    if (!isAudioMuted && isPlaying) {
      f1AudioEngine.update(speedA, throttleA, gearA);
    } else {
      f1AudioEngine.stop();
    }

    // 2. Camera Choreography
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    if (cameraView === 'CHASE') {
      cam.fov = 46;
      cam.updateProjectionMatrix();
      const chaseOffset = tangentA.clone().multiplyScalar(-7.6).add(new THREE.Vector3(0, 2.2, 0));
      const targetPos = driverAPos.clone().add(chaseOffset);
      cam.position.lerp(targetPos, delta * 6.5);
      const lookTarget = driverAPos.clone().add(tangentA.clone().multiplyScalar(2.0)).add(new THREE.Vector3(0, 0.75, 0));
      cam.lookAt(lookTarget);
    } else if (cameraView === 'ONBOARD') {
      cam.fov = 54;
      cam.updateProjectionMatrix();
      const onboardOffset = tangentA.clone().multiplyScalar(0.25).add(new THREE.Vector3(0, 0.95, 0));
      const targetPos = driverAPos.clone().add(onboardOffset);
      cam.position.copy(targetPos);
      const lookTarget = driverAPos.clone().add(tangentA.clone().multiplyScalar(30)).add(new THREE.Vector3(0, 0.6, 0));
      cam.lookAt(lookTarget);
    } else if (cameraView === 'HELICOPTER') {
      cam.fov = 34;
      cam.updateProjectionMatrix();
      const normalA = new THREE.Vector3().crossVectors(tangentA, new THREE.Vector3(0, 1, 0)).normalize();
      const heliOffset = tangentA
        .clone()
        .multiplyScalar(-16)
        .add(normalA.clone().multiplyScalar(32))
        .add(new THREE.Vector3(0, 42, 0));
      const targetPos = driverAPos.clone().add(heliOffset);
      cam.position.lerp(targetPos, delta * 3.5);
      const battleCenter = driverAPos.clone().add(driverBPos).multiplyScalar(0.5);
      cam.lookAt(battleCenter);
    } else {
      cam.fov = 45;
      cam.updateProjectionMatrix();
      const overviewPos = driverAPos.clone().add(new THREE.Vector3(0, 190, 85));
      cam.position.lerp(overviewPos, delta * 2.2);
      cam.lookAt(driverAPos);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 40, 60]} fov={46} />

      {/* Dynamic Weather Lighting Environments */}
      {weatherMode === 'DAY' && (
        <>
          <ambientLight intensity={0.52} />
          <directionalLight
            position={[120, 260, 140]}
            intensity={1.75}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={600}
            color="#FFF6E8"
          />
          <directionalLight position={[-120, 90, -120]} intensity={0.5} color="#A8C8FF" />
          <hemisphereLight args={['#3578C4', '#1E2F23', 0.6]} />
        </>
      )}

      {weatherMode === 'RAIN' && (
        <>
          <ambientLight intensity={0.42} color="#94A3B8" />
          <directionalLight
            position={[100, 200, 120]}
            intensity={1.1}
            castShadow
            color="#CBD5E1"
          />
          <directionalLight position={[-100, 80, -100]} intensity={0.65} color="#64748B" />
          <hemisphereLight args={['#475569', '#1E293B', 0.5]} />
        </>
      )}

      {weatherMode === 'NIGHT' && (
        <>
          <ambientLight intensity={0.16} color="#1E293B" />
          <directionalLight
            position={[120, 160, 90]}
            intensity={2.3}
            castShadow
            color="#E0E7FF"
          />
          <directionalLight position={[-120, 140, -90]} intensity={1.7} color="#C7D2FE" />
          <hemisphereLight args={['#0F172A', '#020617', 0.25]} />
        </>
      )}

      {/* Extruded 14m Asphalt Road Ribbon, PBR Textures & 3D FIA Kerbs */}
      <RealisticTrackMesh
        centerlinePoints={centerlinePoints}
        trackWidth={14}
        weatherMode={weatherMode}
      />

      {/* CAR 1: Driver A (P1 Leader — Red Bull Racing Navy Livery) */}
      <group position={driverAPos} quaternion={quatA}>
        <React.Suspense fallback={<SculptedF1Fallback color="#1E41FF" />}>
          <F1CarGlbModel
            liveryColor="#1E41FF"
            steerAngleRad={steerA}
            speedKmh={speedA}
            brakeEmissive={brakeEmissiveA}
            drsOpen={isDrsA}
            scale={1.0}
          />
        </React.Suspense>
      </group>

      {/* CAR 2: Driver B (P2 Chaser — McLaren Papaya Livery) */}
      <group position={driverBPos} quaternion={quatB}>
        <React.Suspense fallback={<SculptedF1Fallback color="#FF8000" />}>
          <F1CarGlbModel
            liveryColor="#FF8000"
            steerAngleRad={steerB}
            speedKmh={speedB}
            brakeEmissive={brakeEmissiveB}
            drsOpen={isDrsB}
            scale={1.0}
          />
        </React.Suspense>
      </group>

      {/* CAR 3: ML Strategy Ghost F1 Car (Translucent Champagne Gold) */}
      <group position={ghostPos} quaternion={quatGhost}>
        <React.Suspense fallback={<SculptedF1Fallback color="#D4AF37" isGhost opacity={0.65} />}>
          <F1CarGlbModel
            liveryColor="#D4AF37"
            steerAngleRad={steerA}
            speedKmh={speedA}
            brakeEmissive={0}
            drsOpen={isDrsA}
            scale={1.0}
            isGhost
            ghostOpacity={0.65}
          />
        </React.Suspense>
      </group>
    </>
  );
}

export const SimulationArenaAct4: React.FC<SimulationArenaAct4Props> = ({
  sessionPayload,
  currentDistance,
  maxDistance,
  isPlaying,
  onTogglePlay,
  onSeekDistance,
  onReset,
  activeCircuit = 'monza',
  onSelectCircuit,
  playbackSpeed = 1.0,
  onSetPlaybackSpeed,
  mlWarpOutput,
  mlWarpParams,
  strategyResult,
}) => {
  const [cameraView, setCameraView] = useState<VeloceCamType>('CHASE');
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('DAY');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      f1AudioEngine.stop();
    };
  }, []);

  const handleToggleSound = () => {
    const unmuted = f1AudioEngine.toggleMute();
    setIsAudioMuted(!unmuted);
  };

  // Live telemetry metrics at current cursor
  const metrics = useMemo(() => {
    if (!sessionPayload) {
      return {
        speed: 328,
        gear: 8,
        throttle: 100,
        brake: 0,
        gap: '+0.109',
        driverACode: 'VER',
        driverBCode: 'NOR',
        circuit: 'Monza',
        inDrs: false,
      };
    }

    const idx = Math.floor(
      THREE.MathUtils.clamp(currentDistance, 0, sessionPayload.driverA.speed.length - 1)
    );
    const speed = Math.round(sessionPayload.driverA.speed[idx] || 310);
    const gear = Math.round(sessionPayload.driverA.gear[idx] || 7);
    const throttle = Math.round(sessionPayload.driverA.throttle[idx] || 90);
    const brake = Math.round(sessionPayload.driverA.brake[idx] || 0);

    const deltaVal = sessionPayload.deltaT?.[idx];
    const gap = deltaVal !== undefined ? `+${deltaVal.toFixed(3)}` : '+0.109';

    const inDrs =
      (sessionPayload.drsZones || []).some(
        (z) => currentDistance >= z.startDistanceM && currentDistance <= z.endDistanceM
      ) ||
      (currentDistance > 500 && currentDistance < 1300) ||
      (currentDistance > 4100 && currentDistance < 4900);

    return {
      speed,
      gear,
      throttle,
      brake,
      gap,
      driverACode: sessionPayload.meta.driverA.code,
      driverBCode: sessionPayload.meta.driverB.code,
      circuit: sessionPayload.meta.circuitName,
      inDrs,
    };
  }, [sessionPayload, currentDistance]);

  // Dynamic Corner Jump targets from sessionPayload
  const cornerTargets = useMemo(() => {
    if (sessionPayload?.corners && sessionPayload.corners.length > 0) {
      const corners = sessionPayload.corners;
      const count = corners.length;
      const step = Math.max(1, Math.floor(count / 4));
      return [
        corners[0],
        corners[Math.min(step, count - 1)],
        corners[Math.min(step * 2, count - 1)],
        corners[Math.min(step * 3, count - 1)],
      ].map((c) => ({
        id: c.id,
        name: c.name,
        m: Math.round(c.apexDistanceM),
      }));
    }

    return [
      { id: 'T1', name: 'Rettifilo', m: 450 },
      { id: 'T4', name: 'Roggia', m: 1650 },
      { id: 'T8', name: 'Ascari', m: 3900 },
      { id: 'T11', name: 'Parabolica', m: 5100 },
    ];
  }, [sessionPayload]);

  return (
    <section
      id="act-4"
      className="relative w-full h-screen bg-[#0B0C0E] overflow-hidden select-none"
    >
      {/* 3D WebGL Motorsport Broadcast Canvas */}
      <div className="absolute inset-0">
        <Canvas gl={{ antialias: true, powerPreference: 'high-performance' }} dpr={[1, 1.75]}>
          <ArenaSceneRig
            sessionPayload={sessionPayload}
            currentDistance={currentDistance}
            cameraView={cameraView}
            weatherMode={weatherMode}
            isPlaying={isPlaying}
            isAudioMuted={isAudioMuted}
            mlWarpOutput={mlWarpOutput}
          />
        </Canvas>
      </div>

      {/* ==================================================================== */}
      {/* PILL 1: TOP-LEFT BROADCAST TIMING & BATTLE HUD */}
      {/* ==================================================================== */}
      <div className="absolute top-20 left-6 sm:left-12 z-30 p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/10 shadow-2xl text-white max-w-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] animate-pulse" />
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#F7F6F2]">
              Live Track Battle
            </span>
          </div>
          <span className="font-numeric text-xs font-bold text-[#FF8000]">
            GAP {metrics.gap}s
          </span>
        </div>

        {/* Drivers Leaderboard */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold font-numeric">
              <span className="w-1.5 h-3 rounded-full bg-[#1E41FF]" />
              P1 {metrics.driverACode} (Red Bull)
            </span>
            <span className="font-numeric text-[11px] text-[#A3A8B2]">LEADER</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold font-numeric text-[#FF8000]">
              <span className="w-1.5 h-3 rounded-full bg-[#FF8000]" />
              P2 {metrics.driverBCode} (McLaren)
            </span>
            <span className="font-numeric font-bold text-[#FF8000]">{metrics.gap}s</span>
          </div>
        </div>

        {/* Live Kinematic Gauges */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center font-numeric">
          <div className="p-2 rounded-xl bg-white/5">
            <span className="block text-[10px] text-[#7A7E85] uppercase">Speed</span>
            <span className="text-lg font-bold text-[#F7F6F2]">
              {metrics.speed} <span className="text-[10px]">KM/H</span>
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="block text-[10px] text-[#7A7E85] uppercase">Gear</span>
            <span className="text-lg font-bold text-[#FF3B00]">G{metrics.gear}</span>
          </div>
        </div>

        {/* Throttle & Brake Pedals */}
        <div className="space-y-1.5 mt-3">
          <div className="flex items-center gap-2 text-[10px] font-numeric text-[#7A7E85]">
            <span className="w-8">THR</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[#00FF66]" style={{ width: `${metrics.throttle}%` }} />
            </div>
            <span className="w-7 text-right text-white">{metrics.throttle}%</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-numeric text-[#7A7E85]">
            <span className="w-8">BRK</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[#FF1E44]" style={{ width: `${metrics.brake}%` }} />
            </div>
            <span className="w-7 text-right text-white">{metrics.brake}%</span>
          </div>
        </div>

        {/* DRS, ML Strategy Status & Telemetry Lab Button */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-numeric">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                metrics.inDrs
                  ? 'bg-[#00FF66] text-black animate-pulse'
                  : 'bg-white/10 text-[#7A7E85]'
              }`}
            >
              DRS
            </span>
            <span className="text-[10px] text-[#A3A8B2]">
              {metrics.inDrs ? 'ZONE ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#D4AF37]">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] font-semibold">
              {strategyResult?.undercutGainSec
                ? `+${strategyResult.undercutGainSec.toFixed(2)}s GAIN`
                : mlWarpParams?.tyreAgeLaps
                ? `${mlWarpParams.tyreAgeLaps}L TYRE`
                : 'ML GHOST ACTIVE'}
            </span>
          </div>
        </div>

        {/* Telemetry Lab Quick Modal Trigger */}
        <button
          onClick={() => setIsTelemetryDrawerOpen(true)}
          className="w-full mt-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-[#F7F6F2] text-xs font-semibold tracking-wide transition-all border border-white/10"
        >
          <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>Inspect Telemetry Lab</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* PILL 2: TOP-RIGHT CAMERA, WEATHER & CIRCUIT SWITCHER */}
      {/* ==================================================================== */}
      <div className="absolute top-20 right-6 sm:right-12 z-30 flex flex-col items-end gap-2">
        {/* Camera Rigs Switcher */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/10 shadow-2xl">
          {[
            { id: 'CHASE', label: 'Chase Cam' },
            { id: 'ONBOARD', label: 'Onboard T-Cam' },
            { id: 'HELICOPTER', label: 'Heli TV' },
            { id: 'OVERVIEW', label: 'Orbit' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCameraView(c.id as VeloceCamType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                cameraView === c.id
                  ? 'bg-[#FF3B00] text-white shadow-md'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Weather & Track Condition FX */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-[11px] font-numeric">
          {[
            { id: 'DAY', label: 'Day Sun', icon: Sun },
            { id: 'RAIN', label: 'Wet Rain', icon: CloudRain },
            { id: 'NIGHT', label: 'Night GP', icon: Moon },
          ].map((w) => {
            const IconComp = w.icon;
            return (
              <button
                key={w.id}
                onClick={() => setWeatherMode(w.id as WeatherMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                  weatherMode === w.id
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-[#7A7E85] hover:text-white'
                }`}
              >
                <IconComp className="w-3 h-3 text-[#FF3B00]" />
                <span>{w.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Circuit Switcher */}
        {onSelectCircuit && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-[11px] font-numeric">
            {[
              { id: 'monza', label: 'Monza (5.79km)' },
              { id: 'silverstone', label: 'Silverstone (5.89km)' },
              { id: 'monaco', label: 'Monaco (3.34km)' },
            ].map((trk) => (
              <button
                key={trk.id}
                onClick={() => onSelectCircuit(trk.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  activeCircuit === trk.id
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-[#7A7E85] hover:text-white'
                }`}
              >
                {trk.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* PILL 3: BOTTOM MINIMAL SCRUBBER & PLAYBACK BAR */}
      {/* ==================================================================== */}
      <div className="absolute bottom-8 left-6 right-6 sm:left-16 sm:right-16 max-w-4xl mx-auto z-30 p-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-4 text-white">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className="p-2.5 rounded-xl bg-[#FF3B00] text-white hover:bg-[#e03400] transition-colors shadow"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2.5 rounded-xl bg-white/10 text-[#9CA3AF] hover:text-white transition-colors"
          title="Reset Scrubber (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* F1 V6 Sound Toggle */}
        <button
          onClick={handleToggleSound}
          className={`p-2.5 rounded-xl transition-colors ${
            !isAudioMuted
              ? 'bg-[#FF3B00]/20 text-[#FF3B00] border border-[#FF3B00]/40'
              : 'bg-white/10 text-[#9CA3AF] hover:text-white'
          }`}
          title={isAudioMuted ? 'Unmute F1 V6 Sound Engine' : 'Mute Sound'}
        >
          {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Playback Speed Multipliers */}
        {onSetPlaybackSpeed && (
          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-xl text-[10px] font-numeric">
            {([0.5, 1.0, 2.0] as PlaybackSpeed[]).map((spd) => (
              <button
                key={spd}
                onClick={() => onSetPlaybackSpeed(spd)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-[#FF3B00] text-white font-bold'
                    : 'text-[#7A7E85] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}

        {/* Scrub Slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="font-numeric text-xs text-[#7A7E85] w-14">
            {Math.round(currentDistance)}m
          </span>
          <input
            type="range"
            min={0}
            max={maxDistance || 5793}
            value={currentDistance}
            onChange={(e) => onSeekDistance(Number(e.target.value))}
            className="flex-1 accent-[#FF3B00]"
          />
          <span className="font-numeric text-xs text-[#7A7E85] w-14 text-right">
            {maxDistance || 5793}m
          </span>
        </div>

        {/* Jump to Corner Pills */}
        <div className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-3">
          {cornerTargets.map((c) => (
            <button
              key={c.id}
              onClick={() => onSeekDistance(c.m)}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-numeric font-bold text-[#9CA3AF] hover:text-white transition-colors"
              title={`${c.name} (${c.m}m)`}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPANDABLE TELEMETRY LAB & OSCILLOGRAPH MODAL DRAWER */}
      {/* ==================================================================== */}
      {isTelemetryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-2xl transition-all">
          <div className="relative w-full max-w-6xl h-[88vh] bg-[#090D14] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
                <div>
                  <h3 className="font-display font-extrabold text-base tracking-tight text-[#F7F6F2]">
                    VELOCE // HIGH-FREQUENCY TELEMETRY LAB & GG RADAR
                  </h3>
                  <p className="font-sans text-xs text-[#7A7E85]">
                    Synchronized 1m Spatial Grid Waveforms & Dynamic Friction Capacities
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTelemetryDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#A3A8B2] hover:text-white transition-colors"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: GG Radar + 4-Band Oscillograph */}
            <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 overflow-y-auto">
              {/* Left Pane: G-G Friction Radar */}
              <div className="w-full lg:w-72 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#06080D] border border-white/5">
                <span className="font-sans text-xs uppercase font-semibold text-[#7A7E85] mb-2 self-start">
                  G-G Acceleration Polar Radar
                </span>
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <GGTractionRadar />
                </div>
                <p className="font-sans text-[11px] text-[#7A7E85] text-center mt-3">
                  45-frame comet tail with dynamic $C^1$ pear friction envelope
                </p>
              </div>

              {/* Right Pane: 4-Band Telemetry Oscillograph */}
              <div className="flex-1 flex flex-col rounded-2xl bg-[#06080D] border border-white/5 p-4 min-h-[360px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-xs uppercase font-semibold text-[#7A7E85]">
                    4-Band Oscillograph: Speed, Delta-T, Throttle & Brake
                  </span>
                  <span className="font-numeric text-xs font-bold text-[#00E5FF]">
                    {Math.round(currentDistance)}m / {maxDistance || 5793}m
                  </span>
                </div>
                <div className="flex-1 relative w-full min-h-[300px]">
                  <TelemetryOscillograph />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
