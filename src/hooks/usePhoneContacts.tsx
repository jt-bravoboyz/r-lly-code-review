import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PhoneContact {
  id: string;
  profile_id: string;
  phone_number: string;
  display_name: string | null;
  created_at: string;
}

// Fetch user's synced contacts
export function usePhoneContacts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['phone-contacts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('phone_contacts')
        .select('*')
        .eq('profile_id', profile.id)
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as PhoneContact[];
    },
    enabled: !!profile?.id,
  });
}

// Sync contacts from device
export function useSyncContacts() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (contacts: { phone: string; name: string }[]) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Normalize phone numbers and prepare for upsert
      const contactRecords = contacts.map(c => ({
        profile_id: profile.id,
        phone_number: normalizePhoneNumber(c.phone),
        display_name: c.name || null,
      }));

      // Use upsert to handle duplicates
      const { data, error } = await supabase
        .from('phone_contacts')
        .upsert(contactRecords, { 
          onConflict: 'profile_id,phone_number',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-contacts'] });
    },
  });
}

// Delete a contact
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('phone_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-contacts'] });
    },
  });
}

// Helper to normalize phone numbers
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Ensure US numbers have country code
  if (normalized.length === 10) {
    normalized = '+1' + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('1')) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

export { normalizePhoneNumber };
