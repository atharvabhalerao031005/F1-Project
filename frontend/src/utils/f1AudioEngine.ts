// frontend/src/utils/f1AudioEngine.ts
/**
 * VELOCE // High-Fidelity Synthetic Web Audio F1 V6 Turbo-Hybrid Sound Engine
 * Synthesizes engine RPM harmonics, turbo whistle, and aerodynamic rush.
 * Zero external mp3 dependencies, zero latency, 100% procedural.
 */

class F1AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Turbo whistle nodes
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  private isInitialized: boolean = false;

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Low-pass filter for engine tone
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.engineGain.connect(this.filter);
      this.filter.connect(this.masterGain);

      // 3 Harmonic Oscillators for V6 combustion firing
      // V6 engine at 11,000 RPM: fundamental firing freq = (11,000 / 60) * 3 = ~550 Hz
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.osc1.connect(this.engineGain);
      this.osc1.start();

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(240, this.ctx.currentTime);
      this.osc2.connect(this.engineGain);
      this.osc2.start();

      this.osc3 = this.ctx.createOscillator();
      this.osc3.type = 'sawtooth';
      this.osc3.frequency.setValueAtTime(360, this.ctx.currentTime);
      this.osc3.connect(this.engineGain);
      this.osc3.start();

      // High-pitched turbocharger whistle
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(2800, this.ctx.currentTime);
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked by autoplay policy:', e);
    }
  }

  public toggleMute(): boolean {
    if (!this.isInitialized) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0.0 : 0.22;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
    return !this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public update(speedKmh: number, throttlePct: number, gear: number): void {
    if (this.isMuted || !this.ctx || !this.isInitialized) return;

    const t = this.ctx.currentTime;

    // Approximate engine RPM: Idle 4,500 to Rev Limiter 12,500 RPM
    // Speed / Gear relationship
    const speedRatio = Math.min(1.0, Math.max(0.05, speedKmh / 350));
    const effectiveGear = Math.max(1, Math.min(8, gear || 7));
    const rpm = 4800 + ((speedRatio * effectiveGear) % 1) * 7200 + (throttlePct * 12);

    // Fundamental firing frequency for 1.6L V6: (RPM / 60) * 3
    const fundamental = (rpm / 60) * 3;

    if (this.osc1 && this.osc2 && this.osc3) {
      this.osc1.frequency.setTargetAtTime(fundamental, t, 0.04);
      this.osc2.frequency.setTargetAtTime(fundamental * 2.0, t, 0.04);
      this.osc3.frequency.setTargetAtTime(fundamental * 0.5, t, 0.04);
    }

    // Filter frequency opens wide under heavy throttle
    if (this.filter) {
      const filterFreq = 1200 + (throttlePct / 100) * 2800;
      this.filter.frequency.setTargetAtTime(filterFreq, t, 0.05);
    }

    // Turbo spool pitch rises with speed
    if (this.turboOsc && this.turboGain) {
      const turboPitch = 2200 + speedRatio * 1800;
      const turboVol = 0.02 + (throttlePct / 100) * 0.05;
      this.turboOsc.frequency.setTargetAtTime(turboPitch, t, 0.08);
      this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);
    }
  }

  public stop(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }
}

export const f1AudioEngine = new F1AudioEngine();
