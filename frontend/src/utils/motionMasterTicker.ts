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
    lerp: 0.08,             // Virtual inertial damping factor (half-life ~8.3 frames)
    duration: 1.2,          // Programmatic transition duration (seconds)
    smoothWheel: true,      // Virtual smoothing for notched mouse wheels
    syncTouch: false,       // Maintain 1:1 hardware touch fidelity on mobile
    wheelMultiplier: 1.0,   // Standard wheel sensitivity
    touchMultiplier: 1.5,   // Elevated touch drag velocity
  });

  // Notify ScrollTrigger whenever Lenis updates virtual scroll position
  lenis.on('scroll', ScrollTrigger.update);

  // Single authoritative tick callback slaved to GSAP master clock
  const masterTickCallback = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(masterTickCallback);
  // lagSmoothing(0) prevents GSAP from skipping frames under brief spikes, ensuring exact 3D sync
  gsap.ticker.lagSmoothing(0);

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
