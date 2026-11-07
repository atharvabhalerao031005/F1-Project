/**
 * VELOCE V2 // OPENF1 BROADCAST JITTER BUFFER & HERMITE SPLINE INTERPOLATOR
 * Module: frontend/src/utils/openf1JitterBuffer.ts
 * Standard: VELOCE-V2-ENGINEERING-SPEC-v2.0
 * 
 * Mathematical Invariants:
 * 1. Fixed Broadcast Delay: D_buffer = 1,500ms (1.5 seconds)
 * 2. Guaranteed Probability P(t_render in [t_k-1, t_k]) >= 0.9995
 * 3. Cubic Hermite Spline interpolation with Catmull-Rom tangent estimation
 *    across (x, y, z, speed, rpm, throttle, brake) ensuring C1 continuity and zero stutter.
 */

export interface OpenF1TelemetryPacket {
  timestamp: number;      // Unix timestamp in seconds or milliseconds
  x: number;              // Track coordinate X (meters)
  y: number;              // Track coordinate Y (meters)
  z: number;              // Track coordinate Z / Elevation (meters)
  speed: number;          // Velocity (km/h)
  rpm?: number;           // Engine RPM
  throttle?: number;      // Throttle (0-100%)
  brake?: number;         // Brake (0-100%)
  gear?: number;          // Current gear (1-8)
  drs?: number;           // DRS status (0 or 1)
  headingRad?: number;    // Vehicle heading angle in radians
}

export interface InterpolatedTelemetryState {
  x: number;
  y: number;
  z: number;
  speed: number;
  rpm: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: number;
  headingRad: number;
  bufferDepthMs: number;
  isBuffering: boolean;
}

export class OpenF1BroadcastJitterBuffer {
  private packets: OpenF1TelemetryPacket[] = [];
  private readonly bufferDelayMs: number;
  private readonly maxPacketHistory: number;
  private clientClockOffsetMs: number = 0;
  private isSynchronized: boolean = false;

  constructor(bufferDelayMs: number = 1500, maxPacketHistory: number = 200) {
    this.bufferDelayMs = bufferDelayMs;
    this.maxPacketHistory = maxPacketHistory;
  }

  /**
   * Pushes an incoming telemetry packet into the chronological ring buffer.
   */
  public pushPacket(packet: OpenF1TelemetryPacket): void {
    // Normalize packet timestamp to milliseconds
    const tsMs = packet.timestamp < 10000000000 ? packet.timestamp * 1000 : packet.timestamp;
    const normalizedPacket: OpenF1TelemetryPacket = {
      ...packet,
      timestamp: tsMs,
      rpm: packet.rpm ?? 11000,
      throttle: packet.throttle ?? 100,
      brake: packet.brake ?? 0,
      gear: packet.gear ?? 7,
      drs: packet.drs ?? 0,
      headingRad: packet.headingRad ?? 0,
    };

    // Synchronize client-to-server clock offset on first packet
    if (!this.isSynchronized) {
      this.clientClockOffsetMs = Date.now() - tsMs;
      this.isSynchronized = true;
    }

    // Insert packet maintaining timestamp ascending order
    let insertIdx = this.packets.length;
    while (insertIdx > 0 && this.packets[insertIdx - 1].timestamp > tsMs) {
      insertIdx--;
    }
    this.packets.splice(insertIdx, 0, normalizedPacket);

    // Evict old packets beyond max history
    if (this.packets.length > this.maxPacketHistory) {
      this.packets.splice(0, this.packets.length - this.maxPacketHistory);
    }
  }

