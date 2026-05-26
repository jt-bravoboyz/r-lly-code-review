/**
 * Native (Capacitor) OAuth helper.
 *
 * The Lovable `@lovable.dev/cloud-auth-js` SDK assumes it runs on a web origin
 * served by the Lovable proxy, so it uses a relative broker URL
 * (`/~oauth/initiate`) and calls `window.location.href = brokerUrl` — both of
 * which are wrong inside the Capacitor WKWebView (origin is
 * `capacitor://localhost` and full-page navigation rips the user out of the
 * bundled `dist/` app).
 *
 * On native we instead:
 *   1. Build the absolute broker URL on `rlly.cloud`.
 *   2. Open it in an in-app browser (SFSafariViewController via
 *      `@capacitor/browser`).
 *   3. The broker redirects back to `https://rlly.cloud/auth/return#...` which,
 *      via the Associated Domains entitlement + AASA, hands off to the native
 *      app's `appUrlOpen` listener (see `nativeBootstrap.ts`) where we close
 *      the browser, parse the tokens, and call `supabase.auth.setSession`.
 *
 * The web build never imports this file.
 */
import { Browser } from '@capacitor/browser';

export const NATIVE_OAUTH_REDIRECT_URI = 'https://rlly.cloud/auth/return';
const BROKER_URL = 'https://rlly.cloud/~oauth/initiate';
export const NATIVE_OAUTH_STATE_KEY = 'rally-native-oauth-state';

function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function nativeSignInWithOAuth(
  provider: 'google' | 'apple',
  extraParams: Record<string, string> = {},
): Promise<void> {
  const state = generateState();
  // Stored so the deep-link handler can verify the response.
  try {
    sessionStorage.setItem(NATIVE_OAUTH_STATE_KEY, state);
  } catch {
    // sessionStorage can be unavailable in some webview edge cases; not fatal.
  }
  const params = new URLSearchParams({
    ...extraParams,
    provider,
    redirect_uri: NATIVE_OAUTH_REDIRECT_URI,
    state,
  });
  await Browser.open({
    url: `${BROKER_URL}?${params.toString()}`,
    presentationStyle: 'popover',
    windowName: '_self',
  });
}
