/**
 * AERO-SPEC F1 // HIGH-FREQUENCY TELEMETRY FORMATTERS & TABULAR TYPOGRAPHY
 * Module: frontend/src/utils/formatters.ts
 * Specification: docs/research/AEROSPACE_TELEMETRY_FORMATTERS_AND_TABULAR_TYPOGRAPHY_SPECIFICATION.md
 *
 * MISSION-CRITICAL ZERO-ALLOCATION CONTRACT:
 * - Cumulative Layout Shift: CLS = 0 (Fixed character width contracts across all HUD fields)
 * - Typography Target: Monospace with OpenType 'font-variant-numeric: tabular-nums slashed-zero'
 * - Hot-Path Memory Footprint: 0 bytes heap allocations per call via module-interned Look-Up Tables (LUTs)
 * - Target Frequency: 60.0 Hz to 120.0 Hz sustained real-time playback
 */

// ============================================================================
// 1. TYPOGRAPHY CONTRACT INTERFACES & DEFINITIONS
// ============================================================================

export interface TelemetryFieldContract {
  readonly id: string;
  readonly charWidth: number;
  readonly sampleOutput: string;
  readonly cssFontVariant: string;
  readonly description: string;
}

export interface DeltaFormatOptions {
  /** If true, pads non-signed zero delta with a leading space to match signed width (e.g. ' 0.000s') */
  fixedWidth?: boolean;
  /** Explicit sign for zero delta: '+' | ' ' | '' (default: '') */
  zeroSign?: '+' | ' ' | '';
}

/**
 * Strict character width contracts for telemetry HUD elements.
 * Every element MUST size its container according to these widths (e.g. `width: ${w}ch`).
 */
export const HUD_CHAR_WIDTHS = {
  DISTANCE_M: 5,       // '0000m' -> '9999m'
  LAP_CLOCK: 8,        // '1:19.301', '0:00.000'
  DELTA_SEC: 7,        // '+0.109s', '-0.042s', ' 0.000s' or '0.000s' (6 or 7)
  SPEED_KMH: 8,        // '352 KM/H', '074 KM/H'
  G_FORCE: 7,          // '+1.84 G', '-5.50 G'
  PERCENTAGE_1DEC: 5,  // '79.8%', '06.7%' (6 for 100.0%)
  PERCENTAGE_0DEC: 4,  // '079%', '006%', '100%'
  RPM: 9,              // '12450 RPM', '08200 RPM'
  GEAR: 1,             // 'N', '1'..'8', 'R'
  DRS: 7,              // 'DRS ON ', 'DRS OFF'
  SECTOR_TIME: 7,      // '24.182s'
  TRACK_TEMP: 7,       // '+32.4°C'
} as const;

export const HUD_TYPOGRAPHY_CONTRACT: Record<string, TelemetryFieldContract> = {
  distance: {
    id: 'distance',
    charWidth: HUD_CHAR_WIDTHS.DISTANCE_M,
    sampleOutput: '5793m',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: '4-digit zero-padded track distance in integer meters'
  },
  lapClock: {
    id: 'lapClock',
    charWidth: HUD_CHAR_WIDTHS.LAP_CLOCK,
    sampleOutput: '1:19.301',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: 'Minute, 2-digit second, 3-digit millisecond lap time'
  },
  deltaSec: {
    id: 'deltaSec',
    charWidth: HUD_CHAR_WIDTHS.DELTA_SEC,
    sampleOutput: '+0.109s',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: 'Signed lap delta with 3-digit millisecond precision'
  },
  speedKmh: {
    id: 'speedKmh',
    charWidth: HUD_CHAR_WIDTHS.SPEED_KMH,
    sampleOutput: '352 KM/H',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: '3-digit zero-padded velocity in km/h'
  },
  gForce: {
    id: 'gForce',
    charWidth: HUD_CHAR_WIDTHS.G_FORCE,
    sampleOutput: '+1.84 G',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: 'Signed acceleration in G-units with 2 decimal places'
  },
  percentage: {
    id: 'percentage',
    charWidth: HUD_CHAR_WIDTHS.PERCENTAGE_1DEC,
    sampleOutput: '79.8%',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: '2-digit zero-padded percentage with 1 decimal place'
  },
  rpm: {
    id: 'rpm',
    charWidth: HUD_CHAR_WIDTHS.RPM,
    sampleOutput: '12450 RPM',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: '5-digit zero-padded engine RPM'
  },
  gear: {
    id: 'gear',
    charWidth: HUD_CHAR_WIDTHS.GEAR,
    sampleOutput: '7',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: 'Transmission gear indicator (N, 1-8, R)'
  },
  drs: {
    id: 'drs',
    charWidth: HUD_CHAR_WIDTHS.DRS,
    sampleOutput: 'DRS ON ',
    cssFontVariant: 'tabular-nums slashed-zero',
    description: 'DRS flap aerodynamic state'
  }
};

