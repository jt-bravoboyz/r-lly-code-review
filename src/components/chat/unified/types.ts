import type { Message } from '@/hooks/useChat';

export type ChatType = 'rally' | 'squad' | 'dm';

export interface MessageReaction {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageRead {
  id: string;
  message_id: string;
  profile_id: string;
  read_at: string;
}

export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'] as const;

export type { Message };
