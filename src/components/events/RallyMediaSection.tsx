import { Camera, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRallyMedia, useDeleteRallyMedia } from '@/hooks/useRallyMedia';
import { RallyMediaUpload } from './RallyMediaUpload';

interface RallyMediaSectionProps {
  eventId: string;
  canManage: boolean;
}

export function RallyMediaSection({ eventId, canManage }: RallyMediaSectionProps) {
  const { data: media, isLoading } = useRallyMedia(eventId);
  const deleteMedia = useDeleteRallyMedia();

  const photos = media?.filter(m => m.type === 'photo') || [];
  const video = media?.find(m => m.type === 'video');
  const hasMedia = photos.length > 0 || !!video;

  // Only show this section for managers (upload controls)
  // The gallery display is handled by RallyHeroMediaCarousel
  if (!canManage) return null;
  if (isLoading) return null;

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId: id, eventId });
    } catch {}
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Manage Media
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload controls for managers */}
        <RallyMediaUpload eventId={eventId} />

        {/* Existing media list with delete option */}
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square rounded-md overflow-hidden bg-muted group"
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {video && (
          <div className="relative rounded-md overflow-hidden bg-muted group">
            <video src={video.url} className="w-full max-h-24 object-cover" preload="metadata" />
            <button
              onClick={() => handleDelete(video.id)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {!hasMedia && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Add photos or a video to your rally
          </p>
        )}
      </CardContent>
    </Card>
  );
}
