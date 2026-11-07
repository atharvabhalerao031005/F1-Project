/**
 * VELOCE V2 // ACT 0 KINETIC PRELOADER & WIND-TUNNEL SHUTTER REVEAL
 * Module: frontend/src/components/preloader/KineticPreloaderAct0.tsx
 * Standard: VELOCE-V2-ENGINEERING-SPEC-v2.0
 * 
 * Features:
 * 1. Deterministic 1.2s rAF Tachometer Count-Up: 000 -> 352 KM/H (G1 -> G8).
 * 2. Clinical White Alabaster (#FAF9F6) wind-tunnel theme with #0F1012 ink.
 * 3. Smooth Louver Shutter Reveal with 8° aerodynamic rake opening at 1.2s.
 * 4. Hard safety timeout unmounting at 1.8s max (Zero Deadlock Guarantee).
 * 5. Immediate "SKIP INTRO →" click handler.
 */

import React, { useEffect, useState, useRef } from 'react';
import { FastForward } from 'lucide-react';

interface KineticPreloaderAct0Props {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const KineticPreloaderAct0: React.FC<KineticPreloaderAct0Props> = ({
  onComplete,
  minDurationMs = 1200,
}) => {
  const [speed, setSpeed] = useState<number>(0);
  const [gear, setGear] = useState<number>(1);
  const [rpm, setRpm] = useState<number>(2400);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('veloce_preloader_dismissed', 'true');
      }
    } catch {}
    setIsRevealing(true);
    setIsDismissed(true);
    onComplete?.();
  };

  useEffect(() => {
    // If deep-linked with hash (e.g. #act-2, #act-4) or already scrolled, bypass immediately
    if (typeof window !== 'undefined') {
      if (window.location.hash || window.scrollY > 50) {
        setIsDismissed(true);
        onComplete?.();
        return;
      }
    }

    // If already dismissed in this session, skip immediately
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem('veloce_preloader_dismissed') === 'true') {
        setIsDismissed(true);
        onComplete?.();
        return;
      }
    } catch {}

    const t0 = performance.now();
    const maxSpeed = 352;
    const duration = Math.min(minDurationMs, 1000); // 1.0s swift calibration

    const gearThresholds = [
      { maxSpd: 65, g: 1 },
      { maxSpd: 115, g: 2 },
      { maxSpd: 165, g: 3 },
      { maxSpd: 215, g: 4 },
      { maxSpd: 255, g: 5 },
      { maxSpd: 290, g: 6 },
      { maxSpd: 325, g: 7 },
      { maxSpd: 360, g: 8 },
    ];

    const tick = (now: number) => {
      if (hasFinishedRef.current) return;
      const elapsed = now - t0;
      const progress = Math.min(1.0, elapsed / duration);

      // Smooth cubic acceleration curve
      const easedProgress = 1.0 - Math.pow(1.0 - progress, 3);
      const currentSpeed = Math.round(easedProgress * maxSpeed);
      setSpeed(currentSpeed);

      // Gear calculation
      let currentGear = 8;
      for (const gt of gearThresholds) {
        if (currentSpeed <= gt.maxSpd) {
          currentGear = gt.g;
          break;
        }
      }
      setGear(currentGear);

      // RPM calculation
      const calculatedRpm = Math.min(12500, Math.round(3000 + (currentSpeed / maxSpeed) * 9200));
      setRpm(calculatedRpm);

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Shutter reveal phase
        hasFinishedRef.current = true;
        setIsRevealing(true);
        setTimeout(() => {
          setIsDismissed(true);
          onComplete?.();
        }, 350);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    // Hard safety timeout: guaranteed dismiss by 1.3s max
    const hardTimeout = setTimeout(() => {
      if (!hasFinishedRef.current) {
        handleDismiss();
      }
    }, 1300);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(hardTimeout);
    };
  }, [minDurationMs]);

  if (isDismissed) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden cursor-pointer transition-opacity duration-500 ${
        isRevealing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#FAF9F6' }}
    >
      {/* Upper Louver Shutter: Clinical White Alabaster with 8° rake */}
      <div
        className="absolute top-0 left-0 w-full h-1/2 bg-[#FAF9F6] border-b border-[#E5E2DA] shadow-sm transition-transform duration-600 ease-out origin-top"
        style={{
          transform: isRevealing ? 'translateY(-105%) skewY(-2deg)' : 'translateY(0%)',
          willChange: 'transform',
        }}
      />

      {/* Lower Louver Shutter: Clinical White Alabaster with 8° rake */}
      <div
        className="absolute bottom-0 left-0 w-full h-1/2 bg-[#FAF9F6] border-t border-[#E5E2DA] shadow-sm transition-transform duration-600 ease-out origin-bottom"
        style={{
          transform: isRevealing ? 'translateY(105%) skewY(2deg)' : 'translateY(0%)',
          willChange: 'transform',
        }}
      />

      {/* Skip Button (Top Right) */}
      <div className="absolute top-6 right-6 z-50 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleDismiss(e);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F1012] text-[#FAF9F6] hover:bg-[#FF3B00] text-xs font-sans font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer z-50 pointer-events-auto"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Instrument HUD Console */}
      <div className="relative z-10 flex flex-col items-center text-center select-none font-mono">
        {/* Section Kicker */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F0EDE6] border border-[#E0DCD3] mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#FF3B00] animate-ping" />
          <span className="text-[11px] font-bold tracking-[0.24em] text-[#0F1012] uppercase font-sans">
            VELOCE // WIND-TUNNEL CALIBRATION
          </span>
        </div>

        {/* Precision Tachometer Speed Readout */}
        <div className="flex items-baseline gap-3 mb-2">
          <span
            className="text-7xl sm:text-9xl font-black text-[#0F1012] tracking-tighter tabular-nums"
            style={{
              fontVariantNumeric: 'tabular-nums slashed-zero',
              fontFamily: 'JetBrains Mono, Space Grotesk, monospace',
            }}
          >
            {speed.toString().padStart(3, '0')}
          </span>
          <span className="text-xl sm:text-3xl font-extrabold text-[#7A7E85] tracking-wider uppercase font-sans">
            KM/H
          </span>
        </div>

        {/* Secondary Engineering Readouts: Gear, RPM, Test Cell Status */}
        <div className="flex items-center gap-6 pt-4 border-t border-[#E0DCD3] text-xs text-[#555962]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-[#7A7E85] uppercase font-semibold">GEAR</span>
            <span className="text-base font-bold text-[#0F1012]">G{gear}</span>
          </div>

          <div className="w-[1px] h-3.5 bg-[#D5D0C5]" />

          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-[#7A7E85] uppercase font-semibold">TACH</span>
            <span className="text-base font-bold text-[#0F1012] tabular-nums">
              {rpm.toLocaleString()} <span className="text-[10px] font-normal text-[#7A7E85]">RPM</span>
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-[#D5D0C5]" />

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00CC66] animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider text-[#0F1012] uppercase font-sans">
              FLOW LAMINAR READY
            </span>
          </div>
        </div>

        {/* Active Shutter Progress Bar */}
        <div className="w-56 h-1 bg-[#E0DCD3] rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-[#FF3B00] transition-all duration-75 ease-out rounded-full"
            style={{ width: `${(speed / 352) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
