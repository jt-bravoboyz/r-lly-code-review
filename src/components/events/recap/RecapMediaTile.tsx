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
  /** Kept for API compatibility — no longer forces aspect-square. */
  square?: boolean;
}

/**
 * Photo/video-aware media tile. Images render uncropped via `object-contain`
 * on a matte backdrop so the true composition is preserved. Videos show their
 * stored thumbnail when available, otherwise a branded placeholder.
 */
export const RecapMediaTile = forwardRef<HTMLDivElement, RecapMediaTileProps>(
  ({ media, className }, ref) => {
    const isVideo = media.type === 'video';

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-xl bg-black/20 backdrop-blur-sm',
          className,
        )}
      >
        {isVideo ? (
          media.thumbnail_url ? (
            <img
              src={getOptimizedImageUrl(media.thumbnail_url, { width: 600 })}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full min-h-[120px] bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
              <FileVideo className="h-7 w-7 text-muted-foreground/60" />
            </div>
          )
        ) : (
          <img
            src={getOptimizedImageUrl(media.url, { width: 600 })}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
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