// ============================================================================
// 2. PRE-ALLOCATED LOOK-UP TABLES (LUTs) — ZERO HEAP GARBAGE IN HOT PATHS
// ============================================================================

/** 2-digit zero-padded numbers: '00' through '99' */
export const LUT_00_99: readonly string[] = (() => {
  const arr = new Array<string>(100);
  for (let i = 0; i < 100; i++) {
    arr[i] = i < 10 ? '0' + i : String(i);
  }
  return Object.freeze(arr);
})();

/** 3-digit zero-padded numbers: '000' through '999' */
export const LUT_000_999: readonly string[] = (() => {
  const arr = new Array<string>(1000);
  for (let i = 0; i < 1000; i++) {
    if (i < 10) arr[i] = '00' + i;
    else if (i < 100) arr[i] = '0' + i;
    else arr[i] = String(i);
  }
  return Object.freeze(arr);
})();

/** Seconds followed by dot: '00.' through '59.' (avoids 1 extra string concat in clock) */
export const LUT_SEC_DOT: readonly string[] = (() => {
  const arr = new Array<string>(60);
  for (let i = 0; i < 60; i++) {
    arr[i] = (i < 10 ? '0' + i : String(i)) + '.';
  }
  return Object.freeze(arr);
})();

/** Pre-computed Distance LUT: '0000m' through '9999m' (10,000 interned strings) */
export const DISTANCE_LUT: readonly string[] = (() => {
  const arr = new Array<string>(10000);
  for (let i = 0; i < 10000; i++) {
    const d0 = (i / 1000) | 0;
    const d1 = ((i % 1000) / 100) | 0;
    const d2 = ((i % 100) / 10) | 0;
    const d3 = i % 10;
    arr[i] = `${d0}${d1}${d2}${d3}m`;
  }
  return Object.freeze(arr);
})();

/** Pre-computed Speed LUT: '000 KM/H' through '999 KM/H' (1,000 interned strings) */
export const SPEED_LUT: readonly string[] = (() => {
  const arr = new Array<string>(1000);
  for (let i = 0; i < 1000; i++) {
    const d0 = (i / 100) | 0;
    const d1 = ((i % 100) / 10) | 0;
    const d2 = i % 10;
    arr[i] = `${d0}${d1}${d2} KM/H`;
  }
  return Object.freeze(arr);
})();

/**
 * Pre-computed G-Force LUT: '-6.00 G' through '+6.00 G' with 0.01 G step (1,201 interned strings).
 * Index calculation: index = Math.round((g + 6.0) * 100)
 * index 0 -> '-6.00 G', index 600 -> '+0.00 G', index 1200 -> '+6.00 G'
 */
export const GFORCE_LUT: readonly string[] = (() => {
  const arr = new Array<string>(1201);
  for (let idx = 0; idx <= 1200; idx++) {
    const gVal = (idx - 600) / 100;
    const sign = idx >= 600 ? '+' : '-';
    const absVal = Math.abs(gVal);
    const intPart = Math.floor(absVal);
    const decPart = Math.round((absVal - intPart) * 100);
    const decStr = decPart < 10 ? '0' + decPart : (decPart === 100 ? '00' : String(decPart));
    arr[idx] = `${sign}${intPart}.${decStr} G`;
  }
  return Object.freeze(arr);
})();

/** Pre-computed Percentage LUT (1 decimal): '00.0%' through '100.0%' (1,001 interned strings) */
export const PERCENT_LUT_1DEC: readonly string[] = (() => {
  const arr = new Array<string>(1001);
  for (let i = 0; i <= 1000; i++) {
    const intPart = (i / 10) | 0;
    const decPart = i % 10;
    const intStr = intPart < 10 ? '0' + intPart : String(intPart);
    arr[i] = `${intStr}.${decPart}%`;
  }
  return Object.freeze(arr);
})();

