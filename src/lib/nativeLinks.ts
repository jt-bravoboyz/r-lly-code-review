import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open a protocol-style link (sms:, mailto:, tel:).
 * Uses same-window navigation so Capacitor's WKWebView hands the URL
 * off to the native Messages / Mail / Phone app instead of opening a
 * blank in-app window (which is what `_blank` does on native).
 */
export function openProtocolLink(url: string) {
  window.location.href = url;
}

/**
 * Open an external https/http link.
 * - Native (Capacitor): in-app Safari View Controller via @capacitor/browser.
 * - Web: new tab with noopener.
 */
export async function openExternalLink(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a maps / directions URL.
 * - Native (Capacitor): in-app Safari View Controller — the user can
 *   then tap through to Apple/Google Maps.
 * - Mobile web: same-window navigation so iOS / Android can hand off
 *   the universal link to the installed Maps app.
 * - Desktop web: new tab.
 */
export function openDirectionsLink(url: string) {
  if (Capacitor.isNativePlatform()) {
    void Browser.open({ url });
    return;
  }
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer: coarse)').matches;
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ---- Platform helpers ---------------------------------------------------

function isIOSLike(): boolean {
  if (Capacitor.getPlatform() === 'ios') return true;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// ---- SMS / Mailto builders ---------------------------------------------

/**
 * Build a `sms:` URL with the correct separator for the platform.
 * iOS uses `&body=`, Android/everything else uses `?body=`.
 * Pass an empty string for `to` to compose without a recipient.
 */
export function buildSmsUrl(to: string, body: string): string {
  const sep = isIOSLike() ? '&' : '?';
  const encoded = encodeURIComponent(body);
  return `sms:${to}${sep}body=${encoded}`;
}

/** Open the native Messages composer prefilled with `body`. */
export function openSms(to: string, body: string): void {
  openProtocolLink(buildSmsUrl(to, body));
}

export interface MailtoOptions {
  subject?: string;
  body?: string;
}

/** Build a `mailto:` URL with optional subject/body. */
export function buildMailtoUrl(to: string, opts: MailtoOptions = {}): string {
  const params: string[] = [];
  if (opts.subject) params.push(`subject=${encodeURIComponent(opts.subject)}`);
  if (opts.body) params.push(`body=${encodeURIComponent(opts.body)}`);
  return `mailto:${to}${params.length ? `?${params.join('&')}` : ''}`;
}

/** Open the native Mail composer. */
export function openMailto(to: string, opts: MailtoOptions = {}): void {
  openProtocolLink(buildMailtoUrl(to, opts));
}

// ---- Map directions facade ---------------------------------------------

export interface MapsTarget {
  lat?: number | null;
  lng?: number | null;
  /** Free-form address fallback (used when lat/lng missing). */
  address?: string | null;
  /** Optional human-readable label/name. */
  label?: string | null;
  /** Optional origin coordinates (for "from-to" directions). */
  originLat?: number | null;
  originLng?: number | null;
  /** Mode: directions (default), search, or transit directions. */
  mode?: 'directions' | 'search' | 'transit';
}

/**
 * Build a maps URL that prefers native apps:
 * - iOS (native or web): `maps://` (Apple Maps) when coordinates are present;
 *   falls back to https://maps.apple.com for address search.
 * - Android native / non-iOS: https://www.google.com/maps universal link
 *   (Android intent-handles this to Google Maps).
 */
export function buildMapsUrl(t: MapsTarget): string {
  const mode = t.mode ?? 'directions';
  const hasCoords = typeof t.lat === 'number' && typeof t.lng === 'number';
  const ios = isIOSLike();

  if (ios) {
    // Apple Maps URL scheme. https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
    const base = 'https://maps.apple.com/';
    const params = new URLSearchParams();
    if (mode === 'transit') params.set('dirflg', 'r');
    if (hasCoords) {
      const coord = `${t.lat},${t.lng}`;
      if (mode === 'search') {
        params.set('q', t.label || coord);
        params.set('ll', coord);
      } else {
        params.set('daddr', coord);
        if (typeof t.originLat === 'number' && typeof t.originLng === 'number') {
          params.set('saddr', `${t.originLat},${t.originLng}`);
        }
      }
    } else if (t.address) {
      if (mode === 'search') params.set('q', t.address);
      else params.set('daddr', t.address);
    } else if (t.label) {
      params.set('q', t.label);
    }
    return `${base}?${params.toString()}`;
  }

  // Google Maps universal link (works on Android + web).
  if (mode === 'search') {
    const q = hasCoords ? `${t.lat},${t.lng}` : (t.label || t.address || '');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  const params = new URLSearchParams({ api: '1' });
  if (hasCoords) {
    params.set('destination', `${t.lat},${t.lng}`);
  } else if (t.address) {
    params.set('destination', t.address);
  } else if (t.label) {
    params.set('destination', t.label);
  }
  if (typeof t.originLat === 'number' && typeof t.originLng === 'number') {
    params.set('origin', `${t.originLat},${t.originLng}`);
  }
  if (mode === 'transit') params.set('travelmode', 'transit');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Open directions to a target, picking the right native app per platform.
 * One-liner replacement for the various `https://www.google.com/maps/...` URLs
 * that used to be hand-built across the app.
 */
export function openMapsDirections(t: MapsTarget): void {
  openDirectionsLink(buildMapsUrl(t));
}
