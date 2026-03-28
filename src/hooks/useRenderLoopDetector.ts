import { useRef, useEffect } from 'react';

const THRESHOLD = 3; // renders per second
const WINDOW_MS = 1000;

/**
 * Dev-mode hook: warns in the console when a component renders
 * more than THRESHOLD times within WINDOW_MS.
 *
 * Usage:
 *   useRenderLoopDetector('EventDetail');
 *
 * Only active in development builds — no-op in production.
 */
export function useRenderLoopDetector(componentName: string) {
  const timestamps = useRef<number[]>([]);

  useEffect(() => {
    if (import.meta.env.PROD) return;

    const now = Date.now();
    timestamps.current.push(now);

    // Trim to the current window
    timestamps.current = timestamps.current.filter(
      (t) => now - t < WINDOW_MS
    );

    if (timestamps.current.length > THRESHOLD) {
      console.warn(
        `[R@lly Loop Detector] ⚠️ POTENTIAL LOOP: <${componentName}> rendered ${timestamps.current.length} times in the last ${WINDOW_MS}ms`
      );
    }
  });
}
