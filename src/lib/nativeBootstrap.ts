/**
 * Native bootstrap: status bar, keyboard, splash screen, and deep-link
 * routing. All work is gated behind `Capacitor.isNativePlatform()` so the
 * web bundle is untouched (these imports are tree-shaken to no-ops in the
 * web build because the only entry-point call returns immediately).
 */
import { Capacitor } from '@capacitor/core';

let initialized = false;

export async function initNativeShell(opts: {
  /** Called when a deep link arrives; receives the in-app path to navigate to. */
  onDeepLink?: (path: string) => void;
} = {}): Promise<void> {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  const [{ StatusBar, Style }, { Keyboard, KeyboardResize }, { SplashScreen }, { App }] =
    await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/keyboard'),
      import('@capacitor/splash-screen'),
      import('@capacitor/app'),
    ]);

  // Status bar — match dark splash, overlay the WebView so safe-area-inset-top
  // CSS picks it up cleanly.
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (err) {
    console.warn('StatusBar init failed', err);
  }

  // Keyboard — use native resize so the WebView shrinks instead of
  // pushing the bottom nav off-screen.
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: false });
  } catch (err) {
    console.warn('Keyboard init failed', err);
  }

  // Deep links: rlly.cloud/join/:code → /join/:code inside the app.
  try {
    App.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        // Universal links + custom scheme both come through here.
        const path = url.pathname + url.search + url.hash;
        if (path && path !== '/') {
          opts.onDeepLink?.(path);
        }
      } catch (err) {
        console.warn('Bad deep link URL', event.url, err);
      }
    });
  } catch (err) {
    console.warn('App deep-link listener failed', err);
  }

  // Android hardware back button: close the top-most sheet/dialog if open,
  // otherwise pop the router history. Only the root route exits the app.
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      // If a Radix overlay (Dialog/Sheet/Drawer/AlertDialog) is open, close it.
      const openOverlay = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
      );
      if (openOverlay) {
        // Prefer the close button if present (preserves animations).
        const closeBtn = openOverlay.querySelector<HTMLElement>(
          '[data-radix-collection-item][aria-label="Close"], button[aria-label="Close"], [data-dismiss]'
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          // Fallback: dispatch Escape, which Radix overlays listen for.
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        }
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (err) {
    console.warn('App backButton listener failed', err);
  }
}

/** Hide the iOS splash screen — call once auth state has resolved so the
 * user never sees a white flash between splash and the first React paint. */
export async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch (err) {
    console.warn('SplashScreen.hide failed', err);
  }
}
