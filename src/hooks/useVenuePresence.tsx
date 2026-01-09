import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VenuePresence {
  id: string;
  profile_id: string;
  venue_id: string;
  event_id: string | null;
  entered_at: string;
  exited_at: string | null;
  last_seen_at: string;
  floor: number | null;
  beacon_id: string | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
  venue?: {
    name: string;
    address: string | null;
  };
}

export interface ArrivalNotificationSettings {
  id: string;
  profile_id: string;
  notify_on_friend_arrival: boolean;
  notify_on_friend_departure: boolean;
  notify_only_same_event: boolean;
}

// Get current venue presence for events
export function useEventVenuePresence(eventId: string | null) {
  return useQuery({
    queryKey: ['venue-presence', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('venue_presence')
        .select(`
          *,
          profile:profiles(display_name, avatar_url),
          venue:venues(name, address)
        `)
        .eq('event_id', eventId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false });
      
      if (error) throw error;
      return data as VenuePresence[];
    },
    enabled: !!eventId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Track user's current presence
export function useTrackPresence() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const currentPresenceRef = useRef<string | null>(null);
  
  const enterVenue = useMutation({
    mutationFn: async ({ venueId, eventId, floor, beaconId }: {
      venueId: string;
      eventId?: string;
      floor?: number;
      beaconId?: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      // First, check if already at this venue
      const { data: existing } = await supabase
        .from('venue_presence')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('venue_id', venueId)
        .is('exited_at', null)
        .single();
      
      if (existing) {
        // Update last_seen_at
        const { data, error } = await supabase
          .from('venue_presence')
          .update({
            last_seen_at: new Date().toISOString(),
            floor,
            beacon_id: beaconId,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        currentPresenceRef.current = data.id;
        return { isNew: false, data };
      }
      
      // Exit any other venue first
      await supabase
        .from('venue_presence')
        .update({ exited_at: new Date().toISOString() })
        .eq('profile_id', profile.id)
        .is('exited_at', null);
      
      // Create new presence record
      const { data, error } = await supabase
        .from('venue_presence')
        .insert({
          profile_id: profile.id,
          venue_id: venueId,
          event_id: eventId || null,
          floor,
          beacon_id: beaconId,
        })
        .select()
        .single();
      
      if (error) throw error;
      currentPresenceRef.current = data.id;
      
      // Send arrival notification
      await supabase.functions.invoke('send-arrival-notification', {
        body: {
          type: 'arrival',
          profileId: profile.id,
          venueId,
          eventId,
        },
      });
      
      return { isNew: true, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-presence'] });
    },
  });
  
  const exitVenue = useMutation({
    mutationFn: async (venueId?: string) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const query = supabase
        .from('venue_presence')
        .update({ exited_at: new Date().toISOString() })
        .eq('profile_id', profile.id)
        .is('exited_at', null);
      
      if (venueId) {
        query.eq('venue_id', venueId);
      }
      
      const { error } = await query;
      if (error) throw error;
      
      // Send departure notification
      if (venueId) {
        await supabase.functions.invoke('send-arrival-notification', {
          body: {
            type: 'departure',
            profileId: profile.id,
            venueId,
          },
        });
      }
      
      currentPresenceRef.current = null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-presence'] });
    },
  });
  
  const updatePresence = useCallback(async (floor?: number, beaconId?: string) => {
    if (!currentPresenceRef.current) return;
    
    await supabase
      .from('venue_presence')
      .update({
        last_seen_at: new Date().toISOString(),
        floor,
        beacon_id: beaconId,
      })
      .eq('id', currentPresenceRef.current);
  }, []);
  
  return {
    enterVenue,
    exitVenue,
    updatePresence,
    currentPresenceId: currentPresenceRef.current,
  };
}

// Get and update notification settings
export function useArrivalNotificationSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['arrival-notification-settings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data, error } = await supabase
        .from('arrival_notification_settings')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default settings if none exist
      if (!data) {
        return {
          id: '',
          profile_id: profile.id,
          notify_on_friend_arrival: true,
          notify_on_friend_departure: true,
          notify_only_same_event: true,
        } as ArrivalNotificationSettings;
      }
      
      return data as ArrivalNotificationSettings;
    },
    enabled: !!profile?.id,
  });
  
  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<ArrivalNotificationSettings>) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('arrival_notification_settings')
        .upsert({
          profile_id: profile.id,
          ...settings,
        }, {
          onConflict: 'profile_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ArrivalNotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arrival-notification-settings'] });
    },
  });
  
  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
  };
}
