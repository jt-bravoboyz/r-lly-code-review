import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

export function useNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['notifications', profile.id], (old: Notification[] | undefined) => {
            if (!old) return [payload.new as Notification];
            return [payload.new as Notification, ...old];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    },
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.read).length || 0;
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      profile_id: string;
      type: string;
      title: string;
      body?: string;
      data?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          profile_id: notification.profile_id,
          type: notification.type,
          title: notification.title,
          body: notification.body || null,
          data: notification.data as any || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}