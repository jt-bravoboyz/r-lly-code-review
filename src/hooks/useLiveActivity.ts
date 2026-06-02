// useLiveActivity.ts
// React hook that manages the R@lly Home Live Activity for a specific event.
// Safe to call on web — all native calls are no-ops outside of iOS.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import RallyHomePlugin from '@/plugins/RallyHomePlugin';

interface UseLiveActivityOptions {
  eventId: string;
  eventName: string;
}

export function useLiveActivity({ eventId, eventName }: UseLiveActivityOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const startedRef = useRef(false);

  // Check support once on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    RallyHomePlugin.isLiveActivitySupported()
      .then(({ supported }) => setIsSupported(supported))
      .catch(() => setIsSupported(false));
  }, []);

  /**
   * Start the Live Activity in "event live" state.
   * Call this when the event transitions to live status.
   */
  const startEventActivity = useCallback(async (attendeeCount: number) => {
    if (!isSupported || startedRef.current) return;
    try {
      await RallyHomePlugin.startLiveActivity({ eventId, eventName, attendeeCount });
      startedRef.current = true;
    } catch (err) {
      console.warn('[LiveActivity] startEventActivity failed:', err);
    }
  }, [isSupported, eventId, eventName]);

  /**
   * Transition the Live Activity to "bar hop transition" state.
   * Call this when the host moves to the next bar hop stop.
   */
  const updateToBarHop = useCallback(async (opts: {
    currentStopNumber: number;
    totalStops: number;
    nextStopName?: string;
  }) => {
    if (!isSupported) return;
    try {
      await RallyHomePlugin.updateToBarHop({ eventName, ...opts });
    } catch (err) {
      console.warn('[LiveActivity] updateToBarHop failed:', err);
    }
  }, [isSupported, eventName]);

  /**
   * Transition the Live Activity to "heading home" state.
   * Call this when the user taps "I'm Heading Home".
   */
  const updateToHeadingHome = useCallback(async (destinationName?: string) => {
    if (!isSupported) return;
    try {
      await RallyHomePlugin.updateToHeadingHome({ eventName, destinationName });
    } catch (err) {
      console.warn('[LiveActivity] updateToHeadingHome failed:', err);
    }
  }, [isSupported, eventName]);

  /**
   * End the Live Activity and dismiss it from the Lock Screen.
   * Call this when the user confirms safe arrival (manually or via auto-arrival).
   */
  const endActivity = useCallback(async () => {
    if (!isSupported) return;
    try {
      await RallyHomePlugin.endLiveActivity();
      startedRef.current = false;
    } catch (err) {
      console.warn('[LiveActivity] endLiveActivity failed:', err);
    }
  }, [isSupported]);

  return {
    isSupported,
    startEventActivity,
    updateToBarHop,
    updateToHeadingHome,
    endActivity,
  };
}
