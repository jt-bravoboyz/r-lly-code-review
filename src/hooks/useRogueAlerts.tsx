import { useState, useEffect, useCallback, useRef } from 'react';
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

const SEEN_KEY = (eventId: string) => `rogue_seen_${eventId}`;
// Show overlay for any rogue alert created within this window that the user
// hasn't dismissed yet. Anything older lives in the timeline only.
const FRESH_WINDOW_MS = 30 * 60 * 1000;

function loadSeenIds(eventId: string): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(eventId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeenIds(eventId: string, ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY(eventId), JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}

export function useRogueAlerts(eventId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [pendingAlerts, setPendingAlerts] = useState<RogueAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // Init seen set whenever event changes
  useEffect(() => {
    if (!eventId) return;
    seenIdsRef.current = loadSeenIds(eventId);
    hydratedRef.current = false;
  }, [eventId]);

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

  // Hydrate the pending queue once after the initial alerts load —
  // surface any unseen rogue alerts from the last 30 minutes.
  useEffect(() => {
    if (!eventId || !profile?.id || hydratedRef.current) return;
    if (!alerts.length) {
      hydratedRef.current = true;
      return;
    }
    const cutoff = Date.now() - FRESH_WINDOW_MS;
    const fresh = alerts
      .filter(a =>
        a.profile_id !== profile.id &&
        !seenIdsRef.current.has(a.id) &&
        new Date(a.created_at).getTime() >= cutoff
      )
      // Show oldest first so the queue chronicles the night in order
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (fresh.length) {
      setPendingAlerts(prev => {
        const known = new Set(prev.map(p => p.id));
        return [...prev, ...fresh.filter(f => !known.has(f.id))];
      });
    }
    hydratedRef.current = true;
  }, [alerts, eventId, profile?.id]);

  // Force-show a specific alert (e.g. from a notification deep-link)
  const showAlertById = useCallback(async (alertId: string) => {
    if (!eventId || !profile?.id) return;
    // Already in queue?
    let exists = pendingAlerts.some(a => a.id === alertId);
    if (exists) return;

    // Look in cached alerts first
    let target = alerts.find(a => a.id === alertId) || null;
    if (!target) {
      const { data } = await supabase
        .from('rogue_alerts' as any)
        .select('*, profile:profiles!rogue_alerts_profile_id_fkey(display_name, avatar_url)')
        .eq('id', alertId)
        .maybeSingle();
      target = (data as unknown as RogueAlert) || null;
    }
    if (!target || target.profile_id === profile.id) return;
    // Bypass seen — explicit deep link
    setPendingAlerts(prev => (prev.some(p => p.id === target!.id) ? prev : [target!, ...prev]));
  }, [alerts, eventId, profile?.id, pendingAlerts]);

  // Realtime: route new inserts into the queue
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
        const newAlert = payload.new as any;
        const { data: profileData } = await supabase
          .from('safe_profiles')
          .select('display_name, avatar_url')
          .eq('id', newAlert.profile_id)
          .single();

        const alertWithProfile: RogueAlert = {
          ...newAlert,
          profile: profileData || { display_name: null, avatar_url: null },
        };

        if (newAlert.profile_id !== profile?.id && !seenIdsRef.current.has(newAlert.id)) {
          setPendingAlerts(prev =>
            prev.some(p => p.id === alertWithProfile.id) ? prev : [...prev, alertWithProfile]
          );
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

      const newAlertId = (data as any)?.id as string | undefined;

      // Send push notification to event attendees — include the rogue_alert_id
      // so deep-links can pop the overlay on the recipient's device.
      try {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            type: 'rogue_alert',
            eventId,
            excludeProfileId: profile.id,
            title: '🔥 GOING ROGUE!',
            body: `${profile.display_name || 'Someone'} has gone rogue!${finalWords ? ` "${finalWords}"` : ''}`,
            data: {
              event_id: eventId,
              rogue_alert_id: newAlertId,
              url: newAlertId
                ? `/events/${eventId}?rogue=${newAlertId}`
                : `/events/${eventId}`,
            },
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

  // Dismiss the head of the queue (and remember it as seen)
  const dismissAlert = useCallback(() => {
    setPendingAlerts(prev => {
      if (!prev.length) return prev;
      const [head, ...rest] = prev;
      if (eventId) {
        seenIdsRef.current.add(head.id);
        persistSeenIds(eventId, seenIdsRef.current);
      }
      return rest;
    });
  }, [eventId]);

  const latestAlert = pendingAlerts[0] || null;

  return {
    alerts,
    reactions,
    latestAlert,
    pendingCount: pendingAlerts.length,
    dismissAlert,
    showAlertById,
    goRogue,
    submitReaction,
    hasGoneRogue,
  };
}
