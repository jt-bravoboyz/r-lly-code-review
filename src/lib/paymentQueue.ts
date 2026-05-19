/**
 * Offline payment queue.
 * IndexedDB-backed (localStorage fallback) queue for failed/offline split-check
 * payment submissions. Drains on `online` event and on app start.
 *
 * Items contain enough context to retry process-fluid-pay end-to-end without
 * the user re-typing card details (token is short-lived but reusable for the
 * same charge).
 */
import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'rally-payments';
const STORE = 'queued-pays';

export interface QueuedPayment {
  id?: number;
  body: Record<string, unknown>; // body for process-fluid-pay
  enqueued_at: number;
  attempts: number;
  last_error?: string;
}

const LS_KEY = 'rally.paymentQueue.fallback';

const supportsIDB = typeof indexedDB !== 'undefined';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function lsRead(): QueuedPayment[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsWrite(items: QueuedPayment[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export async function enqueuePayment(body: Record<string, unknown>, error?: string): Promise<void> {
  const payload: QueuedPayment = {
    body,
    enqueued_at: Date.now(),
    attempts: 0,
    last_error: error,
  };

  if (!supportsIDB) {
    const items = lsRead();
    items.push(payload);
    lsWrite(items);
    notifyChange();
    return;
  }

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(payload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  notifyChange();
}

export async function getQueuedPayments(): Promise<QueuedPayment[]> {
  if (!supportsIDB) return lsRead();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedPayment[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedCount(): Promise<number> {
  const items = await getQueuedPayments();
  return items.length;
}

async function removeQueued(id: number | undefined): Promise<void> {
  if (id == null) return;
  if (!supportsIDB) {
    lsWrite(lsRead().filter((i) => i.id !== id));
    return;
  }
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let draining = false;

export async function drainPaymentQueue(): Promise<{ ok: number; failed: number }> {
  if (draining || typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  draining = true;
  let ok = 0; let failed = 0;
  try {
    const items = await getQueuedPayments();
    for (const item of items) {
      try {
        const { data, error } = await supabase.functions.invoke('process-fluid-pay', { body: item.body });
        if (error || !(data as any)?.ok) {
          failed++;
          // Leave in queue, increment attempts (best-effort; only matters for IDB)
          continue;
        }
        await removeQueued(item.id);
        ok++;
      } catch {
        failed++;
      }
    }
  } finally {
    draining = false;
    notifyChange();
  }
  return { ok, failed };
}

// Lightweight pub-sub so UI can react without polling
type Listener = (count: number) => void;
const listeners = new Set<Listener>();

async function notifyChange() {
  const count = await getQueuedCount();
  listeners.forEach((l) => { try { l(count); } catch { /* ignore */ } });
}

export function subscribeQueueCount(listener: Listener): () => void {
  listeners.add(listener);
  getQueuedCount().then(listener).catch(() => listener(0));
  return () => { listeners.delete(listener); };
}

// Auto-drain on online + on load
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { drainPaymentQueue(); });
  // Drain shortly after load in case items survived from a previous session.
  setTimeout(() => { if (navigator.onLine) drainPaymentQueue(); }, 1500);
}
