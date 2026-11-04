// frontend/src/components/scrubber/TransportBar.tsx
/**
 * AERO-SPEC F1 // ZONE 5: TRANSPORT CONTROL RIBBON (EXACT 28PX)
 * Master Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.4 & Zone 5
 * Technical Research: PHASE_5_TRANSPORT_BAR_PLAYBACK_CONTROLS_AND_SECTOR_LOOPING_RESEARCH.md
 *
 * ARCHITECTURAL CONTRACT & PERFORMANCE INVARIANTS:
 * - Exact 28px Height: `h-[28px] min-h-[28px] max-h-[28px] leading-[28px]`
 * - Zero-VDOM Subscription Contract: ZERO reactive subscriptions to currentDistance in VDOM.
 *   Distance ticker, active sector badge, and live lap clock mutate DOM text nodes directly
 *   via textContent inside a fine-grained `useTelemetryStore.subscribe()` callback.
 * - Modulo Looping Kinematics: Supports ALL, S1, S2, and S3 bounded sector looping.
 * - Tri-Cluster Layout:
 *   * Left Cluster: Play/Pause with #00FF66 active pulse, context-aware reset, micro/macro steppers (-100m, -10m, +10m, +100m).
 *   * Center Cluster: Direct-DOM distance ticker (34ch width, CLS=0), dynamic active sector traversal badge, 4-way sector loop switcher.
 *   * Right Cluster: 5-button speed multiplier (0.25x - 4.0x), live lap clock (M:SS.fff), status indicator, hotkey micro-badges.
 * - NASA FDO / Mercedes ATLAS avionics styling: Void carbon #05070B, 1px seam #1E293B, 0px border-radius.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTelemetryStore, LoopSector } from '../../store/useTelemetryStore';
import { formatLapClock } from '../../utils/formatters';
import type { PlaybackSpeed } from '../../types/telemetry';

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1.0, 2.0, 4.0];
export const SECTOR_OPTIONS: LoopSector[] = ['ALL', 'S1', 'S2', 'S3'];

/**
 * Fast thousands comma separator without heap allocations.
 * Formats: 0 -> '0,000', 5 -> '0,005', 1820 -> '1,820', 5793 -> '5,793'.
 */
export function formatThousandsM(meters: number): string {
  const d = Math.max(0, Math.floor(meters));
  if (d < 1000) {
    return '0,' + d.toString().padStart(3, '0');
  }
  const thousands = Math.floor(d / 1000);
  const remainder = d % 1000;
  return `${thousands},${remainder.toString().padStart(3, '0')}`;
}

/**
 * Formats high-precision distance ticker string:
 * Pattern: 'DISTANCE: 0,000m / 5,793m [00.0%]'
 * Guaranteed fixed character width: exactly 34-35 characters for CLS = 0.
 */
export function formatDistanceTicker(currentM: number, maxM: number): string {
  const safeMax = Math.max(1, maxM);
  const clampedDist = Math.min(Math.max(0, currentM), safeMax);
  const curStr = formatThousandsM(clampedDist);
  const maxStr = formatThousandsM(safeMax);
  const pct = ((clampedDist / safeMax) * 100).toFixed(1).padStart(4, '0');
  return `DISTANCE: ${curStr}m / ${maxStr}m [${pct}%]`;
}

/**
 * Computes target reset distance based on active sector looping bounds.
 */
export function getSectorResetDistance(
  loopSector: LoopSector,
  splits: [number, number] | undefined,
  _maxDistance: number
): number {
  if (!splits || splits.length < 2) return 0;
  const [s1, s2] = splits;
  switch (loopSector) {
    case 'S1':
      return 0;
    case 'S2':
      return s1;
    case 'S3':
      return s2;
    case 'ALL':
    default:
      return 0;
  }
}

export interface TransportBarProps {
  /** Optional override for playback state */
  isPlaying?: boolean;
  /** Optional override for playback speed */
  playbackSpeed?: PlaybackSpeed;
  /** Optional override for active loop sector */
  loopSector?: LoopSector;
}

