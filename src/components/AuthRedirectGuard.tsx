import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Router-level guard that redirects authenticated users away from auth screens.
 * Prevents the "loop" where OAuth completes but the user stays on /auth.
 */
export function AuthRedirectGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const isAuthRoute =
      location.pathname === '/auth' || location.pathname === '/auth/return' || location.pathname === '/Auth/return';

    if (isAuthRoute) {
      // Authenticated user on an auth page — send them home
      navigate('/', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}
