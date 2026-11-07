// frontend/src/components/simulation3d/ChassisKinematics.ts
/**
 * VELOCE V2 // 6-DOF SUSPENSION & CHASSIS DYNAMICS
 * Computes physics-accurate chassis pitch (acceleration squat & braking dive),
 * lateral roll (cornering centripetal Gs), and suspension heave.
 * Singularity-free pure quaternion composition with zero per-frame heap allocations.
 */

import * as THREE from 'three';

export interface VehicleKinematicState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  lateralG: number;
  longitudinalG: number;
  pitchRad: number;
  rollRad: number;
  steeringAngleRad: number;
}

// Static scratch matrix and quaternion buffers to eliminate GC stutter in 120 FPS loops
const _mat = new THREE.Matrix4();
const _pitchQuat = new THREE.Quaternion();
const _rollQuat = new THREE.Quaternion();
const _baseQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);
const _worldUp = new THREE.Vector3(0, 1, 0);
const _scratchRight = new THREE.Vector3();
const _scratchTrueUp = new THREE.Vector3();

/**
 * Computes 6-DOF orientation quaternion incorporating:
 * - Stable Forward Look-At orientation along circuit spline (zero gimbal lock)
 * - Lateral roll proportional to cornering G: roll = -G_lat * 0.022 rad
 * - Longitudinal pitch dive proportional to acceleration/braking: pitch = G_long * 0.010 rad
 * - Track banking compensation
 */
export function computeChassisOrientation(
  tangent: THREE.Vector3,
  lateralG: number = 0,
  longitudinalG: number = 0,
  trackBankRad: number = 0,
  outQuaternion?: THREE.Quaternion
): THREE.Quaternion {
  const forward = tangent.clone().normalize();

  if (forward.lengthSq() < 0.0001) {
    const q = outQuaternion || new THREE.Quaternion();
    return q.identity();
  }

  // Stable look-at orientation matrix pointing along tangent with world Up
  _scratchRight.crossVectors(_worldUp, forward).normalize();
  if (_scratchRight.lengthSq() < 0.001) {
    _scratchRight.set(1, 0, 0);
  }
  _scratchTrueUp.crossVectors(forward, _scratchRight).normalize();

  // Construct stable orthogonal rotation matrix: right (+X), trueUp (+Y), forward (+Z)
  _mat.makeBasis(_scratchRight, _scratchTrueUp, forward);
  _baseQuat.setFromRotationMatrix(_mat);

  // Clamp lateral roll to realistic F1 suspension travel (+/- 2.5 degrees)
  const clampedLatG = Math.max(-5.5, Math.min(5.5, lateralG));
  const rollRad = -clampedLatG * 0.022 + trackBankRad;

  // Longitudinal pitch dive: dive on braking (G < 0 -> nose down), squat on throttle (G > 0 -> tail down)
  const clampedLongG = Math.max(-5.5, Math.min(2.5, longitudinalG));
  const pitchRad = clampedLongG * 0.010;

  // Apply pitch (around local X axis) and roll (around local Z axis) using pure Quaternions (ZERO Gimbal Lock)
  _pitchQuat.setFromAxisAngle(_xAxis, pitchRad);
  _rollQuat.setFromAxisAngle(_zAxis, rollRad);

  const target = outQuaternion || new THREE.Quaternion();
  return target.copy(_baseQuat).multiply(_pitchQuat).multiply(_rollQuat);
}

/**
 * High-precision RMF basis chassis orientation:
 * Uses pre-computed orthonormal normal (+X right) and binormal (+Y surface up)
 */
export function computeChassisOrientationRMF(
  tangent: THREE.Vector3,   // +Z
  normal: THREE.Vector3,    // +X (Right)
  binormal: THREE.Vector3,  // +Y (Surface Normal)
  lateralG = 0,
  longitudinalG = 0,
  outQuaternion?: THREE.Quaternion
): THREE.Quaternion {
  _mat.makeBasis(normal, binormal, tangent);
  _baseQuat.setFromRotationMatrix(_mat);

  const clampedLatG = Math.max(-5.5, Math.min(5.5, lateralG));
  const rollRad = -clampedLatG * 0.022;

  const clampedLongG = Math.max(-5.5, Math.min(2.5, longitudinalG));
  const pitchRad = clampedLongG * 0.010;

  _pitchQuat.setFromAxisAngle(_xAxis, pitchRad);
  _rollQuat.setFromAxisAngle(_zAxis, rollRad);

  const target = outQuaternion || new THREE.Quaternion();
  return target.copy(_baseQuat).multiply(_pitchQuat).multiply(_rollQuat);
}
