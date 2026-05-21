import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Thin geolocation facade that delegates to `@capacitor/geolocation` on
 * native (so iOS uses the proper `NSLocationWhenInUseUsageDescription`
 * permission sheet and watchers survive backgrounding) and falls back to
 * `navigator.geolocation` on web.
 *
 * The API surface mirrors the web Geolocation API to keep call-site
 * refactors mechanical and the web build byte-identical.
 */

export type GeoSuccess = (pos: GeolocationPosition) => void;
export type GeoError = (err: GeolocationPositionError) => void;
export interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const isNative = () => Capacitor.isNativePlatform();

function toWebPosition(pos: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}): GeolocationPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      // Required by the web spec
      toJSON() {
        return this;
      },
    } as GeolocationCoordinates,
    timestamp: pos.timestamp,
    toJSON() {
      return this;
    },
  } as GeolocationPosition;
}

function toWebError(message: string, code = 2): GeolocationPositionError {
  return {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

/** Watch IDs: web → number, native → string. We expose number to callers
 * and keep a side-table mapping number → native string. */
let nextId = 1;
const nativeWatchIds = new Map<number, string>();

export function isGeolocationAvailable(): boolean {
  if (isNative()) return true;
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function getCurrentPosition(
  success: GeoSuccess,
  error?: GeoError,
  options?: GeoOptions
): void {
  if (isNative()) {
    Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    })
      .then((pos) => success(toWebPosition(pos)))
      .catch((err) => error?.(toWebError(err?.message ?? 'Location unavailable')));
    return;
  }
  if (!navigator?.geolocation) {
    error?.(toWebError('Geolocation not supported', 2));
    return;
  }
  navigator.geolocation.getCurrentPosition(success, error, options);
}

export function watchPosition(
  success: GeoSuccess,
  error?: GeoError,
  options?: GeoOptions
): number {
  const id = nextId++;
  if (isNative()) {
    Geolocation.watchPosition(
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      },
      (pos, err) => {
        if (err) {
          error?.(toWebError(err.message ?? 'Watch position error'));
          return;
        }
        if (pos) success(toWebPosition(pos));
      }
    )
      .then((nativeId) => nativeWatchIds.set(id, nativeId))
      .catch((err) => error?.(toWebError(err?.message ?? 'Watch failed')));
    return id;
  }
  if (!navigator?.geolocation) {
    error?.(toWebError('Geolocation not supported', 2));
    return id;
  }
  const webId = navigator.geolocation.watchPosition(success, error, options);
  nativeWatchIds.set(id, String(webId));
  return id;
}

export function clearWatch(id: number): void {
  const stored = nativeWatchIds.get(id);
  nativeWatchIds.delete(id);
  if (stored == null) return;
  if (isNative()) {
    Geolocation.clearWatch({ id: stored }).catch(() => {});
  } else if (navigator?.geolocation) {
    navigator.geolocation.clearWatch(Number(stored));
  }
}

/** Convenience for screens that want the native iOS permission sheet
 * upfront before they start a watcher (rather than the implicit
 * getCurrentPosition prompt). */
export async function requestPermissions(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const status = await Geolocation.requestPermissions();
    return status.location === 'granted' || (status as any).coarseLocation === 'granted';
  } catch {
    return false;
  }
}
