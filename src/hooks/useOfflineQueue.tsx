import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface PendingUpdate {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

const DB_NAME = 'rally-offline';
const STORE_NAME = 'pending-updates';
const NATIVE_FLUSH_INTERVAL_MS = 30_000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

const isNative = () => Capacitor.isNativePlatform();

export function useOfflineQueue() {
  // Online → flush. On native we use @capacitor/network + an interval since
  // Background Sync is not available in WKWebView. On web we keep the
  // existing Background Sync registration with the manual fallback.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let removeNativeListener: (() => void) | null = null;

    const flushNow = () => {
      void syncPendingUpdates();
    };

    if (isNative()) {
      // Lazy-load so the web bundle doesn't pull this in.
      let cancelled = false;
      (async () => {
        try {
          const { Network } = await import('@capacitor/network');
          if (cancelled) return;
          const handle = await Network.addListener('networkStatusChange', (status) => {
            if (status.connected) flushNow();
          });
          removeNativeListener = () => {
            handle.remove().catch(() => {});
          };
          const status = await Network.getStatus();
          if (status.connected) flushNow();
        } catch (err) {
          console.warn('Native network listener failed, falling back to interval', err);
        }
      })();
      // Belt-and-braces interval flush so a stuck queue still drains.
      intervalId = setInterval(flushNow, NATIVE_FLUSH_INTERVAL_MS);
      return () => {
        cancelled = true;
        removeNativeListener?.();
        if (intervalId) clearInterval(intervalId);
      };
    }

    const handleOnline = async () => {
      if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await (registration as any).sync.register('sync-rally-updates');
        } catch {
          flushNow();
        }
      } else {
        flushNow();
      }
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const queueUpdate = useCallback(async (
    url: string,
    method: string,
    body?: object,
    headers?: Record<string, string>
  ) => {
    if (navigator.onLine) {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response;
    }

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const update: PendingUpdate = {
        url,
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : '',
        timestamp: Date.now(),
      };

      await store.add(update);

      // Only register Background Sync on web; native uses the interval+listener above.
      if (!isNative() && 'serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('sync-rally-updates');
        } catch {
          /* sync unavailable — interval / online listener will flush */
        }
      }

      return { ok: true, queued: true };
    } catch (error) {
      console.error('Failed to queue update:', error);
      throw error;
    }
  }, []);

  return { queueUpdate };
}

async function syncPendingUpdates() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();
    const updates = await new Promise<PendingUpdate[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (updates.length === 0) return;

    for (const update of updates) {
      try {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body || undefined,
        });
      } catch (error) {
        console.error('Failed to sync update:', error);
        return; // keep the queue; we'll retry on next tick / network event
      }
    }

    const clearTx = db.transaction(STORE_NAME, 'readwrite');
    clearTx.objectStore(STORE_NAME).clear();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
