// frontend/src/components/editorial/HorologicalChronometer.tsx
import React from 'react';

interface HorologicalChronometerProps {
  label: string;
  sublabel: string;
  value: string | number;
  unit?: string;
  progressPct: number; // 0 to 100
  accentColor?: string; // hex
  secondaryInfo: string;
  statusTag?: string;
}

export const HorologicalChronometer: React.FC<HorologicalChronometerProps> = ({
  label,
  sublabel,
  value,
  unit = '',
  progressPct,
  accentColor = '#C8BFAC',
  secondaryInfo,
  statusTag,
}) => {
  // SVG Circular Gauge Calculations
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, progressPct))) / 100;

  return (
    <div className="relative p-6 rounded-3xl bg-[rgba(242,240,235,0.85)] backdrop-blur-2xl border border-[rgba(229,226,218,0.9)] shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.9),0_4px_24px_-2px_rgba(17,18,21,0.035)] flex items-center justify-between group hover:border-[#111215]/30 transition-all duration-300">
      {/* Left Column: Tabular Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10.5px] font-sans font-bold uppercase tracking-[0.18em] text-[#5C6068]">
            {label}
          </span>
          {sublabel && <span className="text-[9.5px] text-[#8C8F98] font-mono">{sublabel}</span>}
          {statusTag && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#FAF9F6] text-[#111215] border border-[#E5E2DA]">
              {statusTag}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1 my-1">
          <span className="text-3xl sm:text-4xl font-extrabold font-numeric text-[#111215] tabular-nums tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-sans font-bold text-[#5C6068]">
              {unit}
            </span>
          )}
        </div>

        <span className="text-xs text-[#8C8F98] font-sans mt-0.5">
          {secondaryInfo}
        </span>
      </div>

      {/* Right Column: Swiss Chronometer Dial */}
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          {/* Subtle Outer Bezel Rim */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#E5E2DA"
            strokeWidth="2"
            strokeOpacity="0.8"
          />

          {/* Inner Drafting Ticks */}
          <circle
            cx="32"
            cy="32"
            r={radius - 4}
            fill="none"
            stroke="#D5D0C5"
            strokeWidth="0.75"
            strokeDasharray="1.5 4"
          />

          {/* Active Telemetry Sweep Arc */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Jewel Pip */}
        <div className="absolute w-2 h-2 rounded-full bg-[#111215] border border-white shadow-sm" />
      </div>
    </div>
  );
};
