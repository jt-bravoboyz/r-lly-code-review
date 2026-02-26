import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMyAttendeeStatus } from './useSafetyStatus';
import { useSafetyNotifications } from './useSafetyNotifications';
import { toast } from 'sonner';

// Haversine formula to calculate distance in meters between two coordinates
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const ARRIVAL_THRESHOLD_METERS = 100;

interface UseAutoArrivalProps {
  eventId: string;
  eventStatus: string | null | undefined;
}

export function useAutoArrival({ eventId, eventStatus }: UseAutoArrivalProps) {
  const { profile } = useAuth();
  const { data: myStatus, refetch: refetchStatus } = useMyAttendeeStatus(eventId);
  const { notifyArrivedSafe } = useSafetyNotifications();
  const watchIdRef = useRef<number | null>(null);
  const hasMarkedArrivalRef = useRef(false);

  const shouldTrack = 
    profile?.id && 
    myStatus && 
    myStatus.going_home_at && 
    !myStatus.arrived_safely &&
    !myStatus.dd_dropoff_confirmed_at &&
    (eventStatus === 'after_rally' || eventStatus === 'completed');

  const markArrivedSafely = useCallback(async () => {
    if (!profile?.id || hasMarkedArrivalRef.current) return;
    
    // MED-4: Guard against duplicate points if already arrived
    if (myStatus?.arrived_safely) return;
    
    hasMarkedArrivalRef.current = true;

    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({
          arrived_safely: true,
          arrived_at: new Date().toISOString(),
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      // MED-4: Only award points if not already arrived
      try {
        await supabase.rpc('rly_award_points_by_profile', {
          p_profile_id: profile.id,
          p_event_type: 'safe_arrival',
          p_source_id: eventId
        });
      } catch (pointsError) {
        if (import.meta.env.DEV) {
          console.error('Failed to award safe_arrival points:', pointsError);
        }
      }

      await refetchStatus();
      
      notifyArrivedSafe(eventId);
      
      toast.success('🏠 You made it home safely!', {
        description: 'Auto-detected your arrival. Your squad has been notified.',
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Auto-arrival failed:', error);
      }
      hasMarkedArrivalRef.current = false;
    }
  }, [eventId, profile?.id, refetchStatus, notifyArrivedSafe, myStatus?.arrived_safely]);

  useEffect(() => {
    if (!shouldTrack) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const fetchDestinationAndWatch = async () => {
      const { data: attendeeData } = await supabase
        .from('event_attendees')
        .select('destination_lat, destination_lng')
        .eq('event_id', eventId)
        .eq('profile_id', profile!.id)
        .maybeSingle();

      const destLat = attendeeData?.destination_lat;
      const destLng = attendeeData?.destination_lng;

      if (!destLat || !destLng) {
        if (import.meta.env.DEV) {
          console.log('[AutoArrival] No destination coordinates set, skipping auto-detection');
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[AutoArrival] Starting location watch for auto-arrival detection');
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = calculateDistanceMeters(latitude, longitude, destLat, destLng);

          if (import.meta.env.DEV) {
            console.log(`[AutoArrival] Distance to destination: ${distance.toFixed(0)}m`);
          }

          if (distance <= ARRIVAL_THRESHOLD_METERS) {
            if (import.meta.env.DEV) {
              console.log('[AutoArrival] User has arrived at destination!');
            }
            markArrivedSafely();
          }
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.error('[AutoArrival] Geolocation error:', error);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000,
        }
      );
    };

    fetchDestinationAndWatch();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [shouldTrack, eventId, profile?.id, markArrivedSafely]);

  useEffect(() => {
    hasMarkedArrivalRef.current = false;
  }, [eventId]);

  return {
    isTracking: shouldTrack && watchIdRef.current !== null,
  };
}
