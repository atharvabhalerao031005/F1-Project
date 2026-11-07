// frontend/src/components/editorial/Act3To4LaunchBridge.tsx
/**
 * VELOCE // 5-RED-LIGHTS GRAND PRIX START GANTRY BRIDGE (Between Act 3 & Act 4)
 * Design Standard: Official FIA Formula 1 Start Procedure & McLaren MTC Light Luxury
 * Features:
 *   - ScrollTrigger-driven sequential 5-Red-Light start gantry illumination
 *   - Kinetic headline: "LIGHTS OUT AND AWAY WE GO."
 *   - High-contrast 13,000 RPM launch limiter visualization
 *   - Direct seamless transition into Act 4 3D Race Arena
 */

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, ChevronDown } from 'lucide-react';
import { getActiveLenis } from '../../utils/motionMasterTicker';

gsap.registerPlugin(ScrollTrigger);

export const Act3To4LaunchBridge: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [litLightsCount, setLitLightsCount] = useState<number>(0);
  const [isLightsOut, setIsLightsOut] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Scrub gantry lights across scroll through this section
      ScrollTrigger.create({
        trigger: el,
        start: 'top 70%',
        end: 'bottom 40%',
        onUpdate: (self) => {
          const p = self.progress;
          if (p < 0.15) {
            setLitLightsCount(1);
            setIsLightsOut(false);
          } else if (p < 0.35) {
            setLitLightsCount(2);
            setIsLightsOut(false);
          } else if (p < 0.55) {
            setLitLightsCount(3);
            setIsLightsOut(false);
          } else if (p < 0.75) {
            setLitLightsCount(4);
            setIsLightsOut(false);
          } else if (p < 0.90) {
            setLitLightsCount(5);
            setIsLightsOut(false);
          } else {
            // LIGHTS OUT!
            setLitLightsCount(0);
            setIsLightsOut(true);
          }
        },
      });

      // Animate headline reveal
      if (headlineRef.current) {
        gsap.from(headlineRef.current, {
          y: 50,
          opacity: 0,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headlineRef.current,
            start: 'top 85%',
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, []);

  const handleLaunchToArena = () => {
    const arenaEl = document.getElementById('act-4');
    if (arenaEl) {
      const lenis = getActiveLenis();
      if (lenis) {
        lenis.scrollTo(arenaEl, { duration: 1.4 });
      } else {
        arenaEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full py-32 px-6 sm:px-12 md:px-20 bg-[#EFECE4] text-[#111215] border-t border-[#DFD9CC] overflow-hidden select-none"
    >
      {/* Background Micro-Mesh */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#111215 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center gap-10">
        {/* Section Kicker */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/80 border border-[#DFD9CC] shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#E10600] animate-ping" />
          <span className="font-mono text-xs uppercase tracking-[0.24em] font-bold text-[#111215]">
            Grand Prix Start — 5-Red-Lights Gantry
          </span>
        </div>

        {/* ================================================================== */}
        {/* FIA 5-RED-LIGHT START GANTRY                                       */}
        {/* ================================================================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#14171E] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex items-center justify-center gap-4 sm:gap-8">
          {[1, 2, 3, 4, 5].map((gantryIdx) => {
            const isLit = litLightsCount >= gantryIdx && !isLightsOut;
            return (
              <div
                key={gantryIdx}
                className="flex flex-col items-center gap-3 p-3 rounded-2xl bg-[#090B0F] border border-white/10"
              >
                {/* Upper Red LED Cluster */}
                <div
                  className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full transition-all duration-200 border ${
                    isLit
                      ? 'bg-[#FF1801] border-[#FF4D2D] shadow-[0_0_24px_rgba(255,24,1,0.95)]'
                      : 'bg-[#1C2028] border-white/5 opacity-40'
                  }`}
                />
                {/* Lower Red LED Cluster */}
                <div
                  className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full transition-all duration-200 border ${
                    isLit
                      ? 'bg-[#FF1801] border-[#FF4D2D] shadow-[0_0_24px_rgba(255,24,1,0.95)]'
                      : 'bg-[#1C2028] border-white/5 opacity-40'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Dynamic Start State Headline */}
        <div className="flex flex-col gap-3 max-w-2xl">
          <h2
            ref={headlineRef}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display text-[#111215]"
          >
            {isLightsOut ? (
              <span className="text-[#E10600] animate-pulse">
                LIGHTS OUT AND AWAY WE GO.
              </span>
            ) : (
              <span>HOLDING ON THE CLUTCH.</span>
            )}
          </h2>
          <p className="font-sans text-sm sm:text-base text-[#5C6068] leading-relaxed">
            {isLightsOut
              ? 'The full 22-car grid dumps the dual-paddle clutch at 11,800 RPM. Synchronized VSTM-v1 kinematics engage live on track.'
              : 'Five red lights holding steady. Dual clutches biting at 68% threshold. Scroll to trigger the lights out release into the 3D Arena.'}
          </p>
        </div>

        {/* Launch RPM Bar Callout */}
        <div className="w-full max-w-lg p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#DFD9CC] shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#111215]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D43811]" />
              <span>LAUNCH CONTROL LIMITER</span>
            </div>
            <span className="text-[#D43811] font-numeric font-black text-sm">11,800 RPM</span>
          </div>
          {/* LED Stepper Bar */}
          <div className="flex items-center gap-1.5 h-3">
            {Array.from({ length: 24 }).map((_, i) => {
              const active = i < (isLightsOut ? 24 : litLightsCount * 4 + 4);
              const color =
                i < 10
                  ? 'bg-emerald-500'
                  : i < 18
                  ? 'bg-amber-500'
                  : 'bg-red-600';
              return (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-sm transition-all duration-100 ${
                    active ? `${color} shadow-sm` : 'bg-[#E5E2DA]'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[#8C8F98]">
            <span>IDLE 4,000</span>
            <span>CLUTCH BITE 8,500</span>
            <span>MAX CUT 13,000</span>
          </div>
        </div>

        {/* Enter Arena Jump Button */}
        <button
          type="button"
          onClick={handleLaunchToArena}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#111215] text-[#FAF9F6] font-display font-bold text-sm tracking-wider uppercase hover:bg-[#D43811] shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
        >
          <span>ENTER THE 3D TRACK ARENA</span>
          <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
        </button>
      </div>
    </section>
  );
};
