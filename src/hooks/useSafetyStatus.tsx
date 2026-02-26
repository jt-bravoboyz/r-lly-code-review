import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AttendeeWithSafetyStatus {
  id: string;
  profile_id: string;
  going_home_at: string | null;
  arrived_safely: boolean;
  not_participating_rally_home_confirmed: boolean | null;
  dd_dropoff_confirmed_at: string | null;
  dd_dropoff_confirmed_by: string | null;
  is_dd: boolean;
  after_rally_opted_in: boolean | null;
  after_rally_location_name?: string | null;
  destination_name?: string | null;
  needs_ride?: boolean | null;
  ride_pickup_location?: string | null;
  ride_dropoff_location?: string | null;
  location_prompt_shown?: boolean | null;
  status?: string | null;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface EventSafetySummary {
  event_id: string;
  total_attendees: number;
  participating_count: number;
  arrived_safely_count: number;
  not_participating_count: number;
  undecided_count: number;
  dd_count: number;
  dd_pending_arrival_count: number;
  safety_complete: boolean;
}

export type SafetyState = 
  | 'participating' 
  | 'arrived_safely' 
  | 'not_participating' 
  | 'undecided'
  | 'opted_in'
  | 'dd_pending';

export function getSafetyState(attendee: AttendeeWithSafetyStatus): SafetyState {
  if (attendee.arrived_safely || attendee.dd_dropoff_confirmed_at) {
    return 'arrived_safely';
  }
  
  if (attendee.is_dd && !attendee.arrived_safely) {
    if (attendee.going_home_at) {
      return 'participating';
    }
    return 'dd_pending';
  }
  
  if (attendee.going_home_at) {
    return 'participating';
  }
  
  if (attendee.after_rally_opted_in && attendee.destination_name) {
    return 'opted_in';
  }
  
  if (attendee.not_participating_rally_home_confirmed === true) {
    return 'not_participating';
  }
  
  return 'undecided';
}

export function getSafetyStateLabel(state: SafetyState): string {
  switch (state) {
    case 'participating':
      return 'En Route Home';
    case 'arrived_safely':
      return 'Arrived Safely';
    case 'not_participating':
      return 'Not Participating';
    case 'undecided':
      return 'Undecided';
    case 'opted_in':
      return 'Ready for R@lly Home';
    case 'dd_pending':
      return 'DD - Awaiting Arrival';
  }
}

// MED-2: Removed refetchInterval. MED-3: Added missing fields. POL-1: Removed unnecessary casts.
export function useEventSafetyStatus(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-safety-status', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id,
          profile_id,
          going_home_at,
          arrived_safely,
          is_dd,
          after_rally_opted_in,
          not_participating_rally_home_confirmed,
          dd_dropoff_confirmed_at,
          dd_dropoff_confirmed_by,
          destination_name,
          needs_ride,
          ride_pickup_location,
          ride_dropoff_location,
          location_prompt_shown
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      if (!data) return [];

      const profileIds = data.map(d => d.profile_id).filter(Boolean);
      if (profileIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(attendee => ({
        id: attendee.id,
        profile_id: attendee.profile_id,
        going_home_at: attendee.going_home_at,
        arrived_safely: attendee.arrived_safely ?? false,
        not_participating_rally_home_confirmed: attendee.not_participating_rally_home_confirmed ?? null,
        dd_dropoff_confirmed_at: attendee.dd_dropoff_confirmed_at ?? null,
        dd_dropoff_confirmed_by: attendee.dd_dropoff_confirmed_by ?? null,
        is_dd: attendee.is_dd ?? false,
        after_rally_opted_in: attendee.after_rally_opted_in ?? null,
        destination_name: attendee.destination_name ?? null,
        needs_ride: attendee.needs_ride ?? false,
        ride_pickup_location: (attendee as any).ride_pickup_location ?? null,
        ride_dropoff_location: (attendee as any).ride_dropoff_location ?? null,
        location_prompt_shown: (attendee as any).location_prompt_shown ?? false,
        profile: profileMap.get(attendee.profile_id) || null
      })) as AttendeeWithSafetyStatus[];
    },
    enabled: !!eventId,
    // MED-2: No polling. Realtime is handled per-component or via useMyAttendeeStatus.
  });
}

// Check if event safety is complete
export function useIsEventSafetyComplete(eventId: string | undefined) {
  const { data: attendees } = useEventSafetyStatus(eventId);

  const safetyComplete = attendees ? !attendees.some(a => {
    if (a.going_home_at && !a.arrived_safely && !a.dd_dropoff_confirmed_at) {
      return true;
    }
    if (a.is_dd && !a.arrived_safely) {
      return true;
    }
    if (!a.going_home_at && 
        a.not_participating_rally_home_confirmed !== true && 
        !a.after_rally_opted_in) {
      return true;
    }
    return false;
  }) : true;

  return { data: safetyComplete, isLoading: !attendees };
}

