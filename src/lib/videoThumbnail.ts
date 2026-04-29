/**
 * Extract a JPEG thumbnail from a video File or Blob in the browser.
 * Resolves to null on any failure (timeout, decode error, taint, etc.) so
 * upload flows can continue without a thumbnail.
 */
export async function extractVideoThumbnail(
  source: File | Blob,
  opts: { maxWidth?: number; quality?: number; timeoutMs?: number } = {}
): Promise<Blob | null> {
  const { maxWidth = 1280, quality = 0.78, timeoutMs = 6000 } = opts;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: Blob | null) => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(url); } catch {}
      try { video.removeAttribute('src'); video.load(); } catch {}
      resolve(val);
    };

    const url = URL.createObjectURL(source);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    (video as any).playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.src = url;

    const timeout = setTimeout(() => finish(null), timeoutMs);

    const onSeeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        const scale = Math.min(1, maxWidth / w);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout);
            finish(blob);
          },
          'image/jpeg',
          quality
        );
      } catch {
        clearTimeout(timeout);
        finish(null);
      }
    };

    const onLoaded = () => {
      try {
        const target = Math.min(0.1, (video.duration || 1) / 4);
        video.currentTime = isFinite(target) && target > 0 ? target : 0;
      } catch {
        finish(null);
      }
    };

    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', () => finish(null), { once: true });
  });
}
