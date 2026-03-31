import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SquadMediaItem {
  id: string;
  squad_id: string;
  uploader_id: string;
  url: string;
  created_at: string;
}

export function useSquadMedia(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-media', squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const { data, error } = await supabase
        .from('squad_media')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SquadMediaItem[];
    },
    enabled: !!squadId,
  });
}

export function useAddSquadMedia() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ squadId, file }: { squadId: string; file: Blob }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const fileName = `${squadId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('squad-images')
        .upload(fileName, file, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('squad-images')
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) throw new Error('Could not get public URL');

      const { error: insertError } = await supabase
        .from('squad_media')
        .insert({
          squad_id: squadId,
          uploader_id: profile.id,
          url: publicUrlData.publicUrl,
        });
      if (insertError) throw insertError;

      return publicUrlData.publicUrl;
    },
    onSuccess: (_, { squadId }) => {
      queryClient.invalidateQueries({ queryKey: ['squad-media', squadId] });
    },
  });
}

export function useDeleteSquadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, squadId }: { mediaId: string; squadId: string }) => {
      const { error } = await supabase
        .from('squad_media')
        .delete()
        .eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: (_, { squadId }) => {
      queryClient.invalidateQueries({ queryKey: ['squad-media', squadId] });
    },
  });
}
