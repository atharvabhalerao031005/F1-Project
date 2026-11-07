// frontend/src/App.tsx
/**
 * VELOCE V2 // 1,050vh MASTER SCROLLYTELLING & 3D RACE SIMULATION ORCHESTRATOR
 * Design Standard: Veloce Editorial (Awwwards SOTY / landonorris.com + Porsche 911 GT3 RS)
 * Master Blueprint Contract: VELOCE-SCROLL-3D-MASTER-PROMPT-v6.0 & VELOCE_UPGRADE_PATCH.md
 *
 * 1,050vh Track Budget:
 *   - Act 0 / 1: 0vh - 180vh (Preloader & White Wind-Tunnel Hero Chamber, #FAF9F6)
 *   - Car Exit: 180vh - 250vh (Kinematic Scroll-Out, Unmounts to 0.0% GPU past 250vh)
 *   - Act 2: 250vh - 520vh (3-Chapter 2.5D Parallax Lab, #0B0C0E Obsidian)
 *   - Act 3: 520vh - 780vh (System 1 Standalone ML Strategy Workbench, #0E1013 Swiss Stone)
 *   - Act 4: 780vh - 1,050vh (System 2 Dynamic Full-Grid 3D Race Arena, #05070B Circuit Void)
 */

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useTelemetryStore } from './store/useTelemetryStore';
import { useHeadlessPlaybackTicker } from './store/telemetrySubscriber';
import { useGlobalKeyboardControls } from './hooks/useGlobalKeyboardControls';
import { initializeMasterMotionTicker, type MasterTickerContext } from './utils/motionMasterTicker';

