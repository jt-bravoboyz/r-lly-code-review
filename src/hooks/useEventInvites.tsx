import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EventInvite {
  id: string;
  event_id: string;
  invited_profile_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at: string | null;
  event?: {
    id: string;
    title: string;
    start_time: string;
    location_name: string | null;
    is_quick_rally: boolean;
    is_barhop: boolean;
  };
  inviter?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Get pending invites for the current user
export function usePendingInvites() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['event-invites', 'pending', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('event_invites')
        .select(`
          *,
          event:events(id, title, start_time, location_name, is_quick_rally, is_barhop),
          inviter:profiles!event_invites_invited_by_fkey(id, display_name, avatar_url)
        `)
        .eq('invited_profile_id', profile.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as EventInvite[];
    },
    enabled: !!profile?.id,
  });
}

// Get all invites for a specific event
export function useEventInvites(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-invites', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_invites')
        .select(`
          *,
          invited_profile:profiles!event_invites_invited_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

// Create invites for squad members
export function useCreateEventInvites() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      profileIds,
      eventTitle 
    }: { 
      eventId: string; 
      profileIds: string[];
      eventTitle: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Create invite records
      const invites = profileIds.map(profileId => ({
        event_id: eventId,
        invited_profile_id: profileId,
        invited_by: profile.id,
      }));

      const { data, error } = await supabase
        .from('event_invites')
        .insert(invites)
        .select();

      if (error) {
        // Handle duplicate invites gracefully
        if (error.code === '23505') {
          throw new Error('Some members have already been invited');
        }
        throw error;
      }

      // Send push notifications to invited users
      try {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            type: 'rally_invite',
            eventId,
            eventTitle,
            profileIds,
            invitedBy: profile.display_name || 'Someone',
          },
        });
      } catch (notifError) {
        console.error('Failed to send notifications:', notifError);
        // Don't fail the mutation if notifications fail
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-invites', variables.eventId] });
    },
  });
}

// Respond to an invite (accept or decline)
export function useRespondToInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      inviteId, 
      eventId,
      response 
    }: { 
      inviteId: string; 
      eventId: string;
      response: 'accepted' | 'declined';
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Update invite status
      const { error: updateError } = await supabase
        .from('event_invites')
        .update({ 
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // If accepted, also join the event
      if (response === 'accepted') {
        const { error: joinError } = await supabase
          .from('event_attendees')
          .insert({ 
            event_id: eventId, 
            profile_id: profile.id 
          });

        // Ignore duplicate errors (already joined)
        if (joinError && joinError.code !== '23505') {
          throw joinError;
        }

        // Check if this is user's first event (invite conversion)
        try {
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profile.id);

          if (count === 1) {
            // This is their first event - award points to inviter
            const { data: invite } = await supabase
              .from('event_invites')
              .select('invited_by')
              .eq('id', inviteId)
              .single();

            if (invite?.invited_by) {
              await supabase.rpc('rly_award_points_by_profile', {
                p_profile_id: invite.invited_by,
                p_event_type: 'invite_friend',
                p_source_id: profile.id
              });
            }
          }
        } catch (conversionError) {
          console.error('Failed to award invite_friend points:', conversionError);
        }
      }

      return { response };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-invites'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Realtime subscription for new invites
export function useInviteRealtime() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('invite-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_invites',
          filter: `invited_profile_id=eq.${profile.id}`,
        },
        () => {
          // Invalidate pending invites to trigger banner
          queryClient.invalidateQueries({ queryKey: ['event-invites', 'pending'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);
}
