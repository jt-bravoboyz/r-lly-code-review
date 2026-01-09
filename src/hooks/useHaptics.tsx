import { useCallback, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticSettings {
  enabled: boolean;
  compassChange: boolean;
  proximityAlerts: boolean;
  navigationCues: boolean;
  buttonFeedback: boolean;
  intensity: 'light' | 'medium' | 'strong';
}

const DEFAULT_SETTINGS: HapticSettings = {
  enabled: true,
  compassChange: true,
  proximityAlerts: true,
  navigationCues: true,
  buttonFeedback: true,
  intensity: 'medium',
};

const STORAGE_KEY = 'rally_haptic_settings';

// Compass direction thresholds for haptic feedback (in degrees)
const COMPASS_CHANGE_THRESHOLD = 45; // Trigger when direction changes by 45+ degrees
const PROXIMITY_THRESHOLDS = [100, 50, 25, 10, 5]; // meters - trigger at these distances

export function useHaptics() {
  const settingsRef = useRef<HapticSettings>(DEFAULT_SETTINGS);
  const lastCompassRef = useRef<number | null>(null);
  const lastProximityAlertRef = useRef<number>(Infinity);
  const isNative = Capacitor.isNativePlatform();

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        settingsRef.current = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load haptic settings:', e);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: Partial<HapticSettings>) => {
    settingsRef.current = { ...settingsRef.current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsRef.current));
    } catch (e) {
      console.error('Failed to save haptic settings:', e);
    }
  }, []);

  // Get current settings
  const getSettings = useCallback((): HapticSettings => {
    return { ...settingsRef.current };
  }, []);

  // Core haptic trigger using Vibration API or native
  const triggerHaptic = useCallback((style: HapticStyle = 'medium') => {
    if (!settingsRef.current.enabled) return;

    const intensity = settingsRef.current.intensity;
    
    // Map style and intensity to vibration patterns (duration in ms)
    const patterns: Record<HapticStyle, Record<string, number | number[]>> = {
      light: { light: 10, medium: 15, strong: 20 },
      medium: { light: 20, medium: 35, strong: 50 },
      heavy: { light: 40, medium: 60, strong: 80 },
      success: { light: [20, 50, 20], medium: [30, 60, 30], strong: [40, 80, 40] },
      warning: { light: [20, 30, 20, 30, 20], medium: [30, 40, 30, 40, 30], strong: [40, 50, 40, 50, 40] },
      error: { light: [50, 30, 50], medium: [70, 40, 70], strong: [100, 50, 100] },
      selection: { light: 5, medium: 10, strong: 15 },
    };

    const pattern = patterns[style][intensity];

    try {
      if (isNative) {
        // On native, we could use Capacitor Haptics plugin
        // For now, fall back to Vibration API which works on Android
        if ('vibrate' in navigator) {
          navigator.vibrate(pattern);
        }
      } else {
        // Web - use Vibration API if available
        if ('vibrate' in navigator) {
          navigator.vibrate(pattern);
        }
      }
    } catch (e) {
      console.log('Haptic feedback not available');
    }
  }, [isNative]);

  // Trigger haptic for compass direction change
  const triggerCompassChange = useCallback((newHeading: number) => {
    if (!settingsRef.current.enabled || !settingsRef.current.compassChange) return;
    
    if (lastCompassRef.current === null) {
      lastCompassRef.current = newHeading;
      return;
    }

    // Calculate angle difference (accounting for wrap-around)
    let diff = Math.abs(newHeading - lastCompassRef.current);
    if (diff > 180) diff = 360 - diff;

    if (diff >= COMPASS_CHANGE_THRESHOLD) {
      triggerHaptic('selection');
      lastCompassRef.current = newHeading;
    }
  }, [triggerHaptic]);

  // Trigger haptic for proximity to friend
  const triggerProximityAlert = useCallback((distance: number, friendName?: string) => {
    if (!settingsRef.current.enabled || !settingsRef.current.proximityAlerts) return;

    // Find which threshold we crossed
    for (const threshold of PROXIMITY_THRESHOLDS) {
      if (distance <= threshold && lastProximityAlertRef.current > threshold) {
        // Crossed a threshold - getting closer
        if (threshold <= 5) {
          triggerHaptic('success'); // Very close!
        } else if (threshold <= 25) {
          triggerHaptic('medium');
        } else {
          triggerHaptic('light');
        }
        lastProximityAlertRef.current = distance;
        return;
      }
    }

    // Update last distance if moving away
    if (distance > lastProximityAlertRef.current + 20) {
      lastProximityAlertRef.current = distance;
    }
  }, [triggerHaptic]);

  // Reset proximity tracking (when starting new navigation)
  const resetProximityTracking = useCallback(() => {
    lastProximityAlertRef.current = Infinity;
  }, []);

  // Trigger haptic for navigation cues
  const triggerNavigationCue = useCallback((type: 'turn' | 'arrived' | 'reroute' | 'start') => {
    if (!settingsRef.current.enabled || !settingsRef.current.navigationCues) return;

    switch (type) {
      case 'arrived':
        triggerHaptic('success');
        break;
      case 'turn':
        triggerHaptic('medium');
        break;
      case 'reroute':
        triggerHaptic('warning');
        break;
      case 'start':
        triggerHaptic('light');
        break;
    }
  }, [triggerHaptic]);

  // Trigger haptic for button press
  const triggerButtonFeedback = useCallback(() => {
    if (!settingsRef.current.enabled || !settingsRef.current.buttonFeedback) return;
    triggerHaptic('selection');
  }, [triggerHaptic]);

  return {
    triggerHaptic,
    triggerCompassChange,
    triggerProximityAlert,
    triggerNavigationCue,
    triggerButtonFeedback,
    resetProximityTracking,
    getSettings,
    saveSettings,
    isSupported: 'vibrate' in navigator || isNative,
  };
}

// Export settings type for use in Settings page
export type { HapticSettings };
