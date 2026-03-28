import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ImagePlus, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRallyMedia, useUploadRallyMedia, useDeleteRallyMedia, type RallyMedia } from '@/hooks/useRallyMedia';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

interface EventPhotoFeedProps {
  eventId: string;
  isHost: boolean;
}

export function EventPhotoFeed({ eventId, isHost }: EventPhotoFeedProps) {
  const { profile } = useAuth();
  const { data: media, isLoading } = useRallyMedia(eventId);
  const uploadMedia = useUploadRallyMedia();
  const deleteMedia = useDeleteRallyMedia();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null }>>({});

  const photos = media?.filter(m => m.type === 'photo') || [];

  // Fetch uploader profiles
  useEffect(() => {
    if (!photos.length) return;
    const uniqueIds = [...new Set(photos.map(p => p.created_by))];
    const missing = uniqueIds.filter(id => !profiles[id]);
    if (!missing.length) return;

    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', missing)
      .then(({ data }) => {
        if (data) {
          setProfiles(prev => {
            const next = { ...prev };
            data.forEach((p: any) => { next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
            return next;
          });
        }
      });
  }, [photos.length]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`photo-feed-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rally_media',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['rally-media', eventId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setUploading(true);

    let successCount = 0;
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`${file.name}: too large (max 10MB)`);
        continue;
      }
      try {
        await uploadMedia.mutateAsync({
          eventId,
          profileId: profile.id,
          file,
          type: 'photo',
          orderIndex: photos.length + successCount,
        });
        successCount++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} added 📸`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId, eventId });
      toast.success('Photo removed');
      if (viewerIndex !== null) setViewerIndex(null);
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const canDelete = (photo: RallyMedia) => {
    return photo.created_by === profile?.id || isHost;
  };

  // Touch swipe for fullscreen viewer
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60 && viewerIndex !== null) {
      if (diff > 0 && viewerIndex < photos.length - 1) setViewerIndex(viewerIndex + 1);
      if (diff < 0 && viewerIndex > 0) setViewerIndex(viewerIndex - 1);
    }
  };

  // Empty state
  if (!isLoading && photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
          <Camera className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-muted-foreground font-medium">No moments captured yet</p>
          <p className="text-sm text-muted-foreground/70">Be the first to add one</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Add Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{photos.length} moment{photos.length !== 1 ? 's' : ''}</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Add'}
        </Button>
      </div>

      {/* Photo Grid — mixed sizing for premium feel */}
      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
        {photos.map((photo, idx) => {
          const uploaderProfile = profiles[photo.created_by];
          return (
            <div
              key={photo.id}
              className="relative aspect-square cursor-pointer overflow-hidden group"
              onClick={() => setViewerIndex(idx)}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
                loading="lazy"
              />
              {/* Subtle overlay with uploader info */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={uploaderProfile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[6px]">
                      {uploaderProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] text-white/90 truncate">
                    {uploaderProfile?.display_name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Fullscreen Viewer Portal */}
      {viewerIndex !== null && photos[viewerIndex] && createPortal(
        <div
          className="fixed inset-0 bg-black/95 z-[99999] flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 relative z-10">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profiles[photos[viewerIndex].created_by]?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-white/20 text-white">
                  {profiles[photos[viewerIndex].created_by]?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white text-xs font-medium">
                  {profiles[photos[viewerIndex].created_by]?.display_name || 'Unknown'}
                </p>
                <p className="text-white/50 text-[10px]">
                  {format(new Date(photos[viewerIndex].created_at), 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canDelete(photos[viewerIndex]) && (
                <button
                  onClick={() => handleDelete(photos[viewerIndex].id)}
                  className="p-2 rounded-full bg-white/10 hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              )}
              <button
                onClick={() => setViewerIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
            <img
              src={photos[viewerIndex].url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-8 pt-4">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setViewerIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === viewerIndex ? 'bg-white w-3' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
