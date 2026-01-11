import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sendDDRequestMessage, sendDDAcceptedMessage, sendDDVolunteeredMessage, sendDDRevokedMessage, sendDDDeclinedMessage } from './useSystemMessages';

export interface DDRequest {
  id: string;
  event_id: string;
  requested_profile_id: string;
  requested_by_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  created_at: string;
  responded_at: string | null;
  requested_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  requested_by_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Get all DD requests for an event
export function useDDRequests(eventId: string | undefined) {
  return useQuery({
    queryKey: ['dd-requests', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_dd_requests')
        .select(`
          *,
          requested_profile:profiles!event_dd_requests_requested_profile_id_fkey(id, display_name, avatar_url),
          requested_by_profile:profiles!event_dd_requests_requested_by_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DDRequest[];
    },
    enabled: !!eventId,
  });
}

// Get current user's pending DD request for an event
export function useMyDDRequest(eventId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['dd-requests', eventId, 'my', profile?.id],
    queryFn: async () => {
      if (!eventId || !profile?.id) return null;

      const { data, error } = await supabase
        .from('event_dd_requests')
        .select(`
          *,
          requested_by_profile:profiles!event_dd_requests_requested_by_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('requested_profile_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data as DDRequest | null;
    },
    enabled: !!eventId && !!profile?.id,
  });
}

// Get all attendees who are DD for an event
export function useEventDDs(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-dds', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id,
          profile_id,
          is_dd,
          profile:profiles!event_attendees_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('is_dd', true);

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

// Helper to get event's chat ID
async function getEventChatId(eventId: string): Promise<string | null> {
  const { data } = await supabase
    .from('chats')
    .select('id')
    .or(`event_id.eq.${eventId},linked_event_id.eq.${eventId}`)
    .maybeSingle();
  
  return data?.id || null;
}

// Host/cohost creates a DD request for an attendee
export function useCreateDDRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      requestedProfileId,
      requestedName,
    }: { 
      eventId: string; 
      requestedProfileId: string;
      requestedName: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('event_dd_requests')
        .insert({
          event_id: eventId,
          requested_profile_id: requestedProfileId,
          requested_by_profile_id: profile.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A pending DD request already exists for this person');
        }
        throw error;
      }

      // Send system message
      const chatId = await getEventChatId(eventId);
      if (chatId) {
        await sendDDRequestMessage(chatId, requestedName, profile.display_name || 'Host');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dd-requests', variables.eventId] });
    },
  });
}

// Attendee responds to DD request (accept/decline)
export function useRespondToDDRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      requestId,
      eventId,
      response,
      userName,
    }: { 
      requestId: string;
      eventId: string;
      response: 'accepted' | 'declined';
      userName: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Update request status
      const { error: updateError } = await supabase
        .from('event_dd_requests')
        .update({ 
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If accepted, set is_dd = true on event_attendees
      if (response === 'accepted') {
        const { error: ddError } = await supabase
          .from('event_attendees')
          .update({ is_dd: true })
          .eq('event_id', eventId)
          .eq('profile_id', profile.id);

        if (ddError) throw ddError;

        // Send accepted system message
        const chatId = await getEventChatId(eventId);
        if (chatId) {
          await sendDDAcceptedMessage(chatId, userName);
        }
      } else {
        // Send declined system message
        const chatId = await getEventChatId(eventId);
        if (chatId) {
          await sendDDDeclinedMessage(chatId, userName);
        }
      }

      return { response };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dd-requests', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dds', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
}

// Attendee volunteers as DD (no request needed)
export function useVolunteerAsDD() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      eventId,
      userName,
    }: { 
      eventId: string;
      userName: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Set is_dd = true on event_attendees
      const { error } = await supabase
        .from('event_attendees')
        .update({ is_dd: true })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      // Send system message
      const chatId = await getEventChatId(eventId);
      if (chatId) {
        await sendDDVolunteeredMessage(chatId, userName);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-dds', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
}

// Host/cohost revokes DD status
export function useRevokeDD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId,
      profileId,
      userName,
    }: { 
      eventId: string;
      profileId: string;
      userName: string;
    }) => {
      // Set is_dd = false
      const { error: ddError } = await supabase
        .from('event_attendees')
        .update({ is_dd: false })
        .eq('event_id', eventId)
        .eq('profile_id', profileId);

      if (ddError) throw ddError;

      // Update any pending requests to 'revoked'
      await supabase
        .from('event_dd_requests')
        .update({ 
          status: 'revoked',
          responded_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('requested_profile_id', profileId)
        .in('status', ['pending', 'accepted']);

      // Send system message
      const chatId = await getEventChatId(eventId);
      if (chatId) {
        await sendDDRevokedMessage(chatId, userName);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dd-requests', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-dds', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
}

// Check if current user is DD for an event
export function useIsDD(eventId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['is-dd', eventId, profile?.id],
    queryFn: async () => {
      if (!eventId || !profile?.id) return false;

      const { data, error } = await supabase
        .from('event_attendees')
        .select('is_dd')
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data?.is_dd ?? false;
    },
    enabled: !!eventId && !!profile?.id,
  });
}
