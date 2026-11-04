// frontend/src/components/flankRight/RightFlankPanel.tsx
/**
 * AERO-SPEC F1 // QUADRANT 3: MASTER RIGHT FLANK HIGH-DENSITY HUD & ML STRATEGY CONTAINER
 * Blueprint Specification: aero_spec_antigravity_master_blueprint.md (lines 2239-2286)
 * Research Synthesis: PHASE_4_RESEARCH_SWARM_SYNTHESIS.md Section 3 & 4.1
 * Aesthetic Standard: NASA Johnson Space Center Flight Dynamics Officer (FDO) + Mercedes ATLAS
 *
 * ARCHITECTURAL CONTRACT:
 * - High-Density Structural Container for Quadrant 3 (360px grid width in App.tsx).
 * - Exact 1080p Pixel Height Allocation (Exact 756px Budget with 0px Vertical Overflow):
 *   * 24px: Mode Toggle Bar & Telemetry Status Header (.quadrant-header)
 *   * 210px: Sub-Panel 3A (G-G Traction Polar Radar)
 *   * 185px: Sub-Panel 3B (McLaren Applied PCU-8D Steering Wheel HUD & 15-LED Shift Array)
 *   * 337px: Sub-Panel 3C (Corner Apex Proximity & Braking Audit Card, flex-1)
 *   * Total TELEMETRY_LAB: 24 + 210 + 185 + 337 = 756px (EXACT 0px OVERFLOW!)
 *   * Total ML_STRATEGY_ORACLE: 24 + 732 = 756px (EXACT 0px OVERFLOW!)
 * - Zero-VDOM Subscription Contract (Gate 5 Conformance):
 *   * Subscribes STRICTLY and ONLY to `cockpitMode` and `setCockpitMode`.
 *   * NEVER subscribes reactively to `currentDistance`, `isPlaying`, `speed`, or cursor state.
 *   * Completely decoupled from 60 Hz playback cursor updates.
 * - Decoupled Component Architecture:
 *   * Wrapped with `React.memo` to eliminate unnecessary Virtual DOM diffing.
 * - NASA FDO / Mercedes ATLAS Design Tokens:
 *   * Background: #05070B (Void Carbon)
 *   * Borders: 1px solid #1B2230 (Hairline Seams)
 *   * Zero Border-Radius Mandate: `rounded-none` (border-radius: 0px !important)
 *   * Pure CSS Optical Reticle Brackets: `.hud-quadrant` pseudo-elements (Arm: 6px x 6px, 1px hairline)
 */

import React from 'react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import type { CockpitMode } from '../../types/telemetry';
import { GGTractionRadar } from './GGTractionRadar';
import { SteeringWheelHUD } from './SteeringWheelHUD';
import { CornerAuditCard } from './CornerAuditCard';
import { MlStrategySandbox } from './MlStrategySandbox';

export interface RightFlankPanelProps {
  className?: string;
  style?: React.CSSProperties;
  cockpitMode?: CockpitMode;
}

/**
 * Deterministic Pixel Height Geometry for Quadrant 3 at 1080p ($1920 \times 1080$)
 * Viewport height = 1080px - 36px (Zone 0) - 260px (Zone 4) - 28px (Zone 5) = 756px
 */
export const Q3_PANEL_HEIGHTS = {
  TOTAL: 756,
  HEADER: 24,
  SUBPANEL_3A_RADAR: 210,
  SUBPANEL_3B_STEERING: 185,
  SUBPANEL_3C_CORNER: 337,
  ML_SANDBOX: 732,
} as const;

