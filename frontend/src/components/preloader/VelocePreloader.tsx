// frontend/src/components/preloader/VelocePreloader.tsx
/**
 * VELOCE PRO // MCLAREN TECHNOLOGY CENTRE CALIBRATION PRELOADER
 * True Asset-Preloading Curtain & Architectural Louver Shutter Reveal.
 * Guarantees zero "boxy" placeholder models are ever visible to the user.
 * 
 * Standards:
 * - Alabaster ground (#FAF9F6) & Brushed Titanium (#E5E2DA)
 * - Space Grotesk tabular percentage counter
 * - Real GLB asset preloading via preloadGlbScene()
 * - Smooth 8° aerodynamic rake louver shutter exit
 */

import React, { useEffect, useState, useRef } from 'react';
import { FastForward, ShieldCheck } from 'lucide-react';
import { preloadGlbScene } from '../../utils/f1ModelLoader';

interface VelocePreloaderProps {
  onComplete: () => void;
}

export const VelocePreloader: React.FC<VelocePreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('HARVESTING CHASSIS GLTF & 26 SUB-MESHES...');
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const hasFinishedRef = useRef(false);
  const glbLoadedRef = useRef(false);

  const finish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsRevealing(true);
    setTimeout(() => {
      setIsDismissed(true);
      onComplete();
    }, 700);
  };

  useEffect(() => {
    // 1. Trigger actual GLB preloading in background
    preloadGlbScene((pct) => {
      if (pct >= 95) glbLoadedRef.current = true;
    })
      .then(() => {
        glbLoadedRef.current = true;
      })
      .catch((err) => {
        console.warn('Preloader asset warning:', err);
        glbLoadedRef.current = true;
      });

    // 2. Smooth simulated progression (min 1.4s, holds at 92% until GLB finishes)
    const startTime = performance.now();
    const minDuration = 1400; // ms

    let animId: number;

    const tick = (now: number) => {
      if (hasFinishedRef.current) return;
      const elapsed = now - startTime;
      const timeProgress = Math.min(1.0, elapsed / minDuration);

      let targetPct = Math.round(timeProgress * 92);

      // If GLB is fully loaded and time has elapsed, accelerate to 100%
      if (glbLoadedRef.current && elapsed >= minDuration) {
        const extraTime = elapsed - minDuration;
        const extraProgress = Math.min(1.0, extraTime / 300);
        targetPct = Math.round(92 + extraProgress * 8);
      }

      setProgress(targetPct);

      if (targetPct < 25) {
        setStageText('CALIBRATING CATMULL-ROM SPLINES · 24 FIA CIRCUITS');
      } else if (targetPct < 60) {
        setStageText('PRELOADING CARBON MONOCOQUE GLTF & CLEARCOAT');
      } else if (targetPct < 85) {
        setStageText('HEATING BRAKE CALIPERS · 1,020°C MONZA ENVELOPE');
      } else if (targetPct < 99) {
        setStageText('PRESSURIZING WIND TUNNEL · 352 KM/H SPEEDSTREAM');
      } else {
        setStageText('AERODYNAMIC TUNNEL SYNCHRONIZED · LAUNCHING VELOCE');
      }

      if (targetPct >= 100 && glbLoadedRef.current) {
        finish();
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (isDismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col justify-between bg-[#FAF9F6] text-[#111215] select-none transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
        isRevealing ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(229, 226, 218, 0.4) 0%, transparent 70%)',
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full px-8 py-6 flex items-center justify-between border-b border-[#E5E2DA]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D43811] animate-pulse" />
          <span className="font-display font-extrabold text-sm tracking-[0.22em] uppercase text-[#111215]">
            VELOCE · MCLAREN TECHNOLOGY CENTRE SPECIFICATION
          </span>
        </div>

        <button
          onClick={finish}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase text-[#5C6068] border border-[#E5E2DA] bg-white/70 hover:bg-[#111215] hover:text-white transition-all duration-200"
        >
          <span>SKIP TO COCKPIT</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Cinematic Display */}
      <div className="w-full max-w-4xl mx-auto px-8 flex flex-col items-center text-center">
        {/* Tachometer Count */}
        <div className="flex items-baseline justify-center mb-6">
          <span className="font-numeric text-8xl sm:text-9xl md:text-[11rem] font-bold tracking-tighter text-[#111215] tabular-nums leading-none">
            {String(progress).padStart(2, '0')}
          </span>
          <span className="font-numeric text-3xl sm:text-4xl font-bold text-[#8C8F98] ml-2">
            %
          </span>
        </div>

        {/* Laser Hairline Progress Bar */}
        <div className="w-full max-w-md h-1.5 bg-[#E5E2DA] rounded-full overflow-hidden mb-6 relative">
          <div
            className="h-full bg-gradient-to-r from-[#D43811] via-[#DFD9CC] to-[#111215] rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
          {/* Laser Head Pip */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-[#111215] shadow-sm transition-all duration-150 ease-out"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Dynamic Telemetry Stage Status */}
        <div className="flex items-center gap-2.5 text-xs font-mono font-semibold tracking-wider text-[#5C6068] uppercase">
          <ShieldCheck className="w-4 h-4 text-[#D43811]" />
          <span>{stageText}</span>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="w-full px-8 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-[#E5E2DA] text-[11px] font-mono text-[#8C8F98]">
        <div className="flex items-center gap-4">
          <span>HARDWARE ACCELERATED WEBGL 2.0</span>
          <span>·</span>
          <span>THREE.JS R160 KINEMATIC ENGINE</span>
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>FIA 2026 TECHNICAL REGULATIONS</span>
          <span>·</span>
          <span>MTC CLEANROOM RIG</span>
        </div>
      </div>
    </div>
  );
};
