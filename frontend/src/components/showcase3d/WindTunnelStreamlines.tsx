// frontend/src/components/showcase3d/WindTunnelStreamlines.tsx
/**
 * VELOCE V2 // SILKY LAMINAR FLOW AERODYNAMIC STREAMLINE RIBBONS
 * Module: frontend/src/components/showcase3d/WindTunnelStreamlines.tsx
 * Standard: VELOCE-V2-ENGINEERING-SPEC-v2.0
 * 
 * Aerodynamic Trajectories:
 * 1. Centerline Stagnation: Nosecone -> Cockpit/Halo -> Roll-hoop -> DRS Wing Slot
 * 2. Port Y250 Vortex: Front Wing Flap Tips -> Suspension Inwash -> Floor Edge
 * 3. Starboard Y250 Vortex: Starboard Wingtip Helical Wake
 * 4. Port Venturi Undercut Channel: Radiator Inflow -> Coke-Bottle Waist -> Diffuser Plume
 * 5. Starboard Venturi Undercut Channel: Starboard Coke-Bottle Compression
 * 6. Port Halo Lateral Wash: Divergent Flow Around Driver Helmet & Air Intake
 * 7. Starboard Halo Lateral Wash: Symmetrical Rollhoop Wash
 * 8. Rear Wing Mainplane Wake: Low-Pressure High-Velocity Trailing Expansion
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface WindTunnelStreamlinesProps {
  visible?: boolean;
  opacity?: number;
  flowSpeed?: number;
}

// Custom GLSL Shader Material for silky, weightless aerodynamic velocity ribbons
const StreamlineShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColorBase: { value: new THREE.Color('#FAF9F6') }, // Sterile Alabaster Entry Flow
    uColorFast: { value: new THREE.Color('#00F0FF') }, // Telemetry Cyan High-Velocity Acceleration
    uColorVortex: { value: new THREE.Color('#FF9500') }, // Incandescent Aerodynamic Separation
    uOpacity: { value: 0.75 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vProgress;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      // uv.x represents longitudinal parametric progress along the streamline (0.0 to 1.0)
      vProgress = uv.x;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorFast;
    uniform vec3 uColorVortex;
    uniform float uOpacity;

    varying vec2 vUv;
    varying float vProgress;
    varying vec3 vWorldPosition;

    void main() {
      // 1. Moving aerodynamic velocity wave with local acceleration:
      // Flow accelerates through the sidepod undercuts and diffuser (represented by quadratic stretch)
      float acceleratedProgress = pow(vProgress, 1.25);
      float wave = sin(acceleratedProgress * 32.0 - uTime * 7.2);
      float pulse = pow(max(0.0, wave), 5.0);

      // 2. High-frequency micro-particle striations (simulates laser Doppler velocimetry particle seedings)
      float microSparkle = sin(vProgress * 180.0 - uTime * 18.0) * 0.5 + 0.5;
      float microPulse = pow(microSparkle, 8.0) * 0.35;

      // 3. Chromatic Velocity Gradient:
      // Entry: Pristine White/Silver -> Mid-body: Telemetry Cyan -> Exit/Undercut: Incandescent gold
      vec3 velocityColor = mix(uColorBase, uColorFast, smoothstep(0.15, 0.65, vProgress));
      velocityColor = mix(velocityColor, uColorVortex, smoothstep(0.70, 0.95, vProgress) * 0.45);

      // 4. Trailing wake dissipation & soft boundary entry
      float entrySoftness = smoothstep(0.0, 0.08, vProgress);
      float wakeDissipation = 1.0 - pow(vProgress, 1.6);
      
      // 5. Silky Gaussian lateral edge falloff across ribbon thickness (vUv.y in [0..1])
      float edgeFalloff = sin(vUv.y * 3.14159265);
      edgeFalloff = pow(edgeFalloff, 1.4);

      // Composite alpha
      float alpha = (0.22 + 0.78 * pulse + microPulse) * entrySoftness * wakeDissipation * edgeFalloff * uOpacity;

      if (alpha < 0.005) discard;

      gl_FragColor = vec4(velocityColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
};

export const WindTunnelStreamlines: React.FC<WindTunnelStreamlinesProps> = ({
  visible = true,
  opacity = 1.0,
  flowSpeed = 1.0,
}) => {
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  // Construct 8 physical Formula 1 aerodynamic Catmull-Rom streamline ribbons
  const streamlineGeometries = useMemo(() => {
    const trajectories: THREE.Vector3[][] = [
      // 1. Centerline Stagnation: Nosecone -> Halo -> Roll-hoop -> DRS Wing Slot
      [
        new THREE.Vector3(0, 0.28, 2.75),
        new THREE.Vector3(0, 0.44, 1.85),
        new THREE.Vector3(0, 0.78, 0.55),
        new THREE.Vector3(0, 0.90, -0.25),
        new THREE.Vector3(0, 0.88, -1.25),
        new THREE.Vector3(0, 1.02, -2.15),
        new THREE.Vector3(0, 1.05, -3.05),
      ],
      // 2. Port Y250 Wingtip Vortex (Helical corkscrew outwash)
      [
        new THREE.Vector3(-0.95, 0.16, 2.65),
        new THREE.Vector3(-1.08, 0.24, 1.85),
        new THREE.Vector3(-1.14, 0.29, 0.95),
        new THREE.Vector3(-1.08, 0.33, -0.05),
        new THREE.Vector3(-0.98, 0.36, -1.15),
        new THREE.Vector3(-0.85, 0.39, -2.25),
      ],
      // 3. Starboard Y250 Wingtip Vortex
      [
        new THREE.Vector3(0.95, 0.16, 2.65),
        new THREE.Vector3(1.08, 0.24, 1.85),
        new THREE.Vector3(1.14, 0.29, 0.95),
        new THREE.Vector3(1.08, 0.33, -0.05),
        new THREE.Vector3(0.98, 0.36, -1.15),
        new THREE.Vector3(0.85, 0.39, -2.25),
      ],
      // 4. Port Venturi Undercut Channel (Radiator inflow -> Coke-bottle -> Diffuser plume)
      [
        new THREE.Vector3(-0.62, 0.16, 1.55),
        new THREE.Vector3(-0.82, 0.21, 0.75),
        new THREE.Vector3(-0.78, 0.24, -0.25),
        new THREE.Vector3(-0.58, 0.27, -1.25),
        new THREE.Vector3(-0.42, 0.31, -2.05),
        new THREE.Vector3(-0.32, 0.36, -2.95),
      ],
      // 5. Starboard Venturi Undercut Channel
      [
        new THREE.Vector3(0.62, 0.16, 1.55),
        new THREE.Vector3(0.82, 0.21, 0.75),
        new THREE.Vector3(0.78, 0.24, -0.25),
        new THREE.Vector3(0.58, 0.27, -1.25),
        new THREE.Vector3(0.42, 0.31, -2.05),
        new THREE.Vector3(0.32, 0.36, -2.95),
      ],
      // 6. Port Halo Lateral Divergent Wash
      [
        new THREE.Vector3(-0.24, 0.34, 2.35),
        new THREE.Vector3(-0.34, 0.54, 1.25),
        new THREE.Vector3(-0.46, 0.70, 0.35),
        new THREE.Vector3(-0.40, 0.74, -0.55),
        new THREE.Vector3(-0.32, 0.80, -1.75),
        new THREE.Vector3(-0.22, 0.90, -2.85),
      ],
      // 7. Starboard Halo Lateral Divergent Wash
      [
        new THREE.Vector3(0.24, 0.34, 2.35),
        new THREE.Vector3(0.34, 0.54, 1.25),
        new THREE.Vector3(0.46, 0.70, 0.35),
        new THREE.Vector3(0.40, 0.74, -0.55),
        new THREE.Vector3(0.32, 0.80, -1.75),
        new THREE.Vector3(0.22, 0.90, -2.85),
      ],
      // 8. Rear Wing Mainplane Wake (High-Downforce Trailing Cascade)
      [
        new THREE.Vector3(0.0, 0.72, -1.45),
        new THREE.Vector3(0.0, 0.88, -2.05),
        new THREE.Vector3(0.0, 1.12, -2.75),
        new THREE.Vector3(0.0, 1.18, -3.45),
      ],
    ];

    return trajectories.map((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      // Thin 18mm aerodynamic ribbon with smooth tubular discretization
      return new THREE.TubeGeometry(curve, 72, 0.012, 8, false);
    });
  }, []);

  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.getElapsedTime() * flowSpeed;
    materialsRef.current.forEach((mat) => {
      if (mat && mat.uniforms) {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uOpacity.value = opacity * 0.85;
      }
    });
  });

  if (!visible || opacity <= 0.001) return null;

  return (
    <group name="WindTunnelStreamlines">
      {streamlineGeometries.map((geom, idx) => (
        <mesh key={idx} geometry={geom}>
          <shaderMaterial
            ref={(el) => {
              if (el) materialsRef.current[idx] = el;
            }}
            args={[StreamlineShaderMaterial]}
          />
        </mesh>
      ))}
    </group>
  );
};