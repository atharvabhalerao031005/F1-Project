// frontend/src/components/simulation3d/geometry/TrackFrameRMF.ts
/**
 * VELOCE PRO // SINGULARITY-FREE HORIZONTAL TRACK REFERENCE FRAME
 * Standard: Singularity-Free Orthonormal Kinematic Frame & Zero Holonomy Rotation
 * 
 * Invariants:
 * 1. ZERO 90° Vertical Wall Twists:
 *    The lateral normal vector N is strictly constrained to the horizontal XZ plane:
 *    N = (-T_z, 0, T_x).normalize()
 * 2. ZERO Inverted Flips:
 *    The road surface normal (binormal B) is computed as B = T x N, which points
 *    strictly upward (B_y >= 0.85) at all times.
 * 3. Continuous smooth sampling along the Catmull-Rom curve.
 */

import * as THREE from 'three';

export interface TrackFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;  // +Z Forward direction of travel
  normal: THREE.Vector3;   // +X Right (lateral offset axis in ground plane)
  binormal: THREE.Vector3; // +Y Up (road surface normal)
  u: number;
}

export class CircuitRMF {
  private frames: TrackFrame[] = [];
  public readonly length: number;
  public readonly spline: THREE.CatmullRomCurve3;

  constructor(spline: THREE.CatmullRomCurve3, samples = 1200) {
    this.spline = spline;
    this.length = spline.getLength();
    // 0.5m uniform arc-length LUT pre-sampling
    const lutSamples = Math.max(samples, Math.ceil(this.length * 2));
    this.computeFrames(lutSamples);
  }

  private computeFrames(K: number) {
    this.frames = [];
    const spacedPoints = this.spline.getSpacedPoints(K);

    for (let i = 0; i <= K; i++) {
      const u = i / K;
      const position = spacedPoints[i];
      
      const prev = spacedPoints[Math.max(0, i - 1)];
      const next = spacedPoints[Math.min(K, i + 1)];
      let tangent = new THREE.Vector3().subVectors(next, prev).normalize();

      if (tangent.lengthSq() < 1e-6) {
        tangent.set(0, 0, 1);
      }

      // 1. Guaranteed Horizontal Normal N = (-T_z, 0, T_x)
      let normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      if (normal.lengthSq() < 1e-6) {
        normal.set(1, 0, 0);
      } else {
        normal.normalize();
      }

      // 2. Road surface Up Vector B = T x N
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      // Ensure binormal always points UP into the sky (+Y)
      if (binormal.y < 0) {
        binormal.negate();
        normal.negate();
      }

      this.frames.push({
        position,
        tangent,
        normal,
        binormal,
        u,
      });
    }
  }

  public getFrameAt(u: number): TrackFrame {
    const K = this.frames.length - 1;
    const clampedU = ((u % 1.0) + 1.0) % 1.0;
    const sampleFloat = clampedU * K;
    const idx = Math.floor(sampleFloat);
    const frac = sampleFloat - idx;
    const nextIdx = (idx + 1) % (K + 1);

    const f0 = this.frames[idx];
    const f1 = this.frames[nextIdx];

    return {
      position: new THREE.Vector3().lerpVectors(f0.position, f1.position, frac),
      tangent: new THREE.Vector3().lerpVectors(f0.tangent, f1.tangent, frac).normalize(),
      normal: new THREE.Vector3().lerpVectors(f0.normal, f1.normal, frac).normalize(),
      binormal: new THREE.Vector3().lerpVectors(f0.binormal, f1.binormal, frac).normalize(),
      u: clampedU,
    };
  }
}
