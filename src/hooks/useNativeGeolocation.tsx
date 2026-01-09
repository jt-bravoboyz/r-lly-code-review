import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';

export type TrackingMode = 'high_accuracy' | 'balanced' | 'battery_saver';
export type MovementState = 'stationary' | 'walking' | 'running' | 'driving';

interface NativeGeolocationConfig {
  // Update intervals in milliseconds
  stationaryInterval: number;
  walkingInterval: number;
  runningInterval: number;
  drivingInterval: number;
  
  // Speed thresholds in m/s
  walkingThreshold: number;
  runningThreshold: number;
  drivingThreshold: number;
  
  // Accuracy settings
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
}

export const NATIVE_TRACKING_CONFIGS: Record<TrackingMode, NativeGeolocationConfig> = {
  high_accuracy: {
    stationaryInterval: 3000,    // 3 seconds
    walkingInterval: 2000,       // 2 seconds
    runningInterval: 1000,       // 1 second
    drivingInterval: 500,        // 0.5 seconds
    walkingThreshold: 1.0,
    runningThreshold: 2.8,
    drivingThreshold: 8.3,
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000,
  },
  balanced: {
    stationaryInterval: 15000,   // 15 seconds
    walkingInterval: 8000,       // 8 seconds
    runningInterval: 4000,       // 4 seconds
    drivingInterval: 2000,       // 2 seconds
    walkingThreshold: 1.0,
    runningThreshold: 2.8,
    drivingThreshold: 8.3,
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000,
  },
  battery_saver: {
    stationaryInterval: 60000,   // 1 minute
    walkingInterval: 30000,      // 30 seconds
    runningInterval: 15000,      // 15 seconds
    drivingInterval: 10000,      // 10 seconds
    walkingThreshold: 1.0,
    runningThreshold: 2.8,
    drivingThreshold: 8.3,
    enableHighAccuracy: false,
    maximumAge: 30000,
    timeout: 20000,
  },
};

interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

interface BatteryStatus {
  level: number;
  charging: boolean;
}

interface UseNativeGeolocationResult {
  position: LocationUpdate | null;
  isTracking: boolean;
  isNative: boolean;
  isSupported: boolean;
  error: string | null;
  
  // Tracking controls
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<LocationUpdate | null>;
  
  // Mode and state
  trackingMode: TrackingMode;
  setTrackingMode: (mode: TrackingMode) => void;
  movementState: MovementState;
  updateInterval: number;
  
  // Battery optimization
  batteryStatus: BatteryStatus | null;
  isAdaptiveBatteryEnabled: boolean;
  setAdaptiveBatteryEnabled: (enabled: boolean) => void;
  estimatedBatteryImpact: 'low' | 'medium' | 'high';
  
  // Permissions
  requestPermissions: () => Promise<boolean>;
  hasPermissions: boolean;
}

