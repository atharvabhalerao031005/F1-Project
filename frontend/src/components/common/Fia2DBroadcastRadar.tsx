// frontend/src/components/common/Fia2DBroadcastRadar.tsx
/**
 * VELOCE PRO // FIA 2D TACTICAL BROADCAST RADAR & STORYTELLING CONSOLE
 * High-DPI Vector Canvas 2D Radar for all 24 Canonical FIA Circuits.
 * Design Standard: McLaren Technology Centre (MTC Woking) Light-Luxury Editorial.
 * 
 * Features & Invariants:
 * 1. Master Alabaster Ground (#FAF9F6) & Brushed Titanium (#E5E2DA) Framing.
 * 2. Hierarchical Pack Clustering: Lead cars display prominent badges with
 *    attached count pills (+N), while trailing pack cars collapse into sleek
 *    3.5px aerodynamic micro-beads, eliminating conga lines.
 * 3. Driver Transparency (Ghost Mode): Eye toggle dims car to alpha = 0.12.
 *    CRITICAL INVARIANT: The user-tracked driver ALWAYS remains 100% visible!
 * 4. Bulletproof Canvas Lifecycle: ResizeObserver guarantees valid bounds,
 *    eliminating blackouts and transform corruption across all displays.
 * 5. Autonomous Simulation Ticker Safeguard: Ensures play/pause/scrubbing
 *    never freezes into a static image.
 * 6. Horological Telemetry Drawer: Precision chronometer gauges for velocity,
 *    gear, RPM, throttle/brake dual bars, DRS state, and Frenet coordinates.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  Activity,
} from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { getCircuitSplineBundle } from '../../utils/fiaCircuitsDatabase';
import type { PlaybackSpeed } from '../../types/telemetry';

interface Fia2DBroadcastRadarProps {
  className?: string;
  onToggle3D?: () => void;
}

export const Fia2DBroadcastRadar: React.FC<Fia2DBroadcastRadarProps> = ({
  className = '',
  onToggle3D,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store bindings
  const circuitId = useRaceArenaStore((s) => s.circuitId);
  const simulationPayload = useRaceArenaStore((s) => s.simulationPayload);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const hiddenDriverCodes = useRaceArenaStore((s) => s.hiddenDriverCodes);
  const toggleDriverVisibility = useRaceArenaStore((s) => s.toggleDriverVisibility);
  const setActiveDriverCode = useRaceArenaStore((s) => s.setActiveDriverCode);
  const currentLap = useRaceArenaStore((s) => s.currentLap);
  const totalLaps = useRaceArenaStore((s) => s.totalLaps);
  const resetSimulation = useRaceArenaStore((s) => s.resetSimulation);
  const isPlaying = useRaceArenaStore((s) => s.isPlaying);
  const togglePlay = useRaceArenaStore((s) => s.togglePlay);
  const playbackSpeed = useRaceArenaStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useRaceArenaStore((s) => s.setPlaybackSpeed);
  const playbackTimeSec = useRaceArenaStore((s) => s.playbackTimeSec);
  const totalDurationSec = useRaceArenaStore((s) => s.totalDurationSec);
  const scrubToTime = useRaceArenaStore((s) => s.scrubToTime);
  const scrubToLap = useRaceArenaStore((s) => s.scrubToLap);

  // Local UI State
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(true);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Active circuit spline bundle
  const activeCircuitKey = simulationPayload?.circuitId || circuitId || 'monza';
  const bundle = useMemo(() => {
    return getCircuitSplineBundle(activeCircuitKey);
  }, [activeCircuitKey]);

  // Compute 2D aspect-preserving projection bounds with 14% safety padding
  const projection = useMemo(() => {
    const pts = bundle.centerlinePoints;
    if (!pts || pts.length === 0) {
      return { minX: -500, maxX: 500, minZ: -500, maxZ: 500, width: 1000, height: 1000 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const pad = Math.max(80, Math.max(spanX, spanZ) * 0.14);

    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minZ: minZ - pad,
      maxZ: maxZ + pad,
      width: Math.max(10, spanX + pad * 2),
      height: Math.max(10, spanZ + pad * 2),
    };
  }, [bundle]);

  // Tracked driver object
  const activeDriver = useMemo(() => {
    return gridDrivers.find((d) => d.code === activeDriverCode) || gridDrivers[0];
  }, [gridDrivers, activeDriverCode]);

  // Safety Car / VSC status
  const isSafetyCarActive = useMemo(() => {
    return gridDrivers.some((d) => d.status === 'SAFETY_CAR');
  }, [gridDrivers]);

  const isVscActive = useMemo(() => {
    return gridDrivers.some((d) => d.status === 'VSC');
  }, [gridDrivers]);

  // Bulletproof ResizeObserver for zero-blackout canvas containment
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 20 && height > 20) {
          setContainerSize({ width, height });
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Format race clock: HH:MM:SS.s
  const formatRaceClock = useCallback((seconds: number) => {
    const totalMs = Math.max(0, Math.floor(seconds * 10));
    const h = Math.floor(totalMs / 36000);
    const m = Math.floor((totalMs % 36000) / 600);
    const s = Math.floor((totalMs % 600) / 10);
    const ds = totalMs % 10;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ds}`;
  }, []);

﻿  // High-DPI 60 FPS Canvas Render Loop & Autonomous Ticker
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let lastTickTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTickTime) / 1000, 0.1);
      lastTickTime = now;

      // Autonomous simulation ticker safeguard: ensures race advances in 2D mode
      const liveState = useRaceArenaStore.getState();
      if (liveState.isPlaying && dt > 0.001) {
        liveState.tickSimulation(dt);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = containerSize.width;
      const h = containerSize.height;

      if (w < 20 || h < 20) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Synchronize backing buffer resolution to DPR
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      try {
        // Strict transform reset: guarantees zero scale drift or cumulative skew
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // 1. Radar Canvas Ground: Warm Alabaster Parchment (#FAF9F6)
        ctx.fillStyle = '#FAF9F6';
        ctx.fillRect(0, 0, w, h);

        // Subtle Architectural Drafting Grid (#EAE7DF)
        ctx.strokeStyle = 'rgba(229, 226, 218, 0.45)';
        ctx.lineWidth = 0.5;
        const gridSize = 48;
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

        // World-to-Canvas scale mapping (preserve strict aspect ratio)
        const scaleX = (w - 60) / Math.max(10, projection.width);
        const scaleZ = (h - 60) / Math.max(10, projection.height);
        const scale = Math.max(0.0001, Math.min(scaleX, scaleZ));

        const offsetX = (w - projection.width * scale) / 2 - projection.minX * scale;
        const offsetZ = (h - projection.height * scale) / 2 - projection.minZ * scale;

        const toScreen = (x: number, z: number): [number, number] => {
          const sx = x * scale + offsetX;
          const sz = z * scale + offsetZ;
          return [Number.isFinite(sx) ? sx : w / 2, Number.isFinite(sz) ? sz : h / 2];
        };

        // Live race store parameters
        const drivers = liveState.gridDrivers;
        const liveActiveCode = liveState.activeDriverCode;
        const liveHiddenCodes = liveState.hiddenDriverCodes;
        const liveSafetyCar = drivers.some((d) => d.status === 'SAFETY_CAR');

        // 2. Circuit Track Ribbon Rendering
        const pts = bundle.centerlinePoints;
        if (pts && pts.length > 2) {
          // A. Smoked Titanium Trackbed Ribbon (14px)
          ctx.beginPath();
          const [startX, startZ] = toScreen(pts[0].x, pts[0].z);
          ctx.moveTo(startX, startZ);
          for (let i = 1; i < pts.length; i++) {
            const [sx, sz] = toScreen(pts[i].x, pts[i].z);
            ctx.lineTo(sx, sz);
          }
          ctx.closePath();
          ctx.strokeStyle = '#E2DFD6';
          ctx.lineWidth = 14;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // B. DRS Speed Zones: Highlighted trackbed segments with dashed line
          const drsCount = bundle.circuit.drsZones || 2;
          ctx.save();
          for (let z = 0; z < drsCount; z++) {
            const uStart = z === 0 ? 0.88 : (0.42 + z * 0.22) % 1.0;
            const drsPts: [number, number][] = [];
            const steps = 40;
            for (let s = 0; s <= steps; s++) {
              const u = (uStart + (s / steps) * 0.14) % 1.0;
              const p = bundle.trackSpline.getPointAt(u);
              if (p) drsPts.push(toScreen(p.x, p.z));
            }
            if (drsPts.length > 1) {
              ctx.beginPath();
              ctx.moveTo(drsPts[0][0], drsPts[0][1]);
              for (let k = 1; k < drsPts.length; k++) {
                ctx.lineTo(drsPts[k][0], drsPts[k][1]);
              }
              // Soft British Sage DRS speed ribbon
              ctx.strokeStyle = 'rgba(46, 83, 57, 0.35)';
              ctx.lineWidth = 10;
              ctx.stroke();

              // Dashed center zone indicator
              ctx.strokeStyle = '#2E5339';
              ctx.lineWidth = 1.2;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          ctx.restore();

          // C. High-Contrast FIA Racing Line Groove (2.5px Deep Obsidian Ink)
          ctx.beginPath();
          ctx.moveTo(startX, startZ);
          for (let i = 1; i < pts.length; i++) {
            const [sx, sz] = toScreen(pts[i].x, pts[i].z);
            ctx.lineTo(sx, sz);
          }
          ctx.closePath();
          ctx.strokeStyle = '#111215';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // D. Sector Split Lines: S1 (~33%) and S2 (~66%)
          [0.333, 0.667].forEach((uSector, sIdx) => {
            const pt = bundle.trackSpline.getPointAt(uSector);
            const tan = (bundle.trackSpline.getTangentAt(uSector) || new THREE.Vector3(1, 0, 0)).normalize();
            const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
            if (pt) {
              const leftP = pt.clone().addScaledVector(norm, 8);
              const rightP = pt.clone().addScaledVector(norm, -8);
              const [lx, lz] = toScreen(leftP.x, leftP.z);
              const [rx, rz] = toScreen(rightP.x, rightP.z);

              ctx.beginPath();
              ctx.moveTo(lx, lz);
              ctx.lineTo(rx, rz);
              ctx.strokeStyle = '#8C8F98';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Sector micro-label
              ctx.font = 'bold 7.5px sans-serif';
              ctx.fillStyle = '#5C6068';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`S${sIdx + 1}`, lx - norm.x * 6, lz - norm.z * 6);
            }
          });

          // E. Start / Finish Line Marker
          const [sfX, sfZ] = toScreen(pts[0].x, pts[0].z);
          ctx.beginPath();
          ctx.arc(sfX, sfZ, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#111215';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#DFD9CC';
          ctx.stroke();

          ctx.font = 'bold 7px sans-serif';
          ctx.fillStyle = '#111215';
          ctx.fillText('S/F', sfX, sfZ - 11);
        }

﻿        // 3. Compute 2D Screen Coordinates for Drivers
        const L = bundle.trackLengthMeters || 5793;
        const screenPositions = drivers.map((driver, rankIdx) => {
          const rawU = (((driver.s % L) + L) % L) / L;
          const u = isNaN(rawU) ? 0.0 : Math.max(0.0, Math.min(0.999999, rawU));
          const pt = bundle.trackSpline.getPointAt(u) || new THREE.Vector3(0, 0, 0);
          const tangent = (bundle.trackSpline.getTangentAt(u) || new THREE.Vector3(1, 0, 0)).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          const wMeters = driver.w || 0;
          const worldPos = pt.clone().addScaledVector(normal, wMeters);
          const [sx, sz] = toScreen(worldPos.x, worldPos.z);

          const isTracked = driver.code === liveActiveCode;
          // CRITICAL INVARIANT: The tracked car NEVER ghosts, even if toggled off in leaderboard!
          const isTransparentGhost = liveHiddenCodes.includes(driver.code) && !isTracked;

          // Overtaking / Battle Detection: Active divergence in lateral path or speed
          const isOvertaking = Math.abs(driver.w) > 1.05 && driver.speedKmh > 240;

          return {
            driver,
            rank: rankIdx + 1,
            sx,
            sz,
            adjX: sx,
            adjY: sz,
            isTracked,
            isTransparentGhost,
            isOvertaking,
            isRetired: driver.isRetired || driver.status === 'DNF',
            isPitting: driver.status?.includes('PIT'),
            isClusterTrailing: false,
            clusterCount: 0,
          };
        });

        // 4. Hierarchical Pack Clustering (Q(u) + LOD):
        // Cluster bunched cars to eradicate conga lines. The front car displays full badge
        // with a count pill (+N); trailing pack cars collapse into aerodynamic micro-dots.
        const clusterDistance = 24;
        for (let i = 0; i < screenPositions.length; i++) {
          const car = screenPositions[i];
          if (car.isClusterTrailing || car.isRetired || car.isTransparentGhost) continue;

          let trailingCount = 0;
          for (let j = i + 1; j < screenPositions.length; j++) {
            const follower = screenPositions[j];
            if (follower.isClusterTrailing || follower.isRetired || follower.isTransparentGhost) continue;

            const dist = Math.hypot(follower.sx - car.sx, follower.sz - car.sz);
            if (dist < clusterDistance) {
              // INVARIANTS: Tracked car and active duelists NEVER collapse!
              if (!follower.isTracked && !follower.isOvertaking) {
                follower.isClusterTrailing = true;
                trailingCount++;
              }
            }
          }
          car.clusterCount = trailingCount;
        }

        // 5. Quintic C² Anti-Collision Potential Field Separation:
        // Applied solely to non-collapsed leaders and duelists to prevent awkward badge overlaps.
        const minDistance = 22;
        const maxPush = 12;
        for (let i = 0; i < screenPositions.length; i++) {
          for (let j = i + 1; j < screenPositions.length; j++) {
            const a = screenPositions[i];
            const b = screenPositions[j];
            if (a.isClusterTrailing || b.isClusterTrailing || a.isRetired || b.isRetired) continue;
            if (a.isTransparentGhost || b.isTransparentGhost) continue;

            const dx = b.adjX - a.adjX;
            const dy = b.adjY - a.adjY;
            const dist = Math.hypot(dx, dy);

            if (dist < minDistance && dist > 0.001) {
              const overlap = (minDistance - dist) / minDistance;
              const push = Math.min(
                maxPush,
                (6 * Math.pow(overlap, 5) - 15 * Math.pow(overlap, 4) + 10 * Math.pow(overlap, 3)) * 5
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

        // 6. Draw Safety Car / VSC if active
        if (liveSafetyCar && screenPositions.length > 0) {
          const leader = screenPositions[0];
          const scX = leader.adjX + 16;
          const scY = leader.adjY - 16;

          ctx.beginPath();
          ctx.arc(scX, scY, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#DFD9CC';
          ctx.fill();
          ctx.strokeStyle = '#111215';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = '#111215';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SC', scX, scY);
        }

        // 7. Draw Driver Badges (Respecting Ghost Mode & Pack Clustering)
        screenPositions.forEach(
          ({
            driver,
            adjX,
            adjY,
            isTracked,
            isTransparentGhost,
            isClusterTrailing,
            clusterCount,
            isRetired,
            isPitting,
          }, idx) => {
            // A. Ghosted Driver (Toggled by user)
            if (isTransparentGhost) {
              ctx.save();
              ctx.globalAlpha = 0.12;
              ctx.beginPath();
              ctx.arc(adjX, adjY, 6.5, 0, Math.PI * 2);
              ctx.strokeStyle = driver.teamColor || '#111215';
              ctx.lineWidth = 1.2;
              ctx.stroke();
              ctx.font = 'bold 6.5px monospace';
              ctx.fillStyle = '#5C6068';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(driver.code, adjX, adjY);
              ctx.restore();
              return;
            }

            // B. Trailing Pack Micro-Dot (Aerodynamic 3.5px bead)
            if (isClusterTrailing && !isTracked) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(adjX, adjY, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = driver.teamColor || '#111215';
              ctx.fill();
              ctx.lineWidth = 1;
              ctx.strokeStyle = '#FAF9F6';
              ctx.stroke();
              ctx.restore();
              return;
            }

            // C. Full Prominent Badge (Cluster Leader or Tracked Car)
            const radius = isTracked ? 13 : 10.5;

            // Tracked Driver Incandescent Champagne Quartz Halo
            if (isTracked) {
              ctx.beginPath();
              ctx.arc(adjX, adjY, radius + 6, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(200, 191, 172, 0.85)'; // Champagne Quartz
              ctx.lineWidth = 2.0;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(adjX, adjY, radius + 10, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(212, 56, 17, 0.35)'; // Coral Vermilion accent ring
              ctx.lineWidth = 1.0;
              ctx.stroke();
            }

            // Main Driver Badge Circle
            ctx.beginPath();
            ctx.arc(adjX, adjY, radius, 0, Math.PI * 2);
            if (isRetired) {
              ctx.fillStyle = '#A1A4AC';
              ctx.strokeStyle = '#D43811';
            } else if (isPitting) {
              ctx.fillStyle = '#C8A97E';
              ctx.strokeStyle = '#111215';
            } else {
              ctx.fillStyle = driver.teamColor || '#111215';
              ctx.strokeStyle = isTracked ? '#111215' : '#FFFFFF';
            }
            ctx.fill();
            ctx.lineWidth = isTracked ? 2.2 : 1.4;
            ctx.stroke();

            // Driver Code Label (VER, NOR, HAM...)
            ctx.font = `bold ${isTracked ? 9.5 : 8}px sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isRetired ? 'DNF' : driver.code, adjX, adjY);

            // Position Pill (Top-Right of Badge)
            if (!isRetired && idx < 10) {
              const pillX = adjX + radius - 2;
              const pillY = adjY - radius + 2;
              ctx.beginPath();
              ctx.arc(pillX, pillY, 4.8, 0, Math.PI * 2);
              ctx.fillStyle = idx === 0 ? '#DFD9CC' : '#111215';
              ctx.fill();
              ctx.strokeStyle = '#FAF9F6';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.font = 'bold 6.5px monospace';
              ctx.fillStyle = idx === 0 ? '#111215' : '#FAF9F6';
              ctx.fillText(`${idx + 1}`, pillX, pillY);
            }

            // Pack Clustering Count Pill (e.g. "+3" attached to leader)
            if (clusterCount > 0) {
              const countPillX = adjX + radius + 1;
              const countPillY = adjY + radius - 1;
              const pillW = 16;
              const pillH = 11;

              ctx.beginPath();
              ctx.roundRect(countPillX - 2, countPillY - pillH / 2, pillW, pillH, 5);
              ctx.fillStyle = '#DFD9CC'; // Champagne Quartz
              ctx.fill();
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.font = 'bold 7px sans-serif';
              ctx.fillStyle = '#111215';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`+${clusterCount}`, countPillX + pillW / 2 - 2, countPillY);
            }
          }
        );
      } catch (err) {
        console.error('FIA 2D Broadcast Radar render cycle error:', err);
      } finally {
        ctx.restore();
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [bundle, projection, containerSize]);

  // Click on radar to track driver
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const w = containerSize.width;
    const h = containerSize.height;

    const scaleX = (w - 60) / projection.width;
    const scaleZ = (h - 60) / projection.height;
    const scale = Math.min(scaleX, scaleZ);
    const offsetX = (w - projection.width * scale) / 2 - projection.minX * scale;
    const offsetZ = (h - projection.height * scale) / 2 - projection.minZ * scale;

    const L = bundle.trackLengthMeters || 5793;

    for (const driver of gridDrivers) {
      const rawU = (((driver.s % L) + L) % L) / L;
      const u = isNaN(rawU) ? 0.0 : Math.max(0.0, Math.min(0.999999, rawU));
      const pt = bundle.trackSpline.getPointAt(u) || new THREE.Vector3(0, 0, 0);
      const tangent = (bundle.trackSpline.getTangentAt(u) || new THREE.Vector3(1, 0, 0)).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const worldPos = pt.clone().addScaledVector(normal, driver.w || 0);

      const sx = worldPos.x * scale + offsetX;
      const sz = worldPos.z * scale + offsetZ;

      if (Math.hypot(clickX - sx, clickY - sz) < 20) {
        setActiveDriverCode(driver.code);
        break;
      }
    }
  };

﻿  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#FAF9F6] text-[#111215] overflow-hidden select-none font-sans ${className}`}
    >
      {/* ==================================================================== */}
      {/* 1. TOP TACTICAL BROADCAST HEADER                                     */}
      {/* ==================================================================== */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-[#F2F0EB]/92 backdrop-blur-2xl border-b border-[#E5E2DA] z-30">
        {/* Left: Circuit & Round Meta */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D43811] animate-pulse" />
          <div className="flex flex-col">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#111215]">
              FIA 2D TACTICAL BROADCAST RADAR · {bundle.circuit.name.toUpperCase()}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-sans text-[#5C6068]">
              <span>Round {bundle.circuit.round || 21}</span>
              <span>·</span>
              <span>{bundle.circuit.officialLengthMeters}m</span>
              <span>·</span>
              <span>{bundle.circuit.turnsCount} Corners</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#E5E2DA] border border-[#DFDBCF] text-[10px] font-numeric font-bold text-[#111215] ml-2">
            LAP {currentLap} / {totalLaps || bundle.circuit.raceLaps}
          </span>
        </div>

        {/* Center: Safety Car or Live Status */}
        <div className="flex items-center gap-3">
          {isSafetyCarActive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFD9CC] border border-[#C8BFAC] text-xs font-sans font-bold text-[#111215] animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-[#D43811]" />
              SAFETY CAR DEPLOYED
            </span>
          )}
          {isVscActive && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5E2DA] border border-[#DFDBCF] text-xs font-sans font-bold text-[#111215]">
              VIRTUAL SAFETY CAR
            </span>
          )}
          {!isSafetyCarActive && !isVscActive && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAE7DF] text-[10px] font-sans font-medium text-[#5C6068]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E5339]" />
              LIVE TELEMETRY · 60 FPS
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Telemetry Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsTelemetryDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              isTelemetryDrawerOpen
                ? 'bg-[#111215] text-[#FAF9F6]'
                : 'bg-white/80 border border-[#E5E2DA] text-[#5C6068] hover:text-[#111215]'
            }`}
            title="Toggle Live Driver Telemetry Drawer"
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">TELEMETRY</span>
          </button>

          {/* Reset / Restart Simulation Button */}
          <button
            type="button"
            onClick={resetSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white border border-[#E5E2DA] text-xs font-sans font-medium text-[#5C6068] hover:text-[#111215] transition-all cursor-pointer"
            title="Restart Simulation to Lap 1"
          >
            <RotateCcw className="w-3 h-3 text-[#D43811]" />
            <span className="hidden md:inline">RESTART</span>
          </button>

          {/* Return to 3D Arena */}
          {onToggle3D && (
            <button
              type="button"
              onClick={onToggle3D}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#111215] hover:bg-[#2A2C32] text-xs font-sans font-bold text-[#FAF9F6] shadow-sm transition-all cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-[#DFD9CC]" />
              <span>3D ARENA</span>
            </button>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. MAIN 2D BROADCAST BODY                                            */}
      {/* ==================================================================== */}
      <div className="relative flex-1 flex w-full min-h-0 overflow-hidden">
        {/* ================================================================== */}
        {/* LEFT COLUMN: SWISS LIGHT-LUXURY TIMING TOWER                       */}
        {/* ================================================================== */}
        <aside className="w-64 sm:w-72 lg:w-80 bg-[#F2F0EB]/95 backdrop-blur-2xl border-r border-[#E5E2DA] flex flex-col min-h-0 z-20 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-[#E5E2DA] bg-[#ECEAE4]/60 flex items-center justify-between text-[11px] font-sans font-bold tracking-[0.14em] text-[#5C6068] uppercase">
            <span>POS · DRIVER ({gridDrivers.length})</span>
            <span>GAP · TYRE · VIS</span>
          </div>

          {/* Scrollable Leaderboard Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E2DA]/60 scrollbar-thin">
            {gridDrivers.map((driver, index) => {
              const isSelected = driver.code === activeDriverCode;
              const isDNF = driver.isRetired || driver.status === 'DNF';
              const isGhosted = hiddenDriverCodes.includes(driver.code) && !isSelected;

              return (
                <div
                  key={driver.code}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-all text-left group ${
                    isSelected
                      ? 'bg-white shadow-ceramic-sm border-l-2 border-[#D43811]'
                      : 'hover:bg-white/60'
                  } ${isGhosted ? 'opacity-40' : 'opacity-100'}`}
                >
                  {/* Driver click target */}
                  <div
                    onClick={() => setActiveDriverCode(driver.code)}
                    className="flex-1 flex items-center gap-2.5 cursor-pointer min-w-0"
                  >
                    {/* Position Badge */}
                    <span
                      className={`font-numeric text-xs font-bold w-4.5 text-center shrink-0 ${
                        index === 0
                          ? 'text-[#111215] font-black'
                          : index < 3
                          ? 'text-[#111215]'
                          : 'text-[#8C8F98]'
                      }`}
                    >
                      {isDNF ? '—' : index + 1}
                    </span>

                    {/* Team Color Pill */}
                    <span
                      className="w-1.5 h-4.5 rounded-full shrink-0"
                      style={{ backgroundColor: driver.teamColor || '#111215' }}
                    />

                    {/* Name & Code */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-sans truncate ${
                            isSelected
                              ? 'text-[#111215] font-extrabold'
                              : 'text-[#111215] font-semibold'
                          }`}
                        >
                          {driver.code} · {driver.name.split(' ').pop()}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#D43811]/10 text-[#D43811] text-[8px] font-sans font-bold tracking-wider">
                            TRACK
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-sans text-[#5C6068] truncate">
                        #{driver.number} · {driver.team}
                      </span>
                    </div>
                  </div>

                  {/* Interval, Tyre & Eye Toggle */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex flex-col items-end">
                      {isDNF ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#D43811]/10 text-[#D43811] font-numeric text-[10px] font-bold">
                          DNF
                        </span>
                      ) : (
                        <>
                          <span className="font-numeric text-xs font-semibold text-[#111215] tabular-nums">
                            {driver.intervalSec}
                          </span>
                          <span
                            className={`text-[9px] font-sans font-bold uppercase ${
                              driver.compound === 'S'
                                ? 'text-[#D43811]'
                                : driver.compound === 'M'
                                ? 'text-[#A47116]'
                                : driver.compound === 'H'
                                ? 'text-[#111215]'
                                : driver.compound === 'I'
                                ? 'text-[#2E5339]'
                                : 'text-[#4A6B82]'
                            }`}
                          >
                            {driver.compound || 'M'} · C3
                          </span>
                        </>
                      )}
                    </div>

                    {/* Ghost Mode Eye Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDriverVisibility(driver.code);
                      }}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        isGhosted
                          ? 'text-[#8C8F98] bg-[#E5E2DA]'
                          : 'text-[#5C6068] hover:text-[#111215] hover:bg-white'
                      }`}
                      title={
                        isSelected
                          ? 'Active tracked driver is locked to 100% visibility'
                          : isGhosted
                          ? 'Click to restore radar visibility'
                          : 'Make driver transparent (ghost mode on radar)'
                      }
                    >
                      {isGhosted ? (
                        <EyeOff className="w-3.5 h-3.5 text-[#8C8F98]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#5C6068] hover:text-[#111215]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ================================================================== */}
        {/* CENTER: HIGH-DPI VECTOR CANVAS & PLAYBACK DOCK                     */}
        {/* ================================================================== */}
        <main
          ref={containerRef}
          className="relative flex-1 h-full min-h-0 bg-[#FAF9F6] overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Floating Circuit Badge (Bottom-Left) */}
          <div className="hidden md:flex absolute bottom-6 left-6 bg-[#FAF9F6]/85 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-[#E5E2DA] shadow-ceramic-sm text-[10px] font-sans text-[#5C6068] items-center gap-3 pointer-events-none">
            <span className="font-bold text-[#111215]">{bundle.circuit.name}</span>
            <span>·</span>
            <span>{bundle.circuit.officialLengthMeters}m</span>
            <span>·</span>
            <span>{bundle.circuit.drsZones} DRS ZONES</span>
            <span>·</span>
            <span className="text-[#D43811] font-semibold">CLICK CAR TO TRACK</span>
          </div>

          {/* ================================================================ */}
          {/* BOTTOM FLOATING BROADCAST TRANSPORT DOCK                         */}
          {/* ================================================================ */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3 sm:gap-4 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#FAF9F6]/90 backdrop-blur-2xl border border-[#E5E2DA] shadow-ceramic-md">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#111215] hover:bg-[#2A2C32] text-[#FAF9F6] shadow-sm transition-all cursor-pointer"
              title={isPlaying ? 'Pause Simulation [Space]' : 'Play Simulation [Space]'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-[#FAF9F6]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-[#FAF9F6] ml-0.5" />
              )}
            </button>

            {/* Playback Speeds */}
            <div className="flex items-center gap-1 bg-[#EAE7DF] p-0.5 rounded-full border border-[#E5E2DA]">
              {[1.0, 2.0, 5.0, 10.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s as PlaybackSpeed)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-numeric font-bold transition-all cursor-pointer ${
                    playbackSpeed === s
                      ? 'bg-[#111215] text-[#FAF9F6] shadow-sm'
                      : 'text-[#5C6068] hover:text-[#111215]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Race Clock Readout */}
            <span className="font-numeric text-xs font-semibold text-[#111215] tabular-nums min-w-[70px]">
              {formatRaceClock(playbackTimeSec)}
            </span>

            {/* Timeline Scrubber */}
            <div className="w-28 sm:w-44 md:w-56 flex items-center">
              <input
                type="range"
                min={0}
                max={totalDurationSec || 5400}
                step={0.1}
                value={playbackTimeSec}
                onChange={(e) => scrubToTime(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#E5E2DA] rounded-lg appearance-none cursor-pointer accent-[#111215]"
              />
            </div>

            {/* Lap Skip Stepper */}
            <div className="flex items-center gap-1 text-[10px] font-numeric">
              <button
                type="button"
                onClick={() => scrubToLap(currentLap - 1)}
                disabled={currentLap <= 1}
                className="px-2 py-0.5 rounded-full bg-white text-[#5C6068] border border-[#E5E2DA] hover:text-[#111215] disabled:opacity-30 cursor-pointer"
                title="Previous Lap"
              >
                -1L
              </button>
              <span className="text-[#111215] font-bold px-1 tabular-nums">
                L{currentLap}
              </span>
              <button
                type="button"
                onClick={() => scrubToLap(currentLap + 1)}
                disabled={currentLap >= (totalLaps || bundle.circuit.raceLaps)}
                className="px-2 py-0.5 rounded-full bg-white text-[#5C6068] border border-[#E5E2DA] hover:text-[#111215] disabled:opacity-30 cursor-pointer"
                title="Next Lap"
              >
                +1L
              </button>
            </div>
          </div>
        </main>

﻿        {/* ================================================================== */}
        {/* RIGHT COLUMN: COLLAPSIBLE HOROLOGICAL TELEMETRY DRAWER             */}
        {/* ================================================================== */}
        {isTelemetryDrawerOpen && activeDriver && (
          <aside className="w-72 sm:w-80 bg-[#F2F0EB]/95 backdrop-blur-2xl border-l border-[#E5E2DA] flex flex-col p-5 gap-4 z-20 overflow-y-auto">
            {/* Header: Tracked Driver Spotlight */}
            <div className="flex items-center justify-between border-b border-[#E5E2DA] pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full animate-pulse"
                  style={{ backgroundColor: activeDriver.teamColor }}
                />
                <div className="flex flex-col">
                  <span className="font-sans font-extrabold text-base tracking-tight text-[#111215]">
                    {activeDriver.name.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-sans text-[#5C6068]">
                    {activeDriver.team}
                  </span>
                </div>
              </div>
              <span className="font-numeric text-sm font-black text-[#111215] px-2 py-0.5 rounded-full bg-[#E5E2DA]">
                #{activeDriver.number}
              </span>
            </div>

            {/* Velocity Chronometer Readout */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E2DA] shadow-ceramic-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#5C6068] mb-0.5">
                  Velocity
                </span>
                <span className="text-3xl font-numeric font-black text-[#111215] tabular-nums">
                  {Math.round(activeDriver.speedKmh)}
                  <span className="text-xs font-normal text-[#8C8F98] ml-1">KM/H</span>
                </span>
              </div>
              {/* Circular Velocity Gauge Arc */}
              <svg className="w-12 h-12" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="#E5E2DA" strokeWidth="3" fill="none" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#111215"
                  strokeWidth="3.2"
                  strokeDasharray="125"
                  strokeDashoffset={125 - Math.min(125, (activeDriver.speedKmh / 355) * 125)}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* Powertrain Grid: Gear, RPM, Throttle, Brake */}
            <div className="grid grid-cols-2 gap-3">
              {/* Gear & RPM */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E2DA]">
                <span className="block text-[10px] font-sans font-bold text-[#5C6068] uppercase mb-1">
                  Gear · RPM
                </span>
                <span className="text-xl font-numeric font-extrabold text-[#111215]">
                  G{activeDriver.gear}
                </span>
                <span className="block text-[10px] font-numeric text-[#5C6068] mt-0.5 tabular-nums">
                  {activeDriver.rpm} RPM
                </span>
              </div>

              {/* DRS Wing State */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E2DA]">
                <span className="block text-[10px] font-sans font-bold text-[#5C6068] uppercase mb-1">
                  DRS Status
                </span>
                <span
                  className={`text-xs font-sans font-bold px-2 py-0.5 rounded-full inline-block ${
                    activeDriver.drsActive
                      ? 'bg-[#D43811]/10 text-[#D43811]'
                      : 'bg-[#E5E2DA] text-[#5C6068]'
                  }`}
                >
                  {activeDriver.drsActive ? 'OPEN · ACTIVE' : 'CLOSED'}
                </span>
              </div>
            </div>

            {/* Dual Pedal Gauges: Throttle & Brake */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E5E2DA] flex flex-col gap-2.5">
              <span className="block text-[10px] font-sans font-bold text-[#5C6068] uppercase">
                Pedal Inputs
              </span>
              <div>
                <div className="flex justify-between text-[10px] font-sans text-[#5C6068] mb-1">
                  <span>Throttle</span>
                  <span className="font-numeric font-bold text-[#2E5339]">
                    {Math.round((activeDriver.throttle ?? (activeDriver.speedKmh > 100 ? 0.95 : 0.4)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#EAE7DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2E5339] rounded-full transition-all duration-100"
                    style={{
                      width: `${(activeDriver.throttle ?? (activeDriver.speedKmh > 100 ? 0.95 : 0.4)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-sans text-[#5C6068] mb-1">
                  <span>Brake</span>
                  <span className="font-numeric font-bold text-[#D43811]">
                    {Math.round((activeDriver.brake ?? (activeDriver.speedKmh < 120 ? 0.8 : 0)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#EAE7DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D43811] rounded-full transition-all duration-100"
                    style={{
                      width: `${(activeDriver.brake ?? (activeDriver.speedKmh < 120 ? 0.8 : 0)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Frenet-Serret Kinematics */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E5E2DA] flex flex-col gap-2 text-[11px] font-sans">
              <div className="flex items-center gap-2 text-xs font-bold text-[#111215] mb-1">
                <Radio className="w-3.5 h-3.5 text-[#D43811]" />
                <span>FRENET-SERRET KINEMATICS</span>
              </div>
              <div className="flex justify-between text-[#5C6068]">
                <span>Distance along spline (s):</span>
                <span className="font-numeric font-bold text-[#111215] tabular-nums">
                  {Math.round(activeDriver.s)}m
                </span>
              </div>
              <div className="flex justify-between text-[#5C6068]">
                <span>Lateral offset (w):</span>
                <span className="font-numeric font-bold text-[#111215] tabular-nums">
                  {activeDriver.w.toFixed(2)}m
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
