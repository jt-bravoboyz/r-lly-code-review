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
