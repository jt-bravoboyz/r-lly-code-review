import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useLocation() {
  const { profile } = useAuth();
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false
  });

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: error.message,
          loading: false
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const updateProfileLocation = useCallback(async (lat: number, lng: number) => {
    if (!profile) return;

    await supabase
      .from('profiles')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString()
      })
      .eq('id', profile.id);
  }, [profile]);

  const updateEventAttendeeLocation = useCallback(async (eventId: string, lat: number, lng: number) => {
    if (!profile) return;

    await supabase
      .from('event_attendees')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('profile_id', profile.id);
  }, [profile]);

  const toggleLocationSharing = useCallback(async (enabled: boolean) => {
    if (!profile) return;

    await supabase
      .from('profiles')
      .update({ location_sharing_enabled: enabled })
      .eq('id', profile.id);
  }, [profile]);

  return {
    location,
    getCurrentLocation,
    updateProfileLocation,
    updateEventAttendeeLocation,
    toggleLocationSharing
  };
}

export function useRealtimeLocations(eventId: string | undefined) {
  const [attendeeLocations, setAttendeeLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map());

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-locations-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const { profile_id, current_lat, current_lng, share_location } = payload.new as any;
          if (share_location && current_lat && current_lng) {
            setAttendeeLocations(prev => {
              const next = new Map(prev);
              next.set(profile_id, { lat: current_lat, lng: current_lng });
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return attendeeLocations;
}