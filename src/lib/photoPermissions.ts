import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { App } from '@capacitor/app';

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
    if (platform === 'ios') {
      await App.openUrl({ url: 'app-settings:' });
    } else if (platform === 'android') {
      // Best-effort: open generic settings; on most devices this lands on app permissions
      await App.openUrl({ url: 'package:' });
    }
  } catch {
    // no-op
  }
}
