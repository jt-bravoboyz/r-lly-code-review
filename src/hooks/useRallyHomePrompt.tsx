import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PromptStatus {
  isUndecided: boolean;
  needsReconfirmation: boolean;
  canPrompt: boolean;
  isParticipating: boolean;
  hasArrivedSafely: boolean;
  isDD: boolean;
}

/**
 * Hook to determine if an attendee should be prompted for R@lly Home safety choice.
 * 
 * @param eventId - The event ID
 * @param profileId - The profile ID to check
 * @param isBarHopTransitionPoint - UI-layer flag indicating we're at a bar hop transition point
 * 
 * Re-confirmation rules:
 * - Re-prompt ONLY when attendee is actively in After R@lly (after_rally_opted_in = true)
 * - OR when Bar Hop sequence reached a transition prompt point (UI-layer via isBarHopTransitionPoint)
 * - "Continue the Night" is NOT a safety state - leaves attendee undecided
 * - Once confirmed, never prompt again for that event
 */
export function useRallyHomePrompt(
  eventId: string | undefined,
  profileId: string | undefined,
  isBarHopTransitionPoint: boolean = false
): PromptStatus {
  const { data: attendee, isLoading } = useQuery({
    queryKey: ['attendee-prompt-status', eventId, profileId],
    queryFn: async () => {
      if (!eventId || !profileId) return null;

      // Get attendee data
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('event_attendees')
        .select(`
          going_home_at, 
          arrived_safely,
          after_rally_opted_in,
          is_dd,
          not_participating_rally_home_confirmed,
          dd_dropoff_confirmed_at
        `)
        .eq('event_id', eventId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (attendeeError) throw attendeeError;
      if (!attendeeData) return null;

      // Get event data separately
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('is_barhop, status')
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) throw eventError;

      return {
        going_home_at: attendeeData.going_home_at,
        arrived_safely: (attendeeData as any).arrived_safely ?? false,
        not_participating_rally_home_confirmed: (attendeeData as any).not_participating_rally_home_confirmed ?? null,
        dd_dropoff_confirmed_at: (attendeeData as any).dd_dropoff_confirmed_at ?? null,
        after_rally_opted_in: (attendeeData as any).after_rally_opted_in,
        is_dd: (attendeeData as any).is_dd,
        event: eventData,
      };
    },
    enabled: !!eventId && !!profileId,
  });

  if (isLoading || !attendee) {
    return {
      isUndecided: false,
      needsReconfirmation: false,
      canPrompt: false,
      isParticipating: false,
      hasArrivedSafely: false,
      isDD: false,
    };
  }

  const hasArrivedSafely = attendee.arrived_safely || !!attendee.dd_dropoff_confirmed_at;
  const isParticipating = !!attendee.going_home_at && !hasArrivedSafely;
  const isDD = attendee.is_dd || false;

  // Undecided: neither participating nor confirmed not participating
  const isUndecided = 
    attendee.going_home_at === null && 
    attendee.not_participating_rally_home_confirmed === null;

  // Re-confirmation for After R@lly (from DB - attendee opted in to after rally)
  const needsAfterRallyReconfirmation = 
    attendee.not_participating_rally_home_confirmed === true &&
    attendee.going_home_at === null &&
    attendee.after_rally_opted_in === true;

  // Re-confirmation for Bar Hop (UI-layer only, triggered at transition points)
  const needsBarHopReconfirmation = 
    attendee.not_participating_rally_home_confirmed === true &&
    attendee.going_home_at === null &&
    attendee.event?.is_barhop === true &&
    isBarHopTransitionPoint;

  const needsReconfirmation = needsAfterRallyReconfirmation || needsBarHopReconfirmation;

  // Can prompt if undecided OR needs re-confirmation
  // But never prompt if already arrived safely or actively participating
  const canPrompt = !hasArrivedSafely && !isParticipating && (isUndecided || needsReconfirmation);

  return {
    isUndecided,
    needsReconfirmation,
    canPrompt,
    isParticipating,
    hasArrivedSafely,
    isDD,
  };
}

/**
 * Hook for the current authenticated user's prompt status
 */
export function useMyRallyHomePrompt(
  eventId: string | undefined,
  isBarHopTransitionPoint: boolean = false
): PromptStatus {
  const { profile } = useAuth();
  return useRallyHomePrompt(eventId, profile?.id, isBarHopTransitionPoint);
}
