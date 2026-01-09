import { useEffect, useCallback } from 'react';

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

export function useOfflineQueue() {
  // Register for background sync when online
  useEffect(() => {
    const handleOnline = async () => {
      if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
        const registration = await navigator.serviceWorker.ready;
        try {
          await (registration as any).sync.register('sync-rally-updates');
        } catch (error) {
          console.log('Background sync not supported');
          // Fallback: manually sync
          syncPendingUpdates();
        }
      } else {
        // No background sync, manually sync
        syncPendingUpdates();
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Check if we're online and have pending updates
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const queueUpdate = useCallback(async (
    url: string,
    method: string,
    body?: object,
    headers?: Record<string, string>
  ) => {
    if (navigator.onLine) {
      // Online - send immediately
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response;
    }

    // Offline - queue for later
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const update: PendingUpdate = {
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : '',
        timestamp: Date.now(),
      };
      
      await store.add(update);
      
      // Register for background sync
      if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-rally-updates');
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

    for (const update of updates) {
      try {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body || undefined,
        });
      } catch (error) {
        console.error('Failed to sync update:', error);
      }
    }

    // Clear synced updates
    const clearTx = db.transaction(STORE_NAME, 'readwrite');
    clearTx.objectStore(STORE_NAME).clear();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}