export const TransportBarComponent: React.FC<TransportBarProps> = (props) => {
  // Low-frequency event-driven subscriptions (do NOT re-render on distance ticks)
  const storeIsPlaying = useTelemetryStore((s) => s.isPlaying);
  const isPlaying =
    props.isPlaying !== undefined
      ? props.isPlaying
      : typeof window === 'undefined'
      ? useTelemetryStore.getState().isPlaying
      : storeIsPlaying;

  const storePlaybackSpeed = useTelemetryStore((s) => s.playbackSpeed);
  const playbackSpeed =
    props.playbackSpeed !== undefined
      ? props.playbackSpeed
      : typeof window === 'undefined'
      ? useTelemetryStore.getState().playbackSpeed
      : storePlaybackSpeed;

  const storeLoopSector = useTelemetryStore((s) => s.loopSector);
  const loopSector =
    props.loopSector !== undefined
      ? props.loopSector
      : typeof window === 'undefined'
      ? useTelemetryStore.getState().loopSector
      : storeLoopSector;

  // Store actions
  const togglePlay = useTelemetryStore((s) => s.togglePlay);
  const stepDistance = useTelemetryStore((s) => s.stepDistance);
  const setDistance = useTelemetryStore((s) => s.setDistance);
  const setPlaybackSpeed = useTelemetryStore((s) => s.setPlaybackSpeed);
  const setLoopSector = useTelemetryStore((s) => s.setLoopSector);

  // Direct-DOM element references for 60Hz/120Hz zero-VDOM readouts
  const distanceTickerRef = useRef<HTMLSpanElement>(null);
  const liveClockRef = useRef<HTMLSpanElement>(null);
  const sectorBadgeRef = useRef<HTMLSpanElement>(null);

  // High-frequency subscription to currentDistance (bypasses React VDOM reconciliation)
  useEffect(() => {
    const unsubscribe = useTelemetryStore.subscribe(
      (state) => state.currentDistance,
      (currentDistance) => {
        const state = useTelemetryStore.getState();
        const maxM = state.maxDistance || 5793;
        const payload = state.sessionPayload;

        // 1. Direct-DOM distance ticker update
        if (distanceTickerRef.current) {
          distanceTickerRef.current.textContent = formatDistanceTicker(currentDistance, maxM);
        }

        // 2. Direct-DOM live lap clock update
        if (liveClockRef.current && payload?.driverA?.t) {
          const idx = Math.min(Math.max(0, Math.floor(currentDistance)), payload.gridLength);
          const tSec = payload.driverA.t[idx] ?? 0;
          liveClockRef.current.textContent = formatLapClock(tSec);
        }

        // 3. Direct-DOM active sector badge update
        if (sectorBadgeRef.current && payload?.meta?.sectorSplitM) {
          const [s1, s2] = payload.meta.sectorSplitM;
          const secNum = currentDistance < s1 ? '1' : currentDistance < s2 ? '2' : '3';
          sectorBadgeRef.current.textContent = `SECTOR ${secNum}`;
        }
      }
    );

    return unsubscribe;
  }, []);

  // Reset handler: returns to start of active sector/lap
  const handleReset = useCallback(() => {
    const state = useTelemetryStore.getState();
    const targetM = getSectorResetDistance(
      state.loopSector,
      state.sessionPayload?.meta?.sectorSplitM,
      state.maxDistance
    );
    setDistance(targetM);
  }, [setDistance]);

  // Sector switcher handler: adjusts position if outside sector bounds
  const handleSectorChange = useCallback(
    (sector: LoopSector) => {
      setLoopSector(sector);
      const state = useTelemetryStore.getState();
      const splits = state.sessionPayload?.meta?.sectorSplitM;
      if (!splits || splits.length < 2) return;

      const [s1, s2] = splits;
      const cur = state.currentDistance;

      if (sector === 'S1' && (cur < 0 || cur >= s1)) {
        setDistance(0);
      } else if (sector === 'S2' && (cur < s1 || cur >= s2)) {
        setDistance(s1);
      } else if (sector === 'S3' && (cur < s2 || cur >= state.maxDistance)) {
        setDistance(s2);
      }
    },
    [setLoopSector, setDistance]
  );

  // Compute initial static markup values imperatively without subscribing
  const currentStore = useTelemetryStore.getState();
  const initDistance = currentStore.currentDistance || 0;
  const initMaxDistance = currentStore.maxDistance || 5793;
  const initPayload = currentStore.sessionPayload;

  let initSector = 'SECTOR 1';
  if (initPayload?.meta?.sectorSplitM) {
    const [s1, s2] = initPayload.meta.sectorSplitM;
    initSector = initDistance < s1 ? 'SECTOR 1' : initDistance < s2 ? 'SECTOR 2' : 'SECTOR 3';
  }

  let initLapClock = '0:00.000';
  if (initPayload?.driverA?.t) {
    const idx = Math.min(Math.max(0, Math.floor(initDistance)), initPayload.gridLength);
    const tSec = initPayload.driverA.t[idx] ?? 0;
    initLapClock = formatLapClock(tSec);
  }

  return (
    <footer
      data-testid="transport-bar"
      className="col-span-3 h-[28px] min-h-[28px] max-h-[28px] leading-[28px] px-3 flex items-center justify-between bg-[#05070B] border-t border-[#1E293B] text-[11px] font-telemetry select-none rounded-none"
    >
      {/* ================================================================== */}
      {/* LEFT CLUSTER: PLAY/PAUSE, RESET & TACTICAL STEPPERS                */}
      {/* ================================================================== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          data-testid="btn-play-pause"
          onClick={(e) => {
            togglePlay();
            e.currentTarget.blur();
          }}
          className={`hud-button flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border transition-colors rounded-none ${
            isPlaying
              ? 'border-[#00FF66]/60 text-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.25)]'
              : 'border-[#1E293B] text-[#94A3B8] hover:text-[#E2E8F0]'
          }`}
          title="Toggle Playback [SPACE]"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3 h-3 text-[#00FF66] animate-pulse" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-[#00FF66]" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Context-Aware Reset Button */}
        <button
          type="button"
          data-testid="btn-reset"
          onClick={(e) => {
            handleReset();
            e.currentTarget.blur();
          }}
          className="hud-button flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#1E293B] rounded-none"
          title="Reset to Sector/Lap Start [R]"
        >
          <RotateCcw className="w-3 h-3 text-[#94A3B8]" />
          <span>RESET</span>
        </button>

        {/* Stepping Separator */}
        <span className="w-px h-3 bg-[#1E293B] mx-0.5" />

        {/* Macro Step -100m */}
        <button
          type="button"
          data-testid="btn-step-backward-macro"
          onClick={(e) => {
            stepDistance(-100);
            e.currentTarget.blur();
          }}
          className="hud-button px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] hover:text-[#E2E8F0] border border-[#1E293B] rounded-none"
          title="Step Backward 100m [SHIFT+←]"
        >
          -100m
        </button>

        {/* Micro Step -10m */}
        <button
          type="button"
          data-testid="btn-step-backward-micro"
          onClick={(e) => {
            stepDistance(-10);
            e.currentTarget.blur();
          }}
          className="hud-button px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] hover:text-[#E2E8F0] border border-[#1E293B] rounded-none"
          title="Step Backward 10m [←]"
        >
          -10m
        </button>

        {/* Micro Step +10m */}
        <button
          type="button"
          data-testid="btn-step-forward-micro"
          onClick={(e) => {
            stepDistance(10);
            e.currentTarget.blur();
          }}
          className="hud-button px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] hover:text-[#E2E8F0] border border-[#1E293B] rounded-none"
          title="Step Forward 10m [→]"
        >
          +10m
        </button>

        {/* Macro Step +100m */}
        <button
          type="button"
          data-testid="btn-step-forward-macro"
          onClick={(e) => {
            stepDistance(100);
            e.currentTarget.blur();
          }}
          className="hud-button px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] hover:text-[#E2E8F0] border border-[#1E293B] rounded-none"
          title="Step Forward 100m [SHIFT+→]"
        >
          +100m
        </button>
      </div>

      {/* ================================================================== */}
      {/* CENTER CLUSTER: DISTANCE TICKER, SECTOR INDICATOR & LOOP SWITCHER  */}
      {/* ================================================================== */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Direct-DOM High-Precision Distance Ticker (Fixed width 34ch to guarantee CLS = 0) */}
        <div className="w-[34ch] text-left font-mono tabular-nums slashed-zero tracking-tight">
          <span
            ref={distanceTickerRef}
            data-testid="distance-ticker"
            className="text-[#E2E8F0] text-[10.5px] font-bold"
          >
            {formatDistanceTicker(initDistance, initMaxDistance)}
          </span>
        </div>

        {/* Vertical Divider */}
        <span className="w-px h-3 bg-[#1E293B]" />

        {/* Active Sector Traversal Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#64748B] uppercase tracking-wider font-bold">
            POS:
          </span>
          <span
            ref={sectorBadgeRef}
            data-testid="active-sector-indicator"
            className="px-1.5 py-0.5 text-[9.5px] font-bold bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 tracking-wider rounded-none"
          >
            {initSector}
          </span>
        </div>

        {/* Vertical Divider */}
        <span className="w-px h-3 bg-[#1E293B]" />

        {/* Sector Isolation Loop Segmented Toggle */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-[#64748B] uppercase tracking-wider mr-1 font-bold">
            LOOP:
          </span>
          {SECTOR_OPTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              data-testid={`btn-loop-${sec.toLowerCase()}`}
              onClick={(e) => {
                handleSectorChange(sec);
                e.currentTarget.blur();
              }}
              className={`px-1.5 py-0.5 text-[9px] font-bold transition-colors rounded-none ${
                loopSector === sec
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.3)]'
                  : 'bg-[#080B10] text-[#64748B] border border-[#1E293B] hover:text-[#E2E8F0]'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* RIGHT CLUSTER: SPEED MULTIPLIER, LAP CLOCK, STATUS & HOTKEYS       */}
      {/* ================================================================== */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Playback Speed Multiplier Segmented Selector */}
        <div className="flex items-center gap-0.5 bg-[#080B10] p-0.5 border border-[#1E293B] rounded-none">
          {PLAYBACK_SPEEDS.map((spd) => (
            <button
              key={spd}
              type="button"
              data-testid={`btn-speed-${spd}x`}
              onClick={(e) => {
                setPlaybackSpeed(spd);
                e.currentTarget.blur();
              }}
              className={`px-1 py-0.2 text-[8.5px] font-mono font-bold transition-colors rounded-none ${
                playbackSpeed === spd
                  ? 'bg-[#00E5FF] text-[#05070B] shadow-[0_0_6px_rgba(0,229,255,0.4)]'
                  : 'text-[#64748B] hover:text-[#E2E8F0]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Live Elapsed Lap Time (Direct-DOM) */}
        <div className="flex items-center gap-1 font-mono tabular-nums text-[10.5px]">
          <span className="text-[9px] text-[#64748B] font-bold">T:</span>
          <span
            ref={liveClockRef}
            data-testid="live-lap-clock"
            className="text-[#00E5FF] font-bold w-[60px] inline-block text-right"
          >
            {initLapClock}
          </span>
        </div>

        {/* Playback Status Pill */}
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-[#1E293B] bg-[#080B10] rounded-none">
          <span
            className={`w-1.5 h-1.5 inline-block ${
              isPlaying
                ? 'bg-[#00FF66] shadow-[0_0_6px_#00FF66] animate-pulse'
                : 'bg-[#94A3B8]'
            }`}
          />
          <span
            data-testid="playback-status-label"
            className={`text-[9px] font-bold tracking-wider ${
              isPlaying ? 'text-[#00FF66]' : 'text-[#94A3B8]'
            }`}
          >
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </span>
        </div>

        {/* Hotkey Badges */}
        <div className="hidden xl:flex items-center gap-2 text-[9px] text-[#64748B] border-l border-[#1E293B] pl-2.5">
          <span><strong className="text-[#E2E8F0]">[SPACE]</strong> PLAY</span>
          <span><strong className="text-[#E2E8F0]">[←/→]</strong> 10M</span>
          <span><strong className="text-[#E2E8F0]">[SHIFT+←/→]</strong> 100M</span>
          <span><strong className="text-[#E2E8F0]">[M]</strong> MODE</span>
          <span><strong className="text-[#E2E8F0]">[R]</strong> RESET</span>
        </div>
      </div>
    </footer>
  );
};

export const TransportBar = React.memo(TransportBarComponent);
TransportBar.displayName = 'TransportBar';

export default TransportBar;
