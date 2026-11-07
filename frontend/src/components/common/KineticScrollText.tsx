// frontend/src/components/common/KineticScrollText.tsx
/**
 * VELOCE PRO // KINETIC SCROLL REVEAL TYPOGRAPHY
 * High-performance GSAP ScrollTrigger kinetic text reveal.
 * Characters or words slide up from behind an invisible clipping mask (overflow-hidden)
 * with subtle optical blur-in and physical spring easing as elements enter the viewport.
 * 
 * Standard: Light Luxury Editorial (Swiss Haute Horlogerie)
 * Retains 100% accessible semantics and subpixel font rendering.
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface KineticScrollTextProps {
  children?: React.ReactNode;
  text?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  mode?: 'words' | 'chars';
  stagger?: number;
  duration?: number;
  delay?: number;
  threshold?: string; // e.g. "top 88%"
  accentWords?: string[];
  accentClass?: string;
}

export const KineticScrollText: React.FC<KineticScrollTextProps> = ({
  children,
  text,
  as: Component = 'h2',
  className = '',
  mode = 'words',
  stagger = 0.028,
  duration = 0.85,
  delay = 0,
  threshold = 'top 88%',
  accentWords = [],
  accentClass = 'font-editorial italic font-normal text-[#D43811]',
}) => {
  const containerRef = useRef<HTMLElement | null>(null);

  // If simple text is provided, tokenize it into words or characters
  const rawText = text || (typeof children === 'string' ? children : '');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.querySelectorAll('.kinetic-token-inner');
    if (targets.length === 0) return;

    gsap.set(targets, {
      yPercent: 115,
      opacity: 0,
      filter: 'blur(8px)',
    });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: threshold,
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          yPercent: 0,
          opacity: 1,
          filter: 'blur(0px)',
          stagger,
          duration,
          delay,
          ease: 'power3.out',
          onComplete: () => {
            // Clear filter to restore native retina subpixel anti-aliasing
            gsap.set(targets, { clearProps: 'filter' });
          },
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [stagger, duration, delay, threshold]);

  if (!rawText) {
    // Fallback if complex children passed
    return (
      <Component ref={containerRef as any} className={className}>
        {children}
      </Component>
    );
  }

  // Tokenize text into words
  const words = rawText.split(' ');

  return (
    <Component
      ref={containerRef as any}
      className={`${className} overflow-visible`}
      aria-label={rawText}
    >
      {words.map((word, wIdx) => {
        const isAccent = accentWords.some(
          (acc) => word.toLowerCase().includes(acc.toLowerCase())
        );

        if (mode === 'chars') {
          const chars = Array.from(word);
          return (
            <span
              key={`word-${wIdx}`}
              className="inline-block whitespace-nowrap mr-[0.25em]"
            >
              {chars.map((char, cIdx) => (
                <span
                  key={`char-${wIdx}-${cIdx}`}
                  className="inline-block overflow-hidden align-top"
                >
                  <span
                    className={`kinetic-token-inner inline-block transform-gpu will-change-transform ${
                      isAccent ? accentClass : ''
                    }`}
                  >
                    {char}
                  </span>
                </span>
              ))}
            </span>
          );
        }

        // Default mode === 'words'
        return (
          <span
            key={`word-${wIdx}`}
            className="inline-block overflow-hidden align-top mr-[0.25em]"
          >
            <span
              className={`kinetic-token-inner inline-block transform-gpu will-change-transform ${
                isAccent ? accentClass : ''
              }`}
            >
              {word}
            </span>
          </span>
        );
      })}
    </Component>
  );
};
