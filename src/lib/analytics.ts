import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function trackEvent(name: string, metadata?: Record<string, unknown>) {
  const host = window.location.hostname;
  const isAllowed = import.meta.env.PROD
    || host.endsWith('.lovable.app')
    || host.endsWith('.lovableproject.com');
  if (!isAllowed) return;

  try {
    const sessionPromise = supabase.auth.getSession();
    sessionPromise.then(({ data: { session } }) => {
      if (!session?.user?.id) return;

      queueMicrotask(() => {
        supabase.from('analytics_events').insert([{
          user_id: session.user.id,
          event_name: name,
          metadata: (metadata ?? {}) as Json,
        }]);
      });
    });
  } catch {
    // fire-and-forget — swallow all errors
  }
}
