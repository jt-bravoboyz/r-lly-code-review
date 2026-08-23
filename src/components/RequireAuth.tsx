import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Route guard for account-only screens.
 * Waits for the first auth resolution, then redirects signed-out visitors
 * to /auth/return while preserving where they were headed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, hasResolvedOnce } = useAuth();
  const location = useLocation();

  if (loading || !hasResolvedOnce) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/return" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