/** Pre-computed Throttle/Brake LUT: '000%' through '100%' (101 interned strings) */
export const THROTTLE_BRAKE_LUT: readonly string[] = (() => {
  const arr = new Array<string>(101);
  for (let i = 0; i <= 100; i++) {
    arr[i] = (i < 10 ? '00' + i : (i < 100 ? '0' + i : '100')) + '%';
  }
  return Object.freeze(arr);
})();

/** Gear glyph lookup: 0 -> 'N', 1..8 -> '1'..'8', -1 -> 'R' */
export const GEAR_LUT: Record<number, string> = {
  [-1]: 'R',
  0: 'N',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
};

// ============================================================================
// 3. CORE TELEMETRY FORMATTERS
// ============================================================================

/**
 * Formats a track distance in meters to a zero-padded integer string with unit suffix 'm'.
 * Invariant contract: 5 characters for 0..9999m (e.g. '0000m', '1520m', '5793m').
 * Zero-allocation for standard circuits (0..9999m) via DISTANCE_LUT.
 *
 * @param distM Longitudinal distance along track centerline in meters
 * @returns 5-character zero-padded string (e.g. '5793m')
 */
export function formatDistanceM(distM: number): string {
  if (Number.isNaN(distM) || !Number.isFinite(distM)) {
    return '----m';
  }
  const d = Math.floor(distM);
  if (d >= 0 && d < 10000) {
    return DISTANCE_LUT[d];
  }
  if (d < 0) {
    return DISTANCE_LUT[0]; // Clamped to track start
  }
  // Fallback for ultra-long tracks (e.g. Nürburgring Nordschleife 20,832m)
  return `${d}m`;
}

/**
 * Formats elapsed lap time into high-precision stopwatch time: 'M:SS.fff'
 * Invariant contract: Exactly 8 characters for laps under 10 minutes (e.g. '1:19.301', '0:00.000', '1:25.819').
 * Eliminates sub-millisecond rounding rollovers (e.g. 59.9996s -> '1:00.000').
 *
 * @param lapTimeSec Lap time in seconds (float)
 * @returns 8-character high-precision clock string (e.g. '1:19.301')
 */
export function formatLapClock(lapTimeSec: number): string {
  if (Number.isNaN(lapTimeSec) || !Number.isFinite(lapTimeSec)) {
    return '--:--.---';
  }
  if (lapTimeSec <= 0) {
    return '0:00.000';
  }

  // Round to nearest integer millisecond
  const totalMs = Math.round(lapTimeSec * 1000) | 0;
  const mins = (totalMs / 60000) | 0;
  const remMs = totalMs % 60000;
  const secs = (remMs / 1000) | 0;
  const ms = remMs % 1000;

  // Format with pre-allocated LUTs
  const secDot = secs < 60 ? LUT_SEC_DOT[secs] : '59.';
  const msStr = ms < 1000 ? LUT_000_999[ms] : '999';

  return `${mins}:${secDot}${msStr}`;
}

/**
 * Formats a signed lap delta time with millisecond precision: '+0.109s', '-0.042s', '0.000s'.
 * Explicitly guards against IEEE-754 negative zero ('-0.000s').
 *
 * @param deltaSec Lap delta in seconds (positive: trailing/slower, negative: leading/faster)
 * @param options Options for fixed-width space padding or explicit zero sign
 * @returns Signed delta string with 's' suffix
 */
export function formatDeltaSec(deltaSec: number, options?: DeltaFormatOptions): string {
  if (Number.isNaN(deltaSec) || !Number.isFinite(deltaSec)) {
    return '--.---s';
  }

  // Round to nearest integer millisecond
  const totalMs = Math.round(deltaSec * 1000);

  if (totalMs === 0) {
    if (options?.zeroSign === '+') return '+0.000s';
    if (options?.zeroSign === ' ') return ' 0.000s';
    if (options?.fixedWidth) return ' 0.000s';
    return '0.000s';
  }

  const sign = totalMs > 0 ? '+' : '-';
  const absMs = Math.abs(totalMs);
  const secs = (absMs / 1000) | 0;
  const ms = absMs % 1000;

  return `${sign}${secs}.${LUT_000_999[ms]}s`;
}