import { VeloceNavbar } from './components/navigation/VeloceNavbar';
import { F1CarShowcase3D } from './components/showcase3d/F1CarShowcase3D';
import { HeroEditorialAct1 } from './components/editorial/HeroEditorialAct1';
import { UpcomingRacePredictorAct2 } from './components/editorial/UpcomingRacePredictorAct2';
import { CustomSandboxPredictorAct3 } from './components/editorial/CustomSandboxPredictorAct3';
import { FiaPodiumRankingCard } from './components/modals/FiaPodiumRankingCard';
import { SimulationArenaAct4 } from './components/simulation3d/SimulationArenaAct4';
import { KineticPreloaderAct0 } from './components/preloader/KineticPreloaderAct0';
import { DownloadProgressBar, type DownloadProgressState } from './components/common/DownloadProgressBar';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const store = useTelemetryStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const tickerContextRef = useRef<MasterTickerContext | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeCircuit, setActiveCircuit] = useState('monza');
  const [isPreloaderActive, setIsPreloaderActive] = useState(false); // Default false: instant zero-deadlock landing
  const [downloadAbortCtrl, setDownloadAbortCtrl] = useState<AbortController | null>(null);
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

  // Global hotkey acceleration (Space, Arrow keys, M, R, C, 1-4)
  useGlobalKeyboardControls();

  // 60-120 Hz headless kinematics cursor loop
  useHeadlessPlaybackTicker();

  // Load default session on mount
  useEffect(() => {
    store.loadSession('2024_monza_q3_ver_nor');
  }, []);

  // Initialize Master Single-Ticker Motion Engine (GSAP Core + ScrollTrigger + Lenis)
  useEffect(() => {
    const context = initializeMasterMotionTicker();
    tickerContextRef.current = context;
    const lenis = context.lenis;

    const updateScrollProgress = () => {
      ScrollTrigger.update();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      setScrollProgress(progress);
      store.setScrollProgress(progress);
    };

    lenis.on('scroll', updateScrollProgress);
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    // Initialize immediately on mount
    updateScrollProgress();

    // Continuous OKLCH Quintic Smoothstep Scroll Morph:
    // Act 1 (#FAF9F6 Alabaster) -> Act 2 (#0B0C0E Obsidian) -> Act 3 (#0E1013 Swiss Stone) -> Act 4 (#05070B Circuit Void)
    if (containerRef.current) {
      ScrollTrigger.create({
        trigger: '#act-2',
        start: 'top 70%',
        end: 'bottom 30%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0B0C0E', duration: 0.8, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#FAF9F6', duration: 0.8, ease: 'power2.inOut' });
        },
      });

      ScrollTrigger.create({
        trigger: '#act-3',
        start: 'top 70%',
        end: 'bottom 30%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0E1013', duration: 0.8, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0B0C0E', duration: 0.8, ease: 'power2.inOut' });
        },
      });

      ScrollTrigger.create({
        trigger: '#act-4',
        start: 'top 70%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#05070B', duration: 0.8, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0E1013', duration: 0.8, ease: 'power2.inOut' });
        },
      });
    }

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      context.destroy();
      tickerContextRef.current = null;
    };
  }, []);

  const handleJumpToSimulation = () => {
    const el = document.getElementById('act-4');
    if (el) {
      if (tickerContextRef.current?.lenis) {
        tickerContextRef.current.lenis.scrollTo(el, { duration: 1.6 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCircuitSelect = (circuit: string) => {
    const cleanId = (circuit || 'monza').toLowerCase().replace(/[\s-]/g, '_');
    setActiveCircuit(cleanId);
    const sessionMap: Record<string, string> = {
      monza: '2024_monza_q3_ver_nor',
      silverstone: '2024_silverstone_q3_ver_nor',
      monaco: '2024_monaco_q3_lec_pia',
    };
    const sId = sessionMap[cleanId];
    if (sId) {
      store.loadSession(sId);
    }
  };

  // Dynamic SSE Race Loader Stream for Season (2018-2026+) x Circuit
  const handleLoadSeasonRace = (year: number, circuit: string) => {
    // Abort existing download if any
    downloadAbortCtrl?.abort();
    const abortCtrl = new AbortController();
    setDownloadAbortCtrl(abortCtrl);

    setDownloadState({
      stage: 1,
      stageName: 'Resolving Schedule...',
      progressPct: 5,
      bytesDownloaded: 500000,
      totalBytesExpected: 9130000,
      speedMBps: 3.2,
      etaSec: 2.7,
      status: 'DOWNLOADING',
    });

    const eventSource = new EventSource(`/api/v1/stream-race-load?year=${year}&circuit=${circuit}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setDownloadState({
          stage: data.stage || 1,
          stageName: data.stageName || 'Streaming...',
          progressPct: data.progressPct || 0,
          bytesDownloaded: data.bytesDownloaded || 0,
          totalBytesExpected: data.totalBytesExpected || 9130000,
          speedMBps: data.speedMBps || 3.2,
          etaSec: data.etaSec || 1.5,
          status: data.status === 'COMPLETE' ? 'COMPLETE' : 'DOWNLOADING',
        });

        if (data.status === 'COMPLETE') {
          eventSource.close();
          handleCircuitSelect(circuit);
        }
      } catch {
        // SSE message was non-JSON comment
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setDownloadState((prev) => ({
        ...prev,
        status: prev.status === 'COMPLETE' ? 'COMPLETE' : 'IDLE',
      }));
    };
  };

  void handleLoadSeasonRace;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#FAF9F6] transition-colors duration-700 overflow-x-hidden font-sans"
    >
      {/* FIA Official Podium Ranking Card Modal */}
      <FiaPodiumRankingCard />

      {/* ACT 0: Tachometer 000 -> 352 KM/H Preloader & Louver Shutter Reveal */}
      {isPreloaderActive && (
        <KineticPreloaderAct0
          onComplete={() => setIsPreloaderActive(false)}
          minDurationMs={1500}
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

      {/* Minimal Floating Top Navbar */}
      <VeloceNavbar
        onJumpToSimulation={handleJumpToSimulation}
        scrollProgress={scrollProgress}
      />

      {/* Layer 1: Fixed 3D F1 .glb Showcase Canvas (Acts 0 & 1, Unmounts past 250vh for 0.0% GPU) */}
      <F1CarShowcase3D
        liveryColor={store.liveryColor}
        scrollProgress={scrollProgress}
        tyreAgeLaps={store.mlWarpParams.tyreAgeLaps}
        fuelLoadKg={store.mlWarpParams.fuelLoadKg}
      />

      {/* Main Long-Scroll Editorial Content (1,050vh Unified Master Height) */}
      <main className="relative z-20 w-full">
        {/* ACT 1: White Wind-Tunnel Calibration Hero (0vh - 180vh, #FAF9F6) */}
        <div id="act-1">
          <HeroEditorialAct1
            activeLivery={store.liveryColor}
            onSelectLivery={store.setLiveryColor}
            onJumpToSimulation={handleJumpToSimulation}
          />
        </div>

        {/* ACT 2: Real Upcoming Race Predictor & Live Microclimate */}
        <UpcomingRacePredictorAct2 />

        {/* ACT 3: Deep Custom Race Sandbox & Monte Carlo Matrix */}
        <CustomSandboxPredictorAct3 />

        {/* ACT 4: System 2 Dynamic Full-Grid 3D Race Arena (780vh - 1,050vh, #05070B Circuit Void) */}
        <SimulationArenaAct4
          sessionPayload={store.sessionPayload}
          currentDistance={store.currentDistance}
          maxDistance={store.maxDistance}
          isPlaying={store.isPlaying}
          onTogglePlay={store.togglePlay}
          onSeekDistance={store.setDistance}
          onReset={store.resetPlayback}
          cameraMode={store.cameraMode}
          onSelectCamera={store.setCameraMode}
          activeCircuit={activeCircuit}
          onSelectCircuit={handleCircuitSelect}
          playbackSpeed={store.playbackSpeed}
          onSetPlaybackSpeed={store.setPlaybackSpeed}
          mlWarpOutput={store.mlWarpOutput}
          mlWarpParams={store.mlWarpParams}
          strategyResult={store.strategyResult}
        />
      </main>
    </div>
  );
};

export default App;
