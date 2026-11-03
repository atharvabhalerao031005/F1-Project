// frontend/src/components/header/MissionRibbon.tsx
/**
 * AERO-SPEC F1 // ZONE 0: MISSION HEADER RIBBON (36PX)
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.2
 *
 * ARCHITECTURAL CONTRACT:
 * - RAF Decoupled Readout: Reads useTelemetryStore.getState() imperatively at 60-120 Hz.
 * - Rolling FPS: Measures frame delta across 500ms intervals, writes directly to fpsRef.current.textContent.
 * - Direct-DOM Lap Clock: Formats currentDistance + lapT directly to clockRef.current.textContent.
 * - Zero React Re-Renders: Zero useState/setState calls in animation hot-path.
 * - Session Preset Switcher: Seamless switching between Monza, Silverstone, Monaco bundles.
 * - Dual-Engine Switcher: Electric Cyan (#00E5FF) Telemetry Lab vs Active Green (#00FF66) Strategy Oracle.
 * - Environmental Sensors: High-density aerospace telemetry badges for Track, Air, Wind, and FIA status.
 * - Global Hotkeys: Space (Play/Pause), Left/Right Arrows (Step 10m/50m), M / 1 / 2 (Mode Toggle).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Radio, Activity, Cpu, Wind, Thermometer, Gauge } from 'lucide-react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { formatDistanceM, formatLapClock } from '../../utils/formatters';
import type { CockpitMode, SessionTelemetryPayload } from '../../types/telemetry';

export const SESSION_PRESETS = [
  { id: '2024_monza_q3_ver_nor', label: '2024 MONZA GP // Q3 VER vs NOR' },
  { id: '2024_silverstone_q3_ver_nor', label: '2024 SILVERSTONE GP // Q3 VER vs NOR' },
  { id: '2024_monaco_q3_lec_pia', label: '2024 MONACO GP // Q3 LEC vs PIA' },
] as const;

/**
 * Calculates rolling FPS across an elapsed interval.
 * Clamped between 0.0 and maxFps (default: 120.0 FPS).
 */
export function computeRollingFps(
  frames: number,
  elapsedMs: number,
  maxFps: number = 120.0
): number {
  if (elapsedMs <= 0) return 0;
  const rawFps = (frames * 1000) / elapsedMs;
  return Math.min(maxFps, Math.max(0, rawFps));
}

/**
 * Formats direct-DOM distance and lap clock readout string: '0000m // 0:00.000'.
 * Invariant contract: Exactly 17 characters for sub-10-minute laps.
 */
export function formatClockReadout(
  distanceM: number,
  sessionPayload: SessionTelemetryPayload | null
): string {
  const safeDist = Math.max(0, distanceM);
  if (!sessionPayload || !sessionPayload.driverA?.t) {
    return `${formatDistanceM(safeDist)} // 0:00.000`;
  }
  const idx = Math.min(Math.floor(safeDist), sessionPayload.gridLength);
  const lapT = sessionPayload.driverA.t[idx] ?? 0;
  return `${formatDistanceM(safeDist)} // ${formatLapClock(lapT)}`;
}

/**
 * Dispatches hotkey actions to the zustand telemetry store.
 * Ignores keystrokes if the user is focused inside an input, textarea, or select element.
 */
export function handleMissionRibbonHotkey(
  e: KeyboardEvent,
  store: {
    togglePlay: () => void;
    stepDistance: (delta: number) => void;
    setDistance: (dist: number) => void;
    setCockpitMode: (mode: CockpitMode) => void;
    cockpitMode: CockpitMode;
  }
): boolean {
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
      return false;
    }
  }

  if (e.code === 'Space') {
    e.preventDefault();
    store.togglePlay();
    return true;
  }

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    const step = e.shiftKey ? -50 : -10;
    store.stepDistance(step);
    return true;
  }

  if (e.code === 'ArrowRight') {
    e.preventDefault();
    const step = e.shiftKey ? 50 : 10;
    store.stepDistance(step);
    return true;
  }

  if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
    e.preventDefault();
    const nextMode: CockpitMode =
      store.cockpitMode === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB';
    store.setCockpitMode(nextMode);
    return true;
  }

  if (e.code === 'Digit1' || e.key === '1') {
    e.preventDefault();
    store.setCockpitMode('TELEMETRY_LAB');
    return true;
  }

  if (e.code === 'Digit2' || e.key === '2') {
    e.preventDefault();
    store.setCockpitMode('ML_STRATEGY_ORACLE');
    return true;
  }

  if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    store.setDistance(0);
    return true;
  }

  return false;
}

export interface MissionRibbonProps {
  /** Optional override for active cockpit mode (defaults to useTelemetryStore) */
  cockpitMode?: CockpitMode;
  /** Optional override for active session payload (defaults to useTelemetryStore) */
  sessionPayload?: SessionTelemetryPayload | null;
  /** Optional override for loading state (defaults to useTelemetryStore) */
  isLoading?: boolean;
}

