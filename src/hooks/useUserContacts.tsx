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

      // Fetch existing contacts for this owner to do merge-aware saves
      const phones = normalized.map(c => c.phone).filter(Boolean) as string[];
      const emails = normalized.map(c => c.email).filter(Boolean) as string[];

      let existing: UserContact[] = [];

      if (phones.length > 0 || emails.length > 0) {
        let query = supabase
          .from('user_contacts')
          .select('*')
          .eq('owner_id', profile.id);

        // Build OR filter for phone or email matches
        const orParts: string[] = [];
        if (phones.length > 0) orParts.push(`phone.in.(${phones.join(',')})`);
        if (emails.length > 0) orParts.push(`email.in.(${emails.join(',')})`);
        query = query.or(orParts.join(','));

        const { data } = await query;
        existing = (data || []) as UserContact[];
      }

      // Build lookup maps
      const byPhone = new Map<string, UserContact>();
      const byEmail = new Map<string, UserContact>();
      existing.forEach(e => {
        if (e.phone) byPhone.set(e.phone, e);
        if (e.email) byEmail.set(e.email, e);
      });

      const updates: { id: string; name?: string | null; phone?: string | null; email?: string | null; source: string; last_synced_at: string }[] = [];
      const inserts: { owner_id: string; name: string | null; phone: string | null; email: string | null; source: string; last_synced_at: string }[] = [];
      const now = new Date().toISOString();

      for (const c of normalized) {
        const matchByPhone = c.phone ? byPhone.get(c.phone) : undefined;
        const matchByEmail = c.email ? byEmail.get(c.email) : undefined;
        const match = matchByPhone || matchByEmail;

        if (match) {
          // Merge: update existing row with any new fields
          updates.push({
            id: match.id,
            name: c.name || match.name,
            phone: c.phone || match.phone,
            email: c.email || match.email,
            source: c.source,
            last_synced_at: now,
          });
        } else {
          inserts.push({
            owner_id: profile.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            source: c.source,
            last_synced_at: now,
          });
        }
      }

      let allData: any[] = [];

      // Process updates one by one (by id)
      for (const u of updates) {
        const { id, ...fields } = u;
        const { data, error } = await supabase
          .from('user_contacts')
          .update(fields)
          .eq('id', id)
          .select();
        if (error) throw error;
        if (data) allData = allData.concat(data);
      }

      // Batch insert new contacts
      if (inserts.length > 0) {
        const { data, error } = await supabase
          .from('user_contacts')
          .insert(inserts)
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
