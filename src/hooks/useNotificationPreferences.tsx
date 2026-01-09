import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationPreferences {
  id: string;
  profile_id: string;
  bar_hop_transitions: boolean;
  ride_offers: boolean;
  ride_requests: boolean;
  arrival_confirmations: boolean;
  event_updates: boolean;
  squad_invites: boolean;
  going_home_alerts: boolean;
}

export function useNotificationPreferences() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      // Try to get existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ profile_id: profile.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!profile?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'id' | 'profile_id'>>) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('profile_id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}