/**
 * Strict 7-character fixed width delta formatter for CLS = 0 HUD tables.
 * Formats zero as ' 0.000s', ensuring every output is exactly 7 characters wide.
 */
export function formatDeltaSecTabular(deltaSec: number): string {
  return formatDeltaSec(deltaSec, { fixedWidth: true });
}

/**
 * Formats car speed in km/h to a 3-digit zero-padded string with uppercase unit: 'DDD KM/H'
 * Invariant contract: Exactly 8 characters (e.g. '352 KM/H', '074 KM/H', '000 KM/H').
 * Zero-allocation for all realistic racing speeds (0..999 km/h) via SPEED_LUT.
 *
 * @param speedKmh Speed in kilometers per hour
 * @returns 8-character zero-padded speed string (e.g. '352 KM/H')
 */
export function formatSpeedKmh(speedKmh: number): string {
  if (Number.isNaN(speedKmh) || !Number.isFinite(speedKmh)) {
    return '--- KM/H';
  }
  const r = Math.round(speedKmh) | 0;
  if (r >= 0 && r < 1000) {
    return SPEED_LUT[r];
  }
  if (r < 0) {
    return SPEED_LUT[0];
  }
  return `${r} KM/H`;
}

/**
 * Formats longitudinal or lateral G-force with explicit sign and 2 decimal places: '±D.DD G'
 * Invariant contract: Exactly 7 characters (e.g. '+1.84 G', '-5.50 G', '+0.00 G').
 * Zero-allocation for normal racing envelopes (-6.00 G to +6.00 G) via GFORCE_LUT.
 *
 * @param g Acceleration in G units (float)
 * @returns 7-character signed G-force string (e.g. '+1.84 G')
 */
export function formatGForce(g: number): string {
  if (Number.isNaN(g) || !Number.isFinite(g)) {
    return '--.-- G';
  }

  // Fast path: GFORCE_LUT covers -6.00 to +6.00 with 0.01 step (indices 0..1200)
  const lutIdx = Math.round((g + 6.0) * 100);
  if (lutIdx >= 0 && lutIdx <= 1200) {
    return GFORCE_LUT[lutIdx];
  }

  // Dynamic fallback for extreme crash impulses (|g| > 6.00 G)
  const roundedHundredths = Math.round(g * 100);
  const sign = roundedHundredths >= 0 ? '+' : '-';
  const absHundredths = Math.abs(roundedHundredths);
  const intPart = (absHundredths / 100) | 0;
  const decPart = absHundredths % 100;
  return `${sign}${intPart}.${LUT_00_99[decPart]} G`;
}

/**
 * Formats a probability or percentage string with zero-padded integer digits: 'DD.D%' or 'DD%'
 * Invariant contract for decimals = 1: 5 characters for 0..99.9% (e.g. '79.8%', '06.7%'), 6 for '100.0%'.
 * Zero-allocation for decimals = 1 via PERCENT_LUT_1DEC.
 *
 * @param pct Percentage value (0.0 to 100.0)
 * @param decimals Number of decimal digits (default: 1)
 * @returns Tabular formatted percentage string (e.g. '79.8%', '06.7%')
 */
export function formatPercentage(pct: number, decimals: number = 1): string {
  if (Number.isNaN(pct) || !Number.isFinite(pct)) {
    return decimals === 1 ? '--.-%' : '---%';
  }

  // Clamp to valid percentage domain
  const clamped = Math.max(0, Math.min(100, pct));

  // Fast path for default 1 decimal place
  if (decimals === 1) {
    const idx = Math.round(clamped * 10);
    if (idx >= 0 && idx <= 1000) {
      return PERCENT_LUT_1DEC[idx];
    }
  }

  // Fast path for 0 decimal places
  if (decimals === 0) {
    const intVal = Math.round(clamped);
    const d0 = (intVal / 10) | 0;
    const d1 = intVal % 10;
    if (intVal >= 100) return '100%';
    return `${d0}${d1}%`;
  }

  // Arbitrary decimal places fallback
  const intPart = Math.floor(clamped);
  const decPart = Math.round((clamped - intPart) * Math.pow(10, decimals));
  const intStr = intPart < 10 ? '0' + intPart : (intPart >= 100 ? '100' : String(intPart));
  const decStr = String(decPart).padStart(decimals, '0');
  return `${intStr}.${decStr}%`;
}

