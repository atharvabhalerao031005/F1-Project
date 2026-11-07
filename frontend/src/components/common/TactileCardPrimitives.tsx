// frontend/src/components/common/TactileCardPrimitives.tsx
import React, { useRef, useEffect, useId } from 'react';

// ============================================================================
// 1. TACTILE ACOUSTIC HAPTICS (12ms Web Audio Synthetic Detent)
// ============================================================================
export function playAcousticDetent(frequency = 1150) {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.012);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.014);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(4);
    }
  } catch {
    // Audio context was blocked or not allowed
  }
}

// ============================================================================
// 2. 3D SUBPIXEL CARD DEPTH TILT HOOK
// ============================================================================
export function useCardTilt3D<T extends HTMLElement = HTMLDivElement>(maxTiltDeg = 3.5) {
  const cardRef = useRef<T | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = (x / rect.width) * 2 - 1; // -1 to +1
      const ny = (y / rect.height) * 2 - 1;
      targetY = nx * maxTiltDeg;  // rotateY
      targetX = -ny * maxTiltDeg; // rotateX
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const loop = () => {
      // Damped harmonic lerp (silky smooth settle)
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      el.style.transform = `perspective(1000px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) translateZ(0)`;
      rafId = requestAnimationFrame(loop);
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafId);
      el.style.transform = 'none';
    };
  }, [maxTiltDeg]);

  return cardRef;
}

// ============================================================================
// 3. TACTILE SURFACE CARD CONTAINER
// ============================================================================
interface TactileSurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'ceramic' | 'frosted-quartz' | 'milled-stone';
  enableTilt?: boolean;
}

export const TactileSurfaceCard: React.FC<TactileSurfaceCardProps> = ({
  children,
  className = '',
  variant = 'ceramic',
  enableTilt = true,
  ...props
}) => {
  const tiltRef = useCardTilt3D<HTMLDivElement>(enableTilt ? 3.0 : 0);

  const variantStyles = {
    ceramic:
      'bg-[#F2F0EB]/90 backdrop-blur-2xl border border-[#E5E2DA] shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.95),0_4px_20px_-2px_rgba(17,18,21,0.035),0_12px_48px_-6px_rgba(17,18,21,0.025)]',
    'frosted-quartz':
      'bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[inset_0_1px_2px_0_rgba(255,255,255,1.0),0_8px_32px_-4px_rgba(17,18,21,0.04)]',
    'milled-stone':
      'bg-[#ECEAE4]/95 backdrop-blur-xl border border-[#DFDBCF] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.85),0_6px_24px_-3px_rgba(17,18,21,0.03)]',
  }[variant];

  return (
    <div
      ref={tiltRef}
      className={`relative rounded-3xl p-7 text-[#111215] transition-shadow duration-300 hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,1.0),0_16px_56px_-8px_rgba(17,18,21,0.065)] ${variantStyles} ${className}`}
      style={{ willChange: 'transform' }}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// 4. BESPOKE HOROLOGICAL CHRONOMETER DIAL (SVG)
// ============================================================================
interface HorologicalDialProps {
  label: string;
  sublabel?: string;
  value: number | string;
  unit?: string;
  min?: number;
  max?: number;
  numericValue?: number;
  color?: string;
  size?: number;
}

export const HorologicalChronometerDial: React.FC<HorologicalDialProps> = ({
  label,
  sublabel,
  value,
  unit = '',
  min = 0,
  max = 100,
  numericValue,
  color = '#C8BFAC', // Champagne Quartz default
  size = 72,
}) => {
  const actualNum = numericValue ?? (typeof value === 'number' ? value : parseFloat(String(value)) || 0);
  const normalized = Math.max(0, Math.min(1, (actualNum - min) / (max - min || 1)));

  const radius = size * 0.40;
  const strokeWidth = size * 0.055;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // Sweep arc: 260 degrees arc (from 140deg to 400deg)
  const arcLength = circumference * (260 / 360);
  const strokeDashoffset = arcLength * (1 - normalized);

  // Generate 24 precision horological tick marks
  const tickCount = 24;
  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    const angleDeg = 140 + (i / (tickCount - 1)) * 260;
    const angleRad = (angleDeg * Math.PI) / 180;
    const isMajor = i % 4 === 0;
    const innerR = radius - (isMajor ? size * 0.09 : size * 0.05);
    const outerR = radius - size * 0.015;

    const x1 = center + innerR * Math.cos(angleRad);
    const y1 = center + innerR * Math.sin(angleRad);
    const x2 = center + outerR * Math.cos(angleRad);
    const y2 = center + outerR * Math.sin(angleRad);

    return { x1, y1, x2, y2, isMajor };
  });

  return (
    <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/60 border border-[#E5E2DA] shadow-sm hover:border-[#DFDBCF] transition-all">
      <div className="flex flex-col">
        <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-[#5C6068]">
          {label}
        </span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-extrabold font-numeric text-[#111215] tabular-nums tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-numeric font-medium text-[#8C8F98]">
              {unit}
            </span>
          )}
        </div>
        {sublabel && (
          <span className="text-[11px] font-sans text-[#7A7E85] mt-1">
            {sublabel}
          </span>
        )}
      </div>

      {/* Analog Horological Dial */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Outer Bezel Rim */}
          <circle
            cx={center}
            cy={center}
            r={radius + strokeWidth * 0.8}
            fill="none"
            stroke="#E5E2DA"
            strokeWidth="0.8"
          />

          {/* Precision Horological Ticks */}
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isMajor ? '#8C8F98' : '#C8BFAC'}
              strokeWidth={t.isMajor ? '1.2' : '0.6'}
              strokeLinecap="round"
            />
          ))}

          {/* Background Arc Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#EAE7DF"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            transform={`rotate(140 ${center} ${center})`}
            strokeLinecap="round"
          />

          {/* Active Sweep Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(140 ${center} ${center})`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />

          {/* Center Jewel Pivot */}
          <circle cx={center} cy={center} r={size * 0.05} fill="#111215" />
          <circle cx={center} cy={center} r={size * 0.02} fill="#FAF9F6" />
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 5. SEGMENTED PHYSICAL GAUGE (Milled Slot Relief)
// ============================================================================
interface SegmentedGaugeProps {
  label: string;
  value: number | string;
  segmentsCount?: number;
  activeSegments?: number;
  color?: string;
  caption?: string;
}

