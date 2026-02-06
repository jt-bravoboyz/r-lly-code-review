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
        .from('profiles')
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
    mutationFn: async ({ attendeeId, eventId }: { attendeeId: string; eventId: string }) => {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', attendeeId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      return { attendeeId, eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('Request declined');
    },
    onError: (error: any) => {
      console.error('Error declining join request:', error);
      toast.error(error.message || 'Failed to decline request');
    },
  });
}
