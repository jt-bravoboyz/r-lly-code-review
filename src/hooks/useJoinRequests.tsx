import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingRequest {
  id: string;
  event_id: string;
  profile_id: string;
  status: string;
  joined_at: string;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function usePendingJoinRequests(eventId: string | undefined) {
  return useQuery({
    queryKey: ['pending-join-requests', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      // Get pending attendees
      const { data: attendees, error } = await supabase
        .from('event_attendees')
        .select('id, event_id, profile_id, status, joined_at')
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending requests:', error);
        throw error;
      }

      if (!attendees || attendees.length === 0) return [];

      // Fetch profiles separately to avoid relationship ambiguity
      const profileIds = attendees.map(a => a.profile_id);
      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);

      // Merge the data
      return attendees.map(attendee => ({
        ...attendee,
        profile: profiles?.find(p => p.id === attendee.profile_id) || null
      })) as PendingRequest[];
    },
    enabled: !!eventId,
    refetchInterval: 10000,
  });
}

export function useAcceptJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendeeId, eventId }: { attendeeId: string; eventId: string }) => {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'attending' })
        .eq('id', attendeeId);

      if (error) {
        throw error;
      }

      return { attendeeId, eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Request accepted! They can now access the rally.');
    },
    onError: (error: any) => {
      console.error('Error accepting join request:', error);
      toast.error(error.message || 'Failed to accept request');
    },
  });
}

export function useDeclineJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, profileId }: { attendeeId: string; eventId: string; profileId: string }) => {
      // Soft-flag: keeps the row so the host can re-invite later.
      const { data, error } = await supabase.rpc('host_decline_attendee' as any, {
        _event_id: eventId,
        _profile_id: profileId,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return { eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['declined-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Request declined');
    },
    onError: (error: any) => {
      console.error('Error declining join request:', error);
      toast.error(error.message || 'Failed to decline request');
    },
  });
}

interface DeclinedAttendee {
  id: string;
  event_id: string;
  profile_id: string;
  status: string;
  declined_at: string | null;
  profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

export function useDeclinedAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ['declined-attendees', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data: attendees, error } = await (supabase as any)
        .from('event_attendees')
        .select('id, event_id, profile_id, status, declined_at')
        .eq('event_id', eventId)
        .eq('status', 'declined')
        .order('declined_at', { ascending: false });
      if (error) throw error;
      if (!attendees || attendees.length === 0) return [];
      const profileIds = attendees.map((a: any) => a.profile_id);
      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);
      return attendees.map((a: any) => ({
        ...a,
        profile: profiles?.find((p) => p.id === a.profile_id) || null,
      })) as DeclinedAttendee[];
    },
    enabled: !!eventId,
  });
}

export function useReinviteAttendee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, profileId }: { eventId: string; profileId: string }) => {
      const { data, error } = await supabase.rpc('host_reinvite_attendee' as any, {
        _event_id: eventId,
        _profile_id: profileId,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return { eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['declined-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Re-invited');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to re-invite');
    },
  });
}
