import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RecapMediaItem {
  id: string;
  url: string;
  type?: 'photo' | 'video';
  thumbnail_url?: string | null;
}

interface RecapMediaTileProps {
  media: RecapMediaItem;
  className?: string;
  /** Render as an aspect-square grid cell (default). When false, uses natural ratio. */
  square?: boolean;
}

/**
 * Photo/video-aware media tile. Videos display their thumbnail (or first frame
 * via the <video> poster) with a play badge; photos render as plain <img>.
 */
export function RecapMediaTile({ media, className, square = true }: RecapMediaTileProps) {
  const isVideo = media.type === 'video';

  return (
    <div className={cn('relative overflow-hidden bg-muted', square && 'aspect-square', className)}>
      {isVideo ? (
        media.thumbnail_url ? (
          <img
            src={media.thumbnail_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={media.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <img
          src={media.url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      )}

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