export const SegmentedPhysicalGauge: React.FC<SegmentedGaugeProps> = ({
  label,
  value,
  segmentsCount = 14,
  activeSegments = 9,
  color = '#2E5339', // Racing Sage
  caption,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-white/60 border border-[#E5E2DA] shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-[#5C6068]">
          {label}
        </span>
        <span className="text-xl font-extrabold font-numeric text-[#111215] tabular-nums">
          {value}
        </span>
      </div>

      {/* Recessed Milled Slot Relief */}
      <div className="p-1 rounded-xl bg-[#E8E5DD] shadow-[inset_0_1.5px_3px_rgba(17,18,21,0.08)] flex gap-1">
        {Array.from({ length: segmentsCount }).map((_, i) => {
          const isActive = i < activeSegments;
          return (
            <div
              key={i}
              className="h-2 flex-1 rounded-sm transition-all duration-300"
              style={{
                backgroundColor: isActive ? color : 'rgba(255, 255, 255, 0.45)',
                boxShadow: isActive ? '0 1px 2px rgba(17,18,21,0.1)' : 'none',
              }}
            />
          );
        })}
      </div>

      {caption && (
        <span className="text-[10px] font-sans text-[#7A7E85] mt-2 block">
          {caption}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 6. TACTILE KNURLED SLIDER (Aerospace Milled Track)
// ============================================================================
interface KnurledSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  detentStep?: number;
  onChange: (val: number) => void;
  sublabel?: string;
}

export const TactileKnurledSlider: React.FC<KnurledSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  detentStep = 5,
  onChange,
  sublabel,
}) => {
  const sliderId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (Math.abs(val % detentStep) < 0.001) {
      playAcousticDetent();
    }
    onChange(val);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-sans">
        <label htmlFor={sliderId} className="font-semibold text-[#5C6068] uppercase tracking-wider text-[11px]">
          {label}
        </label>
        <span className="font-numeric font-bold text-sm text-[#111215] tabular-nums">
          {value} {unit}
        </span>
      </div>

      <div className="relative py-1">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="veloce-range-slider w-full cursor-grab active:cursor-grabbing"
        />
      </div>

      {sublabel && (
        <span className="text-[10px] font-sans text-[#8C8F98] block">
          {sublabel}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 7. PARAMETRIC TELEMETRY SPARKLINE (SVG)
// ============================================================================
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showConfidenceBand?: boolean;
}

export const TelemetrySparkline: React.FC<SparklineProps> = ({
  data,
  width = 240,
  height = 54,
  color = '#2E5339',
  showConfidenceBand = true,
}) => {
  if (!data || data.length < 2) return null;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - 8) + 4;
    const y = height - 8 - ((val - minVal) / range) * (height - 16);
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>

      {showConfidenceBand && <rect x="0" y="0" width={width} height={height} fill={color} opacity="0.02" rx="4" />}
      {/* Shaded Area Fill */}
      <path d={areaD} fill={`url(#sparkline-grad-${color})`} />

      {/* Main Spline */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />

      {/* End Point Pip */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={color}
        stroke="#FAF9F6"
        strokeWidth="1.5"
      />
    </svg>
  );
};
