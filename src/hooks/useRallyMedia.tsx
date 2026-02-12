import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RallyMedia {
  id: string;
  event_id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_by: string;
  created_at: string;
}

export function useRallyMedia(eventId: string | undefined) {
  return useQuery({
    queryKey: ['rally-media', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('rally_media' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('type', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RallyMedia[];
    },
    enabled: !!eventId,
  });
}

export function useUploadRallyMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      profileId,
      file,
      type,
      orderIndex,
      onUploadProgress,
    }: {
      eventId: string;
      profileId: string;
      file: File;
      type: 'photo' | 'video';
      orderIndex: number;
      onUploadProgress?: (progress: { loaded: number; total: number }) => void;
    }) => {
      const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const filePath = `${eventId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('rally-media')
        .upload(filePath, file, { upsert: false, ...(onUploadProgress ? { onUploadProgress } : {}) });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('rally-media')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('rally_media' as any)
        .insert({
          event_id: eventId,
          type,
          url: urlData.publicUrl,
          order_index: orderIndex,
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RallyMedia;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rally-media', vars.eventId] });
    },
  });
}

export function useDeleteRallyMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, eventId }: { mediaId: string; eventId: string }) => {
      const { error } = await supabase
        .from('rally_media' as any)
        .delete()
        .eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rally-media', vars.eventId] });
    },
  });
}
