import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { normalizePhoneNumber } from './usePhoneContacts';

export interface PhoneInvite {
  id: string;
  event_id: string;
  invited_by: string;
  phone_number: string;
  display_name: string | null;
  invite_code: string;
  status: 'pending' | 'clicked' | 'joined' | 'expired';
  invited_at: string;
  claimed_by: string | null;
  event?: {
    id: string;
    title: string;
    start_time: string;
    location_name: string | null;
  };
}

// Get phone invites for an event
export function useEventPhoneInvites(eventId: string | undefined) {
  return useQuery({
    queryKey: ['phone-invites', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('phone_invites')
        .select('*')
        .eq('event_id', eventId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as PhoneInvite[];
    },
    enabled: !!eventId,
  });
}

// Create a phone invite and open SMS
export function useCreatePhoneInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      eventTitle,
      phoneNumber, 
      displayName,
      eventInviteCode,
    }: { 
      eventId: string; 
      eventTitle: string;
      phoneNumber: string; 
      displayName?: string;
      eventInviteCode: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const normalizedPhone = normalizePhoneNumber(phoneNumber);

      // Create phone invite record
      const { data, error } = await supabase
        .from('phone_invites')
        .insert({
          event_id: eventId,
          invited_by: profile.id,
          phone_number: normalizedPhone,
          display_name: displayName || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Already invited this number to this event');
        }
        throw error;
      }

      // Also record in invite history for quick re-invites
      await supabase
        .from('invite_history')
        .upsert({
          inviter_id: profile.id,
          invited_phone: normalizedPhone,
          invited_name: displayName || null,
          last_invited_at: new Date().toISOString(),
        }, { 
          onConflict: 'inviter_id,invited_phone' 
        });

      return { 
        ...data, 
        inviteCode: data.invite_code,
        eventInviteCode 
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['phone-invites', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['invite-history'] });
    },
  });
}

// Open native SMS with invite message
export function openSMSInvite(
  phoneNumber: string, 
  eventTitle: string, 
  inviteCode: string
) {
  const appStoreLink = 'https://apps.apple.com/app/rally'; // Placeholder
  const playStoreLink = 'https://play.google.com/store/apps/details?id=com.bravoboyz.rally'; // Placeholder
  const webLink = `${window.location.origin}/join/${inviteCode}`;
  
  const message = encodeURIComponent(
    `You're invited to "${eventTitle}" on R@lly! 🎉\n\n` +
    `Join here: ${webLink}\n\n` +
    `Code: ${inviteCode}\n\n` +
    `Download R@lly:\n` +
    `iOS: ${appStoreLink}\n` +
    `Android: ${playStoreLink}`
  );
  
  // Use sms: protocol to open native SMS app
  const smsUrl = `sms:${phoneNumber}?body=${message}`;
  window.open(smsUrl, '_blank');
}

// Claim phone invites when user signs up (call after auth)
export function useClaimPhoneInvites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, profileId }: { phone: string; profileId: string }) => {
      const normalizedPhone = normalizePhoneNumber(phone);

      const { data, error } = await supabase
        .rpc('claim_phone_invites', {
          p_phone: normalizedPhone,
          p_profile_id: profileId,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-invites'] });
      queryClient.invalidateQueries({ queryKey: ['phone-invites'] });
    },
  });
}