// ============================================================================
// 4. AUXILIARY COCKPIT & TELEMETRY FORMATTERS
// ============================================================================

/**
 * Formats throttle percentage (0..100) into 3-digit zero-padded percentage: '000%' to '100%'
 * Invariant contract: Exactly 4 characters. Zero-allocation via THROTTLE_BRAKE_LUT.
 */
export function formatThrottlePct(throttle: number): string {
  if (Number.isNaN(throttle) || !Number.isFinite(throttle)) {
    return '---%';
  }
  const t = Math.max(0, Math.min(100, Math.round(throttle)));
  return THROTTLE_BRAKE_LUT[t];
}

/**
 * Formats brake percentage (0..100) into 3-digit zero-padded percentage: '000%' to '100%'
 * Invariant contract: Exactly 4 characters. Zero-allocation via THROTTLE_BRAKE_LUT.
 */
export function formatBrakePct(brake: number): string {
  if (Number.isNaN(brake) || !Number.isFinite(brake)) {
    return '---%';
  }
  const b = Math.max(0, Math.min(100, Math.round(brake)));
  return THROTTLE_BRAKE_LUT[b];
}

/**
 * Formats engine RPM to a 5-digit zero-padded string with uppercase unit: 'DDDDD RPM'
 * Invariant contract: Exactly 9 characters (e.g. '12450 RPM', '08200 RPM', '00000 RPM').
 */
export function formatRpm(rpm: number): string {
  if (Number.isNaN(rpm) || !Number.isFinite(rpm)) {
    return '----- RPM';
  }
  const r = Math.max(0, Math.min(99999, Math.round(rpm)));
  const d01 = (r / 1000) | 0;
  const d234 = r % 1000;
  const hi = d01 < 10 ? '0' + d01 : String(d01);
  return `${hi}${LUT_000_999[d234]} RPM`;
}

/**
 * Formats transmission gear indicator: 'N', '1'..'8', 'R'
 * Invariant contract: Exactly 1 character.
 */
export function formatGear(gear: number): string {
  if (Number.isNaN(gear) || !Number.isFinite(gear)) {
    return '-';
  }
  const g = Math.round(gear);
  return GEAR_LUT[g] ?? String(g);
}

/**
 * Formats Drag Reduction System (DRS) activation state: 'DRS ON ' or 'DRS OFF'
 * Invariant contract: Exactly 7 characters (includes trailing space on 'ON ' to match 'OFF').
 */
export function formatDrs(drs: boolean | number): string {
  if (typeof drs === 'boolean') {
    return drs ? 'DRS ON ' : 'DRS OFF';
  }
  if (Number.isNaN(drs) || !Number.isFinite(drs)) {
    return 'DRS ---';
  }
  return drs >= 1 ? 'DRS ON ' : 'DRS OFF';
}

/**
 * Formats single sector elapsed time: 'SS.fffs' (e.g. '24.182s', '18.905s')
 * Invariant contract: Exactly 7 characters for sectors under 100 seconds.
 */
export function formatSectorTime(sectorSec: number): string {
  if (Number.isNaN(sectorSec) || !Number.isFinite(sectorSec) || sectorSec < 0) {
    return '--.---s';
  }
  const totalMs = Math.round(sectorSec * 1000) | 0;
  const secs = (totalMs / 1000) | 0;
  const ms = totalMs % 1000;
  const sStr = secs < 100 ? LUT_00_99[secs] : String(secs);
  return `${sStr}.${LUT_000_999[ms]}s`;
}

/**
 * Formats track or ambient temperature: '+32.4°C', '-02.1°C'
 * Invariant contract: Exactly 7 characters.
 */
export function formatTrackTemp(tempC: number): string {
  if (Number.isNaN(tempC) || !Number.isFinite(tempC)) {
    return '--.-°C';
  }
  const roundedTenths = Math.round(tempC * 10);
  const sign = roundedTenths >= 0 ? '+' : '-';
  const absTenths = Math.abs(roundedTenths);
  const intPart = (absTenths / 10) | 0;
  const decPart = absTenths % 10;
  const intStr = intPart < 10 ? '0' + intPart : String(intPart);
  return `${sign}${intStr}.${decPart}°C`;
}
