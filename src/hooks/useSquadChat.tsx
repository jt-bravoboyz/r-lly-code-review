import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Message } from './useChat';

export interface SquadChat {
  id: string;
  squad_id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  linked_event_id: string | null;
  squad?: {
    id: string;
    name: string;
    symbol: string | null;
  };
  linked_event?: {
    id: string;
    title: string;
  };
}

export function useSquadChat(squadId: string | undefined) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['squad-chat', squadId],
    queryFn: async () => {
      if (!squadId) return null;

      // Find or create chat for this squad
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select(`
          *,
          squad:squads(id, name, symbol)
        `)
        .eq('squad_id', squadId)
        .maybeSingle();

      if (findError) throw findError;
      
      if (existingChat) {
        // Fetch linked event separately if exists
        let linked_event = null;
        if (existingChat.linked_event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('id, title')
            .eq('id', existingChat.linked_event_id)
            .single();
          linked_event = eventData;
        }
        return { ...existingChat, linked_event } as SquadChat;
      }

      // Create new chat for squad (only owner can do this)
      const { data: squad } = await supabase
        .from('squads')
        .select('name, owner_id')
        .eq('id', squadId)
        .single();

      if (!squad || squad.owner_id !== profile?.id) {
        // Not the owner, can't create - just return null
        return null;
      }

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({ 
          squad_id: squadId, 
          is_group: true,
          name: `${squad.name} Chat`
        })
        .select(`
          *,
          squad:squads(id, name, symbol)
        `)
        .single();

      if (createError) throw createError;
      return newChat as SquadChat;
    },
    enabled: !!squadId && !!profile?.id,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['squad-chat-messages', chat?.id],
    queryFn: async () => {
      if (!chat?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, display_name, avatar_url)
        `)
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!chat?.id,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`squad-chat-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(id, display_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            queryClient.setQueryData(['squad-chat-messages', chat.id], (old: Message[] | undefined) => {
              if (!old) return [newMessage];
              // Avoid duplicates
              if (old.some(m => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat?.id, queryClient]);

  return {
    chat,
    messages: messages || [],
    isLoading: chatLoading || messagesLoading,
  };
}

export function useAllSquadChats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['all-squad-chats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get all squads user owns or is a member of
      const { data: ownedSquads } = await supabase
        .from('squads')
        .select('id')
        .eq('owner_id', profile.id);

      const { data: memberSquads } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('profile_id', profile.id);

      const squadIds = [
        ...(ownedSquads?.map(s => s.id) || []),
        ...(memberSquads?.map(s => s.squad_id) || [])
      ];

      if (squadIds.length === 0) return [];

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          squad:squads(id, name, symbol)
        `)
        .in('squad_id', squadIds);

      if (error) throw error;
      
      // Fetch linked events for any chats that have them
      const chatsWithEvents = await Promise.all((chats || []).map(async (chat) => {
        let linked_event = null;
        if (chat.linked_event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('id, title')
            .eq('id', chat.linked_event_id)
            .single();
          linked_event = eventData;
        }
        return { ...chat, linked_event } as SquadChat;
      }));
      
      return chatsWithEvents;
    },
    enabled: !!profile?.id,
  });
}

// Check if an event should use a squad chat (all attendees from single squad)
export async function checkEventSquadChatEligibility(eventId: string): Promise<{ 
  useSquadChat: boolean; 
  squadId?: string;
  chatId?: string;
}> {
  // Get all event attendees
  const { data: attendees } = await supabase
    .from('event_attendees')
    .select('profile_id')
    .eq('event_id', eventId);

  // Get the event creator
  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', eventId)
    .single();

  if (!attendees || !event) {
    return { useSquadChat: false };
  }

  // All participants including creator
  const allParticipantIds = new Set([
    event.creator_id,
    ...attendees.map(a => a.profile_id)
  ]);

  // Get all squads and their complete member lists
  const { data: allSquads } = await supabase
    .from('squads')
    .select(`
      id,
      owner_id,
      members:squad_members(profile_id)
    `);

  if (!allSquads) return { useSquadChat: false };

  // Check each squad to see if all participants are exactly from one squad
  for (const squad of allSquads) {
    // Get all members of this squad (owner + members)
    const squadMemberIds = new Set([
      squad.owner_id,
      ...squad.members.map(m => m.profile_id)
    ]);

    // Check if all participants are in this squad AND all squad members are participants
    const allParticipantsInSquad = [...allParticipantIds].every(id => squadMemberIds.has(id));
    const allSquadMembersParticipating = [...squadMemberIds].every(id => allParticipantIds.has(id));

    if (allParticipantsInSquad && allSquadMembersParticipating) {
      // Find the squad's chat
      const { data: squadChat } = await supabase
        .from('chats')
        .select('id')
        .eq('squad_id', squad.id)
        .maybeSingle();

      return { 
        useSquadChat: true, 
        squadId: squad.id,
        chatId: squadChat?.id
      };
    }
  }

  return { useSquadChat: false };
}

// Link a squad chat to an event
export async function linkSquadChatToEvent(chatId: string, eventId: string) {
  const { error } = await supabase
    .from('chats')
    .update({ linked_event_id: eventId })
    .eq('id', chatId);

  if (error) throw error;
}

// Unlink a squad chat from an event
export async function unlinkSquadChatFromEvent(chatId: string) {
  const { error } = await supabase
    .from('chats')
    .update({ linked_event_id: null })
    .eq('id', chatId);

  if (error) throw error;
}
