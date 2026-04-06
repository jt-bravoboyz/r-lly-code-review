import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RogueAlert {
  id: string;
  event_id: string;
  profile_id: string;
  final_words: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface RogueReaction {
  id: string;
  rogue_alert_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

export function useRogueAlerts(eventId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [latestAlert, setLatestAlert] = useState<RogueAlert | null>(null);

  // Fetch all rogue alerts for event
  const { data: alerts = [] } = useQuery({
    queryKey: ['rogue-alerts', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('rogue_alerts' as any)
        .select('*, profile:profiles!rogue_alerts_profile_id_fkey(display_name, avatar_url)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RogueAlert[];
    },
    enabled: !!eventId,
  });

  // Fetch reactions for all alerts in event
  const alertIds = alerts.map(a => a.id);
  const { data: reactions = [] } = useQuery({
    queryKey: ['rogue-reactions', eventId, alertIds],
    queryFn: async () => {
      if (!alertIds.length) return [];
      const { data, error } = await supabase
        .from('rogue_reactions' as any)
        .select('*')
        .in('rogue_alert_id', alertIds);
      if (error) throw error;
      return (data || []) as unknown as RogueReaction[];
    },
    enabled: alertIds.length > 0,
  });

  // Realtime subscription for new alerts
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`rogue-alerts-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rogue_alerts',
        filter: `event_id=eq.${eventId}`,
      }, async (payload) => {
        // Fetch the profile info for the new alert
        const newAlert = payload.new as any;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', newAlert.profile_id)
          .single();
        
        const alertWithProfile: RogueAlert = {
          ...newAlert,
          profile: profileData || { display_name: null, avatar_url: null },
        };
        
        // Only show overlay if it's not our own alert
        if (newAlert.profile_id !== profile?.id) {
          setLatestAlert(alertWithProfile);
        }
        queryClient.invalidateQueries({ queryKey: ['rogue-alerts', eventId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rogue_reactions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['rogue-reactions', eventId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, profile?.id, queryClient]);

  // Computed: has the current user already gone rogue for this event?
  const hasGoneRogue = alerts.some(a => a.profile_id === profile?.id);

  // Go rogue mutation
  const goRogue = useMutation({
    mutationFn: async (finalWords?: string) => {
      if (!profile || !eventId) throw new Error('Missing context');
      const { data, error } = await supabase
        .from('rogue_alerts' as any)
        .insert({ event_id: eventId, profile_id: profile.id, final_words: finalWords || null })
        .select('*')
        .single();
      if (error) throw error;

      // Reset safety plan so the user is re-prompted
      await supabase
        .from('event_attendees')
        .update({
          arrival_transport_mode: null,
          not_participating_rally_home_confirmed: false,
          needs_ride: false,
          location_prompt_shown: false,
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      // Send push notification to event attendees
      try {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            type: 'rogue_alert',
            eventId,
            excludeProfileId: profile.id,
            title: '🔥 GOING ROGUE!',
            body: `${profile.display_name || 'Someone'} has gone rogue!${finalWords ? ` "${finalWords}"` : ''}`,
            data: { event_id: eventId, url: `/events/${eventId}` },
          },
        });
      } catch (e) {
        console.error('Failed to send rogue notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rogue-alerts', eventId] });
    },
  });

  // Submit reaction mutation
  const submitReaction = useMutation({
    mutationFn: async ({ alertId, emoji }: { alertId: string; emoji: string }) => {
      if (!profile) throw new Error('Not logged in');
      const { error } = await supabase
        .from('rogue_reactions' as any)
        .upsert(
          { rogue_alert_id: alertId, profile_id: profile.id, emoji },
          { onConflict: 'rogue_alert_id,profile_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rogue-reactions', eventId] });
    },
  });

  const dismissAlert = useCallback(() => setLatestAlert(null), []);

  return {
    alerts,
    reactions,
    latestAlert,
    dismissAlert,
    goRogue,
    submitReaction,
    hasGoneRogue,
  };
}
