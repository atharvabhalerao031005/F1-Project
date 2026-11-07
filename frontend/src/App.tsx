// frontend/src/App.tsx
/**
 * VELOCE V2 // 2,100vh MASTER SCROLLYTELLING & 3D RACE SIMULATION ORCHESTRATOR
 * Design Standard: Veloce Editorial (Awwwards SOTY / landonorris.com + Porsche 911 GT3 RS)
 * Anti-AI Slop Directive: Light luxury, ceramic glass, no Darth Vader black, no // slashes
 *
 * 2,100vh Track Budget:
 *   - Act 1: 0vh - 450vh (White Wind-Tunnel Hero Chamber, #FAF9F6 Alabaster)
 *   - Transition: 450vh - 650vh (Slow 3D Camera Yaw Sweep & Kinematic Departure, Unmounts past 650vh to 0.0% GPU)
 *   - Act 2: 650vh - 1,200vh (2026 Official FIA Oracle Gallery, #0C0E12 Smoked Obsidian Ceramic)
 *   - Act 3: 1,200vh - 1,700vh (The Architect's Proving Ground Workbench, #101318 Swiss Stone Ceramic)
 *   - Act 4: 1,700vh - 2,100vh (System 2 Dynamic Full-Grid 3D Race Arena, #07090D Circuit Void)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useTelemetryStore } from './store/useTelemetryStore';
import { useGlobalKeyboardControls } from './hooks/useGlobalKeyboardControls';
import { initializeMasterMotionTicker, type MasterTickerContext } from './utils/motionMasterTicker';

import { VeloceNavbar } from './components/navigation/VeloceNavbar';
import { F1CarShowcase3D } from './components/showcase3d/F1CarShowcase3D';
import { HeroEditorialAct1 } from './components/editorial/HeroEditorialAct1';
import { UpcomingRacePredictorAct2 } from './components/editorial/UpcomingRacePredictorAct2';
import { CustomSandboxPredictorAct3 } from './components/editorial/CustomSandboxPredictorAct3';
import { FiaPodiumRankingCard } from './components/modals/FiaPodiumRankingCard';
import { SimulationArenaAct4 } from './components/simulation3d/SimulationArenaAct4';
import { VelocePreloader } from './components/preloader/VelocePreloader';
import { DownloadProgressBar, type DownloadProgressState } from './components/common/DownloadProgressBar';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  // CRITICAL FIX: Atomic selectors to prevent 120 FPS root App re-renders on telemetry ticks!
  const liveryColor = useTelemetryStore((s) => s.liveryColor);
  const setLiveryColor = useTelemetryStore((s) => s.setLiveryColor);
  const tyreAgeLaps = useTelemetryStore((s) => s.mlWarpParams.tyreAgeLaps);
  const fuelLoadKg = useTelemetryStore((s) => s.mlWarpParams.fuelLoadKg);
  const loadSession = useTelemetryStore((s) => s.loadSession);

  // Simulation props selected atomically
  const sessionPayload = useTelemetryStore((s) => s.sessionPayload);
  const currentDistance = useTelemetryStore((s) => s.currentDistance);
  const maxDistance = useTelemetryStore((s) => s.maxDistance);
  const isPlaying = useTelemetryStore((s) => s.isPlaying);
  const togglePlay = useTelemetryStore((s) => s.togglePlay);
  const setDistance = useTelemetryStore((s) => s.setDistance);
  const resetPlayback = useTelemetryStore((s) => s.resetPlayback);
  const cameraMode = useTelemetryStore((s) => s.cameraMode);
  const setCameraMode = useTelemetryStore((s) => s.setCameraMode);
  const playbackSpeed = useTelemetryStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useTelemetryStore((s) => s.setPlaybackSpeed);
  const mlWarpOutput = useTelemetryStore((s) => s.mlWarpOutput);
  const mlWarpParams = useTelemetryStore((s) => s.mlWarpParams);
  const strategyResult = useTelemetryStore((s) => s.strategyResult);

  const containerRef = useRef<HTMLDivElement>(null);
  const tickerContextRef = useRef<MasterTickerContext | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAct4InView, setIsAct4InView] = useState(false);
  const [activeCircuit, setActiveCircuit] = useState('monza');
  const [isPreloaderActive, setIsPreloaderActive] = useState(true);
  const [downloadAbortCtrl] = useState<AbortController | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadProgressState>({
    stage: 1,
    stageName: 'Idle',
    progressPct: 0,
    bytesDownloaded: 0,
    totalBytesExpected: 9130000,
    speedMBps: 0,
    etaSec: 0,
    status: 'IDLE',
  });

  useGlobalKeyboardControls();

  useEffect(() => {
    loadSession('2024_monza_q3_ver_nor');
  }, [loadSession]);

  useEffect(() => {
    const context = initializeMasterMotionTicker();
    tickerContextRef.current = context;
    const lenis = context.lenis;

    // CRITICAL FIX: Eliminate forced layout reflows! Lenis passes scroll progress directly.
    let lastDispatchedProgress = 0;
    const handleLenisScroll = (e: { progress: number }) => {
      const p = e.progress;
      if (Math.abs(p - lastDispatchedProgress) > 0.004) {
        lastDispatchedProgress = p;
        setScrollProgress(p);
      }
    };

    lenis.on('scroll', handleLenisScroll);

    // Continuous Quintic Smoothstep Scroll Morph Across 2,100vh:
    // Act 1 (0-450vh, #FAF9F6) -> Departure Transition (450-650vh) -> Act 2 (#0C0E12) -> Act 3 (#101318) -> Act 4 (#07090D)
    if (containerRef.current) {
      ScrollTrigger.create({
        trigger: '#act-1-departure',
        start: 'top 60%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0C0E12', duration: 1.2, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#FAF9F6', duration: 1.2, ease: 'power2.inOut' });
        },
      });

      ScrollTrigger.create({
        trigger: '#act-3',
        start: 'top 70%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#101318', duration: 1.0, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0C0E12', duration: 1.0, ease: 'power2.inOut' });
        },
      });

      // Dormancy observer for Act 4! Only mount 3D Arena when user approaches Act 4!
      ScrollTrigger.create({
        trigger: '#act-4',
        start: 'top 95%',
        onEnter: () => {
          setIsAct4InView(true);
          gsap.to(containerRef.current, { backgroundColor: '#07090D', duration: 1.0, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          setIsAct4InView(false);
          gsap.to(containerRef.current, { backgroundColor: '#101318', duration: 1.0, ease: 'power2.inOut' });
        },
      });
    }

    return () => {
      context.destroy();
      tickerContextRef.current = null;
    };
  }, []);

  const handleJumpToSimulation = useCallback(() => {
    const el = document.getElementById('act-4');
    if (el) {
      if (tickerContextRef.current?.lenis) {
        tickerContextRef.current.lenis.scrollTo(el, { duration: 1.8 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleCircuitSelect = useCallback((circuit: string) => {
    const cleanId = (circuit || 'monza').toLowerCase().replace(/[\s-]/g, '_');
    setActiveCircuit(cleanId);
    const sessionMap: Record<string, string> = {
      monza: '2024_monza_q3_ver_nor',
      silverstone: '2024_silverstone_q3_ver_nor',
      monaco: '2024_monaco_q3_lec_pia',
    };
    const sId = sessionMap[cleanId];
    if (sId) {
      useTelemetryStore.getState().loadSession(sId);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#FAF9F6] overflow-x-hidden font-sans"
    >
      {/* FIA Official Podium Ranking Card Modal */}
      <FiaPodiumRankingCard />

      {/* MTC Calibration Preloader & Louver Shutter Reveal */}
      {isPreloaderActive && (
        <VelocePreloader
          onComplete={() => setIsPreloaderActive(false)}
        />
      )}

      {/* Determinate Multi-Stage SSE Download Progress Bar */}
      <DownloadProgressBar
        state={downloadState}
        onCancel={() => {
          downloadAbortCtrl?.abort();
          setDownloadState((prev) => ({ ...prev, status: 'CANCELLED' }));
        }}
      />

      {/* Minimal Floating Ceramic Glass Top Navbar */}
      <VeloceNavbar
        onJumpToSimulation={handleJumpToSimulation}
        scrollProgress={scrollProgress}
      />

      {/* Hardware-Accelerated Micro-Grain SVG Noise Overlay */}
      <div className="luxury-grain-overlay" aria-hidden="true" />

      {/* Fixed 3D F1 Showcase Canvas (Active across 0vh - 650vh, Unmounts past 650vh for 0.0% GPU) */}
      <F1CarShowcase3D
        liveryColor={liveryColor}
        scrollProgress={scrollProgress}
        tyreAgeLaps={tyreAgeLaps}
        fuelLoadKg={fuelLoadKg}
      />

      {/* Master 2,100vh Long-Scroll Editorial Content */}
      <main className="relative z-20 w-full">
        {/* ACT 1: White MTC Wind Tunnel Chamber & 4-Chapter Scrollytelling Runway (0vh - 650vh, #FAF9F6) */}
        <div id="act-1" className="relative w-full h-[650vh]">
          <div className="sticky top-0 w-full h-screen overflow-hidden">
            <HeroEditorialAct1
              activeLivery={liveryColor}
              onSelectLivery={setLiveryColor}
              onJumpToSimulation={handleJumpToSimulation}
              scrollProgress={scrollProgress}
            />
          </div>
        </div>

        {/* ACT 2: Aesthetic Oracle Gallery (650vh - 1,200vh, #0C0E12) */}
        <div id="act-2" className="relative w-full min-h-[550vh]">
          <UpcomingRacePredictorAct2 />
        </div>

        {/* ACT 3: The Architect's Proving Ground Sandbox (1,200vh - 1,700vh, #101318) */}
        <div id="act-3" className="relative w-full min-h-[500vh]">
          <CustomSandboxPredictorAct3 />
        </div>

        {/* ACT 4: System 2 Dynamic Full-Grid 3D Race Arena (1,700vh - 2,100vh, #07090D) */}
        <div id="act-4" className="relative w-full h-[400vh]">
          <div className="sticky top-0 w-full h-screen overflow-hidden">
            {isAct4InView ? (
              <SimulationArenaAct4
                sessionPayload={sessionPayload}
                currentDistance={currentDistance}
                maxDistance={maxDistance}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeekDistance={setDistance}
                onReset={resetPlayback}
                cameraMode={cameraMode}
                onSelectCamera={setCameraMode}
                activeCircuit={activeCircuit}
                onSelectCircuit={handleCircuitSelect}
                playbackSpeed={playbackSpeed}
                onSetPlaybackSpeed={setPlaybackSpeed}
                mlWarpOutput={mlWarpOutput}
                mlWarpParams={mlWarpParams}
                strategyResult={strategyResult}
              />
            ) : (
              <div className="w-full h-full bg-[#07090D]" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;