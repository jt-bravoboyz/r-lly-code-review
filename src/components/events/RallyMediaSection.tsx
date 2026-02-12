import { useState } from 'react';
import { Camera, Play, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRallyMedia, useDeleteRallyMedia } from '@/hooks/useRallyMedia';
import { RallyMediaUpload } from './RallyMediaUpload';

interface RallyMediaSectionProps {
  eventId: string;
  canManage: boolean;
}

export function RallyMediaSection({ eventId, canManage }: RallyMediaSectionProps) {
  const { data: media, isLoading } = useRallyMedia(eventId);
  const deleteMedia = useDeleteRallyMedia();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'photo' | 'video'>('photo');

  const photos = media?.filter(m => m.type === 'photo') || [];
  const video = media?.find(m => m.type === 'video');
  const hasMedia = photos.length > 0 || !!video;

  // Show nothing if no media and not a manager
  if (!hasMedia && !canManage) return null;
  if (isLoading) return null;

  const openViewer = (url: string, type: 'photo' | 'video') => {
    setViewerUrl(url);
    setViewerType(type);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId: id, eventId });
    } catch {}
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer group"
                  onClick={() => openViewer(p.url, 'photo')}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Video card */}
          {video && (
            <div
              className="relative rounded-md overflow-hidden bg-muted cursor-pointer group"
              onClick={() => openViewer(video.url, 'video')}
            >
              <video src={video.url} className="w-full max-h-48 object-cover" preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" fill="white" />
                </div>
              </div>
              {canManage && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Upload controls for managers */}
          {canManage && <RallyMediaUpload eventId={eventId} />}

          {!hasMedia && canManage && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Add photos or a video to your rally
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen viewer */}
      <Dialog open={!!viewerUrl} onOpenChange={() => setViewerUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0">
          <button
            onClick={() => setViewerUrl(null)}
            className="absolute top-3 right-3 z-50 bg-black/60 text-white rounded-full p-2"
          >
            <X className="h-5 w-5" />
          </button>
          {viewerUrl && viewerType === 'photo' && (
            <img src={viewerUrl} alt="" className="w-full h-full object-contain max-h-[90vh]" />
          )}
          {viewerUrl && viewerType === 'video' && (
            <video src={viewerUrl} controls autoPlay className="w-full max-h-[90vh]" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
