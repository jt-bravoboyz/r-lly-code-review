import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
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
  proximitySignal?: 'gps' | 'ble';
  bleRssi?: number;
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
  
  const watchIdRef = useRef<number | null>(null);
  const eventIdRef = useRef<string | null>(null);
  const smoothedHeadingRef = useRef<number>(0);
  const smoothedPositionRef = useRef<{ lat: number; lng: number } | null>(null);

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

  // Get distance and bearing from current position to a target
  const getDistanceAndBearing = useCallback((targetLat: number, targetLng: number) => {
    if (!currentPosition) {
      return { distance: 0, bearing: 0 };
    }
    
    const distance = calculateDistance(currentPosition.lat, currentPosition.lng, targetLat, targetLng);
    const bearing = calculateBearing(currentPosition.lat, currentPosition.lng, targetLat, targetLng);
    
    return { distance, bearing };
  }, [currentPosition]);

  // Start tracking location
  const startTracking = useCallback((eventId: string) => {
    if (!navigator.geolocation || !profile?.id) return;

    eventIdRef.current = eventId;
    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        
        // Apply position smoothing
        let smoothedLat = latitude;
        let smoothedLng = longitude;
        
        if (smoothedPositionRef.current) {
          smoothedLat = smoothedPositionRef.current.lat + (latitude - smoothedPositionRef.current.lat) * POSITION_SMOOTHING;
          smoothedLng = smoothedPositionRef.current.lng + (longitude - smoothedPositionRef.current.lng) * POSITION_SMOOTHING;
        }
        smoothedPositionRef.current = { lat: smoothedLat, lng: smoothedLng };

        // Determine signal quality based on accuracy
        if (accuracy <= 10) {
          setSignalQuality('good');
        } else if (accuracy <= 30) {
          setSignalQuality('fair');
        } else {
          setSignalQuality('poor');
        }

        const newPosition: Position = {
          lat: smoothedLat,
          lng: smoothedLng,
          accuracy,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: Date.now(),
        };

        setCurrentPosition(newPosition);

        // Update location in database
        if (eventIdRef.current) {
          await supabase
            .from('event_attendees')
            .update({
              current_lat: smoothedLat,
              current_lng: smoothedLng,
              last_location_update: new Date().toISOString(),
              share_location: true,
            })
            .eq('event_id', eventIdRef.current)
            .eq('profile_id', profile.id);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setSignalQuality('poor');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

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
  }, [profile?.id]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (eventIdRef.current && profile?.id) {
      await supabase
        .from('event_attendees')
        .update({ share_location: false })
        .eq('event_id', eventIdRef.current)
        .eq('profile_id', profile.id);
    }

    eventIdRef.current = null;
    setIsTracking(false);
    setMemberLocations(new Map());
  }, [profile?.id]);

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
    };
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
