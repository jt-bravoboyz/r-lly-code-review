import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DirectMessageSheet } from '@/components/chat/DirectMessageSheet';
import { useOpenDmChat } from '@/hooks/useDirectMessages';
import { toast } from 'sonner';

interface OpenDmArgs {
  otherProfileId: string;
  /** Optional preloaded chat id (skips RPC). */
  chatId?: string;
  /** Optional preloaded other-profile metadata (skips lookup). */
  otherProfile?: { id: string; display_name: string | null; avatar_url: string | null };
}

interface DirectMessageContextValue {
  openDm: (args: OpenDmArgs) => Promise<void>;
  closeDm: () => void;
}

const DirectMessageContext = createContext<DirectMessageContextValue | undefined>(undefined);

export function DirectMessageProvider({ children }: { children: ReactNode }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<OpenDmArgs['otherProfile']>(null as any);
  const [open, setOpen] = useState(false);
  const openDmChat = useOpenDmChat();

  const openDm = useCallback(async ({ otherProfileId, chatId: presetChatId, otherProfile: presetOther }: OpenDmArgs) => {
    try {
      let nextChatId = presetChatId;
      if (!nextChatId) {
        nextChatId = await openDmChat.mutateAsync(otherProfileId);
      }
      let other = presetOther;
      if (!other) {
        const { data } = await (supabase as any)
          .from('safe_profiles')
          .select('id, display_name, avatar_url')
          .eq('id', otherProfileId)
          .maybeSingle();
        other = data || { id: otherProfileId, display_name: null, avatar_url: null };
      }
      setChatId(nextChatId!);
      setOtherProfile(other!);
      setOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Could not open direct message');
    }
  }, [openDmChat]);

  const closeDm = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <DirectMessageContext.Provider value={{ openDm, closeDm }}>
      {children}
      <DirectMessageSheet
        open={open}
        onOpenChange={setOpen}
        chatId={chatId}
        otherProfile={otherProfile || null}
      />
    </DirectMessageContext.Provider>
  );
}

export function useDirectMessage() {
  const ctx = useContext(DirectMessageContext);
  if (!ctx) {
    return {
      openDm: async () => {
        if (import.meta.env.DEV) console.warn('[DirectMessage] openDm called outside provider');
      },
      closeDm: () => {},
    } as DirectMessageContextValue;
  }
  return ctx;
}
