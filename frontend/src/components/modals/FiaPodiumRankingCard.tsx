// frontend/src/components/modals/FiaPodiumRankingCard.tsx
/**
 * VELOCE PRO // OFFICIAL FIA GRAND PRIX PODIUM & CLASSIFICATION CARD
 * Standard: FIA World Championship Post-Race Podium & Classification Table
 */

import React from 'react';
import { Trophy, Medal, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';

export const FiaPodiumRankingCard: React.FC = () => {
  const isPodiumCardOpen = useRaceArenaStore((s) => s.isPodiumCardOpen);
  const setIsPodiumCardOpen = useRaceArenaStore((s) => s.setIsPodiumCardOpen);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const scrubToTime = useRaceArenaStore((s) => s.scrubToTime);
  const totalLaps = useRaceArenaStore((s) => s.totalLaps);
  const circuitId = useRaceArenaStore((s) => s.circuitId);

  if (!isPodiumCardOpen) return null;

  // Sort drivers by final standings
  const sortedDrivers = [...gridDrivers].sort((a, b) => {
    if (a.isRetired && !b.isRetired) return 1;
    if (!a.isRetired && b.isRetired) return -1;
    return 0; // maintain official order
  });

  const p1 = sortedDrivers[0];
  const p2 = sortedDrivers[1];
  const p3 = sortedDrivers[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#090C10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-950/40 via-black to-zinc-900/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold text-red-500 tracking-widest uppercase">
                FIA FORMULA 1 WORLD CHAMPIONSHIP
              </div>
              <h2 className="text-lg font-bold font-sans text-white tracking-wide">
                OFFICIAL RACE CLASSIFICATION // {circuitId?.toUpperCase()} ({totalLaps} LAPS)
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsPodiumCardOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Podium Top 3 Showcase */}
        {p1 && (
          <div className="px-6 py-6 bg-black/30 border-b border-white/5 grid grid-cols-3 gap-3 items-end">
            {/* P2 Silver */}
            {p2 && (
              <div className="flex flex-col items-center p-3 rounded-2xl bg-zinc-900/60 border border-zinc-700/40 text-center">
                <Medal className="w-5 h-5 text-zinc-400 mb-1" />
                <span className="font-mono text-xs font-bold text-zinc-400">P2</span>
                <span className="font-sans font-bold text-sm text-white mt-1">{p2.name}</span>
                <span className="text-[11px] text-zinc-400">{p2.team}</span>
                <span className="mt-2 font-mono text-[11px] text-zinc-300">{p2.intervalSec || '+1.84s'}</span>
              </div>
            )}

            {/* P1 Gold */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center relative -top-2 shadow-xl shadow-amber-500/5">
              <Trophy className="w-7 h-7 text-amber-400 mb-1 animate-bounce" />
              <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest">
                WINNER // P1
              </span>
              <span className="font-sans font-bold text-base text-white mt-1">{p1.name}</span>
              <span className="text-xs text-amber-300/80">{p1.team}</span>
              <span className="mt-2 font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                25 PTS
              </span>
            </div>

            {/* P3 Bronze */}
            {p3 && (
              <div className="flex flex-col items-center p-3 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-center">
                <Medal className="w-5 h-5 text-amber-600 mb-1" />
                <span className="font-mono text-xs font-bold text-amber-600">P3</span>
                <span className="font-sans font-bold text-sm text-white mt-1">{p3.name}</span>
                <span className="text-[11px] text-zinc-400">{p3.team}</span>
                <span className="mt-2 font-mono text-[11px] text-zinc-300">{p3.intervalSec || '+4.12s'}</span>
              </div>
            )}
          </div>
        )}

        {/* Full Grid Classification Table */}
        <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-white/5">
          {sortedDrivers.map((driver, idx) => (
            <div
              key={driver.code}
              className="py-2 flex items-center justify-between text-xs font-mono hover:bg-white/5 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 font-bold ${idx < 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {driver.isRetired ? 'DNF' : `P${idx + 1}`}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: driver.teamColor || '#FFF' }}
                />
                <span className="font-sans font-bold text-white">{driver.name}</span>
                <span className="text-[11px] text-zinc-400 hidden sm:inline">{driver.team}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300">
                  {driver.compound} ({driver.tireAge || 12}L)
                </span>
                <span className="w-16 text-right text-zinc-300">
                  {driver.isRetired ? (
                    <span className="text-red-400 font-bold flex items-center gap-1 justify-end">
                      <AlertTriangle className="w-3 h-3" /> RET
                    </span>
                  ) : idx === 0 ? (
                    <span className="text-emerald-400 font-bold">LEADER</span>
                  ) : (
                    driver.intervalSec || `+${(idx * 1.5).toFixed(2)}s`
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-4 bg-black/50 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => {
              scrubToTime(0);
              setIsPodiumCardOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-sans font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Simulation</span>
          </button>

          <button
            onClick={() => setIsPodiumCardOpen(false)}
            className="px-5 py-2 rounded-xl bg-[#E10600] hover:bg-[#FF3B00] text-white text-xs font-sans font-bold shadow-lg transition-colors cursor-pointer"
          >
            Return to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
