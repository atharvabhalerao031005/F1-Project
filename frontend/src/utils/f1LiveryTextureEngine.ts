// frontend/src/utils/f1LiveryTextureEngine.ts
/**
 * VELOCE PRO // AUTHENTIC FIA FORMULA 1 LIVERY & TEXTURE SYNTHESIZER
 * Procedural PBR Canvas Texture Engine for all 11 Constructors (2026 Season Grid).
 * 
 * Features:
 * - Bespoke paint textures for all teams: Red Bull, Ferrari, McLaren, Mercedes-AMG,
 *   Aston Martin, Audi Sport (formerly Sauber), Cadillac F1, Williams, Alpine, Racing Bulls, Haas.
 * - Constructor-accurate color palettes, clearcoat dielectric finishes, and aerodynamic split liveries.
 * - Vector driver numbers (#1, #4, #16, #44, #63, #27, #77, #11, etc.), FIA safety badges, and technical decals.
 * - High-anisotropy mipmapped CanvasTextures with singleton caching.
 */

import * as THREE from 'three';

export interface LiveryProfile {
  id: string;
  constructorName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  carbonTone: string;
  stripeColor: string;
  defaultNumber: number;
  driverNumbers: number[];
  finish: {
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    ior: number;
  };
  wheelRimColor: string;
  badgeText: string;
  tagline: string;
}

export const CONSTRUCTOR_LIVERIES: Record<string, LiveryProfile> = {
  ferrari: {
    id: 'ferrari',
    constructorName: 'Scuderia Ferrari HP',
    primaryColor: '#D2051E',
    secondaryColor: '#FFFFFF',
    accentColor: '#FFE600',
    carbonTone: '#121316',
    stripeColor: '#FFE600',
    defaultNumber: 16,
    driverNumbers: [16, 44],
    finish: {
      metalness: 0.08,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.015,
      ior: 1.55,
    },
    wheelRimColor: '#B80518',
    badgeText: 'FERRARI',
    tagline: 'CORSE CLIENTI · MARANELLO',
  },
  mclaren: {
    id: 'mclaren',
    constructorName: 'McLaren Formula 1 Team',
    primaryColor: '#FF8000',
    secondaryColor: '#141619',
    accentColor: '#00D2FF',
    carbonTone: '#0E1012',
    stripeColor: '#00D2FF',
    defaultNumber: 4,
    driverNumbers: [4, 81],
    finish: {
      metalness: 0.14,
      roughness: 0.18,
      clearcoat: 0.92,
      clearcoatRoughness: 0.025,
      ior: 1.54,
    },
    wheelRimColor: '#FF8000',
    badgeText: 'MCLAREN',
    tagline: 'WOKING MTC · CHROME AERODYNAMICS',
  },
  mercedes: {
    id: 'mercedes',
    constructorName: 'Mercedes-AMG PETRONAS F1 Team',
    primaryColor: '#C4C9CC',
    secondaryColor: '#0A0C0E',
    accentColor: '#00D2BE',
    carbonTone: '#0A0C0E',
    stripeColor: '#00D2BE',
    defaultNumber: 63,
    driverNumbers: [63, 12],
    finish: {
      metalness: 0.75,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.62,
    },
    wheelRimColor: '#00D2BE',
    badgeText: 'MERCEDES-AMG',
    tagline: 'BRACKLEY · SILVER ARROWS E-PERFORMANCE',
  },
  redbull: {
    id: 'redbull',
    constructorName: 'Oracle Red Bull Racing',
    primaryColor: '#030F26',
    secondaryColor: '#EA0029',
    accentColor: '#E1FE21',
    carbonTone: '#0B0D11',
    stripeColor: '#E1FE21',
    defaultNumber: 1,
    driverNumbers: [1, 30],
    finish: {
      metalness: 0.18,
      roughness: 0.28,
      clearcoat: 0.40,
      clearcoatRoughness: 0.15,
      ior: 1.50,
    },
    wheelRimColor: '#FFE600',
    badgeText: 'RED BULL',
    tagline: 'MILTON KEYNES · POWERTRAINS FORD',
  },
  astonmartin: {
    id: 'astonmartin',
    constructorName: 'Aston Martin Aramco F1 Team',
    primaryColor: '#00594F',
    secondaryColor: '#0C1210',
    accentColor: '#CEDC00',
    carbonTone: '#0C100E',
    stripeColor: '#CEDC00',
    defaultNumber: 14,
    driverNumbers: [14, 18],
    finish: {
      metalness: 0.58,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.56,
    },
    wheelRimColor: '#CEDC00',
    badgeText: 'ASTON MARTIN',
    tagline: 'SILVERSTONE AMR · ARAMCO HONDA',
  },
  audi: {
    id: 'audi',
    constructorName: 'Audi Sport Formula 1 Team',
    primaryColor: '#C0C4C8',
    secondaryColor: '#111215',
    accentColor: '#E0052B',
    carbonTone: '#0E1012',
    stripeColor: '#E0052B',
    defaultNumber: 27,
    driverNumbers: [27, 5],
    finish: {
      metalness: 0.50,
      roughness: 0.18,
      clearcoat: 0.95,
      clearcoatRoughness: 0.02,
      ior: 1.58,
    },
    wheelRimColor: '#E0052B',
    badgeText: 'AUDI SPORT',
    tagline: 'NEUBURG & HINWIL · VORSPRUNG DURCH TECHNIK',
  },
  cadillac: {
    id: 'cadillac',
    constructorName: 'Cadillac Formula 1 Team',
    primaryColor: '#C5A059',
    secondaryColor: '#090B0E',
    accentColor: '#E0052B',
    carbonTone: '#090B0E',
    stripeColor: '#FFFFFF',
    defaultNumber: 77,
    driverNumbers: [77, 11],
    finish: {
      metalness: 0.68,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.60,
    },
    wheelRimColor: '#C5A059',
    badgeText: 'CADILLAC',
    tagline: 'DETROIT · V-SERIES HYBRID POWER',
  },
  williams: {
    id: 'williams',
    constructorName: 'Williams Racing',
    primaryColor: '#00247D',
    secondaryColor: '#080E1C',
    accentColor: '#00A3E0',
    carbonTone: '#0C1018',
    stripeColor: '#D07A10',
    defaultNumber: 23,
    driverNumbers: [23, 55],
    finish: {
      metalness: 0.32,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.54,
    },
    wheelRimColor: '#005AFF',
    badgeText: 'WILLIAMS',
    tagline: 'GROVE HERITAGE · KOMATSU MERCEDES',
  },
  alpine: {
    id: 'alpine',
    constructorName: 'BWT Alpine Formula 1 Team',
    primaryColor: '#0090FF',
    secondaryColor: '#FF87BC',
    accentColor: '#FFFFFF',
    carbonTone: '#0D1016',
    stripeColor: '#FF87BC',
    defaultNumber: 10,
    driverNumbers: [10, 7],
    finish: {
      metalness: 0.36,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.55,
    },
    wheelRimColor: '#FF87BC',
    badgeText: 'ALPINE',
    tagline: 'ENSTONE & VIRY · BWT SPORT HYBRID',
  },
  racingbulls: {
    id: 'racingbulls',
    constructorName: 'Visa Cash App RB F1 Team',
    primaryColor: '#1634CB',
    secondaryColor: '#FFFFFF',
    accentColor: '#EA0029',
    carbonTone: '#0E121C',
    stripeColor: '#FFFFFF',
    defaultNumber: 22,
    driverNumbers: [22, 6],
    finish: {
      metalness: 0.42,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      ior: 1.56,
    },
    wheelRimColor: '#FFFFFF',
    badgeText: 'VCARB',
    tagline: 'FAENZA SCUDERIA · RED BULL FORD',
  },
  haas: {
    id: 'haas',
    constructorName: 'MoneyGram Haas F1 Team',
    primaryColor: '#FFFFFF',
    secondaryColor: '#141619',
    accentColor: '#EE0000',
    carbonTone: '#121418',
    stripeColor: '#EE0000',
    defaultNumber: 31,
    driverNumbers: [31, 87],
    finish: {
      metalness: 0.18,
      roughness: 0.22,
      clearcoat: 0.88,
      clearcoatRoughness: 0.03,
      ior: 1.52,
    },
    wheelRimColor: '#EE0000',
    badgeText: 'HAAS F1',
    tagline: 'KANNAPOLIS & BANBURY · MONEYGRAM FERRARI',
  },
};

