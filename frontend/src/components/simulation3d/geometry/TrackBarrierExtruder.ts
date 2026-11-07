// frontend/src/components/simulation3d/geometry/TrackBarrierExtruder.ts
/**
 * VELOCE V2 // PROCEDURAL TRACKSIDE BARRIER & CATCH FENCE GENERATOR
 * Extrudes continuous Armco W-beam galvanized guardrails and instanced
 * Tecpro energy-absorbing safety barrier blocks around the circuit.
 */

import * as THREE from 'three';

export interface BarrierGenerationResult {
  armcoLeft: THREE.BufferGeometry;
  armcoRight: THREE.BufferGeometry;
  fenceLeft: THREE.BufferGeometry;
  fenceRight: THREE.BufferGeometry;
  tecproMatrices: THREE.Matrix4[];
}

export function generateTrackBarriers(
  spline: THREE.CatmullRomCurve3,
  samples: number = 320,
  trackHalfWidth: number = 6.5
): BarrierGenerationResult {
  const up = new THREE.Vector3(0, 1, 0);

  const leftArmcoPos: number[] = [];
  const rightArmcoPos: number[] = [];
  const leftArmcoNorm: number[] = [];
  const rightArmcoNorm: number[] = [];

  const leftFencePos: number[] = [];
  const rightFencePos: number[] = [];

  const tecproMatrices: THREE.Matrix4[] = [];

  const armcoOffset = trackHalfWidth + 3.2; // 3.2m beyond kerb edge
  const fenceOffset = armcoOffset + 0.6;   // 0.6m behind Armco
  const armcoHeight = 0.95;
  const fenceHeight = 3.2;

  // Sample points along spline
  const points: {
    pt: THREE.Vector3;
    tangent: THREE.Vector3;
    normal: THREE.Vector3;
    u: number;
    curvature: number;
  }[] = [];

  for (let i = 0; i <= samples; i++) {
    const u = (i % samples) / samples;
    const pt = spline.getPointAt(u);
    const tangent = spline.getTangentAt(u).normalize();
    const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();

    const uNext = ((u + 0.005) % 1 + 1) % 1;
    const tNext = spline.getTangentAt(uNext).normalize();
    const curvature = tangent.angleTo(tNext) / 0.005;

    points.push({ pt, tangent, normal, u, curvature });
  }

  // Generate continuous extruded ribbon quads for Armco and Catch Fences
  for (let i = 0; i < samples; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Left Armco Quad
    const L1_bot = p1.pt.clone().add(p1.normal.clone().multiplyScalar(-armcoOffset));
    const L1_top = L1_bot.clone().add(new THREE.Vector3(0, armcoHeight, 0));
    const L2_bot = p2.pt.clone().add(p2.normal.clone().multiplyScalar(-armcoOffset));
    const L2_top = L2_bot.clone().add(new THREE.Vector3(0, armcoHeight, 0));

    // Two triangles for left quad
    leftArmcoPos.push(
      L1_bot.x, L1_bot.y, L1_bot.z,
      L2_bot.x, L2_bot.y, L2_bot.z,
      L1_top.x, L1_top.y, L1_top.z,

      L1_top.x, L1_top.y, L1_top.z,
      L2_bot.x, L2_bot.y, L2_bot.z,
      L2_top.x, L2_top.y, L2_top.z
    );

    // Left Armco Normals
    const L_norm = p1.normal.clone().negate();
    for (let k = 0; k < 6; k++) {
      leftArmcoNorm.push(L_norm.x, L_norm.y, L_norm.z);
    }

    // Right Armco Quad
    const R1_bot = p1.pt.clone().add(p1.normal.clone().multiplyScalar(armcoOffset));
    const R1_top = R1_bot.clone().add(new THREE.Vector3(0, armcoHeight, 0));
    const R2_bot = p2.pt.clone().add(p2.normal.clone().multiplyScalar(armcoOffset));
    const R2_top = R2_bot.clone().add(new THREE.Vector3(0, armcoHeight, 0));

    rightArmcoPos.push(
      R1_bot.x, R1_bot.y, R1_bot.z,
      R1_top.x, R1_top.y, R1_top.z,
      R2_bot.x, R2_bot.y, R2_bot.z,

      R1_top.x, R1_top.y, R1_top.z,
      R2_top.x, R2_top.y, R2_top.z,
      R2_bot.x, R2_bot.y, R2_bot.z
    );

    const R_norm = p1.normal.clone();
    for (let k = 0; k < 6; k++) {
      rightArmcoNorm.push(R_norm.x, R_norm.y, R_norm.z);
    }

    // Left Catch Fence Quad
    const LF1_bot = p1.pt.clone().add(p1.normal.clone().multiplyScalar(-fenceOffset));
    const LF1_top = LF1_bot.clone().add(new THREE.Vector3(0, fenceHeight, 0));
    const LF2_bot = p2.pt.clone().add(p2.normal.clone().multiplyScalar(-fenceOffset));
    const LF2_top = LF2_bot.clone().add(new THREE.Vector3(0, fenceHeight, 0));

    leftFencePos.push(
      LF1_bot.x, LF1_bot.y, LF1_bot.z,
      LF2_bot.x, LF2_bot.y, LF2_bot.z,
      LF1_top.x, LF1_top.y, LF1_top.z,

      LF1_top.x, LF1_top.y, LF1_top.z,
      LF2_bot.x, LF2_bot.y, LF2_bot.z,
      LF2_top.x, LF2_top.y, LF2_top.z
    );

    // Right Catch Fence Quad
    const RF1_bot = p1.pt.clone().add(p1.normal.clone().multiplyScalar(fenceOffset));
    const RF1_top = RF1_bot.clone().add(new THREE.Vector3(0, fenceHeight, 0));
    const RF2_bot = p2.pt.clone().add(p2.normal.clone().multiplyScalar(fenceOffset));
    const RF2_top = RF2_bot.clone().add(new THREE.Vector3(0, fenceHeight, 0));

    rightFencePos.push(
      RF1_bot.x, RF1_bot.y, RF1_bot.z,
      RF1_top.x, RF1_top.y, RF1_top.z,
      RF2_bot.x, RF2_bot.y, RF2_bot.z,

      RF1_top.x, RF1_top.y, RF1_top.z,
      RF2_top.x, RF2_top.y, RF2_top.z,
      RF2_bot.x, RF2_bot.y, RF2_bot.z
    );

    // Tecpro Blocks at high-curvature runoffs (Curvature > 0.08)
    if (p1.curvature > 0.08) {
      const tecproSide = p1.curvature > 0 ? 1 : -1;
      const tecproPos = p1.pt.clone().add(p1.normal.clone().multiplyScalar(tecproSide * (armcoOffset - 0.4)));
      tecproPos.y = 0.50; // Place firmly on ground

      const yaw = Math.atan2(-p1.tangent.z, p1.tangent.x);
      const quat = new THREE.Quaternion().setFromAxisAngle(up, yaw);
      const mat = new THREE.Matrix4().compose(
        tecproPos,
        quat,
        new THREE.Vector3(1, 1, 1)
      );
      tecproMatrices.push(mat);
    }
  }

  const armcoLeft = new THREE.BufferGeometry();
  armcoLeft.setAttribute('position', new THREE.Float32BufferAttribute(leftArmcoPos, 3));
  armcoLeft.setAttribute('normal', new THREE.Float32BufferAttribute(leftArmcoNorm, 3));

  const armcoRight = new THREE.BufferGeometry();
  armcoRight.setAttribute('position', new THREE.Float32BufferAttribute(rightArmcoPos, 3));
  armcoRight.setAttribute('normal', new THREE.Float32BufferAttribute(rightArmcoNorm, 3));

  const fenceLeft = new THREE.BufferGeometry();
  fenceLeft.setAttribute('position', new THREE.Float32BufferAttribute(leftFencePos, 3));
  fenceLeft.computeVertexNormals();

  const fenceRight = new THREE.BufferGeometry();
  fenceRight.setAttribute('position', new THREE.Float32BufferAttribute(rightFencePos, 3));
  fenceRight.computeVertexNormals();

  return {
    armcoLeft,
    armcoRight,
    fenceLeft,
    fenceRight,
    tecproMatrices,
  };
}
