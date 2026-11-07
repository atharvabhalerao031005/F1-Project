// frontend/src/components/common/LiveEditorialPrimitives.tsx
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 1. Continuous Infinite Background Marquee Ribbon (0% CPU CSS Compositor Animation)
 * Adds massive editorial scale & constant motion behind sections.
 */
export const InfiniteEditorialMarquee: React.FC<{
  text: string;
  dark?: boolean;
  speedSec?: number;
}> = ({ text, dark = false, speedSec = 28 }) => {
  return (
    <div className="w-full overflow-hidden pointer-events-none select-none py-4">
      <div
        className={`flex whitespace-nowrap font-display font-extrabold text-[11vw] leading-none tracking-tighter ${
          dark ? 'text-white/[0.035]' : 'text-black/[0.04]'
        }`}
        style={{
          animation: `veloceMarquee ${speedSec}s linear infinite`,
        }}
      >
        <span className="pr-16">{text}</span>
        <span className="pr-16">{text}</span>
      </div>
      <style>{`
        @keyframes veloceMarquee {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
};

/**
 * 2. Scroll-Triggered Numeric Odometer Counter
 * Counts smoothly from 0 to target value every time the user scrolls it into view!
 */
export const AnimatedMetricCounter: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ value, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const obj = { val: 0 };

    const ctx = gsap.context(() => {
      gsap.fromTo(
        obj,
        { val: 0 },
        {
          val: value,
          duration: 1.4,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
          onUpdate: () => {
            if (el) {
              el.textContent = `${prefix}${obj.val.toFixed(decimals)}${suffix}`;
            }
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [value, decimals, prefix, suffix]);

  return (
    <span ref={spanRef} className={`tabular-nums ${className}`}>
      {prefix}0{suffix}
    </span>
  );
};

/**
 * 3. Interactive 3D Tilt & Spring-Reveal Editorial Card
 * Pops into view with spring physics on scroll and tilts subtly in 3D toward the cursor on hover.
 */
export const InteractiveSpringCard: React.FC<{
  children: React.ReactNode;
  index?: number;
  className?: string;
}> = ({ children, index = 0, className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 52, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.95,
          delay: index * 0.07,
          ease: 'back.out(1.25)',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [index]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${(nx * 5).toFixed(2)}deg) rotateX(${(-ny * 5).toFixed(2)}deg) translate3d(0, -2px, 0)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translate3d(0, 0, 0)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
};
