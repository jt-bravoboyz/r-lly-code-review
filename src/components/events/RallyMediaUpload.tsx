import { useState, useRef } from 'react';
import { ImagePlus, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadRallyMedia, useRallyMedia, useDeleteRallyMedia } from '@/hooks/useRallyMedia';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

interface RallyMediaUploadProps {
  eventId: string;
}

export function RallyMediaUpload({ eventId }: RallyMediaUploadProps) {
  const { profile } = useAuth();
  const { data: existingMedia } = useRallyMedia(eventId);
  const uploadMedia = useUploadRallyMedia();
  const deleteMedia = useDeleteRallyMedia();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photos = existingMedia?.filter(m => m.type === 'photo') || [];
  const video = existingMedia?.find(m => m.type === 'video');

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.length) return;
    const files = Array.from(e.target.files);

    const remaining = MAX_PHOTOS - photos.length;
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more photo${remaining !== 1 ? 's' : ''}`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`${file.name}: too large (max 10MB)`);
        continue;
      }
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadMedia.mutateAsync({
          eventId,
          profileId: profile.id,
          file: files[i],
          type: 'photo',
          orderIndex: photos.length + i,
        });
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.length) return;
    const file = e.target.files[0];

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Unsupported video format (use mp4, mov, or webm)');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('Video too large (max 50MB)');
      return;
    }

    setUploading(true);
    try {
      // Remove existing video first
      if (video) {
        await deleteMedia.mutateAsync({ mediaId: video.id, eventId });
      }
      await uploadMedia.mutateAsync({
        eventId,
        profileId: profile.id,
        file,
        type: 'video',
        orderIndex: 0,
      });
      toast.success('Video uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemove = async (mediaId: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId, eventId });
    } catch (err: any) {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Add Media (optional)</p>

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Video preview */}
      {video && (
        <div className="relative rounded-md overflow-hidden bg-muted">
          <video src={video.url} className="w-full max-h-40 object-cover" />
          <button
            type="button"
            onClick={() => handleRemove(video.id)}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Video className="h-8 w-8 text-white/80" />
          </div>
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        {photos.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
            Photos
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
          {video ? 'Replace Video' : 'Video'}
        </Button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={handlePhotoSelect}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleVideoSelect}
      />
    </div>
  );
}
