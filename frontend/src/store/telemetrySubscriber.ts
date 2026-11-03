// frontend/src/store/telemetrySubscriber.ts
import { useEffect, useRef } from 'react';
import type React from 'react';
import { useTelemetryStore } from './useTelemetryStore';

/**
 * Attaches a high-frequency subscriber to currentDistance without triggering component re-renders.
 * The callback receives the exact currentDistance float on every store update.
 */
export function useDistanceSubscriber(
  callback: (distanceM: number) => void,
  dependencies: readonly unknown[] = []
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const unsubscribe = useTelemetryStore.subscribe(
      (state) => state.currentDistance,
      (currentDistance) => {
        cbRef.current(currentDistance);
      }
    );
    return unsubscribe;
  }, dependencies);
}

/**
 * Attaches a high-frequency DOM textContent mutator to an HTML element reference.
 * Bypasses React reconciliation completely.
 */
export function useDirectDomTextSubscriber(
  ref: React.RefObject<HTMLElement | null>,
  formatter: (distanceM: number, state: ReturnType<typeof useTelemetryStore.getState>) => string
): void {
  useEffect(() => {
    const unsub = useTelemetryStore.subscribe(
      (state) => state.currentDistance,
      (dist) => {
        if (!ref.current) return;
        const state = useTelemetryStore.getState();
        ref.current.textContent = formatter(dist, state);
      }
    );
    return unsub;
  }, [ref, formatter]);
}

/**
 * Headless fallback ticker that drives advanceFrame(delta) if no WebGL canvas is mounted.
 */
export function useHeadlessPlaybackTicker(): void {
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const state = useTelemetryStore.getState();
      if (state.isPlaying) {
        state.advanceFrame(dt);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);
}
