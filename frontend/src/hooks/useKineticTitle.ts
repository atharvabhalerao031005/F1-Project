// frontend/src/hooks/useKineticTitle.ts
/**
 * VELOCE V2 // KINETIC TYPOGRAPHY HOOK
 * Direct non-clipping GSAP entrance animation (y: 36, opacity: 0 -> y: 0, opacity: 1)
 * with paddingTop: 0.15em and velocity skew clamped strictly within +/- 3.5 degrees.
 * Strictly preserves nested <span> tags (e.g. Instrument Serif italics) and zero overflow clipping.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface KineticTitleOptions {
  enableScrollSkew?: boolean;
  maxSkewDeg?: number;
  staggerDelay?: number;
  triggerOnScroll?: boolean;
}

export function useKineticTitle(options: KineticTitleOptions = {}) {
  const {
    enableScrollSkew = true,
    maxSkewDeg = 3.5,
    triggerOnScroll = true,
  } = options;

  const containerRef = useRef<HTMLHeadingElement | HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ensure adequate top padding so tall font ascenders (like "T", "d", accents) are never clipped
    el.style.paddingTop = '0.15em';
    el.style.overflow = 'visible';
    el.style.willChange = 'transform, opacity';

    // Direct clean entrance: y: 36 -> 0, opacity: 0 -> 1 with smooth power3.out easing
    const anim = gsap.fromTo(
      el,
      {
        y: 36,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.95,
        ease: 'power3.out',
        scrollTrigger: triggerOnScroll
          ? {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none',
            }
          : undefined,
      }
    );

    let velocityTrigger: ScrollTrigger | null = null;
    let skewSetter: gsap.QuickToFunc | null = null;

    if (enableScrollSkew) {
      skewSetter = gsap.quickTo(el, 'skewY', {
        duration: 0.45,
        ease: 'power2.out',
      });

      velocityTrigger = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          if (!skewSetter) return;
          const velocity = self.getVelocity();
          // Normalize velocity and clamp strictly to [-maxSkewDeg, +maxSkewDeg]
          const rawSkew = (velocity / 1200) * 1.5;
          const clampedSkew = Math.max(-maxSkewDeg, Math.min(maxSkewDeg, rawSkew));
          skewSetter(clampedSkew);
        },
      });
    }

    return () => {
      anim.kill();
      if (velocityTrigger) velocityTrigger.kill();
      gsap.set(el, { clearProps: 'transform,opacity,skewY' });
    };
  }, [enableScrollSkew, maxSkewDeg, triggerOnScroll]);

  return containerRef;
}
