import { useRef } from 'react';
import { ImagePlus, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export interface StagedFile {
  file: File;
  preview: string;
  type: 'photo' | 'video';
}

interface StagedMediaPickerProps {
  stagedFiles: StagedFile[];
  onChange: (files: StagedFile[]) => void;
}

export function StagedMediaPicker({ stagedFiles, onChange }: StagedMediaPickerProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const photos = stagedFiles.filter(f => f.type === 'photo');
  const video = stagedFiles.find(f => f.type === 'video');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const remaining = MAX_PHOTOS - photos.length;

    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more photo${remaining !== 1 ? 's' : ''}`);
      return;
    }

    const valid: StagedFile[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`${file.name}: too large (max 10MB)`);
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file), type: 'photo' });
    }

    onChange([...stagedFiles, ...valid]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Unsupported video format (use mp4, mov, or webm)');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('Video too large (max 50MB)');
      return;
    }

    // Replace existing video
    const without = stagedFiles.filter(f => f.type !== 'video');
    onChange([...without, { file, preview: URL.createObjectURL(file), type: 'video' }]);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = stagedFiles.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Media (optional)</p>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p, i) => {
            const globalIdx = stagedFiles.indexOf(p);
            return (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(globalIdx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {video && (
        <div className="relative rounded-md overflow-hidden bg-muted">
          <video src={video.preview} className="w-full max-h-40 object-cover" />
          <button
            type="button"
            onClick={() => handleRemove(stagedFiles.indexOf(video))}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {photos.length < MAX_PHOTOS && (
          <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4 mr-1" /> Photos
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}>
          <Video className="h-4 w-4 mr-1" /> {video ? 'Replace Video' : 'Video'}
        </Button>
      </div>

      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={handlePhotoSelect} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoSelect} />
    </div>
  );
}