export function useNativeGeolocation(
  initialMode: TrackingMode = 'balanced'
): UseNativeGeolocationResult {
  const [position, setPosition] = useState<LocationUpdate | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(initialMode);
  const [movementState, setMovementState] = useState<MovementState>('stationary');
  const [updateInterval, setUpdateInterval] = useState(NATIVE_TRACKING_CONFIGS[initialMode].stationaryInterval);
  
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [isAdaptiveBatteryEnabled, setAdaptiveBatteryEnabled] = useState(true);
  
  const isNative = Capacitor.isNativePlatform();
  const isSupported = true; // Geolocation is always available
  
  const watchIdRef = useRef<string | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const speedHistoryRef = useRef<number[]>([]);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor battery status
  useEffect(() => {
    const getBatteryStatus = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryStatus = () => {
            setBatteryStatus({
              level: battery.level,
              charging: battery.charging,
            });
          };
          
          updateBatteryStatus();
          battery.addEventListener('levelchange', updateBatteryStatus);
          battery.addEventListener('chargingchange', updateBatteryStatus);
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryStatus);
            battery.removeEventListener('chargingchange', updateBatteryStatus);
          };
        }
      } catch (err) {
        console.log('Battery API not available');
      }
    };
    
    getBatteryStatus();
  }, []);

  // Auto-adjust mode based on battery level
  useEffect(() => {
    if (!isAdaptiveBatteryEnabled || !batteryStatus) return;
    
    if (batteryStatus.charging) {
      if (trackingMode !== 'high_accuracy') {
        setTrackingMode('high_accuracy');
      }
      return;
    }
    
    if (batteryStatus.level < 0.15 && trackingMode !== 'battery_saver') {
      setTrackingMode('battery_saver');
    } else if (batteryStatus.level < 0.30 && trackingMode === 'high_accuracy') {
      setTrackingMode('balanced');
    }
  }, [batteryStatus, isAdaptiveBatteryEnabled, trackingMode]);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (isNative) {
        const status = await Geolocation.requestPermissions();
        const granted = status.location === 'granted';
        setHasPermissions(granted);
        return granted;
      } else {
        // Web - permissions are requested on first use
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              setHasPermissions(true);
              resolve(true);
            },
            () => {
              setHasPermissions(false);
              resolve(false);
            }
          );
        });
      }
    } catch (err) {
      console.error('Permission request error:', err);
      setError('Failed to request location permissions');
      return false;
    }
  }, [isNative]);

  // Calculate speed from position changes
  const calculateSpeed = useCallback((lat: number, lng: number, timestamp: number): number => {
    if (!lastPositionRef.current) {
      lastPositionRef.current = { lat, lng, timestamp };
      return 0;
    }
    
    const timeDiff = (timestamp - lastPositionRef.current.timestamp) / 1000;
    if (timeDiff <= 0) return 0;
    
    const R = 6371e3;
    const φ1 = (lastPositionRef.current.lat * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - lastPositionRef.current.lat) * Math.PI) / 180;
    const Δλ = ((lng - lastPositionRef.current.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    lastPositionRef.current = { lat, lng, timestamp };
    
    return distance / timeDiff;
  }, []);

  // Detect movement state from speed
  const detectMovementState = useCallback((speed: number | null): MovementState => {
    if (speed === null || speed < 0.1) return 'stationary';
    
    const config = NATIVE_TRACKING_CONFIGS[trackingMode];
    
    if (speed >= config.drivingThreshold) return 'driving';
    if (speed >= config.runningThreshold) return 'running';
    if (speed >= config.walkingThreshold) return 'walking';
    return 'stationary';
  }, [trackingMode]);

  // Process position update
  const processPosition = useCallback((coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    altitude: number | null;
  }, timestamp: number) => {
    let effectiveSpeed = coords.speed;
    if (effectiveSpeed === null || effectiveSpeed < 0) {
      effectiveSpeed = calculateSpeed(coords.latitude, coords.longitude, timestamp);
    }
    
    speedHistoryRef.current.push(effectiveSpeed || 0);
    if (speedHistoryRef.current.length > 5) {
      speedHistoryRef.current.shift();
    }
    
    const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
    const newMovementState = detectMovementState(avgSpeed);
    setMovementState(newMovementState);
    
    // Update interval based on movement state
    const config = NATIVE_TRACKING_CONFIGS[trackingMode];
    let newInterval: number;
    
    switch (newMovementState) {
      case 'driving':
        newInterval = config.drivingInterval;
        break;
      case 'running':
        newInterval = config.runningInterval;
        break;
      case 'walking':
        newInterval = config.walkingInterval;
        break;
      default:
        newInterval = config.stationaryInterval;
    }
    
    setUpdateInterval(newInterval);
    
    const update: LocationUpdate = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      speed: effectiveSpeed,
      heading: coords.heading,
      altitude: coords.altitude,
      timestamp,
    };
    
    setPosition(update);
    return update;
  }, [trackingMode, calculateSpeed, detectMovementState]);

  // Get current position once
  const getCurrentPosition = useCallback(async (): Promise<LocationUpdate | null> => {
    try {
      const config = NATIVE_TRACKING_CONFIGS[trackingMode];
      
      if (isNative) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: config.enableHighAccuracy,
          maximumAge: config.maximumAge,
          timeout: config.timeout,
        });
        
        return processPosition(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            altitude: pos.coords.altitude,
          },
          pos.timestamp
        );
      } else {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const update = processPosition(pos.coords as any, pos.timestamp);
              resolve(update);
            },
            (err) => {
              setError(err.message);
              reject(err);
            },
            {
              enableHighAccuracy: config.enableHighAccuracy,
              maximumAge: config.maximumAge,
              timeout: config.timeout,
            }
          );
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get position');
      return null;
    }
  }, [isNative, trackingMode, processPosition]);

  // Start continuous tracking
  const startTracking = useCallback(async () => {
    if (isTracking) return;
    
    try {
      const config = NATIVE_TRACKING_CONFIGS[trackingMode];
      setError(null);
      
      if (isNative) {
        // Native Capacitor watch
        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: config.enableHighAccuracy,
            maximumAge: config.maximumAge,
            timeout: config.timeout,
          },
          (pos, err) => {
            if (err) {
              console.error('Watch position error:', err);
              setError(err.message);
              return;
            }
            
            if (pos) {
              processPosition(
                {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  speed: pos.coords.speed,
                  heading: pos.coords.heading,
                  altitude: pos.coords.altitude,
                },
                pos.timestamp
              );
            }
          }
        );
        
        watchIdRef.current = id;
      } else {
        // Web fallback
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            processPosition(pos.coords as any, pos.timestamp);
          },
          (err) => {
            console.error('Watch position error:', err);
            setError(err.message);
          },
          {
            enableHighAccuracy: config.enableHighAccuracy,
            maximumAge: config.maximumAge,
            timeout: config.timeout,
          }
        );
        
        webWatchIdRef.current = id;
      }
      
      setIsTracking(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start tracking');
    }
  }, [isNative, isTracking, trackingMode, processPosition]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (isNative && watchIdRef.current) {
      Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    
    if (!isNative && webWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
    
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    setIsTracking(false);
  }, [isNative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Calculate battery impact
  const estimatedBatteryImpact = (() => {
    if (trackingMode === 'battery_saver') return 'low' as const;
    if (trackingMode === 'balanced') {
      if (movementState === 'stationary') return 'low' as const;
      return 'medium' as const;
    }
    if (movementState === 'stationary') return 'medium' as const;
    return 'high' as const;
  })();

  return {
    position,
    isTracking,
    isNative,
    isSupported,
    error,
    
    startTracking,
    stopTracking,
    getCurrentPosition,
    
    trackingMode,
    setTrackingMode,
    movementState,
    updateInterval,
    
    batteryStatus,
    isAdaptiveBatteryEnabled,
    setAdaptiveBatteryEnabled,
    estimatedBatteryImpact,
    
    requestPermissions,
    hasPermissions,
  };
}
