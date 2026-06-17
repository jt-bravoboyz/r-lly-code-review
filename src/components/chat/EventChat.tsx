import { useEffect, useState } from 'react';
import { useEventChat } from '@/hooks/useChat';
import { UnifiedChat } from './unified/UnifiedChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EventChatProps {
  eventId: string;
  eventTitle: string;
  eventStatus?: string;
}

export function EventChat({ eventId, eventStatus }: EventChatProps) {
  const { chat, messages, isLoading } = useEventChat(eventId);
  const { profile } = useAuth();
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    if (!profile?.id || !eventId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('event_attendees')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (cancelled) return;
      setAccessState(data?.status === 'removed' ? 'denied' : 'allowed');
    })();
    return () => { cancelled = true; };
  }, [profile?.id, eventId]);

  if (accessState === 'denied') {
    return (
      <div className="flex items-center justify-center h-64 px-6 text-center text-sm text-muted-foreground font-montserrat">
        You are no longer part of this event.
      </div>
    );
  }

  const banner =
    eventStatus === 'live' ? (
      <div className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold font-montserrat text-center">
        R@lly is live. Move out.
      </div>
    ) : eventStatus === 'after_rally' ? (
      <div className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold font-montserrat text-center">
        After R@lly mode active.
      </div>
    ) : null;

  if (!chat?.id && !isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Chat not available
      </div>
    );
  }

  return (
    <UnifiedChat
      chatId={chat?.id || ''}
      chatType="rally"
      messages={messages}
      isLoading={isLoading}
      storagePath={`events/${eventId}`}
      contextBanner={banner}
    />
  );
}
