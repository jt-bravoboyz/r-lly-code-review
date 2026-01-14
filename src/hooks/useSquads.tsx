import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SquadSymbol } from '@/components/squads/SquadSymbolPicker';

export interface Squad {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  symbol?: string;
  group_photo_url?: string;
  isOwned?: boolean;
  members?: SquadMember[];
}

export interface SquadMember {
  id: string;
  squad_id: string;
  profile_id: string;
  added_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Get squads the user owns
export function useOwnedSquads() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['owned-squads', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          members:squad_members(
            *,
            profile:safe_profiles(id, display_name, avatar_url)
          )
        `)
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(s => ({ ...s, isOwned: true })) as Squad[];
    },
    enabled: !!profile?.id,
  });
}

// Get squads the user is a member of (but doesn't own)
export function useMemberSquads() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['member-squads', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // First get squad IDs where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('profile_id', profile.id);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      const squadIds = memberships.map(m => m.squad_id);

      // Then fetch those squads (excluding ones they own)
      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          members:squad_members(
            *,
            profile:safe_profiles(id, display_name, avatar_url)
          )
        `)
        .in('id', squadIds)
        .neq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(s => ({ ...s, isOwned: false })) as Squad[];
    },
    enabled: !!profile?.id,
  });
}

// Combined: all squads user is part of (owned + member)
export function useAllMySquads() {
  const { data: ownedSquads, isLoading: loadingOwned } = useOwnedSquads();
  const { data: memberSquads, isLoading: loadingMember } = useMemberSquads();

  const allSquads = [
    ...(ownedSquads || []),
    ...(memberSquads || []),
  ];

  return {
    data: allSquads,
    isLoading: loadingOwned || loadingMember,
  };
}

// Legacy alias for backward compatibility
export function useSquads() {
  return useOwnedSquads();
}

export function useCreateSquad() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ name, memberIds, symbol = 'shield' }: { name: string; memberIds: string[]; symbol?: SquadSymbol }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Create squad with symbol
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .insert({ name, owner_id: profile.id, symbol })
        .select()
        .single();

      if (squadError) throw squadError;

      // Add members
      if (memberIds.length > 0) {
        const { error: membersError } = await supabase
          .from('squad_members')
          .insert(memberIds.map(id => ({ squad_id: squad.id, profile_id: id })));

        if (membersError) throw membersError;
      }

      // Create squad chat automatically
      const { error: chatError } = await supabase
        .from('chats')
        .insert({ 
          squad_id: squad.id, 
          is_group: true,
          name: `${name} Chat`
        });

      if (chatError) {
        console.error('Failed to create squad chat:', chatError);
        // Don't throw - squad was created, chat is optional
      }

      return squad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['all-squad-chats'] });
    },
  });
}

export function useUpdateSquadSymbol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ squadId, symbol }: { squadId: string; symbol: SquadSymbol }) => {
      const { error } = await supabase
        .from('squads')
        .update({ symbol })
        .eq('id', squadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
    },
  });
}

export function useDeleteSquad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (squadId: string) => {
      const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
    },
  });
}

export function useAddSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ squadId, profileId }: { squadId: string; profileId: string }) => {
      const { error } = await supabase
        .from('squad_members')
        .insert({ squad_id: squadId, profile_id: profileId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['rally-friends'] });
    },
  });
}

export function useRemoveSquadMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ squadId, profileId }: { squadId: string; profileId: string }) => {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      queryClient.invalidateQueries({ queryKey: ['rally-friends'] });
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .order('display_name');

      if (error) throw error;
      return data;
    },
  });
}