// ARCH-4: Consolidated single source of truth for current user's attendee status.
// MED-2: Realtime subscription with duplicate guard and clean unmount.
export function useMyAttendeeStatus(eventId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const result = useQuery({
    queryKey: ['my-attendee-status', eventId, profile?.id],
    queryFn: async () => {
      if (!eventId || !profile?.id) return null;

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id,
          profile_id,
          going_home_at,
          arrived_safely,
          is_dd,
          after_rally_opted_in,
          after_rally_location_name,
          not_participating_rally_home_confirmed,
          dd_dropoff_confirmed_at,
          dd_dropoff_confirmed_by,
          destination_name,
          needs_ride,
          ride_pickup_location,
          ride_dropoff_location,
          location_prompt_shown,
          status
        `)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        profile_id: data.profile_id,
        going_home_at: data.going_home_at,
        arrived_safely: data.arrived_safely ?? false,
        not_participating_rally_home_confirmed: data.not_participating_rally_home_confirmed ?? null,
        dd_dropoff_confirmed_at: data.dd_dropoff_confirmed_at ?? null,
        dd_dropoff_confirmed_by: data.dd_dropoff_confirmed_by ?? null,
        is_dd: data.is_dd ?? false,
        after_rally_opted_in: data.after_rally_opted_in ?? null,
        after_rally_location_name: (data as any).after_rally_location_name ?? null,
        destination_name: data.destination_name ?? null,
        needs_ride: data.needs_ride ?? false,
        ride_pickup_location: (data as any).ride_pickup_location ?? null,
        ride_dropoff_location: (data as any).ride_dropoff_location ?? null,
        location_prompt_shown: (data as any).location_prompt_shown ?? false,
        status: data.status ?? null,
      } as AttendeeWithSafetyStatus;
    },
    enabled: !!eventId && !!profile?.id,
  });

  // MED-2: Realtime subscription with duplicate guard
  useEffect(() => {
    if (!eventId || !profile?.id) return;

    // Guard against duplicate channel creation
    if (channelRef.current) return;

    const channel = supabase
      .channel(`my-attendee-${eventId}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Only refetch if the change is for our profile
          const newRow = payload.new as any;
          if (newRow?.profile_id === profile.id || payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['my-attendee-status', eventId, profile.id] });
          }
          // Also invalidate the event safety status for dashboard updates
          queryClient.invalidateQueries({ queryKey: ['event-safety-status', eventId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [eventId, profile?.id, queryClient]);

  return result;
}

// Set participation status
export function useUpdateSafetyStatus() {
  const { profile } = useAuth();

  const startParticipating = async (eventId: string, destinationName?: string, visibility?: string) => {
    if (!profile?.id) throw new Error('Not authenticated');

    const updates: Record<string, any> = {
      going_home_at: new Date().toISOString(),
      destination_name: destinationName || null,
      destination_visibility: visibility || 'squad',
      arrived_safely: false,
      not_participating_rally_home_confirmed: null,
    };

    const { error } = await supabase
      .from('event_attendees')
      .update(updates)
      .eq('event_id', eventId)
      .eq('profile_id', profile.id);

    if (error) throw error;
  };

  const confirmNotParticipating = async (eventId: string) => {
    if (!profile?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('event_attendees')
      .update({
        going_home_at: null,
        not_participating_rally_home_confirmed: true,
      } as any)
      .eq('event_id', eventId)
      .eq('profile_id', profile.id);

    if (error) throw error;
  };

  // MED-4: Guard against duplicate point awarding
  const confirmArrivedSafely = async (eventId: string, alreadyArrived?: boolean) => {
    if (!profile?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('event_attendees')
      .update({
        arrived_safely: true,
        arrived_at: new Date().toISOString(),
      } as any)
      .eq('event_id', eventId)
      .eq('profile_id', profile.id);

    if (error) throw error;

    // MED-4: Skip if already arrived (prevents duplicate points)
    if (alreadyArrived) return;

    try {
      await supabase.rpc('rly_award_points_by_profile', {
        p_profile_id: profile.id,
        p_event_type: 'safe_arrival',
        p_source_id: eventId
      });
    } catch (pointsError) {
      console.error('Failed to award safe_arrival points:', pointsError);
    }
  };

  return {
    startParticipating,
    confirmNotParticipating,
    confirmArrivedSafely,
  };
}
