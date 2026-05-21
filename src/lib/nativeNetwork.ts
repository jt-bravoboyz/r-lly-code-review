/**
 * Cross-platform network status.
 *
 * Web build: pure `navigator.onLine` + `online`/`offline` events.
 * Native build (Capacitor): `@capacitor/network` plugin, which is reliable
 * across airplane-mode toggles inside WKWebView (where `navigator.onLine`
 * frequently sticks on `true`).
 *
 * `isOnlineSync()` is provided for legacy call-sites that need a synchronous
 * answer; on native it returns the last-known value from the plugin listener
 * (defaults to `true` before the first event arrives).
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

let lastKnownOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let nativeListenerStarted = false;

async function startNativeListener() {
  if (nativeListenerStarted || !isNative()) return;
  nativeListenerStarted = true;
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    lastKnownOnline = status.connected;
    await Network.addListener('networkStatusChange', (s) => {
      lastKnownOnline = s.connected;
    });
  } catch (err) {
    console.warn('[nativeNetwork] failed to start listener', err);
  }
}

// Kick the native listener as soon as this module loads on a device.
if (isNative()) {
  void startNativeListener();
}

export function isOnlineSync(): boolean {
  if (isNative()) return lastKnownOnline;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function isOnline(): Promise<boolean> {
  if (isNative()) {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      lastKnownOnline = status.connected;
      return status.connected;
    } catch {
      return lastKnownOnline;
    }
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Subscribe to connection changes. Returns an unsubscribe fn.
 * `connected` reflects the new state.
 */
export function addNetworkListener(cb: (connected: boolean) => void): () => void {
  if (isNative()) {
    let remove: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Network } = await import('@capacitor/network');
        if (cancelled) return;
        const handle = await Network.addListener('networkStatusChange', (s) => {
          lastKnownOnline = s.connected;
          cb(s.connected);
        });
        remove = () => { handle.remove().catch(() => {}); };
      } catch (err) {
        console.warn('[nativeNetwork] addListener failed', err);
      }
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }

  const onOnline = () => cb(true);
  const onOffline = () => cb(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
