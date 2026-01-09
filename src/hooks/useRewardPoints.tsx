import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Point values for different actions
export const POINT_VALUES = {
  DD_RIDE_COMPLETE: 50, // Points for completing a ride as DD
  DD_BONUS_LATE_NIGHT: 25, // Bonus for rides after midnight
  SAFE_HOME_ARRIVAL: 10, // Points for marking safe arrival
  EVENT_ATTENDED: 5, // Points for attending an event
};

export function useAwardPoints() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ points, reason }: { points: number; reason: string }) => {
      if (!profile?.id) throw new Error('No profile');
      
      const currentPoints = profile.reward_points || 0;
      const newPoints = currentPoints + points;

      const { error } = await supabase
        .from('profiles')
        .update({ reward_points: newPoints })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      return { newPoints, addedPoints: points, reason };
    },
    onSuccess: async (data) => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success(`+${data.addedPoints} points earned!`, {
        description: data.reason,
      });
    },
    onError: () => {
      toast.error('Failed to award points');
    },
  });
}

export function useAwardDDPoints() {
  const awardPoints = useAwardPoints();

  const awardRideComplete = async () => {
    const now = new Date();
    const hour = now.getHours();
    const isLateNight = hour >= 0 && hour < 5;
    
    const basePoints = POINT_VALUES.DD_RIDE_COMPLETE;
    const bonusPoints = isLateNight ? POINT_VALUES.DD_BONUS_LATE_NIGHT : 0;
    const totalPoints = basePoints + bonusPoints;
    
    const reason = isLateNight 
      ? 'DD ride completed + late night bonus!' 
      : 'DD ride completed - thanks for being a safe driver!';

    await awardPoints.mutateAsync({ points: totalPoints, reason });
  };

  return { awardRideComplete, isPending: awardPoints.isPending };
}