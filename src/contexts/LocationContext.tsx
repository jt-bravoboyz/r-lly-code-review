import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBatteryOptimizedLocation, TrackingMode, MovementState, TRACKING_CONFIGS } from '@/hooks/useBatteryOptimizedLocation';
import { useIndoorPositioning, BeaconInfo } from '@/hooks/useIndoorPositioning';
import { useWifiPositioning, EnvironmentInfo } from '@/hooks/useWifiPositioning';

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: 'gps' | 'indoor' | 'hybrid' | 'wifi' | 'network';
  floor?: number;
  altitude?: number | null;
}

export interface MemberLocation {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  lastUpdate: number;
  distance?: number;
  bearing?: number;
  proximitySignal?: 'gps' | 'ble' | 'wifi';
  bleRssi?: number;
  floor?: number;
}

interface BatteryInfo {
  level: number | null;
  charging: boolean;
  estimatedImpact: 'low' | 'medium' | 'high';
}

interface IndoorInfo {
  isSupported: boolean;
  isActive: boolean;
  isSimulating: boolean;
  venueName?: string;
  floor?: number;
  beaconCount: number;
}

export interface AccuracyDataPoint {
  timestamp: number;
  accuracy: number;
  source: 'gps' | 'wifi' | 'network' | 'indoor' | 'hybrid';
}

interface LocationContextType {
  currentPosition: Position | null;
  compassHeading: number | null;
  isTracking: boolean;
  memberLocations: Map<string, MemberLocation>;
  startTracking: (eventId: string) => void;
  stopTracking: () => void;
  getDistanceAndBearing: (targetLat: number, targetLng: number) => { distance: number; bearing: number };
  navigateToMember: (member: MemberLocation) => void;
  selectedMemberForNav: MemberLocation | null;
  setSelectedMemberForNav: (member: MemberLocation | null) => void;
  signalQuality: 'good' | 'fair' | 'poor';
  // Battery optimization
  trackingMode: TrackingMode;
  setTrackingMode: (mode: TrackingMode) => void;
  movementState: MovementState;
  updateInterval: number;
  batteryInfo: BatteryInfo;
  isAdaptiveBatteryEnabled: boolean;
  setAdaptiveBatteryEnabled: (enabled: boolean) => void;
  // Indoor positioning
  indoorInfo: IndoorInfo;
  startIndoorPositioning: () => Promise<void>;
  stopIndoorPositioning: () => void;
  startIndoorSimulation: () => void;
  stopIndoorSimulation: () => void;
  nearbyBeacons: BeaconInfo[];
  availableBeacons: number;
  // Environment detection
  environmentInfo: EnvironmentInfo;
  isWifiPositioningActive: boolean;
  // Accuracy history
  accuracyHistory: AccuracyDataPoint[];
  clearAccuracyHistory: () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

// Smoothing factor for compass jitter reduction (0-1, lower = more smoothing)
const COMPASS_SMOOTHING = 0.15;
const POSITION_SMOOTHING = 0.3;

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate bearing from point 1 to point 2 in degrees
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

// Smooth angle values (handles wrap-around at 360)
function smoothAngle(current: number, target: number, factor: number): number {
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (current + diff * factor + 360) % 360;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [memberLocations, setMemberLocations] = useState<Map<string, MemberLocation>>(new Map());
  const [signalQuality, setSignalQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [selectedMemberForNav, setSelectedMemberForNav] = useState<MemberLocation | null>(null);
  const [accuracyHistory, setAccuracyHistory] = useState<AccuracyDataPoint[]>([]);
  
  const watchIdRef = useRef<number | null>(null);
  const eventIdRef = useRef<string | null>(null);
  const smoothedHeadingRef = useRef<number>(0);
  const smoothedPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDbUpdateRef = useRef<number>(0);

  // Battery optimization hook
  const batteryOptimization = useBatteryOptimizedLocation('balanced');
  
  // Indoor positioning hook
  const indoorPositioning = useIndoorPositioning();
  
  // Wi-Fi positioning hook for indoor fallback
  const wifiPositioning = useWifiPositioning();

  // Derived battery info
  const batteryInfo: BatteryInfo = {
    level: batteryOptimization.batteryStatus?.level ?? null,
    charging: batteryOptimization.batteryStatus?.charging ?? false,
    estimatedImpact: batteryOptimization.estimatedBatteryImpact,
  };

  // Derived indoor info
  const indoorInfo: IndoorInfo = {
    isSupported: indoorPositioning.isSupported,
    isActive: indoorPositioning.isScanning,
    isSimulating: indoorPositioning.isSimulating,
    venueName: indoorPositioning.indoorPosition?.venueName,
    floor: indoorPositioning.indoorPosition?.floor,
    beaconCount: indoorPositioning.nearbyBeacons.length,
  };

  // Compass heading listener
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;
      
      // iOS uses webkitCompassHeading
      if ('webkitCompassHeading' in event) {
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android uses alpha (0-360, but 0 points to the direction the device is facing)
        heading = 360 - event.alpha;
      }

      if (heading !== null) {
        // Apply smoothing to reduce jitter
        smoothedHeadingRef.current = smoothAngle(smoothedHeadingRef.current, heading, COMPASS_SMOOTHING);
        setCompassHeading(Math.round(smoothedHeadingRef.current));
      }
    };

    // Request permission for iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Merge indoor position with GPS when available
  useEffect(() => {
    if (indoorPositioning.indoorPosition && currentPosition) {
      // If indoor position has better accuracy, use it
      if (indoorPositioning.indoorPosition.accuracy < currentPosition.accuracy) {
        setCurrentPosition(prev => ({
          ...prev!,
          lat: indoorPositioning.indoorPosition!.lat,
          lng: indoorPositioning.indoorPosition!.lng,
          accuracy: indoorPositioning.indoorPosition!.accuracy,
          source: 'indoor',
          floor: indoorPositioning.indoorPosition!.floor,
        }));
      }
    }
  }, [indoorPositioning.indoorPosition]);

  // Get distance and bearing from current position to a target
  const getDistanceAndBearing = useCallback((targetLat: number, targetLng: number) => {
    if (!currentPosition) {
      return { distance: 0, bearing: 0 };
    }
    
    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, targetLat, targetLng);
    const bearing = calculateBearing(currentPosition.lat, currentPosition.lng, targetLat, targetLng);
    
    return { distance, bearing };
  }, [currentPosition]);

