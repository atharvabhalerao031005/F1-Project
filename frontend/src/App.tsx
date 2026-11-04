// frontend/src/App.tsx
/**
 * VELOCE // F1 3D SCROLLYTELLING, REALISTIC CIRCUIT SIMULATION & ML STRATEGY EXPERIENCE
 * Benchmark: landonorris.com + Porsche 911 GT3 RS + Apple Pro Scrollytelling
 * Standard: VELOCE-SCROLL-3D-MASTER-PROMPT-v6.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useTelemetryStore } from './store/useTelemetryStore';
import { useHeadlessPlaybackTicker } from './store/telemetrySubscriber';
import { useGlobalKeyboardControls } from './hooks/useGlobalKeyboardControls';

import { VeloceNavbar } from './components/navigation/VeloceNavbar';
import { F1CarShowcase3D } from './components/showcase3d/F1CarShowcase3D';
import { HeroEditorialAct1 } from './components/editorial/HeroEditorialAct1';
import { AeroPhysicsAct2 } from './components/editorial/AeroPhysicsAct2';
import { PitWallOracleAct3 } from './components/editorial/PitWallOracleAct3';
import { SimulationArenaAct4 } from './components/simulation3d/SimulationArenaAct4';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const store = useTelemetryStore();
  const lenisRef = useRef<Lenis | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeCircuit, setActiveCircuit] = useState('monza');

  // Mount global keyboard acceleration (Space play/pause, scrub, etc.)
  useGlobalKeyboardControls();

  // Mount 60-120 Hz playback ticker
  useHeadlessPlaybackTicker();

  // Load default session on mount
  useEffect(() => {
    store.loadSession('2024_monza_q3_ver_nor');
  }, []);

  // Initialize Lenis Smooth Inertial Scrolling & Bind GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Connect Lenis to ScrollTrigger
    lenis.on('scroll', () => {
      ScrollTrigger.update();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      setScrollProgress(progress);
      store.setScrollProgress(progress);
    });

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    // GSAP ScrollTrigger Background Color Morphing:
    // Act 1 (Stone #F4F2ED) -> Act 2 (Obsidian #0B0C0E) -> Act 3 (Stone #F4F2ED) -> Act 4 (Obsidian #0B0C0E)
    if (containerRef.current) {
      ScrollTrigger.create({
        trigger: '#act-2',
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0B0C0E', duration: 0.6 });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#F4F2ED', duration: 0.6 });
        },
      });

      ScrollTrigger.create({
        trigger: '#act-3',
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#F4F2ED', duration: 0.6 });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0B0C0E', duration: 0.6 });
        },
      });

      ScrollTrigger.create({
        trigger: '#act-4',
        start: 'top 60%',
        onEnter: () => {
          gsap.to(containerRef.current, { backgroundColor: '#0B0C0E', duration: 0.6 });
        },
        onLeaveBack: () => {
          gsap.to(containerRef.current, { backgroundColor: '#F4F2ED', duration: 0.6 });
        },
      });
    }

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  const handleJumpToSimulation = () => {
    const el = document.getElementById('act-4');
    if (el) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, { duration: 1.6 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCircuitSelect = (circuit: string) => {
    setActiveCircuit(circuit);
    const sessionMap: Record<string, string> = {
      monza: '2024_monza_q3_ver_nor',
      silverstone: '2024_silverstone_q3_ver_nor',
      monaco: '2024_monaco_q3_lec_pia',
    };
    const sId = sessionMap[circuit] || '2024_monza_q3_ver_nor';
    store.loadSession(sId);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#F4F2ED] transition-colors duration-500 overflow-x-hidden font-sans"
    >
      {/* Minimal Floating Top Navbar */}
      <VeloceNavbar
        onJumpToSimulation={handleJumpToSimulation}
        scrollProgress={scrollProgress}
      />

      {/* Layer 1: Fixed 3D F1 .glb Showcase Canvas (Acts 1 & 2) */}
      <F1CarShowcase3D
        liveryColor={store.liveryColor}
        scrollProgress={scrollProgress}
        tyreAgeLaps={store.mlWarpParams.tyreAgeLaps}
        fuelLoadKg={store.mlWarpParams.fuelLoadKg}
      />

      {/* Main Long-Scroll Editorial Content (~650vh total height) */}
      <main className="relative z-20 w-full">
        {/* ACT 1: Editorial Hero & 2.5D Showcase (0vh - 140vh, Warm Stone) */}
        <div id="act-1">
          <HeroEditorialAct1
            activeLivery={store.liveryColor}
            onSelectLivery={store.setLiveryColor}
            onJumpToSimulation={handleJumpToSimulation}
          />
        </div>

        {/* ACT 2: Scroll-Driven 3D Aero & Tire Physics (140vh - 320vh, Showroom Obsidian) */}
        <AeroPhysicsAct2
          tyreAgeLaps={store.mlWarpParams.tyreAgeLaps}
          fuelLoadKg={store.mlWarpParams.fuelLoadKg}
          compound={store.mlWarpParams.compound}
          onUpdateParams={store.updateMlWarpParams}
        />

        {/* ACT 3: Editorial ML Strategy & Monte Carlo Oracle (320vh - 470vh, Warm Stone) */}
        <PitWallOracleAct3
          strategyInput={store.strategyInput}
          strategyResult={store.strategyResult}
          onUpdateStrategy={store.updateStrategyInput}
          onRunSimulation={store.runMonteCarloSimulation}
          onSelectCircuit={handleCircuitSelect}
          activeCircuit={activeCircuit}
        />

        {/* ACT 4: Full-Screen Realistic 3D Circuit Race Simulation Arena (470vh - 650vh) */}
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
