// frontend/src/components/common/MotorsportPostProcessing.tsx
/**
 * VELOCE V2 // CINEMATIC MOTORSPORT POST-PROCESSING PIPELINE
 * Provides broadcast-quality optical rendering:
 * - N8AO: Screen-space ambient occlusion for tire contact grounding
 * - Selective Bloom: Incandescent brake rotors, rain LED strobes, sun glints
 * - ACES Filmic Tone Mapping: Full dynamic range preserving highlight roll-off
 * - Broadcast Vignette & Sensor Noise
 */

import React from 'react';
import { EffectComposer, Bloom, N8AO, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';

export interface MotorsportPostProcessingProps {
  weatherMode?: 'DAY' | 'RAIN' | 'NIGHT';
  enabled?: boolean;
}

export const MotorsportPostProcessing: React.FC<MotorsportPostProcessingProps> = ({
  weatherMode = 'DAY',
  enabled = true,
}) => {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {([
        <N8AO
          key="n8ao"
          aoRadius={1.8}
          distanceFalloff={0.8}
          intensity={weatherMode === 'NIGHT' ? 2.8 : 2.2}
          color="#08090C"
          halfRes
        />,
        <Bloom
          key="bloom"
          luminanceThreshold={1.12}
          luminanceSmoothing={0.35}
          mipmapBlur
          intensity={weatherMode === 'NIGHT' ? 1.4 : 0.85}
          radius={0.65}
        />,
        <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
        <Vignette
          key="vignette"
          eskil={false}
          offset={0.25}
          darkness={weatherMode === 'NIGHT' ? 0.75 : 0.55}
        />,
        <Noise
          key="noise"
          opacity={0.02}
          blendFunction={BlendFunction.OVERLAY}
        />,
      ] as any)}
    </EffectComposer>
  );
};
