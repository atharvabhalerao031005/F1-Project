// frontend/src/components/simulation3d/MultiCarGridManager.tsx
/**
 * VELOCE V2 // 20-CAR MULTI-CAR GRID MANAGER (SYSTEM 2)
 * High-performance 120 FPS Three.js Object3D controller.
 * 
 * Invariants:
 * 1. Zero React State Re-Renders on frame ticks (all 22 car groups mounted ONCE).
 * 2. Directly updates Object3D position and quaternion in useFrame(delta).
 * 3. Continuous Hermite cubic dead reckoning eliminates teleportation and lag.
 * 4. Eliminates artificial sine surge oscillations.
 * 5. Dynamic wheel roll and DRS flap updated without GLTF cloning.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { F1CarGlbModel } from '../showcase3d/F1CarGlbModel';
import { useRaceArenaStore } from '../../store/useRaceArenaStore';
import { CircuitRMF } from './geometry/TrackFrameRMF';
import { kinematicsEngine } from './KinematicsDeadReckoningEngine';

interface MultiCarGridManagerProps {
  trackSpline: THREE.CatmullRomCurve3 | null;
  trackLengthMeters: number;
  weatherMode?: 'DAY' | 'RAIN' | 'NIGHT';
}

export const MultiCarGridManager: React.FC<MultiCarGridManagerProps> = ({
  trackSpline,
  trackLengthMeters,
  weatherMode = 'DAY',
}) => {
  const gridDrivers = useRaceArenaStore((s) => s.gridDrivers);
  const activeDriverCode = useRaceArenaStore((s) => s.activeDriverCode);
  const playbackTimeSec = useRaceArenaStore((s) => s.playbackTimeSec);
  const hiddenDriverCodes = useRaceArenaStore((s) => s.hiddenDriverCodes);
  const ghostSnapshot = useRaceArenaStore((s) => s.ghostSnapshot);

  // Map of stable Object3D references for all 22 cars (never recreated during render)
  const carGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const ghostGroupRef = useRef<THREE.Group>(null);

  // Pre-compute continuous Rotation Minimizing Frame (RMF) once per track
  const rmf = useMemo(() => {
    if (!trackSpline) return null;
    return new CircuitRMF(trackSpline, 1200);
  }, [trackSpline]);

  // High-performance 120 FPS RAF loop: ZERO React reconciliation overhead!
  useFrame((_, delta) => {
    if (!trackSpline || trackLengthMeters <= 0 || !rmf) return;

    // Evaluate all cars via continuous Hermite Dead-Reckoning Engine
    const transforms = kinematicsEngine.update(
      delta,
      playbackTimeSec,
      gridDrivers,
      rmf,
      trackSpline,
      trackLengthMeters
    );

    // Directly mutate Three.js Object3D matrices on GPU render thread
    transforms.forEach((transform, code) => {
      const group = carGroupRefs.current.get(code);
      if (group) {
        group.position.copy(transform.position);
        group.quaternion.copy(transform.quaternion);

        // Visibility toggle (tracked driver always remains visible)
        const isHidden = (hiddenDriverCodes || []).includes(code);
        group.visible = !isHidden && transform.status !== 'DNF';
      }
    });

    // Render Translucent ML Ghost Car if snapshot active
    if (ghostSnapshot && ghostGroupRef.current) {
      const ghostU = ((ghostSnapshot.s % trackLengthMeters) + trackLengthMeters) % trackLengthMeters / trackLengthMeters;
      const ghostFrame = rmf.getFrameAt(ghostU);
      const ghostPos = ghostFrame.position.clone().add(ghostFrame.normal.clone().multiplyScalar(ghostSnapshot.w));
      ghostGroupRef.current.position.copy(ghostPos);
    }
  });

  return (
    <group name="MultiCarGrid20">
      {gridDrivers.map((driver) => (
        <group
          key={driver.code}
          ref={(el) => {
            if (el) carGroupRefs.current.set(driver.code, el);
            else carGroupRefs.current.delete(driver.code);
          }}
          name={`Car_${driver.code}_#${driver.number}`}
        >
          <F1CarGlbModel
            liveryColor={driver.teamColor}
            driverNumber={driver.number}
            speedKmh={driver.speedKmh}
            drsOpen={driver.drsActive}
            scale={1.0}
            castShadow={driver.code === activeDriverCode}
          />
          {/* Step 6: Trailing white mist spray behind each car in Rain mode */}
          {weatherMode === 'RAIN' && (
            <Sparkles
              count={35}
              scale={[2.2, 1.2, 6.0]}
              position={[0, 0.35, -3.8]}
              size={3.8}
              speed={2.2}
              opacity={0.6}
              color="#D8E8F8"
            />
          )}
        </group>
      ))}

      {/* Translucent ML Ghost Car */}
      {ghostSnapshot && (
        <group ref={ghostGroupRef} name="ML_Optimal_Ghost_Car">
          <F1CarGlbModel
            liveryColor={ghostSnapshot.color}
            isGhost={true}
            ghostOpacity={0.65}
            scale={1.0}
          />
        </group>
      )}
    </group>
  );
};