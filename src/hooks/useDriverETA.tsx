import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  lat: number;
  lng: number;
  lastUpdate: string | null;
}

interface ETAResult {
  driverLocation: DriverLocation | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  isLoading: boolean;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate ETA based on distance (assuming average urban speed of 30 km/h)
function estimateETA(distanceKm: number): number {
  const avgSpeedKmH = 30; // Conservative estimate for urban driving
  return Math.ceil((distanceKm / avgSpeedKmH) * 60); // Return minutes
}

export function useDriverETA(
  driverId: string | undefined,
  passengerLat: number | undefined,
  passengerLng: number | undefined,
  eventId?: string | null
): ETAResult {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch driver's current location
  useEffect(() => {
    if (!driverId) {
      setIsLoading(false);
      return;
    }

    const fetchDriverLocation = async () => {
      setIsLoading(true);
      
      // First try to get from event_attendees (if they're at the event)
      if (eventId) {
        const { data: attendeeData } = await supabase
          .from('event_attendees')
          .select('current_lat, current_lng, last_location_update, share_location')
          .eq('event_id', eventId)
          .eq('profile_id', driverId)
          .maybeSingle();

        if (attendeeData?.share_location && attendeeData.current_lat && attendeeData.current_lng) {
          setDriverLocation({
            lat: attendeeData.current_lat,
            lng: attendeeData.current_lng,
            lastUpdate: attendeeData.last_location_update,
          });
          setIsLoading(false);
          return;
        }
      }

      // Fallback to profile location
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_lat, current_lng, last_location_update, location_sharing_enabled')
        .eq('id', driverId)
        .maybeSingle();

      if (profileData?.location_sharing_enabled && profileData.current_lat && profileData.current_lng) {
        setDriverLocation({
          lat: profileData.current_lat,
          lng: profileData.current_lng,
          lastUpdate: profileData.last_location_update,
        });
      } else {
        setDriverLocation(null);
      }
      setIsLoading(false);
    };

    fetchDriverLocation();

    // Subscribe to real-time updates
    const channelName = eventId 
      ? `driver-location-event-${eventId}-${driverId}`
      : `driver-location-${driverId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: eventId ? 'event_attendees' : 'profiles',
          filter: eventId 
            ? `profile_id=eq.${driverId}` 
            : `id=eq.${driverId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data.current_lat && data.current_lng) {
            const isSharing = eventId ? data.share_location : data.location_sharing_enabled;
            if (isSharing) {
              setDriverLocation({
                lat: data.current_lat,
                lng: data.current_lng,
                lastUpdate: data.last_location_update,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, eventId]);

  // Calculate distance and ETA
  const { distanceKm, etaMinutes } = useMemo(() => {
    if (!driverLocation || !passengerLat || !passengerLng) {
      return { distanceKm: null, etaMinutes: null };
    }

    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      passengerLat,
      passengerLng
    );

    return {
      distanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
      etaMinutes: estimateETA(distance),
    };
  }, [driverLocation, passengerLat, passengerLng]);

  return {
    driverLocation,
    distanceKm,
    etaMinutes,
    isLoading,
  };
}

// Format ETA for display
export function formatETA(minutes: number | null): string {
  if (minutes === null) return 'Unknown';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

// Format distance for display
export function formatDistance(km: number | null): string {
  if (km === null) return 'Unknown';
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}
