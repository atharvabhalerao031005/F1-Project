// frontend/src/components/simulation3d/DriverTrackingController.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { kinematicsEngine } from './KinematicsDeadReckoningEngine';

export interface DriverTrackingControllerProps {
  getTrackedCarPose?: () => { position: THREE.Vector3; tangent: THREE.Vector3; speedKmh: number } | null;
  trackSpline?: THREE.CatmullRomCurve3 | null;
  trackLengthMeters?: number;
}

export const DriverTrackingController: React.FC<DriverTrackingControllerProps> = ({
  getTrackedCarPose,
}) => {
  const cameraRig = useRaceArenaStore((s) => s.cameraRig);
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const smoothedTangentRef = useRef(new THREE.Vector3(0, 0, 1));
  const initializedRef = useRef(false);

  // Execute with priority 1 AFTER car positions have been updated in the current frame
  useFrame(({ camera }, delta) => {
    const pose = getTrackedCarPose
      ? getTrackedCarPose()
      : kinematicsEngine.getEvaluatedTransform(activeDriverCode);
    if (!pose) return;

    const dt = Math.min(delta, 0.05);
    const { position: carPos, tangent: carTan } = pose;

    if (!initializedRef.current) {
      smoothedTangentRef.current.copy(carTan).normalize();
      initializedRef.current = true;
    } else {
      // Smooth ONLY the rotational tangent vector (never lerp position against a fast-moving target!)
      const alpha = 1 - Math.exp(-10.0 * dt);
      smoothedTangentRef.current.lerp(carTan, alpha).normalize();
    }

    const fwd = smoothedTangentRef.current;

    if (cameraRig === 'CHASE') {
      // Locked exact 6.6m behind and 2.1m above the car — ZERO longitudinal vibration!
      camera.position.set(
        carPos.x - fwd.x * 6.6,
        carPos.y + 2.1,
        carPos.z - fwd.z * 6.6
      );
      camera.lookAt(
        carPos.x + fwd.x * 12.0,
        carPos.y + 0.65,
        carPos.z + fwd.z * 12.0
      );
    } else if (cameraRig === 'ONBOARD') {
      // Locked Onboard Halo T-Cam — ZERO vibration!
      camera.position.set(
        carPos.x + fwd.x * 0.15,
        carPos.y + 1.18,
        carPos.z + fwd.z * 0.15
      );
      camera.lookAt(
        carPos.x + fwd.x * 28.0,
        carPos.y + 0.85,
        carPos.z + fwd.z * 28.0
      );
    } else if (cameraRig === 'HELICOPTER') {
      camera.position.set(
        carPos.x - fwd.x * 26.0 + fwd.z * 14.0,
        carPos.y + 24.0,
        carPos.z - fwd.z * 26.0 - fwd.x * 14.0
      );
      camera.lookAt(carPos.x + fwd.x * 8.0, carPos.y, carPos.z + fwd.z * 8.0);
    } else {
      // TRACKSIDE Broadcast Station (snaps to nearest 250m marshalling post and pans smoothly)
      const stationX = Math.round(carPos.x / 220) * 220 + 22;
      const stationZ = Math.round(carPos.z / 220) * 220 + 22;
      camera.position.set(stationX, carPos.y + 4.5, stationZ);
      camera.lookAt(carPos.x, carPos.y + 0.8, carPos.z);
    }
  });

  return null;
};
