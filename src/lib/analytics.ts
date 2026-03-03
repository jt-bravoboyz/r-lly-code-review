import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function trackEvent(name: string, metadata?: Record<string, unknown>) {
  if (!import.meta.env.PROD) return;

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
