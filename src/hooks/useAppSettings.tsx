import { useState, useEffect, useCallback } from 'react';
import { TrackingMode } from '@/hooks/useNativeGeolocation';

export interface AppSettings {
  // Tracking settings
  trackingMode: TrackingMode;
  adaptiveBattery: boolean;
  
  // Haptic settings
  hapticsEnabled: boolean;
  hapticCompassChange: boolean;
  hapticProximityAlerts: boolean;
  hapticNavigationCues: boolean;
  hapticButtonFeedback: boolean;
  hapticIntensity: 'light' | 'medium' | 'strong';
  
  // Navigation settings
  voiceGuidance: boolean;
  voiceVolume: number;
  autoRecenter: boolean;
  showDistanceInFeet: boolean;
  
  // Privacy settings
  shareLocationDefault: boolean;
  showOnMap: boolean;
  allowFriendRequests: boolean;
  
  // Notification settings
  pushNotifications: boolean;
  eventReminders: boolean;
  friendArrivals: boolean;
  rideUpdates: boolean;
  
  // Display settings
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showAccuracyIndicator: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Tracking
  trackingMode: 'balanced',
  adaptiveBattery: true,
  
  // Haptics
  hapticsEnabled: true,
  hapticCompassChange: true,
  hapticProximityAlerts: true,
  hapticNavigationCues: true,
  hapticButtonFeedback: true,
  hapticIntensity: 'medium',
  
  // Navigation
  voiceGuidance: true,
  voiceVolume: 80,
  autoRecenter: true,
  showDistanceInFeet: false,
  
  // Privacy
  shareLocationDefault: true,
  showOnMap: true,
  allowFriendRequests: true,
  
  // Notifications
  pushNotifications: true,
  eventReminders: true,
  friendArrivals: true,
  rideUpdates: true,
  
  // Display
  theme: 'system',
  compactMode: false,
  showAccuracyIndicator: true,
};

const STORAGE_KEY = 'rally_app_settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error('Failed to load app settings:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save app settings:', e);
    }
  }, [settings, isLoaded]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
