// frontend/src/utils/harmonicSpringEase.ts
/**
 * PROJECT VELOCE // DAMPED HARMONIC SPRING EASE (zeta = 0.82)
 * Pure mathematical implementation of sub-critically damped physical harmonic motion.
 * Replaces generic cubic-bezier(0.4, 0, 0.2, 1) and CSS transitions with authentic mechanical settling.
 */

import gsap from 'gsap';

export interface HarmonicSpringConfig {
  zeta?: number;      // Damping ratio (0.82 = liquid luxury, 1.1% overshoot)
  omegaN?: number;    // Natural angular frequency in rad/s (default 13.416)
  duration?: number;  // Settling duration in seconds (default 0.82)
}

/**
 * Evaluates normalized step displacement x(t) for a damped harmonic oscillator.
 * tNormalized is in [0, 1].
 */
export function evaluateHarmonicSpring(
  tNormalized: number,
  zeta: number = 0.82,
  omegaN: number = 13.416
): number {
  if (tNormalized <= 0) return 0;
  if (tNormalized >= 1) return 1;

  // Scale normalized time [0, 1] to physical settling domain (~0.45s physical)
  const physicalTime = tNormalized * (4.5 / (zeta * omegaN));
  const omegaD = omegaN * Math.sqrt(1 - zeta * zeta);
  const expDecay = Math.exp(-zeta * omegaN * physicalTime);
  const oscillation = Math.cos(omegaD * physicalTime) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * physicalTime);

  // Return step response: displacement from 0 to 1
  return 1 - expDecay * oscillation;
}

/**
 * Registers and returns a GSAP-compatible custom easing function based on physical harmonic springs.
 */
export function createHarmonicSpringEase(name: string = 'luxurySpring', config: HarmonicSpringConfig = {}): (progress: number) => number {
  const { zeta = 0.82, omegaN = 13.416 } = config;

  const easeFunc = (progress: number): number => {
    return evaluateHarmonicSpring(progress, zeta, omegaN);
  };

  // Register with GSAP so it can be referenced by string: ease: "luxurySpring"
  gsap.registerEase(name, easeFunc);
  return easeFunc;
}

// Automatically register default luxury spring on module import
export const luxurySpring = createHarmonicSpringEase('luxurySpring', { zeta: 0.82, omegaN: 13.416 });
