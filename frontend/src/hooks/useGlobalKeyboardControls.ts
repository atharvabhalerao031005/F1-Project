// frontend/src/hooks/useGlobalKeyboardControls.ts
/**
 * AERO-SPEC F1 // PHASE 5 GLOBAL KEYBOARD ACCELERATION HOOK
 * Master Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.9
 * Technical Research: PHASE_5_KEYBOARD_ACCELERATION_AND_FOCUS_MANAGEMENT_RESEARCH.md
 *
 * Provides high-velocity tactical keyboard navigation across the 5-zone cockpit:
 * - Space: Toggle Play / Pause (rejects e.repeat)
 * - ArrowLeft / ArrowRight: Micro step +/- 10m (accepts e.repeat for smooth scrub)
 * - Shift + ArrowLeft / ArrowRight: Macro step +/- 100m (rapid circuit transit)
 * - KeyM / 'm': Toggle Cockpit Mode (TELEMETRY_LAB <-> ML_STRATEGY_ORACLE)
 * - KeyR / 'r': Reset Playback to lap/sector start
 * - KeyC / 'c': Cycle 3D Camera Mode (ISO -> ORTHO -> CHASE -> ISO)
 * - Digit1 - Digit4: Set Playback Speed (0.5x, 1.0x, 2.0x, 4.0x)
 *
 * Implements strict focus guarding, discrete repeat suppression,
 * and zero-VDOM imperative Zustand store dispatch.
 */

import { useEffect } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import type { CameraMode, PlaybackSpeed } from '../types/telemetry';

export const CAMERA_MODES: CameraMode[] = ['ISO', 'ORTHO', 'CHASE'];

export const SPEED_MAP: Record<string, PlaybackSpeed> = {
  Digit1: 0.5,
  Digit2: 1.0,
  Digit3: 2.0,
  Digit4: 4.0,
  Numpad1: 0.5,
  Numpad2: 1.0,
  Numpad3: 2.0,
  Numpad4: 4.0,
};

/**
 * Focus Guard: returns true if the event originates from an active
 * text input, slider, select, or editable element.
 */
export function isInputElementActive(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const elem = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (attr: string) => string | null;
    closest?: (selector: string) => unknown;
  };

  // 1. Direct standard HTML form elements
  const tagName = elem.tagName?.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  // 2. Content-editable nodes
  if (elem.isContentEditable === true) {
    return true;
  }

  // 3. ARIA roles mimicking input/editor/slider controls
  if (typeof elem.getAttribute === 'function') {
    const role = elem.getAttribute('role');
    if (
      role === 'textbox' ||
      role === 'searchbox' ||
      role === 'combobox' ||
      role === 'slider' ||
      role === 'spinbutton'
    ) {
      return true;
    }
  }

  // 4. Modal and Dialog isolation check
  if (typeof elem.closest === 'function') {
    const closestDialog = elem.closest('dialog[open], [role="dialog"][aria-modal="true"]');
    if (closestDialog) {
      return true;
    }
  }

  return false;
}

export interface SyntheticKeyboardEvent {
  code?: string;
  key?: string;
  repeat?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: unknown;
  preventDefault?: () => void;
}

/**
 * Authoritative keyboard routing handler.
 * Returns true if the keydown event was intercepted and handled, false otherwise.
 */