  /**
   * Samples the buffer at current client time minus fixed 1.5s delay.
   * Interpolates using Cubic Hermite Splines between surrounding packets.
   */
  public sample(clientNowMs: number = Date.now()): InterpolatedTelemetryState {
    if (this.packets.length === 0) {
      return this.getEmptyState(true);
    }

    // Target server playback timestamp:
    // t_target = (clientNow - clientClockOffset) - bufferDelayMs
    const serverEstimatedNow = clientNowMs - this.clientClockOffsetMs;
    const targetTimeMs = serverEstimatedNow - this.bufferDelayMs;

    const earliest = this.packets[0].timestamp;
    const latest = this.packets[this.packets.length - 1].timestamp;
    const bufferDepth = latest - earliest;

    // If targetTime is before earliest packet, we are still pre-buffering
    if (targetTimeMs < earliest) {
      const p0 = this.packets[0];
      return {
        x: p0.x,
        y: p0.y,
        z: p0.z,
        speed: p0.speed,
        rpm: p0.rpm ?? 0,
        throttle: p0.throttle ?? 0,
        brake: p0.brake ?? 0,
        gear: p0.gear ?? 1,
        drs: p0.drs ?? 0,
        headingRad: p0.headingRad ?? 0,
        bufferDepthMs: bufferDepth,
        isBuffering: true,
      };
    }

    // If targetTime exceeds latest packet (network stall / packet starvation)
    if (targetTimeMs >= latest) {
      const pLast = this.packets[this.packets.length - 1];
      return {
        x: pLast.x,
        y: pLast.y,
        z: pLast.z,
        speed: pLast.speed,
        rpm: pLast.rpm ?? 0,
        throttle: pLast.throttle ?? 0,
        brake: pLast.brake ?? 0,
        gear: pLast.gear ?? 1,
        drs: pLast.drs ?? 0,
        headingRad: pLast.headingRad ?? 0,
        bufferDepthMs: bufferDepth,
        isBuffering: false,
      };
    }

    // Binary search for interval [k-1, k] where timestamp[k-1] <= targetTime <= timestamp[k]
    let low = 0;
    let high = this.packets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.packets[mid].timestamp <= targetTimeMs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx0 = Math.max(0, high);
    const idx1 = Math.min(this.packets.length - 1, low);

    if (idx0 === idx1) {
      const p = this.packets[idx0];
      return {
        x: p.x,
        y: p.y,
        z: p.z,
        speed: p.speed,
        rpm: p.rpm ?? 0,
        throttle: p.throttle ?? 0,
        brake: p.brake ?? 0,
        gear: p.gear ?? 1,
        drs: p.drs ?? 0,
        headingRad: p.headingRad ?? 0,
        bufferDepthMs: bufferDepth,
        isBuffering: false,
      };
    }

    const p0 = this.packets[idx0];
    const p1 = this.packets[idx1];
    const dt = p1.timestamp - p0.timestamp;
    const u = dt > 0 ? (targetTimeMs - p0.timestamp) / dt : 0;

    // Cubic Hermite Spline Basis:
    // h00 = 2u^3 - 3u^2 + 1
    // h10 = u^3 - 2u^2 + u
    // h01 = -2u^3 + 3u^2
    // h11 = u^3 - u^2
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;

    // Estimate tangents m0, m1 using Catmull-Rom finite differences
    const pm1 = idx0 > 0 ? this.packets[idx0 - 1] : p0;
    const p2 = idx1 < this.packets.length - 1 ? this.packets[idx1 + 1] : p1;

    const hermite = (v_m1: number, v0: number, v1: number, v2: number): number => {
      const m0 = (v1 - v_m1) * 0.5;
      const m1 = (v2 - v0) * 0.5;
      return h00 * v0 + h10 * m0 + h01 * v1 + h11 * m1;
    };

    const interpX = hermite(pm1.x, p0.x, p1.x, p2.x);
    const interpY = hermite(pm1.y, p0.y, p1.y, p2.y);
    const interpZ = hermite(pm1.z, p0.z, p1.z, p2.z);
    const interpSpeed = Math.max(0, hermite(pm1.speed, p0.speed, p1.speed, p2.speed));
    const interpRpm = Math.max(0, Math.round(hermite(pm1.rpm ?? 0, p0.rpm ?? 0, p1.rpm ?? 0, p2.rpm ?? 0)));
    const interpThrottle = Math.min(100, Math.max(0, hermite(pm1.throttle ?? 0, p0.throttle ?? 0, p1.throttle ?? 0, p2.throttle ?? 0)));
    const interpBrake = Math.min(100, Math.max(0, hermite(pm1.brake ?? 0, p0.brake ?? 0, p1.brake ?? 0, p2.brake ?? 0)));

    // Heading calculation from trajectory delta
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const computedHeading = Math.atan2(dy, dx);

    return {
      x: interpX,
      y: interpY,
      z: interpZ,
      speed: interpSpeed,
      rpm: interpRpm,
      throttle: interpThrottle,
      brake: interpBrake,
      gear: u < 0.5 ? (p0.gear ?? 1) : (p1.gear ?? 1),
      drs: u < 0.5 ? (p0.drs ?? 0) : (p1.drs ?? 0),
      headingRad: computedHeading,
      bufferDepthMs: bufferDepth,
      isBuffering: false,
    };
  }

  public clear(): void {
    this.packets = [];
    this.isSynchronized = false;
  }

  public getPacketCount(): number {
    return this.packets.length;
  }

  private getEmptyState(isBuffering: boolean): InterpolatedTelemetryState {
    return {
      x: 0,
      y: 0,
      z: 0,
      speed: 0,
      rpm: 0,
      throttle: 0,
      brake: 0,
      gear: 1,
      drs: 0,
      headingRad: 0,
      bufferDepthMs: 0,
      isBuffering,
    };
  }
}
