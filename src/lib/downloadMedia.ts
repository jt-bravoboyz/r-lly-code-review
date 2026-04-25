import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function shortId(id: string, len = 6): string {
  return (id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, len) || 'photo';
}

function extFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return (m?.[1] || 'jpg').toLowerCase();
  } catch {
    return 'jpg';
  }
}

function buildFilename(url: string, id: string, eventId?: string): string {
  const ext = extFromUrl(url);
  const ev = eventId ? `${shortId(eventId, 4)}-` : '';
  return `rally-${ev}${shortId(id)}.${ext}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:...;base64," prefix
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}

export interface DownloadItem {
  url: string;
  id: string;
  eventId?: string;
}

/** Downloads / saves a single photo. On native, opens share sheet → user picks "Save Image". */
export async function downloadPhoto(item: DownloadItem): Promise<void> {
  const filename = buildFilename(item.url, item.id, item.eventId);
  const blob = await fetchBlob(item.url);

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const writeRes = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: 'Save Photo',
      url: writeRes.uri,
      dialogTitle: 'Save to Photos',
    });
    return;
  }

  // Web / PWA — anchor download
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Sequentially downloads multiple photos with progress callback. */
export async function downloadPhotosBatch(
  items: DownloadItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    try {
      await downloadPhoto(items[i]);
      saved++;
    } catch {
      failed++;
    }
    onProgress?.(i + 1, total);
  }

  return { saved, failed };
}