export function resolveConstructorId(input: string = ''): string {
  const s = (input || '').toLowerCase().trim();
  if (s.includes('ferrari') || s.includes('e8002d') || s.includes('d2051e') || s.includes('red') || s.includes('sf-24') || s.includes('lec') || s.includes('ham')) return 'ferrari';
  if (s.includes('mclaren') || s.includes('ff8000') || s.includes('ff8700') || s.includes('orange') || s.includes('papaya') || s.includes('nor') || s.includes('pia')) return 'mclaren';
  if (s.includes('mercedes') || s.includes('00d2be') || s.includes('teal') || s.includes('silver') || s.includes('rus') || s.includes('ant')) return 'mercedes';
  if (s.includes('aston') || s.includes('229971') || s.includes('00594f') || s.includes('green') || s.includes('alo') || s.includes('str')) return 'astonmartin';
  if (s.includes('audi') || s.includes('e0052b') || s.includes('hul') || s.includes('bor') || s.includes('sauber') || s.includes('52e252') || s.includes('kick')) return 'audi';
  if (s.includes('cadillac') || s.includes('c5a059') || s.includes('c8a97e') || s.includes('gold') || s.includes('bot') || s.includes('per')) return 'cadillac';
  if (s.includes('williams') || s.includes('00247d') || s.includes('005aff') || s.includes('alb') || s.includes('sai')) return 'williams';
  if (s.includes('alpine') || s.includes('ff87bc') || s.includes('pink') || s.includes('gas') || s.includes('doo')) return 'alpine';
  if (s.includes('rb') || s.includes('vcarb') || s.includes('tsu') || s.includes('law') || s.includes('had')) return 'racingbulls';
  if (s.includes('haas') || s.includes('b6babd') || s.includes('oco') || s.includes('bea')) return 'haas';
  if (s.includes('redbull') || s.includes('1e41ff') || s.includes('0600ef') || s.includes('ver')) return 'redbull';
  return 'redbull';
}

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a high-fidelity 1024x1024 PBR paint texture map for the F1 chassis bodywork.
 */
