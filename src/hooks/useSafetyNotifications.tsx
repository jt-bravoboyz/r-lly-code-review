import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSafetyNotifications() {
  const { profile } = useAuth();

  // Notify when someone starts participating in R@lly Home
  const notifyGoingHome = async (eventId: string, eventTitle?: string) => {
    if (!profile) return;

    try {
      await supabase.functions.invoke('send-event-notification', {
        body: {
          type: 'going_home',
          eventId,
          title: '🏠 Someone is Heading Home',
          body: `${profile.display_name || 'An attendee'} started Participating in R@lly Home`,
          excludeProfileId: profile.id,
        },
      });
    } catch (error) {
      console.error('Failed to send going home notification:', error);
    }
  };

  // Notify when someone arrives safely
  const notifyArrivedSafe = async (eventId: string, eventTitle?: string) => {
    if (!profile) return;

    try {
      await supabase.functions.invoke('send-event-notification', {
        body: {
          type: 'arrived_safe',
          eventId,
          title: '✅ Safe Arrival!',
          body: `${profile.display_name || 'An attendee'} has arrived safely`,
          excludeProfileId: profile.id,
        },
      });
    } catch (error) {
      console.error('Failed to send arrival notification:', error);
    }
  };

  // Notify when DD confirms a dropoff
  const notifyDDDropoff = async (
    eventId: string, 
    passengerName: string, 
    ddName: string
  ) => {
    try {
      await supabase.functions.invoke('send-event-notification', {
        body: {
          type: 'arrived_safe',
          eventId,
          title: '🚗 Passenger Dropped Off',
          body: `${ddName} confirmed ${passengerName} was dropped off safely`,
        },
      });
    } catch (error) {
      console.error('Failed to send DD dropoff notification:', error);
    }
  };

  // Notify when all safety confirmations are complete
  const notifySafetyComplete = async (eventId: string, eventTitle?: string) => {
    try {
      await supabase.functions.invoke('send-event-notification', {
        body: {
          type: 'safety_complete',
          eventId,
          title: '🎉 Everyone is Safe!',
          body: `All attendees at ${eventTitle || 'the rally'} have confirmed their safety status`,
        },
      });
    } catch (error) {
      console.error('Failed to send safety complete notification:', error);
    }
  };

  return {
    notifyGoingHome,
    notifyArrivedSafe,
    notifyDDDropoff,
    notifySafetyComplete,
  };
}
