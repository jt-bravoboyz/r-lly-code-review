import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SongRec = {
  id: string;
  event_id: string;
  profile_id: string;
  song_name: string;
  artist: string;
  created_at: string;
  profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

export function useSongRecs(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['song-recs', eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<SongRec[]> => {
      if (!eventId) return [];
      const { data: rows, error } = await supabase
        .from('song_recs' as any)
        .select('id, event_id, profile_id, song_name, artist, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = (rows || []) as any[];
      const profileIds = Array.from(new Set(list.map((r) => r.profile_id).filter(Boolean)));
      let profilesMap = new Map<string, any>();
      if (profileIds.length) {
        const { data: profiles } = await supabase
          .from('safe_profiles')
          .select('id, display_name, avatar_url')
          .in('id', profileIds);
        profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }
      return list.map((r) => ({ ...r, profile: profilesMap.get(r.profile_id) || null }));
    },
  });

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`song-recs:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_recs', filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey: ['song-recs', eventId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return query;
}

export function useAddSongRec(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, songName, artist }: { profileId: string; songName: string; artist: string }) => {
      const { error } = await supabase
        .from('song_recs' as any)
        .insert({ event_id: eventId, profile_id: profileId, song_name: songName, artist });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-recs', eventId] });
    },
  });
}

export function useDeleteSongRec(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('song_recs' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-recs', eventId] });
    },
  });
}