  // Throttled database update based on movement state
  const updateDatabase = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    const minInterval = batteryOptimization.updateInterval;
    
    // Only update database at the adaptive interval
    if (now - lastDbUpdateRef.current < minInterval) {
      return;
    }
    
    lastDbUpdateRef.current = now;
    
    if (eventIdRef.current && profile?.id) {
      await supabase
        .from('event_attendees')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString(),
          share_location: true,
        })
        .eq('event_id', eventIdRef.current)
        .eq('profile_id', profile.id);
    }
  }, [batteryOptimization.updateInterval, profile?.id]);

  // Start tracking location with adaptive intervals
  const startTracking = useCallback((eventId: string) => {
    if (!navigator.geolocation || !profile?.id) return;

    eventIdRef.current = eventId;
    setIsTracking(true);

    const config = batteryOptimization.getOptimalConfig();

    const handlePosition = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, speed, altitude } = position.coords;
      
      // Update battery optimization with new position
      batteryOptimization.lastUpdate && batteryOptimization.setTrackingMode(batteryOptimization.currentMode);
      
      // Update Wi-Fi positioning with GPS data for environment detection
      wifiPositioning.updateFromGps(latitude, longitude, accuracy, altitude);
      
      // Apply position smoothing
      let smoothedLat = latitude;
      let smoothedLng = longitude;
      
      if (smoothedPositionRef.current) {
        smoothedLat = smoothedPositionRef.current.lat + (latitude - smoothedPositionRef.current.lat) * POSITION_SMOOTHING;
        smoothedLng = smoothedPositionRef.current.lng + (longitude - smoothedPositionRef.current.lng) * POSITION_SMOOTHING;
      }
      smoothedPositionRef.current = { lat: smoothedLat, lng: smoothedLng };

      // Determine signal quality based on accuracy and environment
      const isLikelyIndoor = wifiPositioning.environmentInfo.isIndoor;
      if (accuracy <= 10) {
        setSignalQuality('good');
      } else if (accuracy <= 30) {
        setSignalQuality('fair');
      } else {
        setSignalQuality('poor');
      }

      // Determine best position source
      let bestSource: 'gps' | 'wifi' | 'network' = 'gps';
      let finalLat = smoothedLat;
      let finalLng = smoothedLng;
      let finalAccuracy = accuracy;
      
      // If we're indoors and Wi-Fi positioning has a better estimate, use it
      if (isLikelyIndoor && wifiPositioning.wifiPosition) {
        if (wifiPositioning.wifiPosition.confidence !== 'low') {
          bestSource = wifiPositioning.wifiPosition.source;
          // Blend GPS with Wi-Fi position for smoother indoor tracking
          const wifiWeight = wifiPositioning.wifiPosition.confidence === 'high' ? 0.6 : 0.4;
          finalLat = smoothedLat * (1 - wifiWeight) + wifiPositioning.wifiPosition.lat * wifiWeight;
          finalLng = smoothedLng * (1 - wifiWeight) + wifiPositioning.wifiPosition.lng * wifiWeight;
          finalAccuracy = Math.min(accuracy, wifiPositioning.wifiPosition.accuracy);
        }
      }

      const newPosition: Position = {
        lat: finalLat,
        lng: finalLng,
        accuracy: finalAccuracy,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp: Date.now(),
        source: bestSource,
        altitude,
      };

      setCurrentPosition(newPosition);
      
      // Add to accuracy history (keep last 100 readings)
      setAccuracyHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          accuracy: finalAccuracy,
          source: bestSource,
        }];
        // Keep last 100 readings (roughly 5-10 minutes at normal update rates)
        return newHistory.slice(-100);
      });

      // Update database with throttling
      await updateDatabase(finalLat, finalLng);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      setSignalQuality('poor');
    };

    // Initial position fetch
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: config.enableHighAccuracy,
      maximumAge: config.maximumAge,
      timeout: config.timeout,
    });

    // Set up adaptive watching
    const id = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: config.enableHighAccuracy,
      maximumAge: config.maximumAge,
      timeout: config.timeout,
    });

    watchIdRef.current = id;

    // Subscribe to other members' locations via realtime
    const channel = supabase
      .channel(`member-locations-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const data = payload.new as any;
          if (!data.share_location || !data.current_lat || !data.current_lng) return;
          if (data.profile_id === profile?.id) return; // Skip self

          // Fetch profile info
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', data.profile_id)
            .single();

          setMemberLocations(prev => {
            const next = new Map(prev);
            next.set(data.profile_id, {
              profileId: data.profile_id,
              displayName: profileData?.display_name || 'Unknown',
              avatarUrl: profileData?.avatar_url,
              lat: data.current_lat,
              lng: data.current_lng,
              lastUpdate: new Date(data.last_location_update).getTime(),
              proximitySignal: 'gps',
            });
            return next;
          });
        }
      )
      .subscribe();

    // Initial fetch of member locations
    supabase
      .from('event_attendees')
      .select(`
        profile_id,
        current_lat,
        current_lng,
        last_location_update,
        share_location,
        profile:profiles(display_name, avatar_url)
      `)
      .eq('event_id', eventId)
      .eq('share_location', true)
      .not('current_lat', 'is', null)
      .then(({ data }) => {
        if (data) {
          const newLocations = new Map<string, MemberLocation>();
          data.forEach((attendee: any) => {
            if (attendee.profile_id !== profile?.id) {
              newLocations.set(attendee.profile_id, {
                profileId: attendee.profile_id,
                displayName: attendee.profile?.display_name || 'Unknown',
                avatarUrl: attendee.profile?.avatar_url,
                lat: attendee.current_lat,
                lng: attendee.current_lng,
                lastUpdate: new Date(attendee.last_location_update).getTime(),
                proximitySignal: 'gps',
              });
            }
          });
          setMemberLocations(newLocations);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, batteryOptimization, updateDatabase]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (eventIdRef.current && profile?.id) {
      await supabase
        .from('event_attendees')
        .update({ share_location: false })
        .eq('event_id', eventIdRef.current)
        .eq('profile_id', profile.id);
    }

    // Stop indoor positioning if active
    if (indoorPositioning.isScanning) {
      indoorPositioning.stopScanning();
    }

    eventIdRef.current = null;
    setIsTracking(false);
    setMemberLocations(new Map());
  }, [profile?.id, indoorPositioning]);

  // Navigate to a member's location - now opens the in-app FindFriendView
  const navigateToMember = useCallback((member: MemberLocation) => {
    setSelectedMemberForNav(member);
  }, []);

  // Update member distances when position changes
  useEffect(() => {
    if (!currentPosition) return;

    setMemberLocations(prev => {
      const next = new Map(prev);
      next.forEach((member, key) => {
        const { distance, bearing } = getDistanceAndBearing(member.lat, member.lng);
        next.set(key, { ...member, distance, bearing });
      });
      return next;
    });
  }, [currentPosition, getDistanceAndBearing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Start Wi-Fi positioning when tracking starts
  useEffect(() => {
    if (isTracking && !wifiPositioning.isScanning) {
      wifiPositioning.startScanning(currentPosition?.accuracy);
    } else if (!isTracking && wifiPositioning.isScanning) {
      wifiPositioning.stopScanning();
    }
  }, [isTracking]);

  // Clear accuracy history
  const clearAccuracyHistory = useCallback(() => {
    setAccuracyHistory([]);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        currentPosition,
        compassHeading,
        isTracking,
        memberLocations,
        startTracking,
        stopTracking,
        getDistanceAndBearing,
        navigateToMember,
        selectedMemberForNav,
        setSelectedMemberForNav,
        signalQuality,
        // Battery optimization
        trackingMode: batteryOptimization.currentMode,
        setTrackingMode: batteryOptimization.setTrackingMode,
        movementState: batteryOptimization.movementState,
        updateInterval: batteryOptimization.updateInterval,
        batteryInfo,
        isAdaptiveBatteryEnabled: batteryOptimization.isAdaptiveEnabled,
        setAdaptiveBatteryEnabled: batteryOptimization.setAdaptiveEnabled,
        // Indoor positioning
        indoorInfo,
        startIndoorPositioning: indoorPositioning.startScanning,
        stopIndoorPositioning: indoorPositioning.stopScanning,
        startIndoorSimulation: indoorPositioning.startSimulation,
        stopIndoorSimulation: indoorPositioning.stopSimulation,
        nearbyBeacons: indoorPositioning.nearbyBeacons,
        availableBeacons: indoorPositioning.databaseBeacons.length,
        // Environment detection
        environmentInfo: wifiPositioning.environmentInfo,
        isWifiPositioningActive: wifiPositioning.isScanning,
        // Accuracy history
        accuracyHistory,
        clearAccuracyHistory,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}
