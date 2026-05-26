import { forwardRef } from 'react';
import { FileVideo, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

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
 * Photo/video-aware media tile. Videos display their stored thumbnail when
 * available; otherwise they fall back to a branded placeholder (NEVER a
 * `<video>` element — mobile Safari/Chrome refuses to render a poster
 * frame from `preload="metadata"`, leaving a blank rectangle).
 *
 * The opportunistic backfill in `useVideoThumbnailBackfill` will fill the
 * thumbnail in over time, swapping the placeholder for a real frame.
 */
export const RecapMediaTile = forwardRef<HTMLDivElement, RecapMediaTileProps>(
  ({ media, className, square = true }, ref) => {
    const isVideo = media.type === 'video';

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-muted',
          square && 'aspect-square',
          className,
        )}
      >
        {isVideo ? (
          media.thumbnail_url ? (
            <img
              src={media.thumbnail_url}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
              <FileVideo className="h-7 w-7 text-muted-foreground/60" />
            </div>
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
  },
);

RecapMediaTile.displayName = 'RecapMediaTile';
