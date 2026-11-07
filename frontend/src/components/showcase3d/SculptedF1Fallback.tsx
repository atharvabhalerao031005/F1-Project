// frontend/src/components/showcase3d/SculptedF1Fallback.tsx
import React from 'react';

interface SculptedF1FallbackProps {
  color?: string;
  steerAngle?: number;
  brakePct?: number;
  scale?: number;
  isGhost?: boolean;
  opacity?: number;
}

/**
 * Clean silhouette placeholder - zero boxy geometric blocks.
 */
export const SculptedF1Fallback: React.FC<SculptedF1FallbackProps> = () => {
  return <group name="SculptedF1FallbackClean" />;
};
