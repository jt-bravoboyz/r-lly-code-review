import { useEventChat } from '@/hooks/useChat';
import { UnifiedChat } from './unified/UnifiedChat';

interface EventChatProps {
  eventId: string;
  eventTitle: string;
  eventStatus?: string;
}

export function EventChat({ eventId, eventStatus }: EventChatProps) {
  const { chat, messages, isLoading } = useEventChat(eventId);

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
