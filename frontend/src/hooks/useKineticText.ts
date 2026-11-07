// frontend/src/hooks/useKineticText.ts
/**
 * PROJECT VELOCE // MASTER KINETIC TEXT HOOK
 * Per-character/per-word optical blur-in reveal (filter: blur(14px) -> blur(0px), y: 32px -> 0px, opacity: 0 -> 1)
 * coupled with Lenis scroll velocity-reactive typographic skew:
 * skewX = clamp(-2.5deg, v_scroll * 0.0035, +2.5deg).
 * Non-destructive: preserves nested tags, font pairings, and accessibility.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitTextNonDestructive } from '../utils/domTextSplitter';
import { getActiveLenis } from '../utils/motionMasterTicker';

gsap.registerPlugin(ScrollTrigger);

export interface KineticTextOptions {
  mode?: 'chars' | 'words';
  stagger?: number;          // Stagger delay between glyphs (default: 0.018s)
  duration?: number;         // Animation duration (default: 0.85s)
  yOffset?: number;          // Initial vertical translation (default: 32px)
  blurPx?: number;           // Initial optical blur radius (default: 14px)
  enableVelocitySkew?: boolean; // Enable scroll velocity skew (default: true)
  maxSkewDeg?: number;       // Clamped maximum skew angle in degrees (default: 2.5deg)
  skewMultiplier?: number;   // Velocity multiplier (default: 0.0035)
  triggerOnScroll?: boolean; // Trigger via ScrollTrigger (default: true)
  scrollStart?: string;      // ScrollTrigger trigger point (default: 'top 86%')
}

export function useKineticText<T extends HTMLElement = HTMLHeadingElement>(
  options: KineticTextOptions = {}
) {
  const {
    mode = 'chars',
    stagger = 0.018,
    duration = 0.85,
    yOffset = 32,
    blurPx = 14,
    enableVelocitySkew = true,
    maxSkewDeg = 2.5,
    skewMultiplier = 0.0035,
    triggerOnScroll = true,
    scrollStart = 'top 86%',
  } = options;

  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Protection against tall letter ascender/descender clipping
    el.style.paddingTop = '0.15em';
    el.style.marginTop = '-0.15em';
    el.style.overflow = 'visible';
    el.style.willChange = 'transform';

    // 1. Non-destructively split DOM tree
    const splitResult = splitTextNonDestructive(el, {
      splitMode: mode === 'chars' ? 'both' : 'words',
      charClass: 'veloce-kinetic-glyph',
      wordClass: 'veloce-kinetic-word',
    });

    const targets = mode === 'chars' ? splitResult.chars : splitResult.words;
    if (targets.length === 0) return;

    // 2. Optical Blur-In Animation
    const revealTimeline = gsap.fromTo(
      targets,
      {
        y: yOffset,
        opacity: 0,
        filter: `blur(${blurPx}px)`,
      },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        stagger,
        duration,
        ease: 'power3.out',
        scrollTrigger: triggerOnScroll
          ? {
              trigger: el,
              start: scrollStart,
              toggleActions: 'play none none none',
            }
          : undefined,
        onComplete: () => {
          // CRITICAL RETINA FIX: Clear filter property to restore native subpixel font anti-aliasing
          gsap.set(targets, { clearProps: 'filter' });
        },
      }
    );

    // 3. Lenis Velocity-Reactive Typographic Skew (skewX)
    let skewSetter: gsap.QuickToFunc | null = null;
    let lenisUnsub: (() => void) | null = null;
    let velocityTrigger: ScrollTrigger | null = null;

    if (enableVelocitySkew) {
      skewSetter = gsap.quickTo(el, 'skewX', {
        duration: 0.45,
        ease: 'power2.out',
      });

      const lenis = getActiveLenis();
      if (lenis) {
        // Direct subscription to active Lenis scroll engine
        const handleScroll = (e: { velocity: number }) => {
          if (!skewSetter) return;
          const rawSkew = e.velocity * skewMultiplier;
          const clampedSkew = Math.max(-maxSkewDeg, Math.min(maxSkewDeg, rawSkew));
          skewSetter(clampedSkew);
        };
        lenis.on('scroll', handleScroll);
        lenisUnsub = () => lenis.off('scroll', handleScroll);
      } else {
        // Fallback to ScrollTrigger velocity estimator
        velocityTrigger = ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            if (!skewSetter) return;
            const v = self.getVelocity();
            const rawSkew = v * skewMultiplier * 0.05;
            const clampedSkew = Math.max(-maxSkewDeg, Math.min(maxSkewDeg, rawSkew));
            skewSetter(clampedSkew);
          },
        });
      }
    }

    // 4. Clean Lifecycle Teardown
    return () => {
      revealTimeline.kill();
      if (lenisUnsub) lenisUnsub();
      if (velocityTrigger) velocityTrigger.kill();
      if (skewSetter) skewSetter(0);
      splitResult.revert();
      gsap.set(el, { clearProps: 'transform,skewX,willChange' });
    };
  }, [
    mode,
    stagger,
    duration,
    yOffset,
    blurPx,
    enableVelocitySkew,
    maxSkewDeg,
    skewMultiplier,
    triggerOnScroll,
    scrollStart,
  ]);

  return containerRef;
}
