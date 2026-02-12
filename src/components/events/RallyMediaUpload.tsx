import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Video, X, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadRallyMedia, useRallyMedia, useDeleteRallyMedia } from '@/hooks/useRallyMedia';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
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
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [failedFiles, setFailedFiles] = useState<{ file: File; type: 'photo' | 'video'; orderIndex: number }[]>([]);

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
    const failed: typeof failedFiles = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadStatus(`Uploading photo ${i + 1} of ${files.length}…`);
        setUploadPercent(0);
        try {
          await uploadMedia.mutateAsync({
            eventId,
            profileId: profile.id,
            file: files[i],
            type: 'photo',
            orderIndex: photos.length + i,
            onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
          });
        } catch { failed.push({ file: files[i], type: 'photo', orderIndex: photos.length + i }); }
      }
      if (failed.length === 0) toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
      else toast.error(`${failed.length} photo(s) failed to upload`);
    } finally {
      setUploading(false);
      setUploadStatus('');
      setUploadPercent(0);
      setFailedFiles(prev => [...prev, ...failed]);
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
      toast.error('Video too large (max 500MB)');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading video…');
    setUploadPercent(0);
    try {
      if (video) {
        await deleteMedia.mutateAsync({ mediaId: video.id, eventId });
      }
      await uploadMedia.mutateAsync({
        eventId,
        profileId: profile.id,
        file,
        type: 'video',
        orderIndex: 0,
        onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
      });
      toast.success('Video uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setFailedFiles(prev => [...prev, { file, type: 'video', orderIndex: 0 }]);
    } finally {
      setUploading(false);
      setUploadStatus('');
      setUploadPercent(0);
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

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{uploadStatus}</p>
          <Progress value={uploadPercent} className="h-2" />
        </div>
      )}

      {/* Retry failed uploads */}
      {failedFiles.length > 0 && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!profile) return;
            setUploading(true);
            const stillFailed: typeof failedFiles = [];
            for (let i = 0; i < failedFiles.length; i++) {
              const f = failedFiles[i];
              setUploadStatus(`Retrying ${f.type} ${i + 1} of ${failedFiles.length}…`);
              setUploadPercent(0);
              try {
                await uploadMedia.mutateAsync({
                  eventId,
                  profileId: profile.id,
                  file: f.file,
                  type: f.type,
                  orderIndex: f.orderIndex,
                  onUploadProgress: (p) => setUploadPercent(Math.round((p.loaded / p.total) * 100)),
                });
              } catch { stillFailed.push(f); }
            }
            setUploading(false);
            setUploadStatus('');
            setUploadPercent(0);
            setFailedFiles(stillFailed);
            if (stillFailed.length > 0) toast.error(`${stillFailed.length} file(s) still failed`);
            else toast.success('All files uploaded!');
          }}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Retry {failedFiles.length} failed
        </Button>
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
