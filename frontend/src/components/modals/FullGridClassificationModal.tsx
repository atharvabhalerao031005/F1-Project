// frontend/src/components/modals/FullGridClassificationModal.tsx
/**
 * VELOCE PRO // HAUTE HORLOGERIE DOCKED CLASSIFICATION PILL & EXPANDABLE 20-DRIVER DRAWER
 * Repositioned to fixed top header zone (below navbar, centered) to guarantee 100% zero
 * collision with the bottom lap scrubber.
 * Synchronized with master useRaceArenaStore modal state.
 */

import React from 'react';
import { ChevronUp, X, Radio, Crosshair } from 'lucide-react';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import type { TyreCompound } from '../../types/telemetry';

const COMPOUND_COLORS: Record<TyreCompound, { bg: string; text: string }> = {
  S: { bg: '#FF1E44', text: '#FFFFFF' },
  M: { bg: '#FFE600', text: '#0F1012' },
  H: { bg: '#F7F6F2', text: '#0F1012' },
  I: { bg: '#00CC66', text: '#FFFFFF' },
  W: { bg: '#0088FF', text: '#FFFFFF' },
};

export const FullGridClassificationModal: React.FC = () => {
  const isOpen = useRaceArenaStore((s) => s.isClassificationModalOpen);
  const setIsOpen = useRaceArenaStore((s) => s.setIsClassificationModalOpen);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const setActiveDriverCode = useRaceArenaStore((s) => s.setActiveDriverCode);

  const leader = gridDrivers[0];
  const p2 = gridDrivers[1];

  return (
    <>
      {/* ================================================================== */}
      {/* REPOSITIONED TOP BATTLE & CLASSIFICATION PILL (Zero Scrubber Clashing) */}
      {/* ================================================================== */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 px-4 sm:px-5 py-2 rounded-full bg-[#0A0D14]/90 hover:bg-[#121622]/95 backdrop-blur-2xl border border-white/15 hover:border-[#FF3B00]/60 text-[#F7F6F2] shadow-[0_8px_30px_rgb(0,0,0,0.6)] transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {/* Battle Leader Pill */}
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: leader?.teamColor || '#3671C6' }}
            />
            <span className="font-mono font-black text-xs tracking-wider text-white">
              P1 {leader?.code || 'VER'}
            </span>
            <span className="font-mono text-[11px] text-emerald-400 font-bold tabular-nums">
              GAP {p2?.intervalSec || '+0.80s'}
            </span>
            <span className="font-mono font-bold text-xs text-zinc-300">
              P2 {p2?.code || 'NOR'}
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Active Tracking Status */}
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] group-hover:text-white transition-colors">
            <Radio className="w-3.5 h-3.5 text-[#FF3B00] animate-pulse" />
            <span className="font-mono font-semibold text-[10px] uppercase tracking-wider">
              TRACKING: <span className="text-white font-bold">{activeDriverCode}</span>
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Expand Drawer Trigger */}
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono font-bold text-zinc-400 group-hover:text-white">
            <span>{gridDrivers.length} DRIVERS</span>
            <ChevronUp className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />
          </div>
        </button>
      </div>

      {/* ================================================================== */}
      {/* EXPANDABLE DYNAMIC CLASSIFICATION MODAL SHEET                      */}
      {/* ================================================================== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-[#0B0C0E] text-white border border-white/10 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div>
                <h3 className="font-display font-bold text-xl text-white flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00]" />
                  {gridDrivers.length}-Car Grid Classification & Broadcast Tracking
                </h3>
                <p className="font-sans text-xs text-[#9CA3AF] mt-1">
                  Click any driver row to smoothly snap the broadcast camera to their car
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7E85]">
                    <th className="py-2.5 px-3">Pos</th>
                    <th className="py-2.5 px-3">Driver</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3 text-center">Tyre</th>
                    <th className="py-2.5 px-3 text-right">Interval</th>
                    <th className="py-2.5 px-3 text-right">Speed</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {gridDrivers.map((d, idx) => {
                    const isTracked = d.code === activeDriverCode;
                    const isDNF = d.isRetired || d.status === 'DNF';
                    const isPit = d.status?.includes('PIT');

                    return (
                      <tr
                        key={d.code}
                        onClick={() => {
                          setActiveDriverCode(d.code);
                          setIsOpen(false);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isTracked ? 'bg-[#FF3B00]/10 border-l-2 border-[#FF3B00]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-white">
                          {isDNF ? '—' : `P${idx + 1}`}
                        </td>
                        <td className="py-3 px-3 flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: d.teamColor }}
                          />
                          <span className="font-bold text-white text-sm">{d.code}</span>
                          <span className="text-[11px] text-zinc-400">#{d.number}</span>
                        </td>
                        <td className="py-3 px-3 text-zinc-400 text-xs font-sans">{d.team}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold shadow-sm"
                            style={{
                              backgroundColor: COMPOUND_COLORS[d.compound]?.bg || '#FFE600',
                              color: COMPOUND_COLORS[d.compound]?.text || '#000000',
                            }}
                          >
                            {d.compound}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">
                          {isDNF ? (
                            <span className="text-red-400">DNF</span>
                          ) : isPit ? (
                            <span className="text-amber-400">PIT</span>
                          ) : (
                            <span className="text-emerald-400">{d.intervalSec}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">
                          {isDNF ? '0.0 km/h' : `${d.speedKmh.toFixed(1)} km/h`}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDriverCode(d.code);
                              setIsOpen(false);
                            }}
                            className={`flex items-center gap-1 mx-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isTracked
                                ? 'bg-[#FF3B00] text-white shadow-md'
                                : 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white'
                            }`}
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>{isTracked ? 'TRACKING' : 'TRACK'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-400">
                Active Camera Rig: <span className="text-white font-bold uppercase">{useRaceArenaStore.getState().cameraRig}</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
