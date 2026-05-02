import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractVideoThumbnail } from '@/lib/videoThumbnail';

interface BackfillMedia {
  id: string;
  url: string;
  type?: 'photo' | 'video' | string | null;
  thumbnail_url?: string | null;
}

/**
 * Opportunistically generates and persists thumbnails for any shared video
 * that's missing one. Throttled to 3 per render pass. Uses the SECURITY
 * DEFINER `set_rally_media_thumbnail` RPC so any event member can patch
 * legacy uploads — not just the original uploader.
 *
 * Runs on both the live Photo Feed and the Recap screen so blank tiles
 * heal themselves the first time anyone opens the event on any device.
 */
export function useVideoThumbnailBackfill(
  eventId: string | undefined,
  media: BackfillMedia[] | undefined,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !eventId || !media?.length) return;

    const targets = media
      .filter(
        (p) =>
          p.type === 'video' &&
          !p.thumbnail_url &&
          !attemptedRef.current.has(p.id),
      )
      .slice(0, 3);

    if (!targets.length) return;

    let cancelled = false;
    (async () => {
      for (const item of targets) {
        if (cancelled) return;
        attemptedRef.current.add(item.id);
        try {
          const res = await fetch(item.url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const thumb = await extractVideoThumbnail(blob);
          if (!thumb || cancelled) continue;
          const thumbPath = `${eventId}/${item.id}_thumb.jpg`;
          const { error: upErr } = await supabase.storage
            .from('rally-media')
            .upload(thumbPath, thumb, { upsert: true, contentType: 'image/jpeg' });
          if (upErr) continue;
          const publicUrl = supabase.storage
            .from('rally-media')
            .getPublicUrl(thumbPath).data.publicUrl;
          const { error: rpcErr } = await supabase.rpc(
            'set_rally_media_thumbnail' as any,
            { p_media_id: item.id, p_thumbnail_url: publicUrl },
          );
          if (rpcErr) {
            console.warn('[rally-media] thumbnail RPC failed', item.id, rpcErr);
            continue;
          }
          queryClient.invalidateQueries({ queryKey: ['rally-media-gallery', eventId] });
        } catch (err) {
          console.warn('[rally-media] backfill failed', item.id, err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [media, eventId, enabled, queryClient]);
}
