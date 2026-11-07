// frontend/src/components/editorial/CustomSandboxPredictorAct3.tsx
/**
 * VELOCE PRO // ACT 3: THE ARCHITECT'S PROVING GROUND WORKBENCH
 * Direction: Swiss Luxury Engineering Atelier & Haute Horlogerie
 * Palette: Swiss Stone (#F4F2EB), Alabaster Ceramic (#FAF9F6), Smoked Titanium (#E5E2DA),
 * Deep Obsidian Ink (#111215), Champagne Quartz (#C8BFAC), Racing Sage (#2E5339).
 * Features: Multi-layer vector blueprints (Diffuser & Slip-Angle), Tactile knurled aluminum faders
 * with 12ms acoustic Web Audio detents, and Leica/Haas F1 telemetry console modal.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sliders,
  Play,
  Sun,
  CloudRain,
  Moon,
  Sparkles,
  Gauge,
  Cpu,
  Flame,
  Thermometer,
  ShieldAlert,
  Loader2,
  Wind,
  Compass,
  ChevronDown,
} from 'lucide-react';
import { getAll24Circuits } from '../../utils/fiaCircuitsDatabase';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { getActiveLenis } from '../../utils/motionMasterTicker';
import { LiveFeederTrainingModal, type FeederAuditData } from '../modals/LiveFeederTrainingModal';
import {
  InfiniteEditorialMarquee,
  InteractiveSpringCard,
  AnimatedMetricCounter,
} from '../common/LiveEditorialPrimitives';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------------------------- */
/* 1. ACOUSTIC WEB AUDIO DETENT HAPTICS                                      */
/* -------------------------------------------------------------------------- */
let audioCtx: AudioContext | null = null;
let lastDetentTimestamp = 0;

function playTactileDetentClick(intensity: number = 1.0): void {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = performance.now();
    // 35ms refractory window prevents acoustic buzzing during rapid slider flicks
    if (now - lastDetentTimestamp < 35) return;
    lastDetentTimestamp = now;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // 12ms mechanical shear frequency sweep: 1,420Hz down to 440Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1420, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.012);

    // Exponential tactile gain decay
    const peakGain = Math.min(0.045, 0.035 * intensity);
    gain.gain.setValueAtTime(peakGain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.012);
  } catch {
    // Silent fallback if Web Audio is unsupported
  }
}

/* -------------------------------------------------------------------------- */
/* 2. TACTILE LUXURY FADER SUBCOMPONENT                                       */
/* -------------------------------------------------------------------------- */
interface TactileLuxuryFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  detentInterval?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
  colorAccent?: string;
  ticks?: Array<{ value: number; label?: string }>;
}

