import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractVideoThumbnail } from '@/lib/videoThumbnail';

export interface RallyMedia {
  id: string;
  event_id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_by: string;
  created_at: string;
  is_featured: boolean;
  processing?: boolean;
}

/** All media for an event */
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

/** Only featured (hero carousel) media */
export function useFeaturedMedia(eventId: string | undefined) {
  return useQuery({
    queryKey: ['rally-media-featured', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('rally_media' as any)
        .select('*')
        .eq('event_id', eventId)
        .eq('is_featured', true)
        .order('type', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RallyMedia[];
    },
    enabled: !!eventId,
  });
}

/** Gallery (non-featured) media — photos AND videos */
export function useGalleryPhotos(eventId: string | undefined) {
  return useQuery({
    queryKey: ['rally-media-gallery', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('rally_media' as any)
        .select('*')
        .eq('event_id', eventId)
        .eq('is_featured', false)
        .order('created_at', { ascending: false });
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
      isFeatured = false,
      onUploadProgress,
    }: {
      eventId: string;
      profileId: string;
      file: File;
      type: 'photo' | 'video';
      orderIndex: number;
      isFeatured?: boolean;
      onUploadProgress?: (progress: { loaded: number; total: number }) => void;
    }) => {
      const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const baseId = crypto.randomUUID();
      const filePath = `${eventId}/${baseId}.${ext}`;

      // For videos, extract a thumbnail BEFORE uploading the heavy file so the
      // user's tap-to-pick gesture is still active (helps iOS Safari decode).
      let thumbnailUrl: string | null = null;
      if (type === 'video') {
        try {
          const thumbBlob = await extractVideoThumbnail(file);
          if (thumbBlob) {
            const thumbPath = `${eventId}/${baseId}_thumb.jpg`;
            const { error: thumbErr } = await supabase.storage
              .from('rally-media')
              .upload(thumbPath, thumbBlob, { upsert: false, contentType: 'image/jpeg' });
            if (!thumbErr) {
              thumbnailUrl = supabase.storage.from('rally-media').getPublicUrl(thumbPath).data.publicUrl;
            }
          }
        } catch (err) {
          console.warn('[rally-media] thumbnail extraction failed', err);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('rally-media')
        .upload(filePath, file, { upsert: false, ...(onUploadProgress ? { onUploadProgress } : {}) });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('rally-media')
        .getPublicUrl(filePath);

      // iPhone .mov files don't play on Android. Mark them for server-side
      // remux to .mp4 (no re-encode, fast & lossless).
      const lowerExt = ext.toLowerCase();
      const needsTranscode =
        type === 'video' &&
        (lowerExt === 'mov' || file.type === 'video/quicktime');

      const { data, error } = await supabase
        .from('rally_media' as any)
        .insert({
          event_id: eventId,
          type,
          url: urlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          order_index: orderIndex,
          created_by: profileId,
          is_featured: isFeatured,
          processing: needsTranscode,
        })
        .select()
        .single();

      if (error) throw error;

      // Fire-and-forget: kick off remux. UI will refresh via realtime when done.
      if (needsTranscode && data) {
        const mediaId = (data as any).id;
        supabase.functions
          .invoke('transcode-video', { body: { media_id: mediaId } })
          .catch((err) => {
            // Non-fatal — the row will stay in processing=true; we surface an error eventually
            console.warn('[transcode-video] invoke failed', err);
          });
      }

      return data as unknown as RallyMedia;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rally-media', vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ['rally-media-featured', vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ['rally-media-gallery', vars.eventId] });
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
      queryClient.invalidateQueries({ queryKey: ['rally-media-featured', vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ['rally-media-gallery', vars.eventId] });
    },
  });
}
