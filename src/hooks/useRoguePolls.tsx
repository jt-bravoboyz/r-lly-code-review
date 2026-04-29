import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type RoguePollChoice = 'bar' | 'home' | 'unknown';

interface RoguePoll {
  id: string;
  rogue_alert_id: string;
  profile_id: string;
  choice: RoguePollChoice;
  created_at: string;
}

/** All polls for every rogue alert in the given event. */
export function useRoguePolls(eventId: string | undefined, alertIds: string[]) {
  const queryClient = useQueryClient();

  const { data: polls = [] } = useQuery({
    queryKey: ['rogue-polls', eventId, alertIds],
    queryFn: async () => {
      if (!alertIds.length) return [];
      const { data, error } = await supabase
        .from('rogue_polls' as any)
        .select('*')
        .in('rogue_alert_id', alertIds);
      if (error) throw error;
      return (data || []) as unknown as RoguePoll[];
    },
    enabled: alertIds.length > 0,
  });

  // Realtime sync
  useEffect(() => {
    if (!eventId || !alertIds.length) return;
    const channel = supabase
      .channel(`rogue-polls-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rogue_polls',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['rogue-polls', eventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, alertIds.join(','), queryClient]);

  return polls;
}

export function useSubmitRoguePoll() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, choice }: { alertId: string; choice: RoguePollChoice }) => {
      if (!profile?.id) throw new Error('Not signed in');
      const { error } = await supabase
        .from('rogue_polls' as any)
        .upsert(
          { rogue_alert_id: alertId, profile_id: profile.id, choice },
          { onConflict: 'rogue_alert_id,profile_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rogue-polls'] });
    },
  });
}
