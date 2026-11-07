// frontend/src/components/simulation3d/AtmosphereSkyRig.tsx
/**
 * VELOCE V2 // SYNCHRONIZED ATMOSPHERE & PMREM IBL RIG
 * Provides physical HDR environment reflection maps across all weather modes:
 * - DAY: Brilliant Monza Italian Summer sky + "park" IBL preset
 * - RAIN: Overcast storm clouds + low-turbidity diffuse bounce
 * - NIGHT: Circuit void with Stars + "night" IBL preset + stadium glow
 */

import React from 'react';
import { Environment, Sky, Stars } from '@react-three/drei';

interface AtmosphereSkyRigProps {
  weatherMode?: 'DAY' | 'RAIN' | 'NIGHT';
}

export const AtmosphereSkyRig: React.FC<AtmosphereSkyRigProps> = ({
  weatherMode = 'DAY',
}) => {
  if (weatherMode === 'NIGHT') {
    return (
      <>
        {/* Deep Circuit Void Sky Background */}
        <color attach="background" args={['#04060A']} />
        <Environment preset="night" environmentIntensity={0.65} />
        <Stars
          radius={500}
          depth={120}
          count={3500}
          factor={4}
          saturation={0.4}
          fade
          speed={0.5}
        />
        <fogExp2 attach="fog" args={['#04060A', 0.00065]} />
      </>
    );
  }

  if (weatherMode === 'RAIN') {
    return (
      <>
        <color attach="background" args={['#5A6878']} />
        <Environment preset="city" environmentIntensity={0.85} />
        <Sky
          distance={60000}
          sunPosition={[20, 45, 30]}
          turbidity={20}
          rayleigh={0.15}
          inclination={0.8}
          azimuth={0.25}
        />
        <fogExp2 attach="fog" args={['#5A6878', 0.00035]} />
      </>
    );
  }

  // DAY: Golden Monza Parkland Sun & Clean Sky Dome
  return (
    <>
      <color attach="background" args={['#B8D5ED']} />
      {/* Specular IBL Reflections on Cars & Asphalt */}
      <Environment preset="sunset" environmentIntensity={1.25} />
      {/* Physical Rayleigh Scattering Sky Dome with 60km boundless domain */}
      <Sky
        distance={60000}
        sunPosition={[120, 240, 140]}
        turbidity={4}
        rayleigh={0.65}
        inclination={0.55}
        azimuth={0.25}
      />
      {/* Seamless Italian Summer Horizon Fog (Reduced density for 2.5km visibility) */}
      <fogExp2 attach="fog" args={['#B8D5ED', 0.00009]} />
    </>
  );
};
