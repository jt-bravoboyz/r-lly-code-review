import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicName } from '@/lib/identity';
import { supabase } from '@/integrations/supabase/client';
import { useRogueAlerts } from '@/hooks/useRogueAlerts';
import { useGalleryPhotos } from '@/hooks/useRallyMedia';

interface Award {
  key: string;
  emoji: string;
  title: string;
  winnerName: string;
  winnerAvatar: string | null;
}

export function useRecapData(eventId: string | undefined) {
  const { alerts, reactions } = useRogueAlerts(eventId);
  const { data: galleryPhotos = [], isLoading: photosLoading } = useGalleryPhotos(eventId);
  const queryClient = useQueryClient();

  // Recap auto-refresh: keep the gallery in sync when late-night drops land
  // (24h after-party uploads). Independent of the photo feed being mounted.
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`recap-media-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rally_media',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['rally-media', eventId] });
        queryClient.invalidateQueries({ queryKey: ['rally-media-gallery', eventId] });
        queryClient.invalidateQueries({ queryKey: ['rally-media-featured', eventId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  // Compute rogue timeline with reaction counts
  const rogueTimeline = alerts.map(alert => {
    const alertReactions = reactions.filter(r => r.rogue_alert_id === alert.id);
    const reactionCounts: Record<string, number> = {};
    alertReactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
    return {
      id: alert.id,
      displayName: getPublicName(alert.profile),
      avatarUrl: alert.profile?.avatar_url || null,
      finalWords: alert.final_words,
      createdAt: alert.created_at,
      reactionCounts,
    };
  });

  // Awards: The Guardian (DD with most accepted riders)
  const { data: guardianData } = useQuery({
    queryKey: ['recap-guardian', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      // Get DDs for this event
      const { data: dds } = await supabase
        .from('event_attendees')
        .select('profile_id')
        .eq('event_id', eventId)
        .eq('is_dd', true);
      if (!dds?.length) return null;

      // Get rides for this event and count accepted passengers
      const { data: rides } = await supabase
        .from('rides')
        .select('id, driver_id')
        .eq('event_id', eventId);
      if (!rides?.length) return null;

      const ddProfileIds = dds.map(d => d.profile_id);
      const ddRides = rides.filter(r => ddProfileIds.includes(r.driver_id));
      if (!ddRides.length) return null;

      const rideIds = ddRides.map(r => r.id);
      const { data: passengers } = await supabase
        .from('ride_passengers')
        .select('ride_id')
        .in('ride_id', rideIds)
        .eq('status', 'accepted');

      if (!passengers?.length) return null;

      // Count per driver
      const countByDriver: Record<string, number> = {};
      for (const p of passengers) {
        const ride = ddRides.find(r => r.id === p.ride_id);
        if (ride) {
          countByDriver[ride.driver_id] = (countByDriver[ride.driver_id] || 0) + 1;
        }
      }

      const topDriverId = Object.entries(countByDriver).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topDriverId) return null;

      const { data: profile } = await supabase
        .from('safe_profiles')
        .select('display_name, avatar_url')
        .eq('id', topDriverId)
        .single();

      return { name: getPublicName(profile), avatar: profile?.avatar_url || null };
    },
    enabled: !!eventId,
  });

  // Awards: The Paparazzi (most gallery uploads)
  const { data: paparazziData } = useQuery({
    queryKey: ['recap-paparazzi', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await supabase
        .from('rally_media')
        .select('created_by')
        .eq('event_id', eventId)
        .eq('is_featured', false);
      if (!data?.length) return null;

      const countByUser: Record<string, number> = {};
      data.forEach(m => { countByUser[m.created_by] = (countByUser[m.created_by] || 0) + 1; });
      const topUserId = Object.entries(countByUser).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topUserId) return null;

      const { data: profile } = await supabase
        .from('safe_profiles')
        .select('display_name, avatar_url')
        .eq('id', topUserId)
        .single();

      return { name: getPublicName(profile), avatar: profile?.avatar_url || null };
    },
    enabled: !!eventId,
  });

  // Build awards array
  const awards: Award[] = [];

  if (guardianData) {
    awards.push({
      key: 'guardian',
      emoji: '🛡️',
      title: 'The Guardian',
      winnerName: guardianData.name,
      winnerAvatar: guardianData.avatar,
    });
  }

  // The Ghost: first rogue alert
  if (rogueTimeline.length > 0) {
    const ghost = [...rogueTimeline].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    awards.push({
      key: 'ghost',
      emoji: '🔥',
      title: 'The Ghost',
      winnerName: ghost.displayName,
      winnerAvatar: ghost.avatarUrl,
    });
  }

  if (paparazziData) {
    awards.push({
      key: 'paparazzi',
      emoji: '📸',
      title: 'The Paparazzi',
      winnerName: paparazziData.name,
      winnerAvatar: paparazziData.avatar,
    });
  }

  // Stats
  const totalReactions = reactions.length;
  const photoCount = galleryPhotos.filter(m => m.type === 'photo').length;
  const videoCount = galleryPhotos.filter(m => m.type === 'video').length;
  const stats = {
    photoCount,
    videoCount,
    rogueCount: rogueTimeline.length,
    reactionCount: totalReactions,
  };

  // Earliest video becomes the hero clip in the recap tour
  const heroVideo = [...galleryPhotos]
    .filter(m => m.type === 'video')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] || null;

  return {
    rogueTimeline,
    galleryPhotos,
    heroVideo,
    awards,
    stats,
    isLoading: photosLoading,
  };
}
