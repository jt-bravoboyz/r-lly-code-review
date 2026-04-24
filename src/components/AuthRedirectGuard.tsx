import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Router-level guard that redirects authenticated users away from auth screens.
 * Prevents the "loop" where OAuth completes but the user stays on /auth.
 */
export function AuthRedirectGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Effect: handle already-authenticated visits to /auth*
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const path = location.pathname.toLowerCase();
    const isAuthRoute =
      path === '/auth' || path === '/auth/return';

    if (isAuthRoute) {
      const pendingRallyCode = localStorage.getItem('pendingRallyCode');
      if (pendingRallyCode) {
        navigate(`/join/${pendingRallyCode}`, { replace: true });
        return;
      }
      navigate('/', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Listener: catch the SIGNED_IN moment of the OAuth handshake immediately
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const path = window.location.pathname.toLowerCase();
        if (path.startsWith('/auth')) {
          const pendingRallyCode = localStorage.getItem('pendingRallyCode');
          if (pendingRallyCode) {
            navigate(`/join/${pendingRallyCode}`, { replace: true });
            return;
          }
          navigate('/', { replace: true });
        }
      }
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
