import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  /** Toast shown on success when no native share sheet is available. */
  successToast?: string;
}

/**
 * Unified share sheet.
 * - Native (Capacitor): @capacitor/share → real iOS/Android share sheet.
 * - Web: navigator.share if available (HTTPS + user gesture), otherwise
 *   falls back to copying the URL/text to the clipboard.
 *
 * Returns `true` if some user-visible action succeeded (share sheet opened,
 * web share resolved, or clipboard copy completed).
 */
export async function shareContent(opts: ShareOptions): Promise<boolean> {
  const { title, text, url } = opts;

  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text, url, dialogTitle: title });
      return true;
    } catch (err: any) {
      // User cancelled → not an error.
      if (typeof err?.message === 'string' && /cancel/i.test(err.message)) return false;
      console.warn('Native share failed:', err);
      // fall through to clipboard fallback
    }
  } else if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err: any) {
      // AbortError = user cancelled
      if (err?.name === 'AbortError') return false;
      // fall through
    }
  }

  // Clipboard fallback
  const payload = [text, url].filter(Boolean).join('\n');
  if (!payload) return false;
  const copied = await copyToClipboard(payload, { silent: true });
  if (copied) {
    toast.success(opts.successToast ?? 'Copied to clipboard');
  }
  return copied;
}

interface CopyOptions {
  /** Suppress the default success toast. */
  silent?: boolean;
}

/**
 * Clipboard write with a safe fallback path. Works on web (HTTPS + user
 * gesture) and inside Capacitor WKWebView. Failures surface a friendly toast
 * instead of an unhandled rejection.
 */
export async function copyToClipboard(text: string, opts: CopyOptions = {}): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      if (!opts.silent) toast.success('Copied');
      return true;
    }
    // Legacy fallback (older WKWebView contexts without secure context)
    if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        if (!opts.silent) toast.success('Copied');
        return true;
      }
    }
    throw new Error('Clipboard unavailable');
  } catch (err) {
    console.warn('copyToClipboard failed:', err);
    toast.error('Copy failed — long-press to copy manually');
    return false;
  }
}
