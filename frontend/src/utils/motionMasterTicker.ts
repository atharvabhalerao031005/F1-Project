// frontend/src/utils/motionMasterTicker.ts
/**
 * VELOCE V2 // SINGLE-TICKER MOTION SYNCHRONIZATION ENGINE
 * Binds Lenis Smooth Scroll, GSAP Core, and ScrollTrigger to a single authoritative clock.
 * Eliminates dual-RAF jank and 1-frame desynchronization on 120Hz ProMotion displays.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export interface MasterTickerContext {
  lenis: Lenis;
  destroy: () => void;
}

let activeTickerContext: MasterTickerContext | null = null;

export function initializeMasterMotionTicker(): MasterTickerContext {
  if (activeTickerContext) {
    return activeTickerContext;
  }

  const lenis = new Lenis({
    lerp: 0.055,            // Velvety liquid luxury inertial damping
    duration: 1.45,         // Programmatic smooth scroll duration (seconds)
    smoothWheel: true,      // Virtual smoothing for notched mouse wheels
    syncTouch: false,       // Maintain 1:1 hardware touch fidelity on mobile
    wheelMultiplier: 0.9,   // Controlled weighted sensitivity across 2,100vh
    touchMultiplier: 1.5,   // Elevated touch drag velocity
  });

  // Notify ScrollTrigger whenever Lenis updates virtual scroll position
  lenis.on('scroll', ScrollTrigger.update);

  // Single authoritative tick callback slaved to GSAP master clock
  const masterTickCallback = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(masterTickCallback);
  // CRITICAL FIX: Restore lagSmoothing(500, 33).
  // Clamps frame delta spikes to 33ms so momentary GC pauses do NOT cause wild camera teleportation!
  gsap.ticker.lagSmoothing(500, 33);

  const context: MasterTickerContext = {
    lenis,
    destroy: () => {
      gsap.ticker.remove(masterTickCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      activeTickerContext = null;
    },
  };

  activeTickerContext = context;
  return context;
}

export function getActiveLenis(): Lenis | null {
  return activeTickerContext?.lenis ?? null;
}
