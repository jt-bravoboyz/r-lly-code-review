import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Car, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsDD } from '@/hooks/useDDManagement';
import { useMyAttendeeStatus } from '@/hooks/useSafetyStatus';
import { useSafetyNotifications } from '@/hooks/useSafetyNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DDArrivedButtonProps {
  eventId: string;
}

export function DDArrivedButton({ eventId }: DDArrivedButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const { data: myStatus } = useMyAttendeeStatus(eventId);
  const { notifyArrivedSafe } = useSafetyNotifications();
  const queryClient = useQueryClient();

  // Only show for DDs who haven't marked arrived_safely
  if (!isDD || !profile?.id) {
    return null;
  }

  // Already arrived - show disabled state
  if (myStatus?.arrived_safely) {
    return (
      <Button
        disabled
        className="w-full bg-green-500/20 text-green-700 rounded-full font-montserrat h-12 cursor-default"
      >
        <CheckCircle2 className="h-5 w-5 mr-2" />
        DD Arrived Safely ✓
      </Button>
    );
  }

  const handleDDArrive = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({
          arrived_safely: true,
          arrived_at: new Date().toISOString(),
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      // Award safe arrival points
      try {
        await supabase.rpc('rly_award_points_by_profile', {
          p_profile_id: profile.id,
          p_event_type: 'safe_arrival',
          p_source_id: eventId
        });
      } catch (pointsError) {
        console.error('Failed to award safe_arrival points:', pointsError);
      }

      // Send notification to host/cohosts
      notifyArrivedSafe(eventId);

      toast.success('DD arrival confirmed! 🚗', {
        description: 'Great job getting everyone home safely!',
      });
      queryClient.invalidateQueries({ queryKey: ['event-safety-status', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-attendee-status', eventId] });
    } catch (error: any) {
      console.error('DD arrival error:', error);
      toast.error(error.message || 'Failed to confirm arrival');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDDArrive}
      disabled={isLoading}
      className="w-full bg-primary hover:bg-primary/90 rounded-full font-montserrat h-12"
    >
      <Car className="h-5 w-5 mr-2" />
      {isLoading ? 'Confirming...' : "DD: I've Arrived Home Safely"}
    </Button>
  );
}