export function handleGlobalKeyDown(e: SyntheticKeyboardEvent): boolean {
  // 1. FOCUS GUARD: Abort if user is interacting with an input, slider, or editor
  if (isInputElementActive(e.target)) {
    return false;
  }

  // Ignore if user is holding system modifier keys (Cmd / Ctrl / Alt)
  // Exception: Shift is permitted for macro scrubbing
  const hasSystemModifier = Boolean(e.ctrlKey || e.metaKey || e.altKey);

  // ----------------------------------------------------------------------
  // ACTION 1: TOGGLE PLAY / PAUSE (Space)
  // ----------------------------------------------------------------------
  if (e.code === 'Space' && !hasSystemModifier) {
    e.preventDefault?.();
    // Prevent auto-repeat thrash when holding Space
    if (e.repeat) return true;
    useTelemetryStore.getState().togglePlay();
    return true;
  }

  // ----------------------------------------------------------------------
  // ACTION 2: SPATIAL SCRUBBING (ArrowLeft / ArrowRight)
  // Supports micro (10m) and macro (100m) scrubbing with auto-repeat enabled
  // ----------------------------------------------------------------------
  if (e.code === 'ArrowLeft' && !hasSystemModifier) {
    e.preventDefault?.();
    const deltaM = e.shiftKey ? -100 : -10;
    useTelemetryStore.getState().stepDistance(deltaM);
    return true;
  }

  if (e.code === 'ArrowRight' && !hasSystemModifier) {
    e.preventDefault?.();
    const deltaM = e.shiftKey ? 100 : 10;
    useTelemetryStore.getState().stepDistance(deltaM);
    return true;
  }

  // ----------------------------------------------------------------------
  // ACTION 3: COCKPIT MODE SWITCHER (KeyM / 'm')
  // ----------------------------------------------------------------------
  const isKeyM = (e.code === 'KeyM' || (e.key && e.key.toLowerCase() === 'm')) && !hasSystemModifier;
  if (isKeyM) {
    e.preventDefault?.();
    if (e.repeat) return true;
    const cur = useTelemetryStore.getState().cockpitMode;
    useTelemetryStore
      .getState()
      .setCockpitMode(cur === 'TELEMETRY_LAB' ? 'ML_STRATEGY_ORACLE' : 'TELEMETRY_LAB');
    return true;
  }

  // ----------------------------------------------------------------------
  // ACTION 4: RESET PLAYBACK TO LAP/SECTOR START (KeyR / 'r')
  // ----------------------------------------------------------------------
  const isKeyR = (e.code === 'KeyR' || (e.key && e.key.toLowerCase() === 'r')) && !hasSystemModifier;
  if (isKeyR) {
    e.preventDefault?.();
    if (e.repeat) return true;

    // Reset distance respecting active sector looping bounds
    const store = useTelemetryStore.getState();
    const splits = store.sessionPayload?.meta?.sectorSplitM;
    let startM = 0;
    if (splits && splits.length >= 2) {
      if (store.loopSector === 'S2') startM = splits[0];
      else if (store.loopSector === 'S3') startM = splits[1];
    }
    store.setDistance(startM);
    return true;
  }

  // ----------------------------------------------------------------------
  // ACTION 5: CYCLE 3D CAMERA VANTAGE (KeyC / 'c')
  // ----------------------------------------------------------------------
  const isKeyC = (e.code === 'KeyC' || (e.key && e.key.toLowerCase() === 'c')) && !hasSystemModifier;
  if (isKeyC) {
    e.preventDefault?.();
    if (e.repeat) return true;
    const curCamera = useTelemetryStore.getState().cameraMode;
    const nextIdx = (CAMERA_MODES.indexOf(curCamera) + 1) % CAMERA_MODES.length;
    useTelemetryStore.getState().setCameraMode(CAMERA_MODES[nextIdx]);
    return true;
  }

  // ----------------------------------------------------------------------
  // ACTION 6: PLAYBACK SPEED MULTIPLIER (Digit1 - Digit4, Numpad1 - Numpad4, AZERTY)
  // ----------------------------------------------------------------------
  if (!hasSystemModifier) {
    const code = e.code ?? '';
    const key = e.key ?? '';
    let speed: PlaybackSpeed | undefined = SPEED_MAP[code];

    if (speed === undefined) {
      if (key === '1' || key === '&') speed = 0.5;
      else if (key === '2' || key === 'é') speed = 1.0;
      else if (key === '3' || key === '"') speed = 2.0;
      else if (key === '4' || key === '\'') speed = 4.0;
    }

    if (speed !== undefined) {
      e.preventDefault?.();
      if (e.repeat) return true;
      useTelemetryStore.getState().setPlaybackSpeed(speed);
      return true;
    }
  }

  return false;
}

export interface UseGlobalKeyboardControlsOptions {
  enabled?: boolean;
}

export function useGlobalKeyboardControls(options: UseGlobalKeyboardControlsOptions = {}): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const listener = (e: KeyboardEvent) => {
      handleGlobalKeyDown(e);
    };

    // Attach listener with { passive: false } to guarantee preventDefault works
    window.addEventListener('keydown', listener, { passive: false });
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [enabled]);
}

export default useGlobalKeyboardControls;