export const MissionRibbon: React.FC<MissionRibbonProps> = (props) => {
  // Fine-grained selective subscriptions for zero-VDOM churn
  const storePayload = useTelemetryStore((s) => s.sessionPayload);
  const storeCockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const setCockpitMode = useTelemetryStore((s) => s.setCockpitMode);
  const loadSession = useTelemetryStore((s) => s.loadSession);
  const storeIsLoading = useTelemetryStore((s) => s.isLoading);

  const payload = props.sessionPayload !== undefined ? props.sessionPayload : storePayload;
  const cockpitMode = props.cockpitMode !== undefined ? props.cockpitMode : storeCockpitMode;
  const isLoading = props.isLoading !== undefined ? props.isLoading : storeIsLoading;

  // High-frequency imperative DOM references
  const clockRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  // 1. Decoupled 60/120 FPS RAF Loop
  useEffect(() => {
    let rafId: number;
    let frames = 0;
    let lastFpsUpdate = performance.now();

    const tick = (now: number) => {
      frames++;
      const elapsed = now - lastFpsUpdate;

      // Update rolling FPS every 500ms without triggering React re-renders
      if (elapsed >= 500) {
        const fps = computeRollingFps(frames, elapsed, 120.0);
        if (fpsRef.current) {
          fpsRef.current.textContent = `${fps.toFixed(1)} FPS`;
        }
        frames = 0;
        lastFpsUpdate = now;
      }

      // Update distance and lap clock readout from store state imperatively
      const { currentDistance, sessionPayload } = useTelemetryStore.getState();
      if (clockRef.current) {
        clockRef.current.textContent = formatClockReadout(currentDistance, sessionPayload);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 2. Global Hotkey Controller
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useTelemetryStore.getState();
      handleMissionRibbonHotkey(e, {
        togglePlay: state.togglePlay,
        stepDistance: state.stepDistance,
        setDistance: state.setDistance,
        setCockpitMode: state.setCockpitMode,
        cockpitMode: state.cockpitMode,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const meta = payload?.meta;
  const weather = meta?.weather;

  const handleSessionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      loadSession(e.target.value);
    },
    [loadSession]
  );

  return (
    <header
      data-testid="mission-ribbon"
      className="col-span-3 h-[var(--hud-zone0-h)] bg-[var(--hud-bg-surface)] border-b border-[var(--hud-border-color)] px-3 flex items-center justify-between text-xs select-none z-20 font-telemetry"
      style={{ height: '36px' }}
    >
      {/* ================================================================== */}
      {/* 1. LEFT CLUSTER: SYSTEM IDENTITY, SESSION SELECTOR & ENGINE TOGGLE */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2.5">
        {/* System Identifier */}
        <div className="flex items-center gap-1.5 font-extrabold text-[var(--hud-cyan)] tracking-wider">
          <Radio className="w-3 h-3 text-[var(--hud-cyan)] animate-pulse" />
          <span className="w-1.5 h-1.5 bg-[var(--hud-green)] inline-block animate-pulse" />
          <span className="tracking-widest">AERO-SPEC</span>
          <span className="text-[var(--hud-text-muted)] font-normal text-[10px]">v5.0</span>
        </div>

        <div className="h-3.5 w-[1px] bg-[var(--hud-border-color)]" />

        {/* Session Preset Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[var(--hud-text-muted)] text-[9px] uppercase tracking-wider hidden sm:inline">
            SESSION:
          </span>
          <select
            data-testid="session-selector"
            value={payload?.sessionId || '2024_monza_q3_ver_nor'}
            onChange={handleSessionChange}
            aria-label="F1 Telemetry Session Selector"
            className="bg-[var(--hud-bg-input)] border border-[var(--hud-border-color)] text-[var(--hud-text-primary)] font-telemetry text-[10px] px-2 py-0.5 uppercase tracking-wider focus:border-[var(--hud-cyan)] outline-none cursor-pointer transition-colors"
          >
            {SESSION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-3.5 w-[1px] bg-[var(--hud-border-color)]" />

        {/* Dual-Engine Cockpit Mode Switcher */}
        <div
          data-testid="cockpit-mode-toggle"
          className="flex items-center border border-[var(--hud-border-color)] bg-[var(--hud-bg-void)] p-0.5"
        >
          {/* Mode 1: 60 FPS Telemetry Lab (Electric Cyan #00E5FF) */}
          <button
            type="button"
            data-testid="mode-btn-telemetry"
            onClick={() => setCockpitMode('TELEMETRY_LAB')}
            aria-pressed={cockpitMode === 'TELEMETRY_LAB'}
            className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all duration-150 ${
              cockpitMode === 'TELEMETRY_LAB'
                ? 'bg-[#00E5FF] text-[#05070B] shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                : 'text-[var(--hud-text-muted)] hover:text-[var(--hud-text-primary)] hover:bg-[var(--hud-bg-hover)]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>[1] 60 FPS TELEMETRY LAB</span>
          </button>

          {/* Mode 2: ML Strategy & Monte Carlo Oracle (Active Green #00FF66) */}
          <button
            type="button"
            data-testid="mode-btn-oracle"
            onClick={() => setCockpitMode('ML_STRATEGY_ORACLE')}
            aria-pressed={cockpitMode === 'ML_STRATEGY_ORACLE'}
            className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all duration-150 ${
              cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'bg-[#00FF66] text-[#05070B] shadow-[0_0_8px_rgba(0,255,102,0.4)]'
                : 'text-[var(--hud-text-muted)] hover:text-[var(--hud-text-primary)] hover:bg-[var(--hud-bg-hover)]'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>[2] ML STRATEGY &amp; MONTE CARLO ORACLE</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. CENTER CLUSTER: ENVIRONMENTAL SENSOR AEROSPACE BADGES           */}
      {/* ================================================================== */}
      <div
        data-testid="environmental-sensors"
        className="hidden lg:flex items-center gap-1.5 text-[10px]"
      >
        {/* Track Temperature Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-border-color)]">
          <Thermometer className="w-3 h-3 text-[var(--hud-amber)]" />
          <span className="text-[var(--hud-text-muted)] text-[9px] uppercase">TRACK</span>
          <strong className="text-[var(--hud-text-primary)] tabular-nums font-bold">
            {weather ? `${weather.trackTempC.toFixed(1)}°C` : '42.4°C'}
          </strong>
        </div>

        {/* Air Temperature Badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-border-color)]">
          <Gauge className="w-3 h-3 text-[var(--hud-cyan)]" />
          <span className="text-[var(--hud-text-muted)] text-[9px] uppercase">AIR</span>
          <strong className="text-[var(--hud-text-primary)] tabular-nums font-bold">
            {weather ? `${weather.airTempC.toFixed(1)}°C` : '28.6°C'}
          </strong>
        </div>

        {/* Wind Speed & Direction Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-border-color)]">
          <Wind className="w-3 h-3 text-[var(--hud-text-secondary)]" />
          <span className="text-[var(--hud-text-muted)] text-[9px] uppercase">WIND</span>
          <strong className="text-[var(--hud-text-primary)] tabular-nums font-bold">
            {weather ? `${weather.windSpeedMs.toFixed(1)} M/S` : '1.8 M/S'}
          </strong>
          <span className="text-[var(--hud-cyan)] font-extrabold text-[9px] bg-[var(--hud-bg-surface)] px-1 border border-[var(--hud-border-color)]">
            {weather?.windDirection ?? 'SSE'}
          </span>
        </div>

        {/* Track Status Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-border-color)]">
          <span
            className={`w-1.5 h-1.5 ${
              weather?.trackStatus === 'GREEN' || !weather
                ? 'bg-[var(--hud-green)] animate-pulse'
                : weather?.trackStatus === 'RED'
                ? 'bg-[var(--hud-red)] animate-ping'
                : 'bg-[var(--hud-amber)] animate-pulse'
            }`}
          />
          <span className="text-[var(--hud-text-muted)] text-[9px] uppercase">FIA</span>
          <strong
            className={`font-bold ${
              weather?.trackStatus === 'GREEN' || !weather
                ? 'text-[var(--hud-green)]'
                : weather?.trackStatus === 'RED'
                ? 'text-[var(--hud-red)]'
                : 'text-[var(--hud-amber)]'
            }`}
          >
            {weather?.trackStatus ?? 'GREEN'}
          </strong>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. RIGHT CLUSTER: STREAM STATUS, DIRECT-DOM CLOCK & ROLLING FPS    */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2 text-[10px]">
        {/* Loading Indicator Pill */}
        {isLoading && (
          <span
            data-testid="loading-indicator"
            className="px-1.5 py-0.5 text-[9px] bg-[var(--hud-cyan)]/10 border border-[var(--hud-cyan)] text-[var(--hud-cyan)] animate-pulse font-bold"
          >
            SYNCING TELEMETRY...
          </span>
        )}

        {/* Telemetry Stream Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-border-color)] text-[var(--hud-green)] font-bold">
          <span className="w-1.5 h-1.5 bg-[var(--hud-green)] animate-ping" />
          <span className="text-[9px] tracking-wider">STREAM: 60.0 HZ</span>
        </div>

        {/* Direct-DOM Distance & Lap Clock Readout */}
        <span
          ref={clockRef}
          data-testid="direct-dom-clock"
          className="text-[var(--hud-text-primary)] font-bold min-w-[135px] text-right tracking-wider tabular-nums"
        >
          0000m // 0:00.000
        </span>

        {/* Decoupled Rolling FPS Monitor */}
        <span
          ref={fpsRef}
          data-testid="rolling-fps-badge"
          className="px-2 py-0.5 bg-[var(--hud-bg-panel)] border border-[var(--hud-cyan)]/60 text-[var(--hud-cyan)] font-extrabold min-w-[64px] text-center tracking-wider tabular-nums shadow-[0_0_6px_rgba(0,229,255,0.2)]"
        >
          60.0 FPS
        </span>
      </div>
    </header>
  );
};
