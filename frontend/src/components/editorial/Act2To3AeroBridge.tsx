// frontend/src/components/editorial/Act2To3AeroBridge.tsx
/**
 * VELOCE // AERODYNAMIC GROUND-EFFECT & TELEMETRY FLOW BRIDGE (Between Act 2 & Act 3)
 * Design Standard: McLaren Technology Centre & Swiss Haute Horlogerie
 * Features:
 *   - ScrollTrigger-driven animated SVG Isobar pressure curves
 *   - Real-time animated telemetry counters that dynamically count up on scroll
 *   - Kinetic text reveal for aerodynamic principles
 *   - Light-luxury alabaster/ceramic styling with zero dark voids
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Wind } from 'lucide-react';
import { InfiniteEditorialMarquee } from '../common/LiveEditorialPrimitives';

gsap.registerPlugin(ScrollTrigger);

export const Act2To3AeroBridge: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const stream1Ref = useRef<SVGPathElement>(null);
  const stream2Ref = useRef<SVGPathElement>(null);
  const stat1Ref = useRef<HTMLSpanElement>(null);
  const stat2Ref = useRef<HTMLSpanElement>(null);
  const stat3Ref = useRef<HTMLSpanElement>(null);
  const stat4Ref = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // 1. Animate headline reveal with spring easing
      if (headlineRef.current) {
        gsap.from(headlineRef.current, {
          y: 60,
          opacity: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headlineRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // 2. SVG Path Stroke-Dashoffset Draw Animation on Scroll
      const paths = [pathRef.current, stream1Ref.current, stream2Ref.current];
      paths.forEach((p, idx) => {
        if (!p) return;
        const length = p.getTotalLength();
        gsap.set(p, { strokeDasharray: length, strokeDashoffset: length });

        gsap.to(p, {
          strokeDashoffset: 0,
          duration: 1.8 + idx * 0.3,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 75%',
            end: 'bottom 40%',
            scrub: 1.2,
          },
        });
      });

      // 3. Dynamic Number Count-Up Animations Triggered On Scroll
      const animateCounter = (
        target: HTMLSpanElement | null,
        endVal: number,
        decimals: number,
        prefix: string = '',
        suffix: string = ''
      ) => {
        if (!target) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: endVal,
          duration: 2.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: target,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
          onUpdate: () => {
            target.textContent = `${prefix}${obj.val.toFixed(decimals)}${suffix}`;
          },
        });
      };

      animateCounter(stat1Ref.current, 4.82, 2, '-', ' kPa');
      animateCounter(stat2Ref.current, 1840, 0, '', ' kg');
      animateCounter(stat3Ref.current, 352.4, 1, '', ' km/h');
      animateCounter(stat4Ref.current, 18.2, 1, '', ' mm');

      // 4. Staggered Card Entrances
      gsap.from('.aero-bridge-card', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1.0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-28 px-6 sm:px-12 md:px-20 bg-[#F4F2EB] text-[#111215] border-t border-b border-[#E5E2DA] overflow-hidden select-none"
    >
      {/* Background Architectural Drafting Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#111215 1px, transparent 1px), linear-gradient(90deg, #111215 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }}
      />

      {/* Continuous Infinite Background Marquee Ribbon */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none opacity-40">
        <InfiniteEditorialMarquee text="VENTURI GROUND EFFECT · STATIC PRESSURE DROP · AERO CHORD MOMENTUM ·" speedSec={32} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-14">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E2DA] pb-8">
          <div className="flex flex-col gap-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-[0.22em] text-[#5C6068]">
              <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
              <span>INTERSTITIAL 02 // 03 · GROUND-EFFECT AERODYNAMIC MATRIX</span>
            </div>
            <h2
              ref={headlineRef}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-[#111215] leading-[1.08]"
            >
              The Venturi Gradient. <br />
              <span className="font-editorial italic font-normal text-[#0284C7]">
                Sculpting Suction Under the Floor.
              </span>
            </h2>
          </div>

          <p className="text-sm font-sans text-[#5C6068] max-w-md leading-relaxed">
            As the 2026 monocoque approaches terminal velocity, the underfloor Venturi throat contracts to an 18mm air gap,
            converting atmospheric speed into 1.8 metric tons of vortex ground-effect downforce.
          </p>
        </div>

        {/* Dynamic Animated Vector Isobar Streamline Display */}
        <div className="relative p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#E5E2DA] shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="flex items-center justify-between mb-6 text-xs font-mono font-bold text-[#111215]">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-[#0284C7]" />
              <span>ISOBAR PRESSURE & VELOCITY STREAMLINES (CFD RUN #8,420)</span>
            </div>
            <span className="text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
              LAMINAR GROUND ATTACHMENT · NOMINAL
            </span>
          </div>

          {/* SVG Animated Pressure Waves */}
          <div className="w-full h-36 sm:h-44 relative">
            <svg
              viewBox="0 0 1000 160"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DFD9CC" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#0284C7" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#D43811" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#2E5339" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="streamGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#0284C7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#DFD9CC" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Upper Streamline */}
              <path
                ref={stream1Ref}
                d="M 0 40 Q 250 40, 420 18 T 680 50 T 1000 40"
                fill="none"
                stroke="url(#streamGrad2)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Main Venturi Throat Depressed Path */}
              <path
                ref={pathRef}
                d="M 0 95 Q 220 95, 380 142 T 580 30 T 820 105 T 1000 95"
                fill="none"
                stroke="url(#streamGrad1)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Lower Boundary Layer Streamline */}
              <path
                ref={stream2Ref}
                d="M 0 135 Q 280 135, 420 152 T 700 115 T 1000 135"
                fill="none"
                stroke="url(#streamGrad2)"
                strokeWidth="1.8"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />

              {/* Critical Apex Point Indicator */}
              <circle
                cx="380"
                cy="142"
                r="5"
                fill="#D43811"
                stroke="#FAF9F6"
                strokeWidth="2.5"
                className="animate-pulse"
              />
            </svg>

            {/* Throat Minimum Label Callout */}
            <div className="absolute top-[68%] left-[38%] -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111215] text-[#FAF9F6] text-[10px] font-mono shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D43811] animate-ping" />
              <span>MIN THROAT 18MM · MAX SUCTION</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#8C8F98] pt-4 border-t border-[#E5E2DA] mt-4">
            <span>STAGNATION INTAKE [0.0M]</span>
            <span className="hidden sm:inline">VENTURI EXPANSION TUNNEL [2.4M]</span>
            <span>UPWARD DIFFUSER WAKE [5.2M]</span>
          </div>
        </div>

        {/* 4 Dynamic Animated Telemetry Readout Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="aero-bridge-card p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-[#E5E2DA] flex flex-col justify-between">
            <span className="text-[11px] font-mono text-[#8C8F98] uppercase tracking-wider">
              Throat Depression
            </span>
            <span
              ref={stat1Ref}
              className="text-2xl sm:text-3xl font-numeric font-black text-[#0284C7] mt-3 tabular-nums"
            >
              -4.82 kPa
            </span>
            <span className="text-[10px] font-sans text-[#5C6068] mt-2">
              Low-pressure floor suction
            </span>
          </div>

          <div className="aero-bridge-card p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-[#E5E2DA] flex flex-col justify-between">
            <span className="text-[11px] font-mono text-[#8C8F98] uppercase tracking-wider">
              Peak Downforce
            </span>
            <span
              ref={stat2Ref}
              className="text-2xl sm:text-3xl font-numeric font-black text-[#111215] mt-3 tabular-nums"
            >
              1840 kg
            </span>
            <span className="text-[10px] font-sans text-[#5C6068] mt-2">
              @ 320 km/h baseline velocity
            </span>
          </div>

          <div className="aero-bridge-card p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-[#E5E2DA] flex flex-col justify-between">
            <span className="text-[11px] font-mono text-[#8C8F98] uppercase tracking-wider">
              Terminal Velocity
            </span>
            <span
              ref={stat3Ref}
              className="text-2xl sm:text-3xl font-numeric font-black text-[#D43811] mt-3 tabular-nums"
            >
              352.4 km/h
            </span>
            <span className="text-[10px] font-sans text-[#5C6068] mt-2">
              Main straight DRS deployed
            </span>
          </div>

          <div className="aero-bridge-card p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-[#E5E2DA] flex flex-col justify-between">
            <span className="text-[11px] font-mono text-[#8C8F98] uppercase tracking-wider">
              Static Floor Gap
            </span>
            <span
              ref={stat4Ref}
              className="text-2xl sm:text-3xl font-numeric font-black text-[#2E5339] mt-3 tabular-nums"
            >
              18.2 mm
            </span>
            <span className="text-[10px] font-sans text-[#5C6068] mt-2">
              Dynamic heave damper travel
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