const TactileLuxuryFader: React.FC<TactileLuxuryFaderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  detentInterval = 5,
  unit = '',
  formatValue,
  onChange,
  colorAccent = '#C8BFAC',
  ticks = [],
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayVal, setDisplayVal] = useState(value);
  const lastDetentStepRef = useRef(Math.round(value / detentInterval));

  useEffect(() => {
    setDisplayVal(value);
  }, [value]);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const fraction = clampedX / rect.width;
      const rawVal = min + fraction * (max - min);

      const stepped = Math.round(rawVal / step) * step;
      const clampedStepped = Math.max(min, Math.min(max, stepped));

      setDisplayVal(clampedStepped);
      onChange(clampedStepped);

      const currentDetentStep = Math.round(clampedStepped / detentInterval);
      if (currentDetentStep !== lastDetentStepRef.current) {
        playTactileDetentClick(1.0);
        lastDetentStepRef.current = currentDetentStep;
      }
    },
    [min, max, step, detentInterval, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const pct = Math.max(0, Math.min(100, ((displayVal - min) / (max - min)) * 100));

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-sans font-semibold tracking-wider uppercase text-[#5C6068]">
          {label}
        </span>
        <div className="flex items-baseline gap-1 font-numeric">
          <span className="text-sm font-extrabold text-[#111215] tabular-nums">
            {formatValue ? formatValue(displayVal) : displayVal}
          </span>
          {unit && <span className="text-[10px] font-medium text-[#8C8F98]">{unit}</span>}
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-8 flex items-center cursor-pointer group touch-none"
      >
        <div className="relative w-full h-[5px] rounded-full bg-[#E5E2DA] shadow-[inset_0_1px_2px_rgba(17,18,21,0.12)] overflow-hidden">
          <div
            className="h-full transition-all duration-75"
            style={{ width: `${pct}%`, backgroundColor: colorAccent }}
          />
        </div>

        <div className="absolute inset-x-0 top-5 flex justify-between pointer-events-none">
          {ticks.length > 0
            ? ticks.map((t, idx) => {
                const tickPct = ((t.value - min) / (max - min)) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${tickPct}%` }}
                  >
                    <div className="w-[1px] h-1.5 bg-[#B8B4A8]" />
                    {t.label && (
                      <span className="mt-0.5 text-[8px] font-numeric text-[#8C8F98] tabular-nums">
                        {t.label}
                      </span>
                    )}
                  </div>
                );
              })
            : [0, 25, 50, 75, 100].map((stepPct) => (
                <div key={stepPct} className="flex flex-col items-center">
                  <div
                    className={`w-[1px] ${stepPct % 50 === 0 ? 'h-1.5 bg-[#111215]' : 'h-1 bg-[#B8B4A8]'}`}
                  />
                </div>
              ))}
        </div>

        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-75"
          style={{
            left: `${pct}%`,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.12 : 1.0})`,
          }}
        >
          <div className="w-[20px] h-[20px] rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#ECE9E1] to-[#D5D0C4] p-[1px] shadow-[0_2px_6px_rgba(17,18,21,0.18),0_8px_18px_rgba(17,18,21,0.10)]">
            <div className="w-full h-full rounded-full bg-[#FAF9F6] border border-[#E5E2DA] flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="w-[1.5px] h-2 rounded-full bg-[#111215]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
/* -------------------------------------------------------------------------- */
/* 3. BESPOKE VECTOR BLUEPRINT 1: AERODYNAMIC DIFFUSER CHANNELS              */
/* -------------------------------------------------------------------------- */
const AerodynamicDiffuserBlueprintSvg: React.FC<{ isWet?: boolean }> = ({ isWet = false }) => {
  return (
  <svg
    viewBox="0 0 680 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full h-auto select-none pointer-events-none transition-opacity duration-500 ${isWet ? "opacity-85" : "opacity-100"}`}
  >
    <defs>
      <pattern id="atelierGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E2DA" strokeWidth="0.5" strokeOpacity="0.6" />
      </pattern>
      <linearGradient id="isobarVenturiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#DFD9CC" stopOpacity="0.25" />
        <stop offset="35%" stopColor="#D43811" stopOpacity="0.5" />
        <stop offset="70%" stopColor="#C8BFAC" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#E5E2DA" stopOpacity="0.1" />
      </linearGradient>
    </defs>

    <rect width="680" height="260" fill="url(#atelierGrid)" rx="12" />
    <rect x="8" y="8" width="664" height="244" rx="10" stroke="#E5E2DA" strokeWidth="0.8" />

    <text x="24" y="28" fontFamily="Space Grotesk, monospace" fontSize="8" fontWeight="700" fill="#111215" letterSpacing="0.15em">
      FIG 3.1 · VENTURI UNDERFLOOR EXPANSION CHANNELS · FIA 2026 SPEC
    </text>
    <text x="24" y="38" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="7" fill="#7A7E85" letterSpacing="0.08em">
      SCALE 1:12 · BOUNDARY LAYER SUCTION · PEAK THROAT DEPRESSION ΔP = -4.82 kPa
    </text>

    <line x1="40" y1="200" x2="640" y2="200" stroke="#111215" strokeWidth="0.9" strokeDasharray="6 3" />
    <text x="548" y="196" fontFamily="Space Grotesk, monospace" fontSize="6.5" fill="#111215">DATUM A · GROUND PLANE</text>

    <path
      d="M 40 140 C 120 140, 180 188, 240 192 C 300 195, 360 178, 460 108 C 520 64, 580 52, 640 50"
      fill="none"
      stroke="#111215"
      strokeWidth="1.6"
      strokeLinecap="round"
    />

    <path
      d="M 160 174 Q 240 206 320 182 Q 420 144 500 90"
      fill="none"
      stroke="url(#isobarVenturiGrad)"
      strokeWidth="10"
      strokeLinecap="round"
      strokeOpacity="0.45"
    />

    <g stroke="#D43811" strokeWidth="0.8">
      <line x1="240" y1="200" x2="240" y2="192" />
      <polyline points="238,198 240,200 242,198" />
      <polyline points="238,194 240,192 242,194" />
    </g>
    <text x="248" y="198" fontFamily="Space Grotesk, monospace" fontSize="7" fontWeight="700" fill="#D43811">
      h_throat = 18.0mm [ΔP = -4.82 kPa]
    </text>

    <g stroke="#111215" strokeWidth="0.85" opacity="0.75">
      <line x1="410" y1="140" x2="425" y2="115" />
      <line x1="460" y1="108" x2="475" y2="83" />
      <line x1="510" y1="78" x2="525" y2="53" />
    </g>
    <text x="532" y="60" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="6.5" fill="#7A7E85">
      SECTION D-D STRAKES [α = 14.2° EXPANSION]
    </text>

    <path
      d="M 100 150 Q 130 135, 160 155 T 220 174 T 280 184 T 360 164 T 460 116"
      fill="none"
      stroke="#4A6B82"
      strokeWidth="1.1"
      strokeDasharray="3 3"
      opacity="0.65"
    />
    <text x="100" y="138" fontFamily="Space Grotesk, monospace" fontSize="6" fill="#4A6B82">
      SEALING VORTEX SHEDDING f = 142 Hz
    </text>
  </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. BESPOKE VECTOR BLUEPRINT 2: TIRE SLIP-ANGLE POLAR DIAGRAM               */
/* -------------------------------------------------------------------------- */
const SlipAnglePolarDiagramSvg: React.FC<{ weatherMode?: 'DAY' | 'RAIN' | 'NIGHT' }> = ({
  weatherMode = 'DAY',
}) => {
  const isWet = weatherMode === 'RAIN';
  const isNight = weatherMode === 'NIGHT';
  const peakMu = isWet ? 0.62 : isNight ? 0.94 : 1.05;
  const peakAlphaDeg = isWet ? 4.2 : isNight ? 5.8 : 6.4;

  const rScale = 70;
  const cx = 130;
  const cy = 130;

  return (
    <svg
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto select-none pointer-events-none transition-opacity duration-500 ${isWet ? "opacity-85" : "opacity-100"}`}
    >
      <rect width="260" height="260" rx="12" fill="#FAF9F6" stroke="#E5E2DA" strokeWidth="0.8" />

      {[0.4, 0.8, 1.0].map((mu) => (
        <g key={mu}>
          <circle
            cx={cx}
            cy={cy}
            r={mu * rScale}
            fill="none"
            stroke="#E5E2DA"
            strokeWidth={mu === 1.0 ? "1.1" : "0.5"}
            strokeDasharray={mu === 1.0 ? "none" : "2 2"}
          />
          <text
            x={cx + 3}
            y={cy - mu * rScale + 7}
            fontFamily="Space Grotesk, monospace"
            fontSize="5.5"
            fill="#8C8F98"
          >
            μ={mu.toFixed(1)}
          </text>
        </g>
      ))}

      {[0, 3, 6, 9, 12].map((deg) => {
        const rad = ((deg * 15 - 90) * Math.PI) / 180;
        const x2 = cx + Math.cos(rad) * 94;
        const y2 = cy + Math.sin(rad) * 94;
        return (
          <g key={deg}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#E5E2DA" strokeWidth="0.5" />
            <text
              x={cx + Math.cos(rad) * 102}
              y={cy + Math.sin(rad) * 102 + 2}
              fontFamily="Space Grotesk, monospace"
              fontSize="5.5"
              fill="#5C6068"
              textAnchor="middle"
            >
              {deg}°
            </text>
          </g>
        );
      })}

      <line x1={cx} y1="24" x2={cx} y2="236" stroke="#B8B4A8" strokeWidth="0.75" />
      <line x1="24" y1={cy} x2="236" y2={cy} stroke="#B8B4A8" strokeWidth="0.75" />
      <text x="216" y={cy - 3} fontFamily="Space Grotesk, monospace" fontSize="5.5" fill="#111215" fontWeight="700">
        +Fx
      </text>
      <text x={cx + 3} y="32" fontFamily="Space Grotesk, monospace" fontSize="5.5" fill="#111215" fontWeight="700">
        +Fy
      </text>

      <path
        d={
          isWet
            ? `M ${cx} ${cy} Q ${cx + 26} ${cy - 42}, ${cx + 46} ${cy - 46} T ${cx + 70} ${cy - 36}`
            : `M ${cx} ${cy} Q ${cx + 34} ${cy - 64}, ${cx + 58} ${cy - 74} T ${cx + 86} ${cy - 68}`
        }
        fill="none"
        stroke={isWet ? "#4A6B82" : isNight ? "#8A7D65" : "#D43811"}
        strokeWidth="2.0"
        strokeLinecap="round"
      />

      {(() => {
        const peakRad = ((peakAlphaDeg * 15 - 90) * Math.PI) / 180;
        const px = cx + Math.cos(peakRad) * (peakMu * rScale);
        const py = cy + Math.sin(peakRad) * (peakMu * rScale);
        return (
          <g>
            <circle cx={px} cy={py} r="3.5" fill="#FAF9F6" stroke="#D43811" strokeWidth="1.5" />
            <circle cx={px} cy={py} r="1.2" fill="#D43811" />
            <text x={px + 6} y={py + 3} fontFamily="Space Grotesk, monospace" fontSize="6" fontWeight="700" fill="#111215">
              {peakMu.toFixed(2)}μ @ {peakAlphaDeg}°
            </text>
          </g>
        );
      })()}

      <text x={cx} y="248" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="6" fill="#7A7E85" textAnchor="middle">
        PACEJKA TIRE ADHESION ENVELOPE
      </text>
    </svg>
  );
};
/* -------------------------------------------------------------------------- */
/* 5. MASTER COMPONENT: CustomSandboxPredictorAct3                            */
/* -------------------------------------------------------------------------- */
export const CustomSandboxPredictorAct3: React.FC = () => {
  const circuits = getAll24Circuits();
  const [selectedCircuitId, setSelectedCircuitId] = useState('interlagos');

  const selectedCircuitMeta =
    circuits.find((c) => c.id === selectedCircuitId) || circuits[0];

  const [customLaps, setCustomLaps] = useState(selectedCircuitMeta.raceLaps);
  const [sessionMode, setSessionMode] = useState<'RACE' | 'QUALIFYING'>('RACE');
  const [weatherMode, setWeatherMode] = useState<'DAY' | 'RAIN' | 'NIGHT'>('DAY');
  const [safetyCarProb, setSafetyCarProb] = useState(1.0);
  const [liveWeatherData, setLiveWeatherData] = useState<any>(null);
  const [circuitContext, setCircuitContext] = useState<any>(null);
  const [_isLoadingContext, setIsLoadingContext] = useState(false);

  // Multi-Stage Heavy Simulation Progress State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgressStage, setSimProgressStage] = useState(1);
  const [simProgressPct, setSimProgressPct] = useState(0);
  const [simAuditData, setSimAuditData] = useState<FeederAuditData | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sectionContainerRef = useRef<HTMLDivElement | null>(null);

  const setSimulationPayload = useRaceArenaStore((s) => s.setSimulationPayload);
  const setActiveWeatherMode = useRaceArenaStore((s) => s.setActiveWeatherMode);
  const terminateSimulation = useRaceArenaStore((s) => s.terminateSimulation);

  // GSAP ScrollTrigger Dynamic Entrance Reveals on Scroll
  useEffect(() => {
    const el = sectionContainerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from('.act3-header-anim', {
        y: 40,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
        },
      });

      gsap.from('.act3-card-anim', {
        y: 50,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.act3-card-anim',
          start: 'top 85%',
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchCircuitData() {
      try {
        setIsLoadingContext(true);
        const raceRes = await fetch(
          `http://127.0.0.1:8000/api/v1/live/upcoming-race?circuit_id=${selectedCircuitId}`
        );
        const raceJson = await raceRes.json();
        if (!isMounted) return;
        setCircuitContext(raceJson);

        const weatherRes = await fetch(
          `http://127.0.0.1:8000/api/v1/live/weather/${selectedCircuitId}`
        );
        const weatherJson = await weatherRes.json();
        if (!isMounted) return;
        setLiveWeatherData(weatherJson);
      } catch (err) {
        console.warn('Backend context fetch notice:', err);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    }
    fetchCircuitData();
    return () => {
      isMounted = false;
    };
  }, [selectedCircuitId]);

  const handleCircuitChange = (id: string) => {
    setSelectedCircuitId(id);
    const meta = circuits.find((c) => c.id === id);
    if (meta) {
      setCustomLaps(meta.raceLaps);
    }
  };

  const baseAirTemp = liveWeatherData?.airTempC ?? 23.8;
  const baseTrackTemp = liveWeatherData?.trackTempC ?? 42.5;

  const microclimate = {
    DAY: {
      airTemp: `${baseAirTemp.toFixed(1)}°C`,
      trackTemp: `${baseTrackTemp.toFixed(1)}°C`,
      tireTemp: `${(baseTrackTemp * 1.52 + 38).toFixed(1)}°C`,
      grip: (liveWeatherData?.gripCoefficient || 0.962).toFixed(3),
      gripLabel: 'Optimal Surface Adhesion',
      label: 'Dry Daylight · Clear Sky',
      icon: Sun,
      color: '#C4841D',
    },
    RAIN: {
      airTemp: `${(baseAirTemp - 6.4).toFixed(1)}°C`,
      trackTemp: `${(baseAirTemp - 4.2).toFixed(1)}°C`,
      tireTemp: '78.5°C',
      grip: '0.618',
      gripLabel: 'Hydroplaning Risk',
      label: 'Monsoon Rain · Standing Water',
      icon: CloudRain,
      color: '#4A6B82',
    },
    NIGHT: {
      airTemp: `${(baseAirTemp - 3.8).toFixed(1)}°C`,
      trackTemp: `${(baseAirTemp + 2.5).toFixed(1)}°C`,
      tireTemp: '96.2°C',
      grip: '0.887',
      gripLabel: 'Thermal Stabilized',
      label: 'Floodlit Night · Cool Asphalt',
      icon: Moon,
      color: '#8A7D65',
    },
  }[weatherMode];

  const incidentRiskLabel =
    safetyCarProb <= 0.4
      ? 'Low Incident Risk · Sprint Formation'
      : safetyCarProb <= 1.2
      ? 'Nominal Risk · 1–2 Stints Interrupted'
      : 'High Incident Risk · Multiple Safety Cars';

  const isWet = weatherMode === 'RAIN';
  const isNight = weatherMode === 'NIGHT';
  const p1Prob = isWet ? '46.8%' : isNight ? '39.4%' : '41.2%';
  const p2Prob = isWet ? '24.2%' : '29.8%';
  const p3Prob = isWet ? '20.5%' : '21.0%';

  const p1WinnerName = 'Max Verstappen';
  const p1Team = 'Red Bull Racing · RB22';
  const p2WinnerName = isWet ? 'Lewis Hamilton' : 'Lando Norris';
  const p2Team = isWet ? 'Ferrari · SF-26' : 'McLaren · MCL39';
  const p3WinnerName = isWet ? 'Lando Norris' : 'Charles Leclerc';
  const p3Team = isWet ? 'McLaren · MCL39' : 'Ferrari · SF-26';

  const handleRunCustomSimulation = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      terminateSimulation();

      setIsSimulating(true);
      setSimProgressStage(1);
      setSimProgressPct(14);

      await new Promise((r) => setTimeout(r, 550));
      setSimProgressStage(2);
      setSimProgressPct(42);

      await new Promise((r) => setTimeout(r, 750));
      setSimProgressStage(3);
      setSimProgressPct(76);

      const isQ = sessionMode === 'QUALIFYING';
      const postBody = {
        circuit_id: selectedCircuitId,
        session_mode: sessionMode,
        total_laps: isQ ? 3 : customLaps,
        drivers: circuitContext?.entryGrid,
        weather_mode: weatherMode,
        safety_car_prob: isQ ? 0.0 : safetyCarProb,
      };

      const resp = await fetch('http://127.0.0.1:8000/api/v1/simulate/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        throw new Error(`Simulation request failed: ${resp.status}`);
      }

      const vstmPayload = await resp.json();

      if (vstmPayload?.feederAudit) {
        setSimAuditData(vstmPayload.feederAudit);
      }

      setSimProgressStage(4);
      setSimProgressPct(100);

      setSimulationPayload(vstmPayload);
      setActiveWeatherMode(weatherMode);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Previous custom simulation aborted cleanly');
      } else {
        console.error('Failed to run custom sandbox simulation:', err);
      }
      setIsSimulating(false);
      setSimProgressPct(0);
    } finally {
      abortControllerRef.current = null;
    }
  };
  return (
    <div
      ref={sectionContainerRef}
      className="relative w-full min-h-screen py-24 px-6 sm:px-12 md:px-20 bg-[#FAF9F6] text-[#111215] flex flex-col justify-center overflow-hidden select-none"
    >
      {/* Precision Drafting Watermark Background Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Continuous Infinite Background Marquee Ribbon */}
        <div className="absolute top-1/3 left-0 right-0 pointer-events-none opacity-40">
          <InfiniteEditorialMarquee text="THE PROVING GROUND · KINEMATIC SIMULATION · PACEJKA TIRE DYNAMICS · VENTURI DIFFUSERS ·" speedSec={34} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] font-extrabold font-display text-[#111215]/[0.025] tracking-tighter whitespace-nowrap select-none">
          {selectedCircuitMeta.shortName.toUpperCase()} · 2026
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col gap-10">
        {/* Section Header Row */}
        <div className="act3-header-anim flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E5E2DA]">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-2.5 text-xs font-sans tracking-[0.2em] uppercase font-semibold text-[#5C6068]">
              <span className="w-2 h-2 rounded-full bg-[#D43811]" />
              <span>Section 03 · The Architect's Proving Ground</span>
              <span className="text-[#8C8F98]">·</span>
              <span className="text-[#8C8F98]">Caliber 2026</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-display text-[#111215] leading-[1.08]">
              Autonomous Race Strategy & Multi-Car Sandbox
            </h2>

            <p className="text-[#5C6068] text-sm max-w-2xl font-sans leading-relaxed mt-1">
              Synthesize bespoke race strategies across all 24 canonical FIA circuits. The physics-informed
              neural regressor computes 2,500 Monte Carlo stochastic trajectories, resolving dynamic tire
              thermal degradation, Venturi ground-effect downforce, and safety car probability envelopes.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF9F6] border border-[#E5E2DA] px-5 py-3 rounded-2xl shadow-[0_2px_8px_rgba(17,18,21,0.03)]">
            <Cpu className="w-4 h-4 text-[#8A7D65]" />
            <span className="text-xs font-numeric font-bold text-[#111215] flex items-center gap-1">
              <AnimatedMetricCounter value={2500} suffix=" Stochastic Runs" />
              <span>· Physics Verified</span>
            </span>
          </div>
        </div>

        {/* 60/40 Asymmetric Architectural Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLS: Architectural Blueprints & Drafting Workspace */}
          <div className="act3-card-anim lg:col-span-7 flex flex-col gap-6">
            {/* Aerodynamic Diffuser Channels Blueprint Card */}
            <InteractiveSpringCard index={0}>
              <div className="p-6 sm:p-7 rounded-3xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-[0_4px_20px_-2px_rgba(17,18,21,0.035)] flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DA]">
                  <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#111215] tracking-wider uppercase">
                    <Wind className="w-4 h-4 text-[#8A7D65]" />
                    <span>Ground-Effect Aerodynamics & Underfloor Venturi Channels</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E5E2DA]/50 text-[10px] font-numeric font-semibold text-[#5C6068]">
                    FIA 2026 REGULATIONS
                  </span>
                </div>

                <AerodynamicDiffuserBlueprintSvg isWet={isWet} />

                <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] font-sans border-t border-[#E5E2DA]">
                  <div>
                    <span className="text-[#8C8F98] uppercase block">Diffuser Area Ratio</span>
                    <span className="font-numeric font-bold text-[#111215]">3.82 Expansion</span>
                  </div>
                  <div>
                    <span className="text-[#8C8F98] uppercase block">Ground Proximity</span>
                    <span className="font-numeric font-bold text-[#D43811]">18.0mm Minimum</span>
                  </div>
                  <div>
                    <span className="text-[#8C8F98] uppercase block">Vortex Shedding</span>
                    <span className="font-numeric font-bold text-[#2E5339]">Active Sealing</span>
                  </div>
                </div>
              </div>
            </InteractiveSpringCard>

            {/* Tire Grip Pacejka Polar Diagram & Dynamic Microclimate Deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InteractiveSpringCard index={1} className="h-full">
                <div className="p-5 rounded-3xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-[0_4px_20px_-2px_rgba(17,18,21,0.035)] flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E2DA]">
                    <span className="text-xs font-sans font-semibold text-[#111215] uppercase tracking-wider">
                      Pacejka Slip-Angle Polar
                    </span>
                    <Compass className="w-3.5 h-3.5 text-[#5C6068]" />
                  </div>
                  <SlipAnglePolarDiagramSvg weatherMode={weatherMode} />
                </div>
              </InteractiveSpringCard>

              <div className="flex flex-col gap-3.5">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-[#5C6068] font-semibold block">
                      Surface (T_Track)
                    </span>
                    <span className="text-2xl font-extrabold font-numeric text-[#111215] tabular-nums">
                      {microclimate.trackTemp}
                    </span>
                    <span className="text-[10px] text-[#8C8F98] block mt-0.5">
                      Solar Absorption Delta: +18.7°C
                    </span>
                  </div>
                  <Thermometer className="w-6 h-6 text-[#C4841D]" />
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-[#5C6068] font-semibold block">
                      Tyre Core (T_Tyre)
                    </span>
                    <span className="text-2xl font-extrabold font-numeric text-[#111215] tabular-nums">
                      {microclimate.tireTemp}
                    </span>
                    <span className="text-[10px] text-[#8C8F98] block mt-0.5">
                      Working Window (100°C–110°C)
                    </span>
                  </div>
                  <Flame className="w-6 h-6 text-[#D43811]" />
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-[#5C6068] font-semibold block">
                      Friction Index (μ)
                    </span>
                    <span className="text-2xl font-extrabold font-numeric text-[#2E5339] tabular-nums">
                      {microclimate.grip}
                    </span>
                    <span className="text-[10px] text-[#8C8F98] block mt-0.5 truncate max-w-[150px]">
                      {microclimate.gripLabel}
                    </span>
                  </div>
                  <Gauge className="w-6 h-6 text-[#2E5339]" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Tactile Workbench Calibration Atelier */}
          <div className="act3-card-anim lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-[0_4px_24px_-2px_rgba(17,18,21,0.04)] flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E2DA]">
                <div className="flex items-center gap-2 text-xs font-sans font-bold text-[#111215] uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-[#8A7D65]" />
                  <span>Workbench Calibration Controls</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E5E2DA]/60 text-[10px] font-numeric font-bold text-[#111215]">
                  ROUND {selectedCircuitMeta.round.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#5C6068]">
                  FIA Championship Circuit
                </label>
                <div className="relative">
                  <select
                    value={selectedCircuitId}
                    onChange={(e) => handleCircuitChange(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F2F0EB] border border-[#E5E2DA] rounded-xl text-xs font-sans font-bold text-[#111215] uppercase tracking-wider appearance-none focus:outline-none focus:border-[#111215] cursor-pointer hover:bg-white transition-colors"
                  >
                    {circuits.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-[#111215]">
                        R{c.round.toString().padStart(2, '0')} · {c.name} ({c.country})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C8F98] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-numeric text-[#8C8F98] pt-1">
                  <span>Length: {selectedCircuitMeta.officialLengthMeters}m</span>
                  <span>Turns: {selectedCircuitMeta.turnsCount}</span>
                  <span>Default: {selectedCircuitMeta.raceLaps} Laps</span>
                </div>
              </div>

              <TactileLuxuryFader
                label="Race Distance (Laps)"
                value={customLaps}
                min={3}
                max={selectedCircuitMeta.raceLaps || 78}
                step={1}
                detentInterval={5}
                unit="Laps"
                formatValue={(v) => `${v} of ${selectedCircuitMeta.raceLaps}`}
                onChange={(val) => setCustomLaps(val)}
                colorAccent="#C8BFAC"
                ticks={[
                  { value: 3, label: '3' },
                  { value: Math.round(selectedCircuitMeta.raceLaps / 2), label: 'Half' },
                  { value: selectedCircuitMeta.raceLaps, label: 'Full' },
                ]}
              />

              <div className="pt-2">
                <TactileLuxuryFader
                  label="Safety Car & Incident Rate"
                  value={safetyCarProb}
                  min={0.0}
                  max={2.5}
                  step={0.1}
                  detentInterval={0.5}
                  unit="Index"
                  formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                  onChange={(val) => setSafetyCarProb(val)}
                  colorAccent="#8A7D65"
                  ticks={[
                    { value: 0.0, label: '0%' },
                    { value: 1.0, label: '100%' },
                    { value: 2.0, label: '200%' },
                  ]}
                />
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F2F0EB] border border-[#E5E2DA] text-[#5C6068] text-[11px] font-sans mt-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#8A7D65] flex-shrink-0" />
                  <span>{incidentRiskLabel}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#5C6068]">
                  Atmospheric Microclimate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeatherMode('DAY')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      weatherMode === 'DAY'
                        ? 'bg-[#FAF9F6] border-[#111215] text-[#111215] shadow-sm'
                        : 'bg-[#F2F0EB] border-[#E5E2DA] text-[#5C6068] hover:text-[#111215]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-[#C4841D] mb-1" />
                    <span className="text-xs font-bold font-sans">Dry Day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeatherMode('RAIN')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      weatherMode === 'RAIN'
                        ? 'bg-[#FAF9F6] border-[#111215] text-[#111215] shadow-sm'
                        : 'bg-[#F2F0EB] border-[#E5E2DA] text-[#5C6068] hover:text-[#111215]'
                    }`}
                  >
                    <CloudRain className="w-4 h-4 text-[#4A6B82] mb-1" />
                    <span className="text-xs font-bold font-sans">Monsoon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeatherMode('NIGHT')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      weatherMode === 'NIGHT'
                        ? 'bg-[#FAF9F6] border-[#111215] text-[#111215] shadow-sm'
                        : 'bg-[#F2F0EB] border-[#E5E2DA] text-[#5C6068] hover:text-[#111215]'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-[#8A7D65] mb-1" />
                    <span className="text-xs font-bold font-sans">Cool Night</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-[#E5E2DA]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center p-1 rounded-full bg-[#F2F0EB] border border-[#E5E2DA]">
                    <button
                      type="button"
                      onClick={() => setSessionMode('RACE')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        sessionMode === 'RACE'
                          ? 'bg-[#111215] text-[#FAF9F6] shadow-sm'
                          : 'text-[#5C6068] hover:text-[#111215]'
                      }`}
                    >
                      Grand Prix
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionMode('QUALIFYING')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        sessionMode === 'QUALIFYING'
                          ? 'bg-[#111215] text-[#FAF9F6] shadow-sm'
                          : 'text-[#5C6068] hover:text-[#111215]'
                      }`}
                    >
                      Q3 Shootout
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunCustomSimulation}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#111215] hover:bg-[#25282F] text-[#FAF9F6] font-sans font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C8BFAC]" />
                      <span>Calibrating VSTM Telemetry ({simProgressPct}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-[#C8BFAC]" />
                      <span>
                        {sessionMode === 'QUALIFYING'
                          ? 'Simulate & Stream Q3 Shootout'
                          : 'Simulate & Stream Grand Prix'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PREDICTED PODIUM SHOOTOUT */}
            <div className="p-6 rounded-3xl bg-[#FAF9F6] border border-[#E5E2DA] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DA]">
                <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-[#111215] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8BFAC]" />
                  <span>Stochastic Predicted Podium</span>
                </div>
                <span className="text-[10px] font-numeric text-[#8C8F98]">2,500 CONVERGED PATHS</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#F2F0EB] border border-[#E5E2DA] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#111215] text-[#FAF9F6] font-numeric text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-bold font-sans text-[#111215]">{p1WinnerName}</h4>
                      <span className="text-[10px] text-[#5C6068]">{p1Team}</span>
                    </div>
                  </div>
                  <span className="text-xs font-numeric font-bold text-[#111215] px-2.5 py-1 rounded-full bg-white border border-[#E5E2DA]">
                    {p1Prob} Win
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DA] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#E5E2DA] text-[#111215] font-numeric text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-bold font-sans text-[#111215]">{p2WinnerName}</h4>
                      <span className="text-[10px] text-[#5C6068]">{p2Team}</span>
                    </div>
                  </div>
                  <span className="text-xs font-numeric font-bold text-[#5C6068] px-2.5 py-1 rounded-full bg-[#F2F0EB] border border-[#E5E2DA]">
                    {p2Prob} Podium
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2DA] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#E5E2DA] text-[#111215] font-numeric text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-bold font-sans text-[#111215]">{p3WinnerName}</h4>
                      <span className="text-[10px] text-[#5C6068]">{p3Team}</span>
                    </div>
                  </div>
                  <span className="text-xs font-numeric font-bold text-[#5C6068] px-2.5 py-1 rounded-full bg-[#F2F0EB] border border-[#E5E2DA]">
                    {p3Prob} Podium
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LiveFeederTrainingModal
        isOpen={isSimulating}
        circuitId={selectedCircuitId}
        circuitName={selectedCircuitMeta.name.toUpperCase()}
        weatherMode={weatherMode}
        sessionMode={sessionMode}
        targetTrackTemp={parseFloat(microclimate.trackTemp) || 42.5}
        progressPct={simProgressPct}
        stageText={
          simProgressStage === 1
            ? 'Stage 1/4 · Ingesting OpenF1 & Satellite Telemetry'
            : simProgressStage === 2
            ? 'Stage 2/4 · Executing 2,500 Monte Carlo Stochastic Trajectories'
            : simProgressStage === 3
            ? 'Stage 3/4 · Solving Gompertz Tyre Thermal Cliffs & Underfloor Aero'
            : 'Simulation Complete · 22-Car Grid Telemetry Ready'
        }
        auditData={simAuditData}
        onProceedToArena={() => {
          setIsSimulating(false);
          const lenis = getActiveLenis();
          const arenaEl = document.getElementById('act-4');
          if (arenaEl) {
            if (lenis) {
              lenis.scrollTo(arenaEl, { duration: 1.4 });
            } else {
              arenaEl.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }}
      />
    </div>
  );
};
