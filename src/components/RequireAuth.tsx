import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Keeps signed-out visitors out of account-only screens while preserving the
 * route they originally requested for a future post-login redirect.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading, hasResolvedOnce } = useAuth();
  const location = useLocation();

  if (loading || !hasResolvedOnce) {
    return (
      <main
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        aria-busy="true"
        aria-label="Checking sign-in status"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth/return" replace state={{ from: location }} />;
  }

  return children;
}
