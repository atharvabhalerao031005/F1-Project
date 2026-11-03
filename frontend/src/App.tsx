import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Radio,
  Sliders,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { CockpitMode } from './types/telemetry';

export const App: React.FC = () => {
  const [cockpitMode, setCockpitMode] = useState<CockpitMode>('TELEMETRY_LAB');
  const [activeSession, setActiveSession] = useState('2024_monza_q3_ver_nor');

  return (
    <div className="cockpit-shell font-telemetry select-none">
      {/* ================================================================== */}
      {/* ZONE 0: MISSION HEADER RIBBON                                      */}
      {/* ================================================================== */}
      <header className="col-span-3 h-[var(--hud-zone0-h)] bg-[var(--hud-bg-panel)] border-b border-[var(--hud-border-color)] px-3 flex items-center justify-between text-xs tracking-wider z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-widest text-[var(--hud-cyan)]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[var(--hud-cyan)]" />
            <span>AERO-SPEC</span>
            <span className="text-[var(--hud-text-muted)] font-normal text-[10px]">v5.0</span>
          </div>

          <div className="h-3 w-[1px] bg-[var(--hud-border-color)]" />

          {/* Session Preset Selector */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[var(--hud-text-muted)] text-[10px]">SESSION:</span>
            <select
              value={activeSession}
              onChange={(e) => setActiveSession(e.target.value)}
              className="bg-[var(--hud-bg-input)] text-[var(--hud-text-primary)] border border-[var(--hud-border-color)] px-2 py-0.5 text-[11px] focus:border-[var(--hud-cyan)] outline-none"
            >
              <option value="2024_monza_q3_ver_nor">2024 MONZA GP // Q3 VER vs NOR</option>
              <option value="2024_silverstone_q3_ver_nor">2024 SILVERSTONE GP // Q3 VER vs NOR</option>
              <option value="2024_monaco_q3_lec_pia">2024 MONACO GP // Q3 LEC vs PIA</option>
            </select>
          </div>
        </div>

        {/* Cockpit Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--hud-bg-surface)] p-0.5 border border-[var(--hud-border-color)]">
          <button
            onClick={() => setCockpitMode('TELEMETRY_LAB')}
            className={`px-2 py-0.5 text-[10px] font-bold tracking-wider flex items-center gap-1 transition-colors ${
              cockpitMode === 'TELEMETRY_LAB'
                ? 'bg-[var(--hud-cyan)] text-[var(--hud-bg-void)]'
                : 'text-[var(--hud-text-secondary)] hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            [1] 60 FPS TELEMETRY LAB
          </button>
          <button
            onClick={() => setCockpitMode('ML_STRATEGY_ORACLE')}
            className={`px-2 py-0.5 text-[10px] font-bold tracking-wider flex items-center gap-1 transition-colors ${
              cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'bg-[var(--hud-amber)] text-[var(--hud-bg-void)]'
                : 'text-[var(--hud-text-secondary)] hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3" />
            [2] ML STRATEGY ORACLE
          </button>
        </div>

        {/* Telemetry Status Readout */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1 text-[var(--hud-green)]">
            <span className="w-1.5 h-1.5 bg-[var(--hud-green)] animate-ping" />
            <span>STREAM: 60.0 HZ</span>
          </div>
          <div className="text-[var(--hud-text-muted)]">
            FRAME: <span className="text-[var(--hud-text-primary)]">0.00ms</span>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* ZONE 1: FLANK LEFT - DRIVER TIMING TOWER                           */}
      {/* ================================================================== */}
      <aside className="hud-quadrant bg-[var(--hud-bg-panel)] border-r border-[var(--hud-border-color)] flex flex-col overflow-hidden">
        <div className="hud-subpanel-header flex items-center justify-between p-2 border-b border-[var(--hud-border-color)] bg-[var(--hud-bg-surface)]">
          <span className="font-bold text-[10px] text-[var(--hud-text-secondary)] tracking-wider">
            QUALIFYING TIMING TOWER
          </span>
          <span className="text-[9px] text-[var(--hud-text-muted)]">20 DRIVERS</span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto text-[var(--hud-text-muted)] text-[11px] flex flex-col items-center justify-center text-center">
          <Layers className="w-6 h-6 mb-2 text-[var(--hud-text-muted)]" />
          <span>PHASE 3 TIMING TOWER MOUNT</span>
          <span className="text-[9px] text-[var(--hud-cyan)] mt-1">GRID: MONZA 5,793M READY</span>
        </div>
      </aside>

      {/* ================================================================== */}
      {/* ZONE 2: CENTER VIEWPORT - 3D KINETIC CIRCUIT                       */}
      {/* ================================================================== */}
      <main className="hud-quadrant relative bg-[var(--hud-bg-void)] flex flex-col overflow-hidden">
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 text-[10px] text-[var(--hud-text-muted)] bg-[var(--hud-bg-surface)]/80 px-2 py-1 border border-[var(--hud-border-color)]">
          <Zap className="w-3 h-3 text-[var(--hud-cyan)]" />
          <span>3D KINETIC CIRCUIT VIEWPORT [R3F / WEBGL]</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--hud-text-muted)] text-center p-4">
          <div className="w-16 h-16 border border-dashed border-[var(--hud-border-color)] flex items-center justify-center mb-3">
            <Radio className="w-8 h-8 text-[var(--hud-cyan)] opacity-60" />
          </div>
          <div className="text-[12px] font-bold text-[var(--hud-text-primary)] tracking-widest mb-1">
            CANVAS 3D PIPELINE INITIALIZED
          </div>
          <div className="text-[10px] text-[var(--hud-text-muted)] max-w-sm">
            Three.js / React Three Fiber scene ready for track spline extrusion, dynamic apex markers, and dual-ghost chase cameras.
          </div>
        </div>
      </main>

      {/* ================================================================== */}
      {/* ZONE 3: FLANK RIGHT - REAL-TIME HUD & ML SANDBOX                   */}
      {/* ================================================================== */}
      <aside className="hud-quadrant bg-[var(--hud-bg-panel)] border-l border-[var(--hud-border-color)] flex flex-col overflow-hidden">
        <div className="hud-subpanel-header flex items-center justify-between p-2 border-b border-[var(--hud-border-color)] bg-[var(--hud-bg-surface)]">
          <span className="font-bold text-[10px] text-[var(--hud-text-secondary)] tracking-wider">
            {cockpitMode === 'TELEMETRY_LAB' ? 'TELEMETRY INSTRUMENTATION' : 'ML PHYSICS WARP SANDBOX'}
          </span>
          <Sliders className="w-3.5 h-3.5 text-[var(--hud-text-muted)]" />
        </div>
        <div className="flex-1 p-3 overflow-y-auto text-[var(--hud-text-muted)] text-[11px] flex flex-col items-center justify-center text-center">
          <Cpu className="w-6 h-6 mb-2 text-[var(--hud-text-muted)]" />
          <span>PHASE 4 INSTRUMENTATION MOUNT</span>
          <span className="text-[9px] text-[var(--hud-amber)] mt-1">
            CLIENT ML SIMULATOR: READY (&lt;1.0ms)
          </span>
        </div>
      </aside>

      {/* ================================================================== */}
      {/* ZONE 4: BOTTOM - OSCILLOGRAPH CANVAS & SCRUBBER CONTROLLER         */}
      {/* ================================================================== */}
      <footer className="col-span-3 h-[var(--hud-quadrant4-h)] hud-quadrant bg-[var(--hud-bg-panel)] border-t border-[var(--hud-border-color)] flex flex-col">
        {/* Upper: Oscillograph Canvas Container */}
        <div className="flex-1 border-b border-[var(--hud-border-color)] flex items-center justify-center text-[10px] text-[var(--hud-text-muted)] relative bg-[var(--hud-bg-surface)]">
          <div className="absolute top-2 left-3 text-[9px] tracking-wider text-[var(--hud-text-secondary)]">
            DUAL-BUFFER 60 FPS OSCILLOGRAPH // SPEED • THROTTLE • BRAKE • DELTA-T
          </div>
          <div className="text-center">
            <span className="text-[var(--hud-cyan)] font-bold">OSCILLOGRAPH DUAL-CANVAS PIPELINE</span>
            <p className="text-[9px] text-[var(--hud-text-muted)] mt-0.5">
              5,794m Resampled Spatial Grid Buffers Loaded (Monza Q3)
            </p>
          </div>
        </div>

        {/* Lower: 34px Transport Controller */}
        <div className="h-[34px] px-3 flex items-center justify-between bg-[var(--hud-bg-void)] text-[11px]">
          <div className="flex items-center gap-2">
            <button className="hud-button flex items-center gap-1 px-2 py-0.5 text-[10px]">
              <Play className="w-3 h-3 text-[var(--hud-green)]" />
              PLAY
            </button>
            <button className="hud-button flex items-center gap-1 px-2 py-0.5 text-[10px]">
              <RotateCcw className="w-3 h-3 text-[var(--hud-text-secondary)]" />
              RESET
            </button>
          </div>
          <div className="text-[10px] text-[var(--hud-text-muted)]">
            HOTKEYS: <span className="text-[var(--hud-text-primary)]">[SPACE]</span> PLAY/PAUSE •{' '}
            <span className="text-[var(--hud-text-primary)]">[← / →]</span> SCRUB 50M •{' '}
            <span className="text-[var(--hud-text-primary)]">[1 / 2]</span> COCKPIT MODE
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