export function getConstructorPaintTexture(constructorKey: string): THREE.CanvasTexture {
  const profile = CONSTRUCTOR_LIVERIES[constructorKey] || CONSTRUCTOR_LIVERIES.redbull;
  const cacheKey = `paint_${profile.id}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Primary Base Coat
  ctx.fillStyle = profile.primaryColor;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Aerodynamic Undercut & Carbon Waist Shading
  const carbonGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  carbonGrad.addColorStop(0.0, profile.primaryColor);
  carbonGrad.addColorStop(0.55, profile.primaryColor);
  carbonGrad.addColorStop(0.85, profile.secondaryColor);
  carbonGrad.addColorStop(1.0, profile.carbonTone);
  ctx.fillStyle = carbonGrad;
  ctx.fillRect(0, 480, 1024, 544);

  // 3. Precision Longitudinal Racing Stripes
  ctx.fillStyle = profile.stripeColor;
  ctx.fillRect(496, 0, 32, 1024); // Centerline nose-to-tail spine

  ctx.fillStyle = profile.accentColor;
  ctx.fillRect(460, 0, 12, 1024);
  ctx.fillRect(552, 0, 12, 1024);

  // 4. Cockpit Surrounds & Sidepod Geometric Speed-Flashes
  ctx.save();
  ctx.fillStyle = profile.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(120, 320);
  ctx.lineTo(400, 240);
  ctx.lineTo(440, 720);
  ctx.lineTo(80, 800);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(904, 320);
  ctx.lineTo(624, 240);
  ctx.lineTo(584, 720);
  ctx.lineTo(944, 800);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. Exposed 2x2 Twill Carbon Fiber Texture Emulation on Lower Flanks
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 600; y < 1024; y += 8) {
    for (let x = 0; x < 1024; x += 8) {
      if (((x + y) / 8) % 2 === 0) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }

  // 6. Constructor Typographic Watermark on Sidepod Air Intake
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText(profile.badgeText, 256, 480);
  ctx.fillText(profile.badgeText, 768, 480);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Creates an authentic high-resolution driver race number and technical sponsor decal texture.
 */
export function getConstructorDecalTexture(constructorKey: string, driverNumber?: number): THREE.CanvasTexture {
  const profile = CONSTRUCTOR_LIVERIES[constructorKey] || CONSTRUCTOR_LIVERIES.redbull;
  const num = driverNumber || profile.defaultNumber;
  const cacheKey = `decal_${profile.id}_${num}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Transparent decal base
  ctx.clearRect(0, 0, 1024, 1024);

  // 1. Nosecone Driver Number Rondel
  ctx.save();
  ctx.fillStyle = profile.primaryColor === '#FFFFFF' ? '#111215' : '#FAF9F6';
  ctx.beginPath();
  ctx.arc(512, 280, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = profile.accentColor;
  ctx.stroke();

  // Bold Racing Glyph
  ctx.fillStyle = profile.primaryColor === '#FFFFFF' ? '#FAF9F6' : '#111215';
  ctx.font = 'bold 130px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 512, 285);
  ctx.restore();

  // 2. Shark Fin Secondary Number
  ctx.save();
  ctx.fillStyle = profile.accentColor;
  ctx.font = 'italic bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(num), 260, 680);
  ctx.fillText(String(num), 764, 680);
  ctx.restore();

  // 3. Technical Partner & FIA Badges
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('FIA HOMOLOGATED · 2026', 512, 450);
  ctx.fillText(profile.tagline, 512, 880);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Creates custom Pirelli Compound sidewall texture with constructor rim accents.
 */
export function getConstructorWheelRimTexture(constructorKey: string): THREE.CanvasTexture {
  const profile = CONSTRUCTOR_LIVERIES[constructorKey] || CONSTRUCTOR_LIVERIES.redbull;
  const cacheKey = `rim_${profile.id}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark forged magnesium disc
  ctx.fillStyle = '#141619';
  ctx.fillRect(0, 0, 512, 512);

  // Constructor Accent Outer Pinstripe
  ctx.strokeStyle = profile.wheelRimColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.stroke();

  // Center Lock Nut
  ctx.fillStyle = profile.accentColor;
  ctx.beginPath();
  ctx.arc(256, 256, 38, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  textureCache.set(cacheKey, tex);
  return tex;
}
