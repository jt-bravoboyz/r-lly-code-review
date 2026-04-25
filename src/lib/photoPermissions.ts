import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';


export type PhotoPermissionState = 'granted' | 'denied' | 'prompt' | 'na';

export async function checkPhotoPermission(): Promise<PhotoPermissionState> {
  if (!Capacitor.isNativePlatform()) return 'na';
  try {
    const res = await Filesystem.checkPermissions();
    const status = (res as any)?.publicStorage as string | undefined;
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function requestPhotoPermission(): Promise<'granted' | 'denied'> {
  if (!Capacitor.isNativePlatform()) return 'granted';
  try {
    const res = await Filesystem.requestPermissions();
    const status = (res as any)?.publicStorage as string | undefined;
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function openAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const platform = Capacitor.getPlatform();
    const url = platform === 'ios' ? 'app-settings:' : 'package:';
    // Lazy-load so missing plugin method doesn't break the bundle
    const { App } = await import('@capacitor/app');
    const appAny = App as unknown as { openUrl?: (opts: { url: string }) => Promise<unknown> };
    if (typeof appAny.openUrl === 'function') {
      await appAny.openUrl({ url });
    } else if (platform !== 'ios') {
      window.location.href = url;
    }
  } catch {
    // no-op
  }
}
