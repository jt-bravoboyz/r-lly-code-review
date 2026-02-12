import { useState, useMemo, useEffect, useCallback } from 'react';
import { Play, X, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useRallyMedia, useDeleteRallyMedia } from '@/hooks/useRallyMedia';
import { RallyMediaUpload } from './RallyMediaUpload';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RallyHeroMediaCarouselProps {
  eventId: string;
  canManage?: boolean;
}

export function RallyHeroMediaCarousel({ eventId, canManage = false }: RallyHeroMediaCarouselProps) {
  const { data: media, isLoading } = useRallyMedia(eventId);
  const deleteMedia = useDeleteRallyMedia();
  const queryClient = useQueryClient();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'photo' | 'video'>('photo');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [editOpen, setEditOpen] = useState(false);

  // Sort: videos first, then photos by order_index
  const sorted = useMemo(() => {
    if (!media || media.length === 0) return [];
    const videos = media.filter(m => m.type === 'video').sort((a, b) => a.order_index - b.order_index);
    const photos = media.filter(m => m.type === 'photo').sort((a, b) => a.order_index - b.order_index);
    return [...videos, ...photos];
  }, [media]);

  const photos = useMemo(() => (media?.filter(m => m.type === 'photo') || []).sort((a, b) => a.order_index - b.order_index), [media]);

  const onSelect = useCallback(() => {
    if (api) setCurrentIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api, onSelect]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId: id, eventId });
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleReorder = async (photoId: string, direction: 'up' | 'down') => {
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= photos.length) return;

    const a = photos[idx];
    const b = photos[swapIdx];

    try {
      await Promise.all([
        supabase.from('rally_media' as any).update({ order_index: b.order_index }).eq('id', a.id),
        supabase.from('rally_media' as any).update({ order_index: a.order_index }).eq('id', b.id),
      ]);
      queryClient.invalidateQueries({ queryKey: ['rally-media', eventId] });
    } catch {
      toast.error('Failed to reorder');
    }
  };

  if (isLoading || sorted.length === 0) {
    // If no media but can manage, show a minimal add button
    if (canManage && !isLoading) {
      return (
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Pencil className="h-4 w-4 mr-2" /> Add Media
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Media</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <RallyMediaUpload eventId={eventId} />
            </div>
          </SheetContent>
        </Sheet>
      );
    }
    return null;
  }

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

        {/* Edit button — host/co-host only */}
        {canManage && (
          <Sheet open={editOpen} onOpenChange={setEditOpen}>
            <SheetTrigger asChild>
              <button
                className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Edit Media</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* Upload controls */}
                <RallyMediaUpload eventId={eventId} />

                {/* Existing media with delete + reorder */}
                {photos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Photos ({photos.length})</p>
                    <div className="space-y-2">
                      {photos.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                          <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">Photo {idx + 1}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => handleReorder(p.id, 'up')}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === photos.length - 1}
                              onClick={() => handleReorder(p.id, 'down')}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video with delete */}
                {media?.find(m => m.type === 'video') && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Video</p>
                    <div className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="h-12 w-16 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                        <video src={media.find(m => m.type === 'video')!.url} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-4 w-4 text-white" fill="white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Rally Video</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => handleDelete(media.find(m => m.type === 'video')!.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Fullscreen viewer */}
      <Dialog open={!!viewerUrl} onOpenChange={() => setViewerUrl(null)}>
        <DialogContent
          hideCloseButton
          className="fixed inset-0 translate-x-0 translate-y-0 left-0 top-0 max-w-none w-full h-full p-0 bg-black border-0 rounded-none flex items-center justify-center"
        >
          <button
            onClick={() => setViewerUrl(null)}
            className="absolute top-4 right-4 z-50 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {viewerUrl && viewerType === 'photo' && (
            <img src={viewerUrl} alt="" className="max-w-full max-h-full object-contain" />
          )}
          {viewerUrl && viewerType === 'video' && (
            <video
              src={viewerUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
