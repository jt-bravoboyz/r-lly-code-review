import { useState, useEffect, useCallback, useRef } from 'react';

export type TrackingMode = 'high_accuracy' | 'balanced' | 'battery_saver';
export type MovementState = 'stationary' | 'walking' | 'running' | 'driving';

interface BatteryOptimizedLocationConfig {
  // Update intervals in milliseconds
  stationaryInterval: number;
  walkingInterval: number;
  runningInterval: number;
  drivingInterval: number;
  
  // Speed thresholds in m/s
  walkingThreshold: number;  // ~3.6 km/h
  runningThreshold: number;  // ~10 km/h
  drivingThreshold: number;  // ~30 km/h
  
  // Accuracy settings
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
}

const TRACKING_CONFIGS: Record<TrackingMode, BatteryOptimizedLocationConfig> = {
  high_accuracy: {
    stationaryInterval: 5000,    // 5 seconds
    walkingInterval: 3000,       // 3 seconds
    runningInterval: 2000,       // 2 seconds
    drivingInterval: 1000,       // 1 second
    walkingThreshold: 1.0,
    runningThreshold: 2.8,
    drivingThreshold: 8.3,
    enableHighAccuracy: true,
    maximumAge: 3000,
    timeout: 10000,
  },
  balanced: {
    stationaryInterval: 30000,   // 30 seconds
    walkingInterval: 10000,      // 10 seconds
    runningInterval: 5000,       // 5 seconds
    drivingInterval: 3000,       // 3 seconds
    walkingThreshold: 1.0,
    runningThreshold: 2.8,
    drivingThreshold: 8.3,
    enableHighAccuracy: true,
    maximumAge: 10000,
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

interface BatteryStatus {
  level: number;
  charging: boolean;
}

interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UseBatteryOptimizedLocationResult {
  currentMode: TrackingMode;
  movementState: MovementState;
  updateInterval: number;
  batteryStatus: BatteryStatus | null;
  isAdaptiveEnabled: boolean;
  lastUpdate: LocationUpdate | null;
  setTrackingMode: (mode: TrackingMode) => void;
  setAdaptiveEnabled: (enabled: boolean) => void;
  getOptimalConfig: () => BatteryOptimizedLocationConfig;
  estimatedBatteryImpact: 'low' | 'medium' | 'high';
}

export function useBatteryOptimizedLocation(
  initialMode: TrackingMode = 'balanced'
): UseBatteryOptimizedLocationResult {
  const [currentMode, setCurrentMode] = useState<TrackingMode>(initialMode);
  const [movementState, setMovementState] = useState<MovementState>('stationary');
  const [updateInterval, setUpdateInterval] = useState(TRACKING_CONFIGS[initialMode].stationaryInterval);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [isAdaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<LocationUpdate | null>(null);
  
  const speedHistoryRef = useRef<number[]>([]);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

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
      } catch (error) {
        if (import.meta.env.DEV) console.log('Battery API not available');
      }
    };
    
    getBatteryStatus();
  }, []);

  // Auto-adjust mode based on battery level
  useEffect(() => {
    if (!isAdaptiveEnabled || !batteryStatus) return;
    
    // If charging, use high accuracy
    if (batteryStatus.charging) {
      if (currentMode !== 'high_accuracy') {
        setCurrentMode('high_accuracy');
      }
      return;
    }
    
    // Adjust mode based on battery level
    if (batteryStatus.level < 0.15 && currentMode !== 'battery_saver') {
      setCurrentMode('battery_saver');
    } else if (batteryStatus.level < 0.30 && currentMode === 'high_accuracy') {
      setCurrentMode('balanced');
    }
  }, [batteryStatus, isAdaptiveEnabled, currentMode]);

  // Detect movement state from speed
  const detectMovementState = useCallback((speed: number | null): MovementState => {
    if (speed === null || speed < 0.1) return 'stationary';
    
    const config = TRACKING_CONFIGS[currentMode];
    
    if (speed >= config.drivingThreshold) return 'driving';
    if (speed >= config.runningThreshold) return 'running';
    if (speed >= config.walkingThreshold) return 'walking';
    return 'stationary';
  }, [currentMode]);

  // Calculate speed from position changes (fallback if speed not provided)
  const calculateSpeed = useCallback((lat: number, lng: number, timestamp: number): number => {
    if (!lastPositionRef.current) {
      lastPositionRef.current = { lat, lng, timestamp };
      return 0;
    }
    
    const timeDiff = (timestamp - lastPositionRef.current.timestamp) / 1000; // seconds
    if (timeDiff <= 0) return 0;
    
    // Haversine distance
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
    
    return distance / timeDiff; // m/s
  }, []);

  // Update movement state and interval based on speed
  const updateFromPosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp;
    
    // Calculate speed if not provided
    let effectiveSpeed = speed;
    if (effectiveSpeed === null || effectiveSpeed < 0) {
      effectiveSpeed = calculateSpeed(latitude, longitude, timestamp);
    }
    
    // Keep speed history for smoothing
    speedHistoryRef.current.push(effectiveSpeed || 0);
    if (speedHistoryRef.current.length > 5) {
      speedHistoryRef.current.shift();
    }
    
    // Use average speed for state detection (reduces jitter)
    const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
    
    const newMovementState = detectMovementState(avgSpeed);
    setMovementState(newMovementState);
    
    // Update interval based on movement state
    const config = TRACKING_CONFIGS[currentMode];
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
    
    setLastUpdate({
      lat: latitude,
      lng: longitude,
      accuracy,
      speed: effectiveSpeed,
      heading,
      timestamp,
    });
  }, [currentMode, detectMovementState, calculateSpeed]);

  // Get optimal config for current conditions
  const getOptimalConfig = useCallback((): BatteryOptimizedLocationConfig => {
    return TRACKING_CONFIGS[currentMode];
  }, [currentMode]);

  // Estimate battery impact
  const estimatedBatteryImpact = useCallback((): 'low' | 'medium' | 'high' => {
    if (currentMode === 'battery_saver') return 'low';
    if (currentMode === 'balanced') {
      if (movementState === 'stationary') return 'low';
      return 'medium';
    }
    // high_accuracy mode
    if (movementState === 'stationary') return 'medium';
    return 'high';
  }, [currentMode, movementState])();

  return {
    currentMode,
    movementState,
    updateInterval,
    batteryStatus,
    isAdaptiveEnabled,
    lastUpdate,
    setTrackingMode: setCurrentMode,
    setAdaptiveEnabled,
    getOptimalConfig,
    estimatedBatteryImpact,
  };
}

// Export the config for external use
export { TRACKING_CONFIGS };
export type { BatteryOptimizedLocationConfig, LocationUpdate };
