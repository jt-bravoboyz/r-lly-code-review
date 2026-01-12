import { useQuery } from '@tanstack/react-query';
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
  | 'dd_pending';

export function getSafetyState(attendee: AttendeeWithSafetyStatus): SafetyState {
  // Check if arrived safely (either self-confirmed or DD dropoff confirmed)
  if (attendee.arrived_safely || attendee.dd_dropoff_confirmed_at) {
    return 'arrived_safely';
  }
  
  // DD who hasn't arrived - special state
  if (attendee.is_dd && !attendee.arrived_safely) {
    // If DD is participating, show participating. Otherwise show dd_pending
    if (attendee.going_home_at) {
      return 'participating';
    }
    return 'dd_pending';
  }
  
  // Participating in R@lly Home (started journey)
  if (attendee.going_home_at) {
    return 'participating';
  }
  
  // Confirmed not participating
  if (attendee.not_participating_rally_home_confirmed === true) {
    return 'not_participating';
  }
  
  // Neither participating nor confirmed not participating
  return 'undecided';
}

export function getSafetyStateLabel(state: SafetyState): string {
  switch (state) {
    case 'participating':
      return 'Participating in R@lly Home';
    case 'arrived_safely':
      return 'Arrived Safely';
    case 'not_participating':
      return 'Not Participating in R@lly Home';
    case 'undecided':
      return 'Undecided';
    case 'dd_pending':
      return 'DD - Awaiting Arrival';
  }
}

// Fetch all attendees with their safety status
export function useEventSafetyStatus(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-safety-status', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      // Query event_attendees with renamed columns
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
          dd_dropoff_confirmed_by
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      if (!data) return [];

      // Fetch profile info separately
      const profileIds = data.map(d => d.profile_id).filter(Boolean);
      if (profileIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Map to our interface
      return data.map(attendee => ({
        id: attendee.id,
        profile_id: attendee.profile_id,
        going_home_at: attendee.going_home_at,
        arrived_safely: (attendee as any).arrived_safely ?? false,
        not_participating_rally_home_confirmed: (attendee as any).not_participating_rally_home_confirmed ?? null,
        dd_dropoff_confirmed_at: (attendee as any).dd_dropoff_confirmed_at ?? null,
        dd_dropoff_confirmed_by: (attendee as any).dd_dropoff_confirmed_by ?? null,
        is_dd: attendee.is_dd ?? false,
        after_rally_opted_in: attendee.after_rally_opted_in ?? null,
        profile: profileMap.get(attendee.profile_id) || null
      })) as AttendeeWithSafetyStatus[];
    },
    enabled: !!eventId,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });
}

// Check if event safety is complete
export function useIsEventSafetyComplete(eventId: string | undefined) {
  const { data: attendees } = useEventSafetyStatus(eventId);

  // Calculate locally since the DB function may not exist yet
  const safetyComplete = attendees ? !attendees.some(a => {
    // Participating but not arrived safely AND not confirmed via DD drop-off
    if (a.going_home_at && !a.arrived_safely && !a.dd_dropoff_confirmed_at) {
      return true;
    }
    // DD who hasn't confirmed their own arrival (regardless of participation)
    if (a.is_dd && !a.arrived_safely) {
      return true;
    }
    // Undecided (neither participating NOR confirmed not participating)
    if (!a.going_home_at && a.not_participating_rally_home_confirmed === null) {
      return true;
    }
    return false;
  }) : true;

  return { data: safetyComplete, isLoading: !attendees };
}

// Get current user's safety status
export function useMyAttendeeStatus(eventId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
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
          not_participating_rally_home_confirmed,
          dd_dropoff_confirmed_at,
          dd_dropoff_confirmed_by
        `)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Map to our interface
      return {
        id: data.id,
        profile_id: data.profile_id,
        going_home_at: data.going_home_at,
        arrived_safely: (data as any).arrived_safely ?? false,
        not_participating_rally_home_confirmed: (data as any).not_participating_rally_home_confirmed ?? null,
        dd_dropoff_confirmed_at: (data as any).dd_dropoff_confirmed_at ?? null,
        dd_dropoff_confirmed_by: (data as any).dd_dropoff_confirmed_by ?? null,
        is_dd: data.is_dd ?? false,
        after_rally_opted_in: data.after_rally_opted_in ?? null,
      } as AttendeeWithSafetyStatus;
    },
    enabled: !!eventId && !!profile?.id,
  });
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
      not_participating_rally_home_confirmed: null, // Clear any previous "not participating" confirmation
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

  const confirmArrivedSafely = async (eventId: string) => {
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
  };

  return {
    startParticipating,
    confirmNotParticipating,
    confirmArrivedSafely,
  };
}
