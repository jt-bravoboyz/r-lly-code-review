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
  /**
   * When true (default), tile is forced to aspect-square while fitting the
   * full media inside the frame. When false, tile renders at the media's
   * natural aspect ratio (ideal for masonry / columns layouts).
   */
  square?: boolean;
  /**
   * Object-position hook retained for callers that still need crop-aware
   * positioning, but square recap tiles now use object-contain by default.
   */
  focalClass?: string;
}

/**
 * Photo/video-aware media tile.
 *
  * - `square` mode: forces 1:1 while using `object-contain` so portrait
  *   phone photos show fully inside the even Facebook-style grid.
 * - Natural mode: renders at intrinsic aspect ratio for masonry grids.
 *
 * Videos display their stored thumbnail when available; otherwise they fall
 * back to a branded placeholder (NEVER a `<video>` element — mobile
 * Safari/Chrome refuses to render a poster frame from `preload="metadata"`).
 */
export const RecapMediaTile = forwardRef<HTMLDivElement, RecapMediaTileProps>(
  ({ media, className, square = true, focalClass = 'object-[center_25%]' }, ref) => {
    const isVideo = media.type === 'video';
    const imageSrc = isVideo
      ? media.thumbnail_url ? getOptimizedImageUrl(media.thumbnail_url, { width: 600 }) : null
      : getOptimizedImageUrl(media.url, { width: 600 });
    const imgClasses = cn(
      'relative z-10 block w-full',
      square ? 'h-full object-contain' : 'h-auto',
      square && focalClass,
    );

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-muted',
          square && 'aspect-square',
          className,
        )}
      >
        {square && imageSrc && (
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-35"
          />
        )}
        {isVideo ? (
          media.thumbnail_url ? (
            <img
              src={imageSrc || undefined}
              alt=""
              loading="lazy"
              decoding="async"
              className={imgClasses}
            />
          ) : (
            <div
              className={cn(
                'w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center',
                square ? 'h-full' : 'aspect-square',
              )}
            >
              <FileVideo className="h-7 w-7 text-muted-foreground/60" />
            </div>
          )
        ) : (
          <img
            src={getOptimizedImageUrl(media.url, { width: 600 })}
            alt=""
            loading="lazy"
            decoding="async"
            className={imgClasses}
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