export const RightFlankPanel: React.FC<RightFlankPanelProps> = React.memo(
  ({ className = '', style, cockpitMode: propCockpitMode }) => {
    // Strict Zero-VDOM subscription: ONLY cockpitMode and setCockpitMode
    const storeCockpitMode = useTelemetryStore((s) => s.cockpitMode);
    const setCockpitMode = useTelemetryStore((s) => s.setCockpitMode);
    const cockpitMode = propCockpitMode ?? storeCockpitMode;

    return (
      <aside
        data-testid="right-flank-panel"
        className={`hud-quadrant w-full md:w-[360px] max-w-[360px] h-[756px] min-h-[756px] max-h-[756px] bg-[#05070B] border-l border-[#1B2230] rounded-none flex flex-col overflow-hidden relative select-none font-telemetry ${className}`}
        style={style}
      >
        {/* ================================================================= */}
        {/* HEADER MODE TOGGLE BAR (24px Fixed Height, Seam Border)           */}
        {/* ================================================================= */}
        <header
          data-testid="q3-header-bar"
          className="quadrant-header h-[24px] min-h-[24px] max-h-[24px] bg-[#080B10] border-b border-[#1B2230] px-2 flex items-center justify-between text-[10px] font-bold tracking-wider select-none shrink-0"
        >
          {/* Left: Tactical Diagnostic Pip & Quadrant Title */}
          <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <span
              data-testid="q3-mode-pip"
              className={`w-1.5 h-1.5 inline-block shrink-0 ${
                cockpitMode === 'ML_STRATEGY_ORACLE' ? 'bg-[#FFE600]' : 'bg-[#00E5FF]'
              }`}
            />
            <span
              data-testid="q3-header-title"
              className="text-[#E2E8F0] uppercase text-[9.5px] truncate"
            >
              {cockpitMode === 'ML_STRATEGY_ORACLE'
                ? 'Q3 // ML PIT-WINDOW & PHYSICS SANDBOX'
                : 'Q3 // INERTIAL G-G & STEERING HUD'}
            </span>
          </div>

          {/* Right: Mode Selector Buttons & Fast Toggle Button */}
          <div
            data-testid="header-mode-controls"
            className="flex items-center gap-1 shrink-0"
          >
            {/* Mode Indicator Pills [1] / [2] */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                data-testid="mode-btn-telemetry"
                onClick={() => setCockpitMode('TELEMETRY_LAB')}
                className={`px-1 py-0.5 text-[7.5px] font-telemetry uppercase tracking-wider border rounded-none transition-colors duration-75 cursor-pointer ${
                  cockpitMode === 'TELEMETRY_LAB'
                    ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/15 font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8] bg-transparent'
                }`}
                title="Switch to Live Telemetry HUD [1]"
              >
                [1] LIVE TELEMETRY HUD
              </button>
              <button
                type="button"
                data-testid="mode-btn-ml"
                onClick={() => setCockpitMode('ML_STRATEGY_ORACLE')}
                className={`px-1 py-0.5 text-[7.5px] font-telemetry uppercase tracking-wider border rounded-none transition-colors duration-75 cursor-pointer ${
                  cockpitMode === 'ML_STRATEGY_ORACLE'
                    ? 'border-[#FFE600] text-[#FFE600] bg-[#FFE600]/15 font-bold'
                    : 'border-[#1B2230] text-[#64748B] hover:text-[#94A3B8] bg-transparent'
                }`}
                title="Switch to ML Strategy Sandbox [2]"
              >
                [2] ML STRATEGY SANDBOX
              </button>
            </div>

            {/* Mode Toggle Button */}
            <button
              type="button"
              data-testid="mode-toggle-btn"
              onClick={() =>
                setCockpitMode(
                  cockpitMode === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB'
                )
              }
              className="px-1.5 py-0.5 border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/15 active:bg-[#00E5FF]/25 font-telemetry text-[8.5px] uppercase tracking-wider rounded-none transition-colors duration-75 cursor-pointer"
              title={`Toggle Mode (Currently ${cockpitMode})`}
            >
              {cockpitMode === 'TELEMETRY_LAB' ? 'OPEN ML SANDBOX ⮞' : 'LIVE HUD ⮜'}
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* QUADRANT 3 CONTENT: CONDITIONAL MODE RENDERING                    */}
        {/* ================================================================= */}
        {cockpitMode === 'ML_STRATEGY_ORACLE' ? (
          /* Mode 2: Interactive ML Pit-Window & Physics-Warp Sandbox (732px, flex-1) */
          <div
            data-testid="ml-strategy-oracle-container"
            className="flex-1 h-[732px] min-h-[732px] max-h-[732px] overflow-hidden relative flex flex-col"
          >
            <MlStrategySandbox />
          </div>
        ) : (
          /* Mode 1: High-Frequency Real-Time Telemetry HUD (732px total, flex-1) */
          <div
            data-testid="telemetry-lab-container"
            className="flex flex-col flex-1 h-[732px] min-h-[732px] max-h-[732px] overflow-hidden relative"
          >
            {/* Sub-Panel 3A: G-G Traction Polar Radar (210px Fixed) */}
            <div
              data-testid="subpanel-3a-radar-container"
              className="h-[210px] min-h-[210px] max-h-[210px] border-b border-[#1B2230] overflow-hidden relative shrink-0"
            >
              <GGTractionRadar />
            </div>

            {/* Sub-Panel 3B: Cockpit Steering Wheel HUD (185px Fixed) */}
            <div
              data-testid="subpanel-3b-steering-container"
              className="h-[185px] min-h-[185px] max-h-[185px] border-b border-[#1B2230] overflow-hidden relative shrink-0"
            >
              <SteeringWheelHUD />
            </div>

            {/* Sub-Panel 3C: Corner Apex & Braking Audit Card (337px flex-1) */}
            <div
              data-testid="subpanel-3c-corner-container"
              className="flex-1 h-[337px] min-h-[337px] max-h-[337px] overflow-hidden relative"
            >
              <CornerAuditCard />
            </div>
          </div>
        )}
      </aside>
    );
  }
);

RightFlankPanel.displayName = 'RightFlankPanel';
