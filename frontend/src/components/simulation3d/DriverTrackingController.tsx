// frontend/src/components/simulation3d/DriverTrackingController.tsx
/**
 * VELOCE V2 // 4-CAMERA CINEMATIC BROADCAST RIG & DRIVER TRACKING CONTROLLER
 * Synchronized with KinematicsDeadReckoningEngine for sub-millimeter camera lock.
 * 
 * 4 Cinematic Broadcast Rigs:
 *   1. CHASE: Damped rig locked to smoothed chassis tangent with unwrapped yaw lag (NO 360° spin),
 *      strict road floor elevation clamping, dynamic FOV warp, and high-frequency harmonics.
 *   2. ONBOARD: Authentic roll-hoop Halo T-Cam with 100% rigid local matrix parenting.
 *   3. HELICOPTER: Low-altitude Cineflex gyro-cam tracking pack (26m altitude, 32° FOV).
 *   4. TRACKSIDE: 200mm telephoto station (16° FOV) panning across classic apexes.
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { kinematicsEngine } from './KinematicsDeadReckoningEngine';

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
    if (!trackSpline || trackLengthMeters <= 0) return;

    // Retrieve EXACT real-time smoothed transform from Kinematics Dead-Reckoning Engine
    const transform = kinematicsEngine.getEvaluatedTransform(activeDriverCode);
    if (!transform) return;

    const carPos = transform.position;
    const carQuat = transform.quaternion;
    const tangent = transform.tangent;
    const speedKmh = transform.speedKmh;
    const speedNorm = THREE.MathUtils.clamp(speedKmh / 350, 0, 1);

    // Instant snap when camera rig switches
    const isRigSwitch = lastRigRef.current !== cameraRig;
    lastRigRef.current = cameraRig;

    // Perspective Camera target values
    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();
    let targetFov = 46;

    // -------------------------------------------------------------------------
    // RIG 1: CHASE CAMERA
    // -------------------------------------------------------------------------
    if (cameraRig === 'CHASE') {
      targetFov = THREE.MathUtils.lerp(44, 52, speedNorm);

      const targetYaw = Math.atan2(tangent.x, tangent.z);
      if (!isInitialized.current || isRigSwitch) {
        currentYawRef.current = targetYaw;
        yawVel.current.val = 0;
      } else {
        currentYawRef.current = smoothDampAngle(
          currentYawRef.current,
          targetYaw,
          yawVel.current,
          0.14,
          delta
        );
      }

      const chaseHeading = new THREE.Vector3(
        Math.sin(currentYawRef.current),
        0,
        Math.cos(currentYawRef.current)
      ).normalize();

      const chaseDist = THREE.MathUtils.lerp(7.2, 8.8, speedNorm);
      const chaseHeight = THREE.MathUtils.lerp(2.2, 2.7, speedNorm);

      targetCamPos = carPos
        .clone()
        .sub(chaseHeading.clone().multiplyScalar(chaseDist))
        .add(new THREE.Vector3(0, chaseHeight, 0));

      const roadFloorY = carPos.y + 0.65;
      if (targetCamPos.y < roadFloorY) {
        targetCamPos.y = roadFloorY;
      }

      const forwardOffsetM = THREE.MathUtils.lerp(3.2, 5.5, speedNorm);
      targetLookAt = carPos
        .clone()
        .add(tangent.clone().multiplyScalar(forwardOffsetM))
        .add(new THREE.Vector3(0, 0.95, 0));

      if (speedKmh > 260) {
        const time = state.clock.getElapsedTime();
        const rumbleAmp = 0.018 * speedNorm;
        targetCamPos.x += Math.sin(time * 38.0) * rumbleAmp;
        targetCamPos.y += Math.cos(time * 42.0) * rumbleAmp;
      }
    }

    // -------------------------------------------------------------------------
    // RIG 2: ONBOARD HALO T-CAM
    // -------------------------------------------------------------------------
    else if (cameraRig === 'ONBOARD') {
      targetFov = THREE.MathUtils.lerp(58, 64, speedNorm);

      const localCamOffset = new THREE.Vector3(0.0, 1.15, -0.22);
      const localLookOffset = new THREE.Vector3(0.0, 0.92, 12.0);

      targetCamPos = localCamOffset.clone().applyQuaternion(carQuat).add(carPos);
      targetLookAt = localLookOffset.clone().applyQuaternion(carQuat).add(carPos);

      const time = state.clock.getElapsedTime();
      const aeroBuffet = 0.012 * speedNorm;
      targetCamPos.x += Math.sin(time * 44.0) * aeroBuffet;
      targetCamPos.y += Math.cos(time * 48.0) * aeroBuffet;
    }

    // -------------------------------------------------------------------------
    // RIG 3: HELICOPTER CINEFLEX
    // -------------------------------------------------------------------------
    else if (cameraRig === 'HELICOPTER') {
      targetFov = 32;

      const heliAltitude = 28.0;
      const heliDist = 34.0;
      const heliOffset = tangent
        .clone()
        .multiplyScalar(-heliDist)
        .add(new THREE.Vector3(12.0, heliAltitude, 0));

      targetCamPos = carPos.clone().add(heliOffset);
      targetLookAt = carPos.clone().add(new THREE.Vector3(0, 0.5, 0));
    }

    // -------------------------------------------------------------------------
    // RIG 4: TRACKSIDE TELEPHOTO
    // -------------------------------------------------------------------------
    else if (cameraRig === 'TRACKSIDE') {
      targetFov = 16;

      const uStation = Math.floor(transform.u * 8) / 8 + 0.06;
      const normU = ((uStation % 1.0) + 1.0) % 1.0;
      const stationPt = trackSpline.getPointAt(normU);

      targetCamPos = stationPt.clone().add(new THREE.Vector3(18.0, 4.2, 18.0));
      targetLookAt = carPos.clone().add(new THREE.Vector3(0, 0.5, 0));
    }

    // -------------------------------------------------------------------------
    // Critically Damped Position & LookAt Integration
    // -------------------------------------------------------------------------
    const posSmooth = isRigSwitch || !isInitialized.current ? 0.001 : cameraRig === 'ONBOARD' ? 0.018 : 0.085;
    const lookSmooth = isRigSwitch || !isInitialized.current ? 0.001 : cameraRig === 'ONBOARD' ? 0.018 : 0.095;

    camPosRef.current.x = smoothDamp(camera.position.x, targetCamPos.x, camVelX.current, posSmooth, delta);
    camPosRef.current.y = smoothDamp(camera.position.y, targetCamPos.y, camVelY.current, posSmooth, delta);
    camPosRef.current.z = smoothDamp(camera.position.z, targetCamPos.z, camVelZ.current, posSmooth, delta);

    lookAtRef.current.x = smoothDamp(lookAtRef.current.x || targetLookAt.x, targetLookAt.x, lookVelX.current, lookSmooth, delta);
    lookAtRef.current.y = smoothDamp(lookAtRef.current.y || targetLookAt.y, targetLookAt.y, lookVelY.current, lookSmooth, delta);
    lookAtRef.current.z = smoothDamp(lookAtRef.current.z || targetLookAt.z, targetLookAt.z, lookVelZ.current, lookSmooth, delta);

    camera.position.copy(camPosRef.current);
    camera.lookAt(lookAtRef.current);

    const persCamera = camera as THREE.PerspectiveCamera;
    if (persCamera.fov !== undefined && Math.abs(persCamera.fov - targetFov) > 0.05) {
      persCamera.fov = THREE.MathUtils.damp(persCamera.fov, targetFov, 6.0, delta);
      persCamera.updateProjectionMatrix();
    }

    isInitialized.current = true;
  });

  return null;
};