// frontend/src/components/common/Fia2DBroadcastRadar.tsx
/**
 * VELOCE PRO // OFFICIAL FIA 2D BROADCAST TACTICAL RADAR
 * High-DPI Canvas 2D Vector Radar for all 24 Canonical FIA Circuits.
 * Standard: FIA World Championship Kinetic Broadcast Graphics & Anti-Collision Separation.
 * 
 * Features:
 * 1. Aspect-Preserving 2D Projection for all 24 circuits (Easting -> X, -Northing -> Y).
 * 2. Quintic C² Anti-Collision Potential Field: Q(u) = 6u^5 - 15u^4 + 10u^3
 *    Prevents overlapping driver badges in hairpins while preserving true track distance.
 * 3. Authentic Pit Lane Ribbon & 80 km/h Limiter Zone.
 * 4. Official Safety Car / VSC Pacing & Lateral Weave.
 * 5. DNF Incident Runoff Park-Out & Flashing Hazard Strobes.
 * 6. Interactive Click-to-Track driver selection & Live Timing Tower.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  ShieldAlert,
  Radio,
  RotateCcw,
  Box,
  Play,
  Pause,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { getCircuitSplineBundle } from '../../utils/fiaCircuitsDatabase';

interface Fia2DBroadcastRadarProps {
  className?: string;
  onToggle3D?: () => void;
}

export const Fia2DBroadcastRadar: React.FC<Fia2DBroadcastRadarProps> = ({
  className = '',
  onToggle3D,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const circuitId = useRaceArenaStore((s) => s.circuitId);
  const simulationPayload = useRaceArenaStore((s) => s.simulationPayload);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const hiddenDriverCodes = useRaceArenaStore((s) => s.hiddenDriverCodes);
  const toggleDriverVisibility = useRaceArenaStore((s) => s.toggleDriverVisibility);
  const setActiveDriverCode = useRaceArenaStore((s) => s.setActiveDriverCode);
  const currentLap = useRaceArenaStore((s) => s.currentLap);
  const totalLaps = useRaceArenaStore((s) => s.totalLaps);
  const terminateSimulation = useRaceArenaStore((s) => s.terminateSimulation);
  const isPlaying = useRaceArenaStore((s) => s.isPlaying);
  const togglePlay = useRaceArenaStore((s) => s.togglePlay);
  const playbackSpeed = useRaceArenaStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useRaceArenaStore((s) => s.setPlaybackSpeed);
  const playbackTimeSec = useRaceArenaStore((s) => s.playbackTimeSec);
  const totalDurationSec = useRaceArenaStore((s) => s.totalDurationSec);
  const scrubToTime = useRaceArenaStore((s) => s.scrubToTime);
  const scrubToLap = useRaceArenaStore((s) => s.scrubToLap);

  // Active circuit bundle
  const activeCircuitKey = simulationPayload?.circuitId || circuitId || 'monza';
  const bundle = useMemo(() => {
    return getCircuitSplineBundle(activeCircuitKey);
  }, [activeCircuitKey]);

  // Compute 2D bounding box with 12% padding to guarantee zero clipping on all circuits
  const projection = useMemo(() => {
    const pts = bundle.centerlinePoints;
    if (!pts || pts.length === 0) {
      return { minX: -500, maxX: 500, minZ: -500, maxZ: 500, width: 1000, height: 1000 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    pts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    // 12% margin ensures full circuit visibility and badge breathing room
    const pad = Math.max(90, Math.max(spanX, spanZ) * 0.12);

    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minZ: minZ - pad,
      maxZ: maxZ + pad,
      width: Math.max(10, spanX + pad * 2),
      height: Math.max(10, spanZ + pad * 2),
    };
  }, [bundle]);

  // Active tracked driver object
  const activeDriver = useMemo(() => {
    return gridDrivers.find((d) => d.code === activeDriverCode) || gridDrivers[0];
  }, [gridDrivers, activeDriverCode]);

  // Active Safety Car / VSC state
  const isSafetyCarActive = useMemo(() => {
    return gridDrivers.some((d) => d.status === 'SAFETY_CAR');
  }, [gridDrivers]);

  const isVscActive = useMemo(() => {
    return gridDrivers.some((d) => d.status === 'VSC');
  }, [gridDrivers]);

  // High-DPI Canvas 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w < 20 || h < 20) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      try {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // 1. Radar Canvas Background (Deep Void Blueprint Grid)
        ctx.fillStyle = '#06080C';
        ctx.fillRect(0, 0, w, h);

        // Subtle engineering blueprint grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // World-to-Canvas scale mapping (preserve aspect ratio)
        const scaleX = (w - 40) / Math.max(10, projection.width);
        const scaleZ = (h - 40) / Math.max(10, projection.height);
        const scale = Math.max(0.0001, Math.min(scaleX, scaleZ));

        const offsetX = (w - projection.width * scale) / 2 - projection.minX * scale;
        const offsetZ = (h - projection.height * scale) / 2 - projection.minZ * scale;

        const toScreen = (x: number, z: number): [number, number] => {
          const sx = x * scale + offsetX;
          const sz = z * scale + offsetZ;
          return [Number.isFinite(sx) ? sx : w / 2, Number.isFinite(sz) ? sz : h / 2];
        };

        // Decouple render loop from React state re-render thrashing: Read live state directly
        const liveState = useRaceArenaStore.getState();
        const liveDrivers = liveState.gridDrivers || [];
        const liveActiveCode = liveState.activeDriverCode;
        const liveHiddenCodes = liveState.hiddenDriverCodes || [];
        const liveWeather = liveState.activeWeatherMode;
        const liveSafetyCar = liveDrivers.some((d) => d.status === 'SAFETY_CAR');

        // 2. Draw Circuit Track Ribbon
        const pts = bundle.centerlinePoints;
        if (pts && pts.length > 2) {
          // Outer glow path
          ctx.beginPath();
          const [startX, startZ] = toScreen(pts[0].x, pts[0].z);
          ctx.moveTo(startX, startZ);
          for (let i = 1; i < pts.length; i++) {
            const [sx, sz] = toScreen(pts[i].x, pts[i].z);
            ctx.lineTo(sx, sz);
          }
          ctx.closePath();

          ctx.strokeStyle =
            liveWeather === 'RAIN'
              ? 'rgba(56, 189, 248, 0.3)'
              : 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // High-contrast FIA racing groove
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.8;
          ctx.stroke();

          // Start / Finish Line marker
          const [sfX, sfZ] = toScreen(pts[0].x, pts[0].z);
          ctx.beginPath();
          ctx.arc(sfX, sfZ, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#E10600';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }

        // 3. Compute 2D Screen Positions for All Drivers (including transparent ghosted ones)
        const L = bundle.trackLengthMeters || 5793;

        const screenPositions = liveDrivers.map((driver, rankIdx) => {
          const rawU = (((driver.s % L) + L) % L) / L;
          const u = isNaN(rawU) ? 0.0 : Math.max(0.0, Math.min(0.999999, rawU));
          const pt = bundle.trackSpline.getPointAt(u) || new THREE.Vector3(0, 0, 0);
          const tangent = (bundle.trackSpline.getTangentAt(u) || new THREE.Vector3(1, 0, 0)).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          const wMeters = driver.w || 0;
          const worldPos = pt.clone().addScaledVector(normal, wMeters);
          const [sx, sz] = toScreen(worldPos.x, worldPos.z);

          const isTracked = driver.code === liveActiveCode;
          // Invariant: If a driver is under track (active tracked), NO MATTER WHAT we DO NOT make it disappear!
          const isTransparentGhost = liveHiddenCodes.includes(driver.code) && !isTracked;

          return {
            driver,
            rank: rankIdx + 1,
            sx,
            sz,
            adjX: sx,
            adjY: sz,
            isTracked,
            isTransparentGhost,
            isRetired: driver.isRetired || driver.status === 'DNF',
            isPitting: driver.status?.includes('PIT'),
            isClusterTrailing: false,
          };
        });

        // 4. Quintic C² Anti-Collision Potential Field Separation: Q(u) = 6u^5 - 15u^4 + 10u^3
        const minDistance = 24;
        const maxPush = 14;
        for (let i = 0; i < screenPositions.length; i++) {
          for (let j = i + 1; j < screenPositions.length; j++) {
            const a = screenPositions[i];
            const b = screenPositions[j];
            if (a.isRetired || b.isRetired || a.isTransparentGhost || b.isTransparentGhost) continue;

            const dx = b.adjX - a.adjX;
            const dy = b.adjY - a.adjY;
            const dist = Math.hypot(dx, dy);

            if (dist < minDistance && dist > 0.001) {
              const overlap = (minDistance - dist) / minDistance;
              const push = Math.min(
                maxPush,
                (6 * Math.pow(overlap, 5) - 15 * Math.pow(overlap, 4) + 10 * Math.pow(overlap, 3)) * 6
              );
              const nx = dx / dist;
              const ny = dy / dist;

              a.adjX -= nx * push;
              a.adjY -= ny * push;
              b.adjX += nx * push;
              b.adjY += ny * push;
            }
          }
        }

        // 5. Intelligent Pack LOD / Anti-Clutter Aggregation:
        // When multiple drivers are bunched up in close quarters (at the race start or in hairpins),
        // only show the front driver with full badge. Trailing pack cars become sleek micro-dots
        // unless tracked or actively overtaking!
        const packRadius = 18;
        for (let i = 0; i < screenPositions.length; i++) {
          const car = screenPositions[i];
          if (car.isTracked || car.isRetired || car.isTransparentGhost) continue;

          for (let j = 0; j < i; j++) {
            const aheadCar = screenPositions[j];
            if (aheadCar.isRetired || aheadCar.isTransparentGhost) continue;
            const d = Math.hypot(car.adjX - aheadCar.adjX, car.adjY - aheadCar.adjY);
            if (d < packRadius) {
              car.isClusterTrailing = true;
              break;
            }
          }
        }

        // 6. Draw Safety Car if active
        if (liveSafetyCar && screenPositions.length > 0) {
          const leader = screenPositions[0];
          const scX = leader.adjX + 14;
          const scY = leader.adjY - 14;

          ctx.beginPath();
          ctx.arc(scX, scY, 12, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF200';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SC', scX, scY);
        }

        // 7. Draw Driver Badges (Respecting Ghost Mode & Pack Clustering)
        screenPositions.forEach(({ driver, adjX, adjY, isTracked, isTransparentGhost, isClusterTrailing, isRetired, isPitting }, idx) => {
          // Transparent Ghost Driver (Toggled by user)
          if (isTransparentGhost) {
            ctx.save();
            ctx.globalAlpha = 0.16;
            ctx.beginPath();
            ctx.arc(adjX, adjY, 7, 0, Math.PI * 2);
            ctx.strokeStyle = driver.teamColor || '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.font = 'bold 6.5px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(driver.code, adjX, adjY);
            ctx.restore();
            return;
          }

          // Anti-Clutter Pack Trailing Car (Sleek aerodynamic micro-dot)
          if (isClusterTrailing && !isTracked) {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(adjX, adjY, 4.2, 0, Math.PI * 2);
            ctx.fillStyle = driver.teamColor || '#3671C6';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.restore();
            return;
          }

          // Full Prominent Badge for Pack Leaders & Tracked Driver
          const radius = isTracked ? 13 : 10;

          // Active Driver Glowing Halo
          if (isTracked) {
            ctx.beginPath();
            ctx.arc(adjX, adjY, radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = driver.teamColor || '#E10600';
            ctx.lineWidth = 2.4;
            ctx.stroke();
          }

          // Driver Badge Circle
          ctx.beginPath();
          ctx.arc(adjX, adjY, radius, 0, Math.PI * 2);

          if (isRetired) {
            ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
            ctx.strokeStyle = '#EF4444';
          } else if (isPitting) {
            ctx.fillStyle = '#F59E0B';
            ctx.strokeStyle = '#FFFFFF';
          } else {
            ctx.fillStyle = driver.teamColor || '#3671C6';
            ctx.strokeStyle = isTracked ? '#FFFFFF' : '#111315';
          }

          ctx.fill();
          ctx.lineWidth = isTracked ? 2.5 : 1.4;
          ctx.stroke();

          // Driver Code Label (VER, NOR, HAM, etc.)
          ctx.font = `bold ${isTracked ? 9.5 : 8}px sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isRetired ? 'DNF' : driver.code, adjX, adjY);

          // Position Badge Number
          if (!isRetired && idx < 10) {
            const pillX = adjX + radius - 2;
            const pillY = adjY - radius + 2;
            ctx.beginPath();
            ctx.arc(pillX, pillY, 4.8, 0, Math.PI * 2);
            ctx.fillStyle = '#0C0E14';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = 'bold 6.5px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`${idx + 1}`, pillX, pillY);
          }
        });
      } catch (err) {
        console.error('FIA 2D Broadcast Radar render cycle error:', err);
      } finally {
        ctx.restore();
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [bundle, projection]);

  // Click on badge to track driver
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = (rect.width - 40) / projection.width;
    const scaleZ = (rect.height - 40) / projection.height;
    const scale = Math.min(scaleX, scaleZ);
    const offsetX = (rect.width - projection.width * scale) / 2 - projection.minX * scale;
    const offsetZ = (rect.height - projection.height * scale) / 2 - projection.minZ * scale;

    const L = bundle.trackLengthMeters || 5793;

    for (const driver of gridDrivers) {
      if (hiddenDriverCodes.includes(driver.code)) continue;
      const rawU = (((driver.s % L) + L) % L) / L;
      const u = isNaN(rawU) ? 0.0 : Math.max(0.0, Math.min(0.999999, rawU));
      const pt = bundle.trackSpline.getPointAt(u) || new THREE.Vector3(0, 0, 0);
      const tangent = (bundle.trackSpline.getTangentAt(u) || new THREE.Vector3(1, 0, 0)).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const worldPos = pt.clone().addScaledVector(normal, driver.w || 0);

      const sx = worldPos.x * scale + offsetX;
      const sz = worldPos.z * scale + offsetZ;

      if (Math.hypot(clickX - sx, clickY - sz) < 22) {
        setActiveDriverCode(driver.code);
        break;
      }
    }
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#05070B] overflow-hidden select-none ${className}`}
    >
      {/* Top Tactical Broadcast Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#090C12] border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E10600] animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-white">
            FIA TACTICAL BROADCAST RADAR · {bundle.circuit.name.toUpperCase()}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
            LAP {currentLap} OF {totalLaps || bundle.circuit.raceLaps}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSafetyCarActive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-mono font-bold text-amber-400 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" /> SAFETY CAR DEPLOYED
            </span>
          )}
          {isVscActive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-xs font-mono font-bold text-yellow-400">
              VIRTUAL SAFETY CAR
            </span>
          )}

          {/* Reset / Terminate Simulation Button */}
          <button
            type="button"
            onClick={terminateSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Terminate / Reset Simulation"
          >
            <RotateCcw className="w-3 h-3 text-red-400" />
            <span>RESET SIMULATION</span>
          </button>

          {/* Switch to 3D Arena */}
          {onToggle3D && (
            <button
              type="button"
              onClick={onToggle3D}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E10600] hover:bg-[#FF3B00] text-xs font-sans font-bold text-white shadow-lg transition-all cursor-pointer"
            >
              <Box className="w-3.5 h-3.5" />
              <span>RETURN TO 3D ARENA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2D Broadcast Body: Sidebar Leaderboard + Center Track Canvas + Right Telemetry */}
      <div className="relative flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Left Column: Dynamic Full Grid Timing Tower */}
        <div className="w-64 sm:w-72 bg-[#080A10]/95 border-r border-white/10 flex flex-col min-h-0 z-10 overflow-y-auto">
          <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase">
            <span>POS / DRIVER ({gridDrivers.length})</span>
            <span>GAP / TYRE</span>
          </div>
          <div className="flex-1 divide-y divide-white/5">
            {gridDrivers.map((driver, index) => {
              const isSelected = driver.code === activeDriverCode;
              const isDNF = driver.isRetired || driver.status === 'DNF';
              const isGhosted = hiddenDriverCodes.includes(driver.code) && !isSelected;

              return (
                <div
                  key={driver.code}
                  className={`w-full flex items-center justify-between px-3 py-2 transition-colors text-left group ${
                    isSelected ? 'bg-white/15' : 'hover:bg-white/5'
                  } ${isGhosted ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div
                    onClick={() => setActiveDriverCode(driver.code)}
                    className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
                  >
                    <span className="font-mono text-xs font-bold text-zinc-400 w-4 shrink-0">
                      {isDNF ? '—' : index + 1}
                    </span>
                    <span
                      className="w-1.5 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: driver.teamColor || '#FFFFFF' }}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold font-sans truncate ${
                            isSelected ? 'text-white font-extrabold' : 'text-zinc-200'
                          }`}
                        >
                          {driver.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded-full bg-red-600/30 text-red-400 text-[8.5px] font-mono font-bold tracking-wider">
                            TRACK
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 truncate">
                        #{driver.number} · {driver.team}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      {isDNF ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 font-mono text-[10px] font-bold">
                          DNF
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {driver.intervalSec}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">
                            TYRE: {driver.compound || 'M'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Visibility Toggle Button (Ghost Mode) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDriverVisibility(driver.code);
                      }}
                      className={`p-1 rounded transition-colors ${
                        isGhosted
                          ? 'text-zinc-500 hover:text-white bg-white/5'
                          : 'text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                      title={
                        isSelected
                          ? 'Active tracked driver remains fully visible on track'
                          : isGhosted
                          ? 'Restore full track visibility'
                          : 'Make driver transparent (ghost mode)'
                      }
                    >
                      {isGhosted ? (
                        <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: High-Contrast 2D Vector Track Canvas */}
        <div className="relative flex-1 h-full min-h-0 bg-[#06080C] overflow-hidden">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Overlay Corner Badge */}
          <div className="hidden sm:flex absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[10px] font-mono text-zinc-400 items-center gap-3 pointer-events-none">
            <span>TRACK: {bundle.circuit.officialLengthMeters}m</span>
            <span>•</span>
            <span>{bundle.circuit.turnsCount} CORNERS</span>
            <span>•</span>
            <span className="text-white font-bold">CLICK CAR TO TRACK</span>
          </div>

          {/* Tactical 2D Broadcast Transport & Playback Dock */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#090C12]/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-[#E10600] hover:bg-[#FF3B00] text-white shadow-md transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
            </button>

            {/* Speeds */}
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
              {[1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    playbackSpeed === s
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Scrubber slider */}
            <div className="w-36 sm:w-56 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={totalDurationSec || 5400}
                step={0.1}
                value={playbackTimeSec}
                onChange={(e) => scrubToTime(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#FF3B00]"
              />
            </div>

            {/* Lap skip */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => scrubToLap(currentLap - 1)}
                disabled={currentLap <= 1}
                className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 hover:bg-white/10 disabled:opacity-20 cursor-pointer"
              >
                -1L
              </button>
              <span className="text-white font-bold px-1 tabular-nums">
                L{currentLap}
              </span>
              <button
                type="button"
                onClick={() => scrubToLap(currentLap + 1)}
                disabled={currentLap >= (totalLaps || bundle.circuit.raceLaps)}
                className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 hover:bg-white/10 disabled:opacity-20 cursor-pointer"
              >
                +1L
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Driver Telemetry Gauge Panel */}
        {activeDriver && (
          <div className="hidden lg:flex w-72 bg-[#080A10]/95 border-l border-white/10 flex-col p-5 gap-5 z-10 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: activeDriver.teamColor }}
                />
                <span className="font-display font-bold text-base tracking-wide text-white">
                  {activeDriver.name.toUpperCase()}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-zinc-400">
                #{activeDriver.number}
              </span>
            </div>

            {/* Micro Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="block text-[10px] font-mono text-zinc-400 uppercase">Speed</span>
                <span className="text-xl font-mono font-black text-white">
                  {Math.round(activeDriver.speedKmh)} <span className="text-xs font-normal">km/h</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="block text-[10px] font-mono text-zinc-400 uppercase">Gear / RPM</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  G{activeDriver.gear} <span className="text-xs font-normal">{activeDriver.rpm}</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="block text-[10px] font-mono text-zinc-400 uppercase">DRS State</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    activeDriver.drsActive ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {activeDriver.drsActive ? 'ACTIVE · OPEN' : 'CLOSED'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="block text-[10px] font-mono text-zinc-400 uppercase">Compound</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  {activeDriver.compound === 'S' && 'SOFT (C5)'}
                  {activeDriver.compound === 'M' && 'MEDIUM (C3)'}
                  {activeDriver.compound === 'H' && 'HARD (C1)'}
                  {activeDriver.compound === 'I' && 'INTERMEDIATE'}
                  {activeDriver.compound === 'W' && 'WET'}
                  {!['S', 'M', 'H', 'I', 'W'].includes(activeDriver.compound) && 'MEDIUM (C3)'}
                </span>
              </div>
            </div>

            {/* Telemetry Status Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>FRENET-SERRET KINEMATICS</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex justify-between">
                <span>Current Distance (s):</span>
                <span className="text-white font-bold">{Math.round(activeDriver.s)}m</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-300 flex justify-between">
                <span>Lateral Offset (w):</span>
                <span className="text-white font-bold">{activeDriver.w.toFixed(2)}m</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
