import { useState, useRef, useCallback, useEffect } from 'react';
import { getPublicName } from '@/lib/identity';
import { Camera, ImagePlus, X, Loader2, Trash2, Download, Check, CheckCircle2, Play, FileVideo, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGalleryPhotos, useUploadRallyMedia, useDeleteRallyMedia, type RallyMedia } from '@/hooks/useRallyMedia';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { downloadPhoto, downloadPhotosBatch } from '@/lib/downloadMedia';
import { ensurePhotoPermission } from './PhotoPermissionDialog';
import { useHaptics } from '@/hooks/useHaptics';
import { usePublicProfile } from '@/contexts/PublicProfileContext';
import { useVideoThumbnailBackfill } from '@/hooks/useVideoThumbnailBackfill';
import { Capacitor } from '@capacitor/core';
import { openExternalLink } from '@/lib/nativeLinks';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

const MAX_PHOTOS_PER_EVENT = 500;
const MAX_VIDEOS_PER_EVENT = 5;
const UPLOAD_CONCURRENCY = 4;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;       // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;      // 500MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPT_ATTR = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(',');

interface EventPhotoFeedProps {
  eventId: string;
  isHost: boolean;
  eventStatus?: string | null;
  eventUpdatedAt?: string | null;
}

export function EventPhotoFeed({ eventId, isHost, eventStatus, eventUpdatedAt }: EventPhotoFeedProps) {
  const { profile } = useAuth();
  const { openProfile } = usePublicProfile();
  const { data: galleryMedia, isLoading } = useGalleryPhotos(eventId);
  const uploadMedia = useUploadRallyMedia();
  const deleteMedia = useDeleteRallyMedia();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [failedUploads, setFailedUploads] = useState<{ file: File; type: 'photo' | 'video' }[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [downloadingViewer, setDownloadingViewer] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSaving, setBatchSaving] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null }>>({});
  // Track videos that fail to play in the browser (e.g. legacy .mov on Android)
  const [erroredVideoIds, setErroredVideoIds] = useState<Set<string>>(new Set());
  const { triggerHaptic } = useHaptics();

  // 24h after-party upload window — re-tick every 60s for live countdown
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (eventStatus !== 'completed') return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [eventStatus]);
  const uploadWindow = (() => {
    if (eventStatus !== 'completed') return { canUpload: true, msLeft: null as number | null };
    if (!eventUpdatedAt) return { canUpload: false, msLeft: 0 };
    const endsAt = new Date(eventUpdatedAt).getTime() + 24 * 60 * 60 * 1000;
    const msLeft = endsAt - nowTick;
    return { canUpload: msLeft > 0, msLeft };
  })();
  const formatCountdown = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const photos = galleryMedia || [];

  // Fetch uploader profiles
  useEffect(() => {
    if (!photos.length) return;
    const uniqueIds = [...new Set(photos.map(p => p.created_by))];
    const missing = uniqueIds.filter(id => !profiles[id]);
    if (!missing.length) return;

    supabase
      .from('safe_profiles')
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
        queryClient.invalidateQueries({ queryKey: ['rally-media-gallery', eventId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  // Opportunistic thumbnail backfill — shared with the Recap screen so
  // legacy/mobile-uploaded videos heal the same way everywhere.
  useVideoThumbnailBackfill(eventId, photos);

  // Validate + categorize a batch of files against current caps.
  const prepareBatch = (files: File[]) => {
    const existingPhotos = photos.filter(p => p.type === 'photo').length;
    const existingVideos = photos.filter(p => p.type === 'video').length;
    const accepted: { file: File; type: 'photo' | 'video' }[] = [];
    let photoSlot = existingPhotos;
    let videoSlot = existingVideos;

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        if (!ALLOWED_VIDEO_TYPES.includes(file.type)) { toast.error(`${file.name}: unsupported video format`); continue; }
        if (videoSlot >= MAX_VIDEOS_PER_EVENT) { toast.error(`Max ${MAX_VIDEOS_PER_EVENT} videos per R@lly. Delete one to add more.`); continue; }
        if (file.size > MAX_VIDEO_SIZE) { toast.error(`${file.name}: too large (max 500MB)`); continue; }
        accepted.push({ file, type: 'video' });
        videoSlot++;
      } else {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error(`${file.name}: unsupported format`); continue; }
        if (photoSlot >= MAX_PHOTOS_PER_EVENT) { toast.error(`Max ${MAX_PHOTOS_PER_EVENT} photos per R@lly. Delete one to add more.`); continue; }
        if (file.size > MAX_PHOTO_SIZE) { toast.error(`${file.name}: too large (max 10MB)`); continue; }
        accepted.push({ file, type: 'photo' });
        photoSlot++;
      }
    }
    return accepted;
  };

  // Run uploads in parallel chunks. Returns counts + the list of files that failed.
  const runChunkedUploads = async (
    queue: { file: File; type: 'photo' | 'video' }[],
    baseOrderIndex: number,
  ) => {
    let done = 0;
    let photoSuccess = 0;
    let videoSuccess = 0;
    const failed: { file: File; type: 'photo' | 'video' }[] = [];
    setUploadProgress({ done: 0, total: queue.length });

    for (let i = 0; i < queue.length; i += UPLOAD_CONCURRENCY) {
      const slice = queue.slice(i, i + UPLOAD_CONCURRENCY);
      const results = await Promise.allSettled(
        slice.map((item, j) =>
          uploadMedia.mutateAsync({
            eventId,
            profileId: profile!.id,
            file: item.file,
            type: item.type,
            orderIndex: baseOrderIndex + i + j,
            isFeatured: false,
          })
        )
      );
      results.forEach((r, idx) => {
        const item = slice[idx];
        if (r.status === 'fulfilled') {
          if (item.type === 'video') videoSuccess++; else photoSuccess++;
        } else {
          failed.push(item);
        }
        done++;
      });
      setUploadProgress({ done, total: queue.length });
    }
    if (failed.length > 0) {
      console.warn('[EventPhotoFeed] Failed uploads:', failed.map(f => f.file.name));
    }
    return { photoSuccess, videoSuccess, failed };
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const queue = prepareBatch(files);
    if (queue.length === 0) return;

    setUploading(true);
    try {
      const { photoSuccess, videoSuccess, failed } = await runChunkedUploads(queue, photos.length);
      setFailedUploads(failed);

      const total = photoSuccess + videoSuccess;
      if (photoSuccess > 0 && videoSuccess > 0) {
        toast.success(`${total} added 🎬${failed.length ? ` · ${failed.length} failed` : ''}`);
      } else if (videoSuccess > 0) {
        toast.success(`${videoSuccess} video${videoSuccess > 1 ? 's' : ''} added 🎥${failed.length ? ` · ${failed.length} failed` : ''}`);
      } else if (photoSuccess > 0) {
        toast.success(`${photoSuccess} photo${photoSuccess > 1 ? 's' : ''} added 📸${failed.length ? ` · ${failed.length} failed` : ''}`);
      } else if (failed.length > 0) {
        toast.error(`${failed.length} upload${failed.length > 1 ? 's' : ''} failed`);
      }
    } finally {
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  };

  const handleRetryFailed = async () => {
    if (!profile || failedUploads.length === 0 || retrying) return;
    const queue = failedUploads;
    setRetrying(true);
    setUploading(true);
    try {
      const { photoSuccess, videoSuccess, failed } = await runChunkedUploads(queue, photos.length);
      setFailedUploads(failed);
      const total = photoSuccess + videoSuccess;
      if (failed.length === 0 && total > 0) toast.success(`All ${total} retried ✅`);
      else if (total > 0) toast.warning(`${total} uploaded · ${failed.length} still failed`);
      else toast.error(`Retry failed`);
    } finally {
      setRetrying(false);
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  };


  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia.mutateAsync({ mediaId, eventId });
      toast.success('Removed');
      if (viewerIndex !== null) setViewerIndex(null);
    } catch {
      toast.error('Failed to remove');
    }
  };

  const canDelete = (photo: RallyMedia) => {
    return photo.created_by === profile?.id || isHost;
  };

  // ---- Download handlers ----
  const handleDownloadCurrent = async () => {
    if (viewerIndex === null || downloadingViewer) return;
    const photo = photos[viewerIndex];
    if (!photo) return;
    const isVideoItem = photo.type === 'video';
    setDownloadingViewer(true);
    try {
      const ok = await ensurePhotoPermission();
      if (!ok) { setDownloadingViewer(false); return; }
      await downloadPhoto({ url: photo.url, id: photo.id, eventId });
      triggerHaptic('light');
      toast.success(isVideoItem ? 'Video saved! 🎥' : 'Photo saved! 📸');
    } catch {
      triggerHaptic('error');
      toast.error(isVideoItem ? 'Could not save video' : 'Could not save photo');
    } finally {
      setDownloadingViewer(false);
    }
  };

  // ---- Select Mode ----
  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleBatchSave = async () => {
    if (batchSaving || selectedIds.size === 0) return;
    const items = photos
      .filter(p => selectedIds.has(p.id) && p.type === 'photo')
      .map(p => ({ url: p.url, id: p.id, eventId }));
    if (items.length === 0) return;

    const ok = await ensurePhotoPermission();
    if (!ok) return;

    setBatchSaving(true);
    const toastId = toast.loading(`Saving 0 of ${items.length}…`);
    try {
      const { saved, failed } = await downloadPhotosBatch(items, (done, total) => {
        toast.loading(`Saving ${done} of ${total}…`, { id: toastId });
      });
      if (saved > 0 && failed === 0) {
        triggerHaptic('success');
        toast.success(`${saved} photo${saved > 1 ? 's' : ''} saved! 📸`, { id: toastId });
      } else if (saved > 0 && failed > 0) {
        triggerHaptic('warning');
        toast.warning(`Saved ${saved}, ${failed} failed`, { id: toastId });
      } else {
        triggerHaptic('error');
        toast.error('Could not save photos', { id: toastId });
      }
      exitSelectMode();
    } finally {
      setBatchSaving(false);
    }
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
          Add Photo or Video
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 24h After-Party Upload banner / Bundle locked state */}
      {eventStatus === 'completed' && (
        uploadWindow.canUpload && uploadWindow.msLeft != null ? (
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2.5 text-xs font-montserrat">
            🎬 <span className="font-bold">The night's not over.</span> Drop your shots & clips for the final cut — <span className="font-semibold text-primary">{formatCountdown(uploadWindow.msLeft)} left</span>.
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-xs font-montserrat text-muted-foreground text-center">
            🔒 Bundle locked — the 24h after-party upload window has closed.
          </div>
        )
      )}

      {/* Header — switches to Select toolbar when in select mode */}
      {selectMode ? (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={exitSelectMode} disabled={batchSaving}>
            Cancel
          </Button>
          <p className="text-sm font-medium">
            {selectedIds.size} selected
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleBatchSave}
            disabled={selectedIds.size === 0 || batchSaving}
          >
            {batchSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Save{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{photos.length} moment{photos.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-1.5">
            {photos.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={enterSelectMode}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Select
              </Button>
            )}
            {uploadWindow.canUpload && (
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
            )}
          </div>
        </div>
      )}

      {/* Retry failed uploads */}
      {failedUploads.length > 0 && !uploading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs font-montserrat text-destructive">
            {failedUploads.length} upload{failedUploads.length > 1 ? 's' : ''} failed
          </p>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleRetryFailed}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Photo Grid — mixed sizing for premium feel */}
      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
        {photos.map((photo, idx) => {
          const uploaderProfile = profiles[photo.created_by];
          const isSelected = selectedIds.has(photo.id);
          const isVideo = photo.type === 'video';
          const isProcessing = isVideo && photo.processing === true;
          const isVideoBroken = isVideo && erroredVideoIds.has(photo.id);
          return (
            <div
              key={photo.id}
              className="relative aspect-square cursor-pointer overflow-hidden group bg-muted"
              onClick={() => {
                // Don't open viewer while processing
                if (isProcessing) return;
                // Videos always open the viewer (not selectable for batch save)
                if (selectMode && !isVideo) toggleSelected(photo.id);
                else setViewerIndex(idx);
              }}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {isProcessing ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground p-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[9px] font-medium text-center leading-tight">Processing video…</span>
                </div>
              ) : isVideoBroken ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground p-2">
                  <FileVideo className="h-5 w-5" />
                  <span className="text-[9px] font-medium text-center leading-tight">Tap to open</span>
                </div>
              ) : isVideo ? (
                <>
                  {photo.thumbnail_url ? (
                    <img
                      src={photo.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        selectMode && isSelected ? 'scale-95 brightness-75' : 'group-hover:scale-105 group-active:scale-95'
                      }`}
                    />
                  ) : (
                    // No stored thumbnail yet — paint a branded placeholder
                    // immediately so mobile never sees a blank white tile.
                    // Background backfill effect will swap in a real frame
                    // shortly via realtime.
                    <div
                      className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60 transition-all duration-300 ${
                        selectMode && isSelected ? 'scale-95 brightness-75' : 'group-hover:scale-105 group-active:scale-95'
                      }`}
                    >
                      <FileVideo className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                  )}
                  {/* Play badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={photo.url}
                  alt=""
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    selectMode && isSelected ? 'scale-95 brightness-75' : 'group-hover:scale-105 group-active:scale-95'
                  }`}
                  loading="lazy"
                />
              )}

              {/* Selection checkbox (visible in select mode, photos only) */}
              {selectMode && !isVideo && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-black/40 border-white/80 text-transparent backdrop-blur-sm'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </div>
              )}

              {/* Subtle overlay with uploader info (hidden in select mode) */}
              {!selectMode && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={uploaderProfile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[6px]">
                        {uploaderProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[9px] text-white/90 truncate">
                      {getPublicName(uploaderProfile)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Fullscreen Viewer Portal */}
      {viewerIndex !== null && photos[viewerIndex] && createPortal(
        <div
          className="fixed inset-0 bg-black/95 z-[99999] flex flex-col safe-top safe-bottom"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 relative z-10">
            <div className="flex items-center gap-2">
              <Avatar
                className="h-6 w-6 cursor-pointer"
                onClick={() => photos[viewerIndex].created_by && openProfile(photos[viewerIndex].created_by)}
                aria-label="View uploader profile"
              >
                <AvatarImage src={profiles[photos[viewerIndex].created_by]?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-white/20 text-white">
                  {profiles[photos[viewerIndex].created_by]?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white text-xs font-medium">
                  {profiles[photos[viewerIndex].created_by]?.display_name || 'R@lly Member'}
                </p>
                <p className="text-white/50 text-[10px]">
                  {format(new Date(photos[viewerIndex].created_at), 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Save works for both photos AND videos. On native, downloadPhoto routes
                  through the share-sheet so iOS/Android offer "Save Video" / "Save Image". */}
              <button
                onClick={handleDownloadCurrent}
                disabled={downloadingViewer}
                className="p-2 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 transition-colors disabled:opacity-60"
                aria-label={photos[viewerIndex].type === 'video' ? 'Save video' : 'Save photo'}
              >
                {downloadingViewer
                  ? <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  : <Download className="h-4 w-4 text-primary" />}
              </button>

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

          {/* Media */}
          <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
            {photos[viewerIndex].type === 'video' ? (
              erroredVideoIds.has(photos[viewerIndex].id) ? (
                <div className="flex flex-col items-center justify-center gap-4 text-white text-center px-6">
                  <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">This video can't preview here</p>
                    <p className="text-xs text-white/60">
                      Open it in a new tab to watch or download.
                    </p>
                  </div>
                  <a
                    href={photos[viewerIndex].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (Capacitor.isNativePlatform()) {
                        e.preventDefault();
                        void openExternalLink(photos[viewerIndex].url);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open video
                  </a>
                </div>
              ) : (
                <video
                  key={photos[viewerIndex].id}
                  src={photos[viewerIndex].url}
                  controls
                  autoPlay
                  playsInline
                  onError={() => {
                    setErroredVideoIds((prev) => {
                      if (prev.has(photos[viewerIndex].id)) return prev;
                      const next = new Set(prev);
                      next.add(photos[viewerIndex].id);
                      return next;
                    });
                  }}
                  className="max-w-full max-h-full rounded-lg"
                />
              )
            ) : (
              <img
                src={photos[viewerIndex].url}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-4 pt-4">
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

      {/* Sticky upload progress — Portal so it stays visible while scrolling */}
      {uploading && uploadProgress.total > 0 && createPortal(
        <div
          className="fixed inset-x-0 z-[9999] px-4 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
        >
          <div className="mx-auto max-w-md pointer-events-auto rounded-2xl border border-primary/30 bg-background/80 backdrop-blur-xl shadow-2xl px-4 py-3 font-montserrat">
            <div className="flex items-center gap-2.5 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <p className="text-sm font-semibold flex-1 truncate">
                {retrying ? 'Retrying' : 'Uploading'} {uploadProgress.done} of {uploadProgress.total}…
              </p>
              <span className="text-xs font-bold text-primary tabular-nums">
                {Math.round((uploadProgress.done / uploadProgress.total) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
