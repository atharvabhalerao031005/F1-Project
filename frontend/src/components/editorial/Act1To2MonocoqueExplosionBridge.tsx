// frontend/src/components/editorial/Act1To2MonocoqueExplosionBridge.tsx
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Act1To2MonocoqueExplosionBridge: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // 1. Horizontal Scroll-Pinned Editorial Filmstrip + Parallax Watermark
  useEffect(() => {
    const sec = sectionRef.current;
    const track = trackRef.current;
    if (!sec || !track) return;

    const ctx = gsap.context(() => {
      gsap.to(track, {
        xPercent: -66.666,
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 0.65,
        },
      });
    }, sec);

    return () => ctx.revert();
  }, []);

  // 2. Interactive 60 FPS Cursor-Reactive Wind-Tunnel Streamline Art Canvas
  useEffect(() => {
    const canvas = flowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let t = 0;

    const renderFlow = () => {
      t += 0.025;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x * w;
      const my = mouseRef.current.y * h;

      // Draw 36 silk-smooth aerodynamic pressure streamlines deflecting around cursor & airfoil
      const numLines = 36;
      for (let i = 0; i < numLines; i++) {
        const baseY = (h * 0.12) + (i / (numLines - 1)) * (h * 0.76);
        const isCenterStream = Math.abs(i - numLines / 2) < 5;

        ctx.beginPath();
        ctx.strokeStyle = isCenterStream
          ? 'rgba(232, 0, 32, 0.42)'
          : 'rgba(17, 18, 21, 0.10)';
        ctx.lineWidth = (isCenterStream ? 1.8 : 1.0) * dpr;

        for (let x = 0; x <= w; x += 18 * dpr) {
          const dx = x - mx;
          const dy = baseY - my;
          const distSq = dx * dx + dy * dy + 9000 * dpr * dpr;
          const push = (dy * 18000 * dpr * dpr) / distSq;
          const wave = Math.sin(x * 0.004 - t + i * 0.15) * 6 * dpr;
          const y = baseY + push + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      rafId = requestAnimationFrame(renderFlow);
    };

    rafId = requestAnimationFrame(renderFlow);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        };
      }}
      className="relative w-full h-screen overflow-hidden bg-[#F4F2EB] text-[#111215] select-none border-t border-black/5"
    >
      {/* Interactive 24/7 Background Streamline Art Canvas */}
      <canvas
        ref={flowCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
      />

      {/* 3-Panel Horizontal Scroll-Pinned Editorial Filmstrip (300vw wide) */}
      <div ref={trackRef} className="relative z-10 flex w-[300vw] h-full items-center">
        {/* PANEL 1: Ground Effect & Downforce */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            01 — Aerodynamic Philosophy
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                SCULPTED BY{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Invisible Pressure.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                Move your cursor across the pressure field. Twin underfloor Venturi tunnels accelerate
                airflow beneath the chassis, generating 68% of total downforce without the drag penalty
                of oversized wings.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Peak Downforce
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  1,840 <span className="text-lg font-normal text-[#7A7E85]">kg</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Floor Suction
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  -4.82 <span className="text-lg font-normal text-[#7A7E85]">kPa</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            GROUND EFFECT
          </div>
        </div>

        {/* PANEL 2: Thermal Tire Cliff */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20 border-l border-black/5">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            02 — Surface Grip &amp; Degradation
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                THE EDGE OF THE{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Thermal Cliff.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                Every lap burns 1.85 kg of fuel while shearing micro-layers of vulcanized rubber. Our
                Gompertz degradation model pinpoints the exact lap a compound crosses its thermal
                threshold.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Operating Window
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  105 <span className="text-lg font-normal text-[#7A7E85]">°C</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Fuel Effect
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  -0.032 <span className="text-lg font-normal text-[#7A7E85]">s/lap</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            TIRE PHYSICS
          </div>
        </div>

        {/* PANEL 3: Stochastic Race Strategy */}
        <div className="w-screen h-full flex flex-col justify-between px-12 md:px-24 py-20 border-l border-black/5">
          <div className="text-xs uppercase tracking-[0.25em] text-[#7A7E85] font-medium">
            03 — Predictive Intelligence
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.94] mb-6">
                2,500 RACES RUN{' '}
                <span className="font-serif italic font-normal text-[#E80020]">
                  Before Lights Out.
                </span>
              </h2>
              <p className="text-base md:text-lg text-[#4A4D55] max-w-xl leading-relaxed">
                By weighting historical pace against car dominance, microclimate, and track layout, the
                simulation engine evaluates thousands of pit-window outcomes in milliseconds.
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 border-l border-black/10 pl-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Monte Carlo Runs
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                  2,500
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#7A7E85] mb-1">
                  Circuits Mapped
                </div>
                <div className="font-display text-4xl md:text-5xl font-bold tabular-nums text-[#E80020]">
                  24 <span className="text-lg font-normal text-[#7A7E85]">GP</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11vw] font-display font-extrabold tracking-tighter leading-none text-black/[0.04] pointer-events-none">
            RACE ORACLE
          </div>
        </div>
      </div>
    </section>
  );
};
