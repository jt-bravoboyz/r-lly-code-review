import { UnifiedChat } from './unified/UnifiedChat';
import type { Message } from '@/hooks/useChat';

// Backwards-compatible thin wrapper around UnifiedChat for existing call sites.
interface ChatViewProps {
  chatId: string;
  messages: Message[];
  isLoading: boolean;
  storagePath?: string;
}

export function ChatView({ chatId, messages, isLoading, storagePath = 'general' }: ChatViewProps) {
  return (
    <UnifiedChat
      chatId={chatId}
      chatType="squad"
      messages={messages}
      isLoading={isLoading}
      storagePath={storagePath}
    />
  );
}
