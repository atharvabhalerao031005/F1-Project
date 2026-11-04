// frontend/src/App.tsx
/**
 * AERO-SPEC F1 // MASTER TELEMETRY & ML STRATEGY COCKPIT
 * Standard: AERO-SPEC-ML-AG-CONTRACT-v5.0
 * Layout: 6-Zone Precision CSS Grid
 *
 * GRID ARCHITECTURE:
 * - Columns: [315px_1fr_360px] (Timing Tower, Center Viewport, Right HUD/ML Sandbox)
 * - Rows: [36px_1fr_260px_28px] (Header Ribbon, Telemetry Core, Oscillograph, Transport Bar)
 *
 * INTEGRATED PHASE 3 MODULES:
 * - Zone 0: MissionRibbon (Header status, RAF clock, environmental telemetry, dual-engine toggle)
 * - Quadrant 1: TimingTower (Dual-mode 20-driver qualifying matrix & Monte Carlo oracle)
 * - Quadrant 2: CircuitViewport3D (Three.js 3D kinetic track spline, dynamic vertex shaders, dual-ghost chase cameras)
 */

import React, { useEffect } from 'react';
import { useTelemetryStore } from './store/useTelemetryStore';
import { MissionRibbon } from './components/header/MissionRibbon';
import { TimingTower } from './components/flankLeft/TimingTower';
import { CircuitViewport3D } from './components/viewport3d/CircuitViewport3D';
import { RightFlankPanel } from './components/flankRight/RightFlankPanel';
import { TelemetryOscillograph } from './components/scrubber/TelemetryOscillograph';
import { StrategyFanChart } from './components/scrubber/StrategyFanChart';
import { TransportBar } from './components/scrubber/TransportBar';
import { useGlobalKeyboardControls } from './hooks/useGlobalKeyboardControls';

export const App: React.FC = () => {
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);
  const loadSession = useTelemetryStore((s) => s.loadSession);

  // Mount global keyboard acceleration layer
  useGlobalKeyboardControls();

  useEffect(() => {
    loadSession('2024_monza_q3_ver_nor');
  }, [loadSession]);

  return (
    <div className="grid grid-cols-[315px_1fr_360px] grid-rows-[36px_1fr_260px_28px] h-screen w-screen bg-[#05070B] overflow-hidden select-none font-telemetry">
      {/* ================================================================== */}
      {/* ZONE 0: MISSION HEADER RIBBON (Row 1, 36px, Full Width)            */}
      {/* ================================================================== */}
      <MissionRibbon />

      {/* ================================================================== */}
      {/* QUADRANT 1: FLANK LEFT - DUAL-MODE TIMING TOWER (Row 2, Col 1)     */}
      {/* ================================================================== */}
      <TimingTower />

      {/* ================================================================== */}
      {/* QUADRANT 2: CENTER VIEWPORT - 3D KINETIC CIRCUIT (Row 2, Col 2)   */}
      {/* ================================================================== */}
      <CircuitViewport3D />

      {/* ================================================================== */}
      {/* QUADRANT 3: FLANK RIGHT - REAL-TIME HUD & ML SANDBOX (Row 2, Col 3)*/}
      {/* ================================================================== */}
      <RightFlankPanel />

      {/* ================================================================== */}
      {/* ZONE 4: BOTTOM - OSCILLOGRAPH CANVAS CONTAINER (Row 3, 260px)       */}
      {/* ================================================================== */}
      <section className="col-span-3 hud-quadrant bg-[var(--hud-bg-panel)] border-t border-[var(--hud-border-color)] flex flex-col overflow-hidden">
        <header className="quadrant-header flex items-center justify-between px-3 py-1 border-b border-[var(--hud-border-color)] bg-[var(--hud-bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block shadow-[0_0_6px_#00E5FF]" />
            <span className="font-bold text-[10px] text-[#E2E8F0] tracking-wider">
              {cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'Q4 // 53-LAP ML STINT DEGRADATION & MONTE CARLO CUMULATIVE RACE GAP FAN CHART (P10–P90)'
                : 'Q4 // 60 FPS MULTI-CHANNEL SYNCHRONIZED TELEMETRY OSCILLOGRAPH (1M SPATIAL GRID)'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-telemetry text-[9px]">
            {cockpitMode === 'ML_STRATEGY_ORACLE' ? (
              <>
                <span className="text-[#00E5FF]">■ DRIVER A STINT PACE</span>
                <span className="text-[#B000FF]">■ DRIVER B STINT PACE</span>
                <span className="text-[#00FF66]">■ MEDIAN CUMULATIVE GAP (s)</span>
                <span className="text-[#00E5FF]/60">■ P10–P90 MONTE CARLO FAN</span>
              </>
            ) : (
              <>
                <span className="text-[#00E5FF]">■ SPEED A (km/h)</span>
                <span className="text-[#B000FF]">■■ SPEED B (GHOST)</span>
                <span className="text-[#FFE600]">■■ ML WARPED TRACE</span>
                <span className="text-[#00FF66]">■ THROTTLE (%)</span>
                <span className="text-[#FF1E44]">■ BRAKE (bar)</span>
              </>
            )}
          </div>
        </header>
        <div className="flex-1 w-full h-[calc(260px-24px)] relative bg-[#05070B] overflow-hidden">
          {cockpitMode === 'ML_STRATEGY_ORACLE' ? (
            <StrategyFanChart />
          ) : (
            <TelemetryOscillograph />
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/* ZONE 5: BOTTOM STATUS / TRANSPORT CONTROLLER (Row 4, 28px)          */}
      {/* ================================================================== */}
      <TransportBar />

      {/* CRT SCANLINES & PHOSPHOR VIGNETTE OVERLAY */}
      <div className="crt-overlay pointer-events-none" style={{ pointerEvents: 'none' }} />
    </div>
  );
};

export default App;
