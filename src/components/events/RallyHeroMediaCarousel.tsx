import { useState, useMemo, useEffect, useCallback } from 'react';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRallyMedia } from '@/hooks/useRallyMedia';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';

interface RallyHeroMediaCarouselProps {
  eventId: string;
}

export function RallyHeroMediaCarousel({ eventId }: RallyHeroMediaCarouselProps) {
  const { data: media, isLoading } = useRallyMedia(eventId);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'photo' | 'video'>('photo');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // Sort: videos first, then photos by order_index
  const sorted = useMemo(() => {
    if (!media || media.length === 0) return [];
    const videos = media.filter(m => m.type === 'video').sort((a, b) => a.order_index - b.order_index);
    const photos = media.filter(m => m.type === 'photo').sort((a, b) => a.order_index - b.order_index);
    return [...videos, ...photos];
  }, [media]);

  // Track current slide
  const onSelect = useCallback(() => {
    if (api) setCurrentIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api, onSelect]);

  if (isLoading || sorted.length === 0) return null;

  const openViewer = (url: string, type: 'photo' | 'video') => {
    setViewerUrl(url);
    setViewerType(type);
  };

  return (
    <>
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <Carousel
          opts={{ loop: sorted.length > 1, align: 'start' }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {sorted.map((item) => (
              <CarouselItem
                key={item.id}
                className="pl-0 basis-full cursor-pointer"
                onClick={() => openViewer(item.url, item.type as 'photo' | 'video')}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
                  {item.type === 'video' ? (
                    <>
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-7 w-7 text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Pagination dots */}
        {sorted.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            {sorted.map((_, i) => (
              <button
                key={i}
                className={`rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-2.5 h-2.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  api?.scrollTo(i);
                }}
              />
            ))}
          </div>
        )}

        {/* Index indicator */}
        {sorted.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-medium rounded-full px-2.5 py-1">
            {currentIndex + 1}/{sorted.length}
          </div>
        )}
      </div>

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
