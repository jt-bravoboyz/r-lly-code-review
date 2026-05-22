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

function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return raw.trim() || null;
}

function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

export function useUpsertUserContacts() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (contacts: { name?: string; phone?: string; email?: string; source: string }[]) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const normalized = contacts
        .map(c => ({
          name: c.name?.trim() || null,
          phone: normalizePhone(c.phone),
          email: normalizeEmail(c.email),
          source: c.source,
        }))
        .filter(c => c.phone || c.email);

      if (normalized.length === 0) return [];

      const rows = normalized.map(c => ({
        owner_id: profile.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        source: c.source,
        last_synced_at: new Date().toISOString(),
      }));

      const withPhone = rows.filter(c => c.phone !== null);
      const emailOnly = rows.filter(c => c.phone === null && c.email !== null);

      let allData: any[] = [];

      if (withPhone.length > 0) {
        const { data, error } = await supabase
          .from('user_contacts')
          .upsert(withPhone, { onConflict: 'owner_id,phone', ignoreDuplicates: true })
          .select();
        if (error) throw error;
        if (data) allData = allData.concat(data);
      }

      if (emailOnly.length > 0) {
        const { data, error } = await supabase
          .from('user_contacts')
          .upsert(emailOnly, { onConflict: 'owner_id,email', ignoreDuplicates: true })
          .select();
        if (error) throw error;
        if (data) allData = allData.concat(data);
      }

      return allData;
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
