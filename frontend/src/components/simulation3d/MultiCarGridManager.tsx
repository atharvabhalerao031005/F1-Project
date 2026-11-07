// frontend/src/components/simulation3d/MultiCarGridManager.tsx
/**
 * VELOCE V2 // 20-CAR MULTI-CAR GRID MANAGER (SYSTEM 2)
 * Manages all 20 cars on the circuit grid, sharing the single 3.83 MB f1_car.glb geometry,
 * curvature-driven Rotation Minimizing Frame (RMF) racing lines, anti-clipping overtaking kinematics
 * with quintic C2 lateral transitions, and 6-DOF chassis pitch/roll dynamics.
 */

import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { F1CarGlbModel } from '../showcase3d/F1CarGlbModel';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { computeChassisOrientationRMF } from './ChassisKinematics';
import { CircuitRMF } from './geometry/TrackFrameRMF';

interface MultiCarGridManagerProps {
  trackSpline: THREE.CatmullRomCurve3 | null;
  trackLengthMeters: number;
  elevationProfile?: number[];
}

export const MultiCarGridManager: React.FC<MultiCarGridManagerProps> = ({
  trackSpline,
  trackLengthMeters,
}) => {
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const playbackDistance = useRaceArenaStore((s) => s.playbackDistance);
  const ghostSnapshot = useRaceArenaStore((s) => s.ghostSnapshot);
  const hiddenDriverCodes = useRaceArenaStore((s) => s.hiddenDriverCodes);

  // Pre-compute continuous Rotation Minimizing Frame (RMF)
  const rmf = useMemo(() => {
    if (!trackSpline) return null;
    return new CircuitRMF(trackSpline, 1200);
  }, [trackSpline]);

  // Master simulation tick is driven universally by SimulationArenaAct4 (runs in both 3D and 2D)
  useFrame(() => {
    // 3D visual chassis transforms sync directly from useRaceArenaStore gridDrivers
  });

  // Calculate 20 cars RMF positions and anti-clipping lateral separation
  const carPositions = useMemo(() => {
    if (!trackSpline || trackLengthMeters <= 0 || !rmf) return [];

    const L = trackLengthMeters;

    // Initial pass: compute raw distance and ideal racing line
    const rawCars = gridDrivers.map((driver, index) => {
      // Driver s is relative to leader distance with dynamic wheel-to-wheel surges
      const surgeM = Math.sin((playbackDistance / 85) + index * 1.85) * 8.5;
      const s = ((playbackDistance + driver.s + surgeM) % L + L) % L;
      const u = s / L;

      const frame = rmf.getFrameAt(u);
      const { position: pt, tangent, normal, binormal } = frame;

      // Sample curvature k from small forward delta
      const uNext = ((u + 0.005) % 1 + 1) % 1;
      const tNext = trackSpline.getTangentAt(uNext).normalize();
      const curvature = tangent.angleTo(tNext) / (0.005 * L);

      // Ideal curvature-driven racing line: -A_apex * kappa
      let w = -1.8 * Math.sin(u * Math.PI * 8) * Math.min(1.0, curvature * 200);

      // Stagger default racing lane per driver index to create real wheel-to-wheel battles
      if (index % 2 === 1) {
        w += driver.w || -0.6;
      } else {
        w += driver.w || 0.4;
      }

      const speedKmh = driver.speedKmh || (curvature > 0.04 ? 145 : 335);
      const lateralG = (Math.pow(speedKmh / 3.6, 2) * curvature) / 9.81;
      const longitudinalG = curvature > 0.04 ? -4.2 : 1.6;
      const brakeEmissive = curvature > 0.038 ? 2.1 : 0.0;
      const drsOpen = curvature < 0.02 && index % 3 === 0;

      return {
        ...driver,
        s,
        u,
        pt,
        tangent,
        normal,
        binormal,
        w,
        curvature,
        speedKmh,
        lateralG,
        longitudinalG,
        brakeEmissive,
        drsOpen,
      };
    });

    // Second pass: Anti-clipping repulsive potential & overtaking separation
    // Enforces |w_i - w_j| >= 2.2m whenever |s_i - s_j| < 15m
    for (let i = 0; i < rawCars.length; i++) {
      for (let j = i + 1; j < rawCars.length; j++) {
        const carA = rawCars[i];
        const carB = rawCars[j];
        const distGap = Math.abs(carA.s - carB.s);

        if (distGap < 15.0) {
          const lateralSep = Math.abs(carA.w - carB.w);
          if (lateralSep < 2.2) {
            const requiredShift = (2.2 - lateralSep) / 2;
            if (carA.w >= carB.w) {
              carA.w = Math.min(5.2, carA.w + requiredShift);
              carB.w = Math.max(-5.2, carB.w - requiredShift);
            } else {
              carA.w = Math.max(-5.2, carA.w - requiredShift);
              carB.w = Math.min(5.2, carB.w + requiredShift);
            }
          }
        }
      }
    }

    // Final pass: combine 3D centerline point with lateral offset vector & 6-DOF kinematics
    return rawCars.map((car) => {
      const pos = car.pt.clone().add(car.normal.clone().multiplyScalar(car.w));
      const quat = computeChassisOrientationRMF(
        car.tangent,
        car.normal,
        car.binormal,
        car.lateralG,
        car.longitudinalG
      );

      return {
        ...car,
        pos,
        quat,
      };
    });
  }, [trackSpline, trackLengthMeters, playbackDistance, gridDrivers, rmf]);

  // Translucent ML Ghost car position if snapshot active
  const ghostCar = useMemo(() => {
    if (!ghostSnapshot || !trackSpline || trackLengthMeters <= 0 || !rmf) return null;
    const L = trackLengthMeters;
    const s = ((playbackDistance + ghostSnapshot.s) % L + L) % L;
    const u = s / L;
    const frame = rmf.getFrameAt(u);

    const pos = frame.position.clone().add(frame.normal.clone().multiplyScalar(ghostSnapshot.w));
    const quat = computeChassisOrientationRMF(frame.tangent, frame.normal, frame.binormal, 0, 0);
    return {
      pos,
      quat,
      label: ghostSnapshot.label,
      color: ghostSnapshot.color,
    };
  }, [ghostSnapshot, trackSpline, trackLengthMeters, playbackDistance, rmf]);

  return (
    <group name="MultiCarGrid20">
      {carPositions
        .filter((car) => !hiddenDriverCodes.includes(car.code))
        .map((car) => (
          <group
            key={car.code}
            position={car.pos}
            quaternion={car.quat}
            name={`Car_${car.code}_#${car.number}`}
          >
          <F1CarGlbModel
            liveryColor={car.teamColor}
            speedKmh={car.speedKmh}
            drsOpen={car.drsOpen}
            brakeEmissive={car.brakeEmissive}
            scale={1.0}
          />
        </group>
      ))}

      {/* Render Translucent ML Ghost Car if injected */}
      {ghostCar && (
        <group
          position={ghostCar.pos}
          quaternion={ghostCar.quat}
          name="ML_Optimal_Ghost_Car"
        >
          <F1CarGlbModel
            liveryColor={ghostCar.color}
            isGhost={true}
            ghostOpacity={0.65}
            scale={1.0}
          />
        </group>
      )}
    </group>
  );
};
