// frontend/src/components/simulation3d/DriverTrackingController.tsx
/**
 * VELOCE V2 // 4-CAMERA CINEMATIC BROADCAST RIG & DRIVER TRACKING CONTROLLER
 * Standard: VELOCE-V2-GRAPHICS-OVERHAUL-RESEARCH-v1.0
 * 
 * 4 Cinematic Broadcast Rigs:
 *   1. CHASE: Dual-stage damped rig with unwrapped yaw lag inertia (NO 360° spin),
 *      strict road floor elevation clamping, speed FOV warp (42° -> 54°), and engine harmonics.
 *   2. ONBOARD: Authentic roll-hoop Halo T-Cam with 100% rigid local matrix parenting.
 *   3. HELICOPTER: Low-altitude Cineflex gyro-cam tracking the racing pack (26m altitude, 30° FOV).
 *   4. TRACKSIDE: 200mm telephoto station (14° FOV) panning across classic Monza apexes.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { CircuitRMF } from './geometry/TrackFrameRMF';

interface DriverTrackingControllerProps {
  trackSpline: THREE.CatmullRomCurve3 | null;
  trackLengthMeters: number;
}

// 2nd-order critically damped SmoothDamp (zero overshoot)
function smoothDamp(
  current: number,
  target: number,
  velocityRef: { val: number },
  smoothTime: number,
  delta: number
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const h = omega * delta;
  const d = 1 / (1 + h + 0.48 * h * h + 0.235 * h * h * h);
  const diff = current - target;
  const temp = (velocityRef.val + omega * diff) * delta;
  velocityRef.val = (velocityRef.val - omega * temp) * d;
  return target + (diff + temp) * d;
}

// Shortest-arc angle unwrapped SmoothDamp (strictly eliminates the 360° death spin)
function smoothDampAngle(
  current: number,
  target: number,
  velocityRef: { val: number },
  smoothTime: number,
  delta: number
): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return smoothDamp(current, current + diff, velocityRef, smoothTime, delta);
}

export const DriverTrackingController: React.FC<DriverTrackingControllerProps> = ({
  trackSpline,
  trackLengthMeters,
}) => {
  const { camera } = useThree();
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const cameraRig = useRaceArenaStore((s) => s.cameraRig);
  const playbackDistance = useRaceArenaStore((s) => s.playbackDistance);
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);

  // Pre-compute continuous Rotation Minimizing Frame (RMF) for the circuit
  const rmf = useMemo(() => {
    if (!trackSpline) return null;
    return new CircuitRMF(trackSpline, 1200);
  }, [trackSpline]);

  const camPosRef = useRef(new THREE.Vector3());
  const camVelX = useRef({ val: 0 });
  const camVelY = useRef({ val: 0 });
  const camVelZ = useRef({ val: 0 });

  const lookAtRef = useRef(new THREE.Vector3());
  const lookVelX = useRef({ val: 0 });
  const lookVelY = useRef({ val: 0 });
  const lookVelZ = useRef({ val: 0 });

  const currentYawRef = useRef(0);
  const yawVel = useRef({ val: 0 });

  const lastRigRef = useRef(cameraRig);
  const isInitialized = useRef(false);

  useFrame((state, delta) => {
    if (!trackSpline || trackLengthMeters <= 0 || !rmf) return;

    const L = trackLengthMeters;

    // Locate active tracked driver index and exact position matching MultiCarGridManager
    const driverIndex = gridDrivers.findIndex((d) => d.code === activeDriverCode);
    const index = driverIndex >= 0 ? driverIndex : 0;
    const driver = gridDrivers[index] || gridDrivers[0];

    // Dynamic wheel-to-wheel surge matching MultiCarGridManager identically
    const surgeM = Math.sin((playbackDistance / 85) + index * 1.85) * 8.5;
    const s = ((playbackDistance + driver.s + surgeM) % L + L) % L;
    const u = s / L;

    // Evaluate continuous RMF frame at car's arc length
    const frame = rmf.getFrameAt(u);
    const { position: carPt, tangent, normal, binormal } = frame;

    // Curvature calculation for racing line offset
    const uNext = ((u + 0.005) % 1 + 1) % 1;
    const tNext = trackSpline.getTangentAt(uNext).normalize();
    const curvature = tangent.angleTo(tNext) / (0.005 * L);

    // Curvature-driven racing line matching MultiCarGridManager
    let w = -1.8 * Math.sin(u * Math.PI * 8) * Math.min(1.0, curvature * 200);
    if (index % 2 === 1) {
      w += driver.w || -0.6;
    } else {
      w += driver.w || 0.4;
    }

    // Exact chassis world position
    const carPos = carPt.clone().add(normal.clone().multiplyScalar(w));

    // Construct car orientation matrix basis: normal (+X right), binormal (+Y surface up), tangent (+Z forward)
    const carBasisMat = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    const carQuat = new THREE.Quaternion().setFromRotationMatrix(carBasisMat);

    const speedNorm = THREE.MathUtils.clamp((driver.speedKmh || 300) / 350, 0, 1);
    let targetFov = 46;

    // ========================================================================
    // RIG SNAP DETECTION: Instant snap on rig switch (prevents clipping through ground)
    // ========================================================================
    const didRigChange = lastRigRef.current !== cameraRig;
    if (didRigChange) {
      lastRigRef.current = cameraRig;
      isInitialized.current = false;
      camVelX.current.val = 0;
      camVelY.current.val = 0;
      camVelZ.current.val = 0;
      lookVelX.current.val = 0;
      lookVelY.current.val = 0;
      lookVelZ.current.val = 0;
      yawVel.current.val = 0;
    }

    if (cameraRig === 'ONBOARD') {
      // ======================================================================
      // 1. COCKPIT HALO T-CAM: 100% RIGID LOCAL MATRIX PARENTING
      // ======================================================================
      targetFov = 68;

      // Realistic engine harmonics jitter
      const engineJitter = Math.sin(state.clock.elapsedTime * 85) * 0.003 * speedNorm;

      // T-Cam coordinates: positioned on airbox roll-hoop looking forward over Halo & nosecone
      const localCamOffset = new THREE.Vector3(0, 1.12 + engineJitter, -0.22);
      // Look-ahead biased into turn apex based on curvature
      const apexOffset = -curvature * 14.0;
      const localLookOffset = new THREE.Vector3(apexOffset, 0.82, 28.0);
      const localUp = new THREE.Vector3(0, 1, 0);

      // Transform rigidly to world coordinates via car's rotation quaternion
      const worldCamPos = localCamOffset.clone().applyQuaternion(carQuat).add(carPos);
      const worldLookAt = localLookOffset.clone().applyQuaternion(carQuat).add(carPos);
      const worldUp = localUp.clone().applyQuaternion(carQuat);

      camera.position.copy(worldCamPos);
      camera.up.copy(worldUp);
      camera.lookAt(worldLookAt);

      camPosRef.current.copy(worldCamPos);
      lookAtRef.current.copy(worldLookAt);
    } else if (cameraRig === 'CHASE') {
      // ======================================================================
      // 2. CHASE RIG: UNWRAPPED YAW LAG + CRITICALLY DAMPED + ELEVATION CLAMP
      // ======================================================================
      targetFov = 44 + speedNorm * 10;

      // Target yaw along car tangent vector
      const targetYaw = Math.atan2(tangent.x, tangent.z);

      if (!isInitialized.current) {
        currentYawRef.current = targetYaw;
        const initBack = tangent.clone().multiplyScalar(-5.4);
        camPosRef.current.copy(carPos).add(initBack).add(new THREE.Vector3(0, 1.85, 0));
        lookAtRef.current.copy(carPos).add(tangent.clone().multiplyScalar(4.5)).add(new THREE.Vector3(0, 0.65, 0));
        isInitialized.current = true;
      }

      // Smooth unwrapped yaw damping (zero 360° spinning across branch cut)
      currentYawRef.current = smoothDampAngle(
        currentYawRef.current,
        targetYaw,
        yawVel.current,
        0.20,
        delta
      );

      const lagDir = new THREE.Vector3(
        Math.sin(currentYawRef.current),
        0,
        Math.cos(currentYawRef.current)
      ).normalize();

      // High-frequency road vibration
      const roadShake = Math.sin(state.clock.elapsedTime * 60) * 0.012 * speedNorm;

      const targetCamPos = carPos.clone().add(lagDir.clone().multiplyScalar(-5.4));
      targetCamPos.y += 1.85 + roadShake;

      const targetLookAt = carPos.clone().add(tangent.clone().multiplyScalar(4.8));
      targetLookAt.y += 0.65;

      // Critically damped position smoothing
      camPosRef.current.x = smoothDamp(camPosRef.current.x, targetCamPos.x, camVelX.current, 0.16, delta);
      camPosRef.current.y = smoothDamp(camPosRef.current.y, targetCamPos.y, camVelY.current, 0.16, delta);
      camPosRef.current.z = smoothDamp(camPosRef.current.z, targetCamPos.z, camVelZ.current, 0.16, delta);

      // ====================================================================
      // STRICT ROAD FLOOR ELEVATION CLAMP: Prevents camera dipping into tarmac
      // ====================================================================
      const camU = ((s - 5.4) % L + L) / L;
      const trackAtCam = rmf.getFrameAt(camU).position;
      const minCamElevation = trackAtCam.y + 1.25;

      if (camPosRef.current.y < minCamElevation) {
        camPosRef.current.y = minCamElevation;
        if (camVelY.current.val < 0) camVelY.current.val = 0;
      }

      // Critically damped look-at tracking
      lookAtRef.current.x = smoothDamp(lookAtRef.current.x, targetLookAt.x, lookVelX.current, 0.10, delta);
      lookAtRef.current.y = smoothDamp(lookAtRef.current.y, targetLookAt.y, lookVelY.current, 0.10, delta);
      lookAtRef.current.z = smoothDamp(lookAtRef.current.z, targetLookAt.z, lookVelZ.current, 0.10, delta);

      camera.position.copy(camPosRef.current);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookAtRef.current);
    } else if (cameraRig === 'HELICOPTER') {
      // ======================================================================
      // 3. HELICOPTER RIG: Low-altitude Cineflex gyro-cam tracking pack
      // ======================================================================
      targetFov = 32;

      const angle = state.clock.elapsedTime * 0.12;
      const radius = 24.0;
      const heliOffset = new THREE.Vector3(
        Math.cos(angle) * radius,
        22.0,
        Math.sin(angle) * radius
      );

      const targetCamPos = carPos.clone().add(heliOffset);
      const targetLookAt = carPos.clone().add(new THREE.Vector3(0, 0.8, 0));

      if (!isInitialized.current) {
        camPosRef.current.copy(targetCamPos);
        lookAtRef.current.copy(targetLookAt);
        isInitialized.current = true;
      }

      camPosRef.current.x = smoothDamp(camPosRef.current.x, targetCamPos.x, camVelX.current, 0.35, delta);
      camPosRef.current.y = smoothDamp(camPosRef.current.y, targetCamPos.y, camVelY.current, 0.35, delta);
      camPosRef.current.z = smoothDamp(camPosRef.current.z, targetCamPos.z, camVelZ.current, 0.35, delta);

      lookAtRef.current.x = smoothDamp(lookAtRef.current.x, targetLookAt.x, lookVelX.current, 0.20, delta);
      lookAtRef.current.y = smoothDamp(lookAtRef.current.y, targetLookAt.y, lookVelY.current, 0.20, delta);
      lookAtRef.current.z = smoothDamp(lookAtRef.current.z, targetLookAt.z, lookVelZ.current, 0.20, delta);

      camera.position.copy(camPosRef.current);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookAtRef.current);
    } else if (cameraRig === 'TRACKSIDE') {
      // ======================================================================
      // 4. TRACKSIDE RIG: 200mm telephoto station panning across apex
      // ======================================================================
      targetFov = 16;

      const apexU = ((Math.floor(u * 12) + 0.5) / 12) % 1;
      const apexFrame = rmf.getFrameAt(apexU);
      const targetCamPos = apexFrame.position.clone()
        .add(apexFrame.normal.clone().multiplyScalar(18.0))
        .add(new THREE.Vector3(0, 3.2, 0));
      const targetLookAt = carPos.clone().add(new THREE.Vector3(0, 0.85, 0));

      if (!isInitialized.current) {
        camPosRef.current.copy(targetCamPos);
        lookAtRef.current.copy(targetLookAt);
        isInitialized.current = true;
      }

      camPosRef.current.x = smoothDamp(camPosRef.current.x, targetCamPos.x, camVelX.current, 0.45, delta);
      camPosRef.current.y = smoothDamp(camPosRef.current.y, targetCamPos.y, camVelY.current, 0.45, delta);
      camPosRef.current.z = smoothDamp(camPosRef.current.z, targetCamPos.z, camVelZ.current, 0.45, delta);

      lookAtRef.current.x = smoothDamp(lookAtRef.current.x, targetLookAt.x, lookVelX.current, 0.08, delta);
      lookAtRef.current.y = smoothDamp(lookAtRef.current.y, targetLookAt.y, lookVelY.current, 0.08, delta);
      lookAtRef.current.z = smoothDamp(lookAtRef.current.z, targetLookAt.z, lookVelZ.current, 0.08, delta);

      camera.position.copy(camPosRef.current);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookAtRef.current);
    }

    // Dynamic smooth FOV adjustment
    const persCam = camera as THREE.PerspectiveCamera;
    if (persCam.fov !== undefined) {
      persCam.fov = THREE.MathUtils.damp(persCam.fov, targetFov, 6.0, delta);
      persCam.updateProjectionMatrix();
    }
  });

  return null;
};
