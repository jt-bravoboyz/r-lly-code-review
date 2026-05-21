import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { initNativeShell, hideNativeSplash } from '@/lib/nativeBootstrap';

/**
 * Mounts inside <BrowserRouter> so it has access to `useNavigate` for
 * routing inbound deep links. Web build: every Capacitor call inside
 * `initNativeShell` is a no-op, so this component is effectively dead code
 * on the browser.
 */
export function NativeBootstrap() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  // Init status bar / keyboard / deep-link listener exactly once.
  useEffect(() => {
    void initNativeShell({
      onDeepLink: (path) => {
        // Drop the origin/scheme; React Router handles the rest.
        navigate(path, { replace: false });
      },
    });
  }, [navigate]);

  // Hide the iOS splash screen as soon as auth state resolves so users
  // never see a white flash between the native splash and the first paint.
  useEffect(() => {
    if (!loading) void hideNativeSplash();
  }, [loading]);

  return null;
}
