// frontend/src/hooks/useMagneticPill.ts
/**
 * VELOCE V2 // MAGNETIC PILL CURSOR ATTRACTION HOOK
 * Attracts interactive buttons toward the cursor when within 80px radius
 * with quadratic falloff (K_pull = 0.38) and damped spring return.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useMagneticPill<T extends HTMLElement = HTMLElement>(
  radius: number = 80,
  kPull: number = 0.38
) {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const falloff = Math.pow(1 - dist / radius, 2);
        xTo(dx * kPull * falloff);
        yTo(dy * kPull * falloff);
      } else {
        xTo(0);
        yTo(0);
      }
    };

    const handleMouseLeave = () => {
      xTo(0);
      yTo(0);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      xTo(0);
      yTo(0);
    };
  }, [radius, kPull]);

  return elementRef;
}
