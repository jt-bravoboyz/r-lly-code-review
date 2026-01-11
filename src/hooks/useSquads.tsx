import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Squad {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
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

export function useSquads() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['squads', profile?.id],
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
      return data as Squad[];
    },
    enabled: !!profile?.id,
  });
}

export function useCreateSquad() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Create squad
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .insert({ name, owner_id: profile.id })
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

      return squad;
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ['squads'] });
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
      queryClient.invalidateQueries({ queryKey: ['squads'] });
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
