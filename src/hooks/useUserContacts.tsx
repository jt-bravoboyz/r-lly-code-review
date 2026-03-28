import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserContact {
  id: string;
  owner_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  last_synced_at: string;
  created_at: string;
}

export function useUserContacts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-contacts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('user_contacts')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as UserContact[];
    },
    enabled: !!profile?.id,
  });
}

export function useUpsertUserContacts() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (contacts: { name?: string; phone?: string; email?: string; source: string }[]) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const records = contacts
        .filter(c => c.phone || c.email)
        .map(c => ({
          owner_id: profile.id,
          name: c.name || null,
          phone: c.phone || null,
          email: c.email || null,
          source: c.source,
          last_synced_at: new Date().toISOString(),
        }));

      if (records.length === 0) return [];

      // Batch upsert — use phone as conflict key when available, else email
      const { data, error } = await supabase
        .from('user_contacts')
        .upsert(records, { onConflict: 'owner_id,phone', ignoreDuplicates: false })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
    },
  });
}

export function useDeleteAllUserContacts() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_contacts')
        .delete()
        .eq('owner_id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
    },
  });
}
