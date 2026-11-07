// frontend/src/components/scrubber/MasterLapScrubber.tsx
/**
 * VELOCE PRO // MASTER DYNAMIC LAP SCRUBBER & DRIVER VIEWPORT MANAGER
 * Supports continuous 100ms micro-scrubbing across all laps (1 to 78 laps),
 * play/pause, 1x/2x/5x/10x speeds, driver visibility toggles, and 2D/3D dual view.
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Trophy,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import type { PlaybackSpeed } from '../../types/telemetry';

interface MasterLapScrubberProps {
  onToggle2DView?: () => void;
  is2DActive?: boolean;
}

export const MasterLapScrubber: React.FC<MasterLapScrubberProps> = ({
  onToggle2DView,
  is2DActive = false,
}) => {
  const [isDriverMenuOpen, setIsDriverMenuOpen] = useState(false);

  const isPlaying = useRaceArenaStore((s) => s.isPlaying);
  const togglePlay = useRaceArenaStore((s) => s.togglePlay);
  const playbackSpeed = useRaceArenaStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useRaceArenaStore((s) => s.setPlaybackSpeed);
  const playbackTimeSec = useRaceArenaStore((s) => s.playbackTimeSec);
  const totalDurationSec = useRaceArenaStore((s) => s.totalDurationSec);
  const currentLap = useRaceArenaStore((s) => s.currentLap);
  const totalLaps = useRaceArenaStore((s) => s.totalLaps);
  const scrubToTime = useRaceArenaStore((s) => s.scrubToTime);
  const scrubToLap = useRaceArenaStore((s) => s.scrubToLap);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const hiddenDriverCodes = useRaceArenaStore((s) => s.hiddenDriverCodes);
  const toggleDriverVisibility = useRaceArenaStore((s) => s.toggleDriverVisibility);
  const setIsPodiumCardOpen = useRaceArenaStore((s) => s.setIsPodiumCardOpen);
  const setIsClassificationModalOpen = useRaceArenaStore((s) => s.setIsClassificationModalOpen);

  // Format seconds to mm:ss.ms
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const speeds: PlaybackSpeed[] = [1.0, 2.0, 5.0, 10.0];

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-3 bg-[rgba(11,13,18,0.88)] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl select-none pointer-events-auto">
      {/* Top Row: Current Lap Progress & Time Stamps */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#E10600]/20 border border-[#E10600]/40 text-[#FF3B00] font-bold">
            LAP {currentLap} / {totalLaps}
          </span>
          <span className="text-zinc-400">
            {formatTime(playbackTimeSec)} / {formatTime(totalDurationSec)}
          </span>
        </div>

        {/* Viewport & Controls Actions */}
        <div className="flex items-center gap-2">
          {onToggle2DView && (
            <button
              onClick={onToggle2DView}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-semibold border transition-all ${
                is2DActive
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {is2DActive ? '3D Broadcast' : '2D Track Map'}
            </button>
          )}

          {/* Driver Visibility Filter Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsDriverMenuOpen(!isDriverMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Drivers ({gridDrivers.length - hiddenDriverCodes.length})</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Driver Filter Dropdown */}
            {isDriverMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-64 max-h-72 overflow-y-auto bg-[#0E1117] border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                <div className="text-[10px] font-mono text-zinc-400 px-2 py-1 uppercase tracking-wider border-b border-white/5 flex justify-between">
                  <span>Filter Visible Cars</span>
                  <button
                    onClick={() => {
                      // Toggle all on
                      gridDrivers.forEach((d) => {
                        if (hiddenDriverCodes.includes(d.code)) toggleDriverVisibility(d.code);
                      });
                    }}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {gridDrivers.map((driver) => {
                  const isVisible = !hiddenDriverCodes.includes(driver.code);
                  return (
                    <button
                      key={driver.code}
                      onClick={() => toggleDriverVisibility(driver.code)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isVisible ? 'bg-white/5 text-white' : 'bg-transparent text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: driver.teamColor || '#FFF' }}
                        />
                        <span className="font-mono font-bold">{driver.code}</span>
                        <span className="text-[11px] text-zinc-400 truncate max-w-[100px]">
                          {driver.name}
                        </span>
                      </div>
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-zinc-300" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Full Grid Classification Drawer Trigger */}
          <button
            onClick={() => setIsClassificationModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            title="Open Full Grid Classification"
          >
            <span>Grid</span>
          </button>

          {/* Podium Results Button */}
          <button
            onClick={() => setIsPodiumCardOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Results</span>
          </button>
        </div>
      </div>

      {/* Main Scrubber Slider */}
      <div className="relative w-full flex items-center mb-3">
        <input
          type="range"
          min={0}
          max={totalDurationSec || 5400}
          step={0.1}
          value={playbackTimeSec}
          onChange={(e) => scrubToTime(parseFloat(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF3B00] hover:bg-white/20 transition-colors"
        />
      </div>

      {/* Bottom Controls Row: Play/Pause, Speeds, Lap Quick-Jump */}
      <div className="flex items-center justify-between">
        {/* Playback Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrubToTime(0)}
            className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Restart Race"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E10600] text-white hover:bg-[#FF3B00] shadow-lg transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center gap-1 ml-2 bg-white/5 p-1 rounded-lg border border-white/5">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  playbackSpeed === s
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Lap Quick-Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrubToLap(currentLap - 1)}
            disabled={currentLap <= 1}
            className="px-2 py-1 rounded bg-white/5 text-zinc-300 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono"
          >
            -1 Lap
          </button>

          <select
            value={currentLap}
            onChange={(e) => scrubToLap(parseInt(e.target.value))}
            className="bg-[#141820] text-xs font-mono font-bold text-white border border-white/10 rounded px-2 py-1 focus:outline-none cursor-pointer"
          >
            {Array.from({ length: totalLaps }, (_, i) => i + 1).map((lapNum) => (
              <option key={lapNum} value={lapNum}>
                Lap {lapNum}
              </option>
            ))}
          </select>

          <button
            onClick={() => scrubToLap(currentLap + 1)}
            disabled={currentLap >= totalLaps}
            className="px-2 py-1 rounded bg-white/5 text-zinc-300 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono"
          >
            +1 Lap
          </button>
        </div>
      </div>
    </div>
  );
};
