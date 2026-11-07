// frontend/src/components/editorial/CircuitTopographySvg.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { getCircuitSplineBundle } from '../../utils/fiaCircuitsDatabase';

interface CircuitTopographySvgProps {
  circuitId: string;
  className?: string;
  showContours?: boolean;
}

export const CircuitTopographySvg: React.FC<CircuitTopographySvgProps> = ({
  circuitId,
  className = '',
  showContours = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bundle = useMemo(() => getCircuitSplineBundle(circuitId), [circuitId]);

  // Project 3D centerline points to 2.5D axonometric SVG plane
  const projectedData = useMemo(() => {
    const rawPts = bundle.centerlinePoints;
    if (!rawPts || rawPts.length === 0) return null;

    // 1. Calculate Centroid and Elevation Range
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    rawPts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const cX = (minX + maxX) / 2;
    const cZ = (minZ + maxZ) / 2;
    const elevSpan = Math.max(1, maxY - minY);

    // Projection Angles
    const theta = (-24 * Math.PI) / 180; // Azimuth
    const phi = (34 * Math.PI) / 180;   // Tilt
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const sinP = Math.sin(phi);
    const elevGain = 18.5; // Amplification for dramatic elevation visibility

    // Transform points
    const transformed = rawPts.map((p, idx) => {
      const rx = p.x - cX;
      const rz = p.z - cZ;
      const normY = (p.y - minY) / elevSpan;

      // 2.5D coordinates
      const u = rx * cosT - rz * sinT;
      const vElev = (rx * sinT + rz * cosT) * sinP - normY * elevGain;
      const vGround = (rx * sinT + rz * cosT) * sinP;

      return {
        u,
        vElev,
        vGround,
        normY,
        origY: p.y,
        idx,
      };
    });

    // Compute bounding box in (u, v) space
    let uMin = Infinity, uMax = -Infinity;
    let vMin = Infinity, vMax = -Infinity;

    transformed.forEach((t) => {
      if (t.u < uMin) uMin = t.u;
      if (t.u > uMax) uMax = t.u;
      if (t.vElev < vMin) vMin = t.vElev;
      if (t.vElev > vMax) vMax = t.vElev;
      if (t.vGround < vMin) vMin = t.vGround;
      if (t.vGround > vMax) vMax = t.vGround;
    });

    const uSpan = Math.max(10, uMax - uMin);
    const vSpan = Math.max(10, vMax - vMin);

    // Map to SVG viewBox (0, 0, 960, 560) with 14% breathing room
    const targetW = 960;
    const targetH = 560;
    const padX = targetW * 0.12;
    const padY = targetH * 0.14;
    const scale = Math.min((targetW - padX * 2) / uSpan, (targetH - padY * 2) / vSpan);

    const svgElevPts = transformed.map((t) => ({
      x: (t.u - uMin) * scale + padX,
      y: (t.vElev - vMin) * scale + padY,
      normY: t.normY,
      origY: t.origY,
      idx: t.idx,
    }));

    const svgGroundPts = transformed.map((t) => ({
      x: (t.u - uMin) * scale + padX,
      y: (t.vGround - vMin) * scale + padY,
    }));

    // SVG Path Generators
    const elevPath = svgElevPts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '') + ' Z';
    const groundPath = svgGroundPts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '') + ' Z';

    // Rib Isolines connecting ground to elevated track (sampled every N points)
    const step = Math.max(4, Math.floor(svgElevPts.length / 28));
    const ribs = [];
    for (let i = 0; i < svgElevPts.length; i += step) {
      ribs.push({
        x1: svgGroundPts[i].x,
        y1: svgGroundPts[i].y,
        x2: svgElevPts[i].x,
        y2: svgElevPts[i].y,
        normY: svgElevPts[i].normY,
      });
    }

    // Sector points (S1: 32%, S2: 72%, SF: 0%)
    const s1Idx = Math.floor(svgElevPts.length * 0.32);
    const s2Idx = Math.floor(svgElevPts.length * 0.72);
    const sfIdx = 0;

    // DRS Speed Trap (approx 88% along circuit)
    const drsIdx = Math.floor(svgElevPts.length * 0.88);

    return {
      elevPath,
      groundPath,
      ribs,
      svgElevPts,
      sectors: [
        { name: 'SF', label: 'FINISH', pt: svgElevPts[sfIdx] },
        { name: 'S1', label: 'SECTOR 1', pt: svgElevPts[s1Idx] },
        { name: 'S2', label: 'SECTOR 2', pt: svgElevPts[s2Idx] },
      ],
      speedTrap: svgElevPts[drsIdx],
      elevDeltaM: bundle.circuit.elevationChangeM,
    };
  }, [bundle]);

  // Subtle Ambient Kinetic Drift Animation (Sinusoidal floating breath)
  useEffect(() => {
    let animId: number;
    let t = 0;
    const el = containerRef.current;
    if (!el) return;

    const tick = () => {
      t += 0.016;
      const driftX = Math.sin(t * 0.45) * 2.5 + Math.cos(t * 0.72) * 1.2;
      const driftY = Math.cos(t * 0.52) * 2.2 + Math.sin(t * 0.88) * 0.8;
      const tilt = Math.sin(t * 0.38) * 0.6;

      el.style.transform = `translate3d(${driftX.toFixed(2)}px, ${driftY.toFixed(2)}px, 0px) rotate(${tilt.toFixed(2)}deg)`;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!projectedData) return null;

  return (
    <div className={`relative w-full aspect-[16/9.5] select-none ${className}`}>
      <div ref={containerRef} className="w-full h-full will-change-transform transition-transform duration-75">
        <svg viewBox="0 0 960 560" className="w-full h-full overflow-visible">
          <defs>
            {/* Linear Gradient for Elevated Racing Ribbon */}
            <linearGradient id="elevationGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#111215" />
              <stop offset="50%" stopColor="#2E333D" />
              <stop offset="85%" stopColor="#8A7D65" />
              <stop offset="100%" stopColor="#C8A97E" />
            </linearGradient>

            {/* Subtle Ground Shadow Blur Filter */}
            <filter id="ceramicGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
              <feOffset dx="0" dy="8" />
              <feComponentTransfer><feFuncA type="linear" slope="0.08" /></feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Topographic Elevation Contour Isobaths */}
          {showContours && (
            <g className="opacity-45 pointer-events-none">
              <path
                d={projectedData.groundPath}
                fill="none"
                stroke="#E5E2DA"
                strokeWidth="18"
                strokeOpacity="0.35"
                strokeLinejoin="round"
              />
              <path
                d={projectedData.groundPath}
                fill="none"
                stroke="#C8A97E"
                strokeWidth="38"
                strokeOpacity="0.12"
                strokeLinejoin="round"
              />
              <path
                d={projectedData.groundPath}
                fill="none"
                stroke="#E5E2DA"
                strokeWidth="68"
                strokeOpacity="0.06"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 2. Ground Projection Shadow / Baseline Footprint */}
          <path
            d={projectedData.groundPath}
            fill="rgba(242, 240, 235, 0.45)"
            stroke="#DCD7CC"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeLinejoin="round"
          />

          {/* 3. Vertical Elevation Struts (Rib Cage) */}
          <g>
            {projectedData.ribs.map((r, i) => (
              <line
                key={i}
                x1={r.x1}
                y1={r.y1}
                x2={r.x2}
                y2={r.y2}
                stroke={r.normY > 0.5 ? '#C8A97E' : '#D5D0C5'}
                strokeWidth={r.normY > 0.6 ? '1.2' : '0.75'}
                strokeOpacity={0.65}
              />
            ))}
          </g>

          {/* 4. Elevated 3D Circuit Racing Ribbon */}
          <path
            d={projectedData.elevPath}
            fill="none"
            stroke="url(#elevationGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ceramicGlow)"
          />

          {/* 5. Sector Split Markers */}
          {projectedData.sectors.map((s, idx) => (
            <g key={idx} transform={`translate(${s.pt.x}, ${s.pt.y})`}>
              <circle r="3.5" fill="#FAF9F6" stroke="#111215" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="-18" stroke="#5C6068" strokeWidth="1" strokeDasharray="2 2" />
              <rect x="-24" y="-32" width="48" height="14" rx="3" fill="#F2F0EB" stroke="#E5E2DA" strokeWidth="0.75" />
              <text x="0" y="-23" textAnchor="middle" className="text-[7.5px] font-mono font-bold fill-[#111215] uppercase tracking-wider">
                {s.name}
              </text>
            </g>
          ))}

          {/* 6. DRS Speed Trap Vector Callout */}
          {projectedData.speedTrap && (
            <g transform={`translate(${projectedData.speedTrap.x}, ${projectedData.speedTrap.y})`}>
              {/* Pulsing Target Ring */}
              <circle r="5" fill="#FF4D2D" fillOpacity="0.18" className="animate-ping" />
              <circle r="3" fill="#FF4D2D" stroke="#FAF9F6" strokeWidth="1" />
              <line x1="0" y1="0" x2="28" y2="-24" stroke="#FF4D2D" strokeWidth="1.2" />
              
              {/* Tactical Speed Badge */}
              <g transform="translate(30, -34)">
                <rect width="98" height="20" rx="4" fill="#FAF9F6" stroke="#FF4D2D" strokeWidth="1" filter="url(#ceramicGlow)" />
                <text x="6" y="13" className="text-[8px] font-mono font-extrabold fill-[#FF4D2D] tracking-wider">
                  TRAP · 338.4 KM/H
                </text>
              </g>
            </g>
          )}

          {/* 7. Elevation Contour Delta Watermark */}
          <text
            x="32"
            y="520"
            className="text-[10px] font-mono font-bold fill-[#8C8F98] uppercase tracking-[0.2em]"
          >
            TOPOGRAPHIC DELTA: {projectedData.elevDeltaM}M · 2.5D AXONOMETRIC RIDGE
          </text>
        </svg>
      </div>
    </div>
  );
};
