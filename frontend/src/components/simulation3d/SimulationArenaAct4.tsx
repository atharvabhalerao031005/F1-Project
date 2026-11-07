// frontend/src/components/simulation3d/SimulationArenaAct4.tsx
/**
 * VELOCE V2 // ACT 4: PHOTOREALISTIC 20-CAR 3D RACE ARENA & 2D BROADCAST RADAR
 * Direction 1: Swiss Haute Horlogerie & Editorial Brutalism
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * Features:
 *   - Dynamic Grid with MultiCarGridManager (shared BufferGeometry, PBR clearcoat)
 *   - Active-Car Dynamic Sun Shadow Rig (44m tight frustum, PCFSoftShadowMap)
 *   - Atmosphere & PMREM IBL Sky Rig across Day, Rain, and Night
 *   - Instanced parkland trees with GPU wind sway & Armco guardrails
 *   - Motorsport Cinematic Postprocessing (N8AO, selective Bloom, ACES Filmic Tone Mapping)
 *   - 4 Broadcast Camera Rigs (Chase, Onboard, Helicopter, Trackside)
 *   - High-DPI 2D Tactical Broadcast Radar view toggle
 *   - Precision chronometer HUD with mechanical drafting crosshairs and reset engine
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sun,
  CloudRain,
  Moon,
  Box,
  Compass,
  Square,
} from 'lucide-react';
import { getCircuitSplineBundle } from '../../utils/fiaCircuitsDatabase';
import { RealisticTrackMesh, type WeatherMode } from './RealisticTrackMesh';
import { MultiCarGridManager } from './MultiCarGridManager';
import { DriverTrackingController } from './DriverTrackingController';
import { DynamicSunShadowRig } from './DynamicSunShadowRig';
import { AtmosphereSkyRig } from './AtmosphereSkyRig';
import { MotorsportPostProcessing } from '../common/MotorsportPostProcessing';
import { FullGridClassificationModal } from '../modals/FullGridClassificationModal';
import { Fia2DBroadcastRadar } from '../common/Fia2DBroadcastRadar';
import { MasterLapScrubber } from '../scrubber/MasterLapScrubber';
import { f1AudioEngine } from '../../utils/f1AudioEngine';
import { useRaceArenaStore, type BroadcastCamRig } from '../../store/useRaceArenaStore';
import type {
  CameraMode,
  MlPhysicsWarpOutput,
  MlPhysicsWarpParams,
  MlStrategySimulationResult,
  PlaybackSpeed,
  SessionTelemetryPayload,
} from '../../types/telemetry';

export type VeloceCamType = 'CHASE' | 'ONBOARD' | 'HELICOPTER' | 'TRACKSIDE';

interface SimulationArenaAct4Props {
  sessionPayload?: SessionTelemetryPayload | null;
  currentDistance?: number;
  maxDistance?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeekDistance?: (dist: number) => void;
  onReset?: () => void;
  cameraMode?: CameraMode;
  onSelectCamera?: (mode: CameraMode) => void;
  activeCircuit?: string;
  onSelectCircuit?: (circuit: string) => void;
  playbackSpeed?: PlaybackSpeed;
  onSetPlaybackSpeed?: (speed: PlaybackSpeed) => void;
  mlWarpOutput?: MlPhysicsWarpOutput | null;
  mlWarpParams?: MlPhysicsWarpParams;
  strategyResult?: MlStrategySimulationResult | null;
}

export const SimulationArenaAct4: React.FC<SimulationArenaAct4Props> = ({
  sessionPayload,
  activeCircuit = 'interlagos',
}) => {
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('DAY');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [is2DViewActive, setIs2DViewActive] = useState<boolean>(false);

  const arenaStore = useRaceArenaStore();
  const activeDriverCode = arenaStore.activeDriverCode;
  const cameraRig = arenaStore.cameraRig;
  const isPlaying = arenaStore.isPlaying;
  const playbackDistance = arenaStore.playbackDistance;
  const currentLap = arenaStore.currentLap;
  const totalLaps = arenaStore.totalLaps;
  const terminateSimulation = arenaStore.terminateSimulation;
  const tickSimulation = arenaStore.tickSimulation;

  // Universal master simulation RAF loop: runs at 60 FPS in BOTH 3D Arena and 2D Tactical Radar
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isPlaying) {
        tickSimulation(deltaSec);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, tickSimulation]);

  // Track accuracy: Use active simulated circuit ID first, fallback to store or prop
  const activeCircuitKey =
    arenaStore.simulationPayload?.circuitId || arenaStore.circuitId || activeCircuit || 'interlagos';

  // Synthesize canonical 3D track spline for the active circuit
  const { trackSpline, trackLengthMeters, centerlinePoints } = useMemo(() => {
    const bundle = getCircuitSplineBundle(activeCircuitKey);

    // If dual-driver session payload is active and matches current circuit
    if (sessionPayload?.driverA?.x?.length && (activeCircuitKey === 'monza' || !activeCircuitKey)) {
      const xs = sessionPayload.driverA.x;
      const ys = sessionPayload.driverA.y;
      const zs = sessionPayload.driverA.z;

      let minZ = 0;
      if (zs && zs.length > 0) {
        minZ = Math.min(...zs);
      }

      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < xs.length; i++) {
        // Ground mapping: Easting -> X, Northing -> -Z
        const groundX = xs[i];
        const groundZ = -ys[i];
        const groundY =
          zs && zs[i] !== undefined
            ? THREE.MathUtils.clamp((zs[i] - minZ) * 0.04, 0.05, 3.5)
            : 0.05;
        pts.push(new THREE.Vector3(groundX, groundY, groundZ));
      }

      const spline = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      spline.arcLengthDivisions = 2000;
      spline.updateArcLengths();
      const length = spline.getLength();

      return {
        trackSpline: spline,
        trackLengthMeters: Math.round(length) || bundle.trackLengthMeters,
        centerlinePoints: pts,
      };
    }

    // Canonical 24-circuit database bundle
    return {
      trackSpline: bundle.trackSpline,
      trackLengthMeters: bundle.trackLengthMeters,
      centerlinePoints: bundle.centerlinePoints,
    };
  }, [sessionPayload, activeCircuitKey]);

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

  const activeDriver =
    arenaStore.gridDrivers.find((d) => d.code === activeDriverCode) || arenaStore.gridDrivers[0];

  // Active tracked driver world position for dynamic sun shadow camera
  const trackedCarPosition = useMemo(() => {
    if (!trackSpline || trackLengthMeters <= 0) return new THREE.Vector3(0, 0, 0);
    const s =
      (((playbackDistance + (activeDriver?.s || 0)) % trackLengthMeters) + trackLengthMeters) %
      trackLengthMeters;
    const rawU = s / trackLengthMeters;
    const u = isNaN(rawU) ? 0.0 : Math.max(0.0, Math.min(0.999999, rawU));
    return trackSpline.getPointAt(u) || new THREE.Vector3(0, 0, 0);
  }, [trackSpline, trackLengthMeters, playbackDistance, activeDriver]);

  return (
    <section
      id="act-4"
      className="relative w-full h-screen min-h-[100vh] bg-[#05070B] overflow-hidden select-none"
    >
      {/* ==================================================================== */}
      {/* 3D WEBGL TRACK CANVAS (Active when not in 2D View)                   */}
      {/* ==================================================================== */}
      {!is2DViewActive && (
        <div className="absolute inset-0 z-10 w-full h-full">
          <Canvas
            shadows
            dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              stencil: false,
              toneMapping: THREE.NoToneMapping,
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 24, 38]} fov={46} far={25000} />

            {/* Atmosphere Sky Rig */}
            <AtmosphereSkyRig weatherMode={weatherMode} />

            {/* Dynamic Sun Shadow Rig */}
            <DynamicSunShadowRig
              targetPosition={trackedCarPosition}
              weatherMode={weatherMode}
            />

            {/* Extruded 14m Asphalt Road Mesh */}
            <RealisticTrackMesh
              centerlinePoints={centerlinePoints}
              trackWidth={14}
              weatherMode={weatherMode}
            />

            {/* Dynamic Multi-Car Grid Manager */}
            <MultiCarGridManager
              trackSpline={trackSpline}
              trackLengthMeters={trackLengthMeters}
            />

            {/* Dynamic 4-Camera Tracking Controller */}
            <DriverTrackingController
              trackSpline={trackSpline}
              trackLengthMeters={trackLengthMeters}
            />

            {/* Motorsport Optical Post-Processing Pipeline */}
            <MotorsportPostProcessing weatherMode={weatherMode} enabled={true} />
          </Canvas>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FULLSCREEN 2D TACTICAL BROADCAST RADAR (When Toggled)                 */}
      {/* ==================================================================== */}
      {is2DViewActive && (
        <div className="absolute inset-0 z-30 w-full h-full">
          <Fia2DBroadcastRadar onToggle3D={() => setIs2DViewActive(false)} />
        </div>
      )}

      {/* ==================================================================== */}
      {/* FLOATING GLASS HUD: MINIMAL DRIVER TELEMETRY CHIP (Bottom Left)      */}
      {/* ==================================================================== */}
      {!is2DViewActive && activeDriver && (
        <div className="absolute bottom-24 left-6 sm:left-10 z-30 pointer-events-auto hidden md:block">
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#090C12]/80 backdrop-blur-xl border border-white/10 shadow-lg text-white">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
              style={{ backgroundColor: activeDriver.teamColor }}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-display text-xs font-bold leading-none">
                <span>{activeDriver.name.toUpperCase()}</span>
                <span className="text-zinc-500 font-mono text-[10px]">#{activeDriver.number}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 mt-1">
                <span className="text-amber-400 font-bold">
                  P{arenaStore.gridDrivers.findIndex((d) => d.code === activeDriver.code) + 1}
                </span>
                <span>·</span>
                <span className="text-emerald-400 tabular-nums">{activeDriver.intervalSec}</span>
                <span>·</span>
                <span>{Math.round(activeDriver.speedKmh || 280)} km/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONSOLIDATED MASTER BROADCAST DOCK (Decision A6: Spatial Glass Pill) */}
      {/* ==================================================================== */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full bg-[#090C12]/88 backdrop-blur-2xl border border-white/12 shadow-2xl text-white select-none max-w-[94vw] overflow-x-auto">
        {/* Circuit & Lap Capsule */}
        <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-200">{activeCircuitKey.toUpperCase()}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[9.5px]">
            L{currentLap.toString().padStart(2, '0')}/{totalLaps}
          </span>
        </div>

        <div className="h-3.5 w-px bg-white/15 shrink-0" />

        {/* Viewport Toggle: 3D vs 2D */}
        <div className="flex items-center p-0.5 rounded-full bg-white/5 border border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => setIs2DViewActive(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer ${
              !is2DViewActive ? 'bg-[#E10600] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>3D</span>
          </button>
          <button
            type="button"
            onClick={() => setIs2DViewActive(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer ${
              is2DViewActive ? 'bg-[#E10600] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>2D</span>
          </button>
        </div>

        {/* 4 Broadcast Camera Rigs Selector (3D View Only) */}
        {!is2DViewActive && (
          <>
            <div className="h-3.5 w-px bg-white/15 shrink-0 hidden lg:block" />
            <div className="hidden lg:flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/5 shrink-0">
              {(['CHASE', 'ONBOARD', 'HELICOPTER', 'TRACKSIDE'] as BroadcastCamRig[]).map((rig) => (
                <button
                  type="button"
                  key={rig}
                  onClick={() => arenaStore.setCameraRig(rig)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    cameraRig === rig ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {rig}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="h-3.5 w-px bg-white/15 shrink-0" />

        {/* Atmosphere & Audio Toggles */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              !isAudioMuted ? 'text-[#FF3B00] bg-white/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Toggle Engine Audio"
          >
            {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setWeatherMode(weatherMode === 'DAY' ? 'RAIN' : weatherMode === 'RAIN' ? 'NIGHT' : 'DAY')}
            className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={`Atmosphere: ${weatherMode} (Click to toggle)`}
          >
            {weatherMode === 'DAY' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
            {weatherMode === 'RAIN' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
            {weatherMode === 'NIGHT' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>

        <div className="h-3.5 w-px bg-white/15 shrink-0" />

        {/* Master Play / Pause */}
        <button
          type="button"
          onClick={arenaStore.togglePlay}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3B00] hover:bg-[#FF5500] text-white text-[10px] font-mono font-bold tracking-wider transition-colors cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3 h-3" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white ml-0.5" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Minimal Terminate Icon Button */}
        <button
          type="button"
          onClick={terminateSimulation}
          className="p-1.5 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-300 transition-colors cursor-pointer shrink-0"
          title="Terminate active simulation"
        >
          <Square className="w-3 h-3 fill-red-400" />
        </button>
      </div>

      {/* ==================================================================== */}
      {/* MASTER DYNAMIC LAP SCRUBBER (Bottom Docked)                          */}
      {/* ==================================================================== */}
      {!is2DViewActive && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-12 sm:right-12 z-20 pointer-events-auto flex justify-center">
          <MasterLapScrubber
            onToggle2DView={() => setIs2DViewActive(true)}
            is2DActive={false}
          />
        </div>
      )}

      {/* Full Grid Classification Telemetry Modal */}
      <FullGridClassificationModal />
    </section>
  );
};
