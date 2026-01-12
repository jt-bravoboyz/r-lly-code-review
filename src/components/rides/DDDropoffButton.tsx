import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Car, Navigation } from 'lucide-react';
import { useEventSafetyStatus, getSafetyState } from '@/hooks/useSafetyStatus';
import { useAuth } from '@/hooks/useAuth';
import { useRides } from '@/hooks/useRides';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface DDDropoffButtonProps {
  eventId: string;
}

export function DDDropoffButton({ eventId }: DDDropoffButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { profile } = useAuth();
  const { data: attendees } = useEventSafetyStatus(eventId);
  const { data: rides } = useRides(eventId);
  const queryClient = useQueryClient();

  if (!profile) return null;

  // Find rides where current user is the driver
  const myRides = rides?.filter(r => r.driver?.id === profile.id) || [];
  
  // Get all passengers from my rides who are participating in R@lly Home
  const myPassengers = myRides.flatMap(ride => 
    (ride.passengers || [])
      .filter(p => p.status === 'confirmed')
      .map(p => ({
        ...p,
        rideId: ride.id,
      }))
  );

  // Find which passengers are participating in R@lly Home but haven't arrived
  const participatingPassengers = attendees?.filter(a => {
    const state = getSafetyState(a);
    const isMyPassenger = myPassengers.some(p => p.passenger?.id === a.profile_id);
    return isMyPassenger && state === 'participating';
  }) || [];

  if (participatingPassengers.length === 0) {
    return null;
  }

  const handleConfirmDropoff = async (passengerId: string, passengerName: string) => {
    if (!profile.id) return;

    setLoading(passengerId);
    try {
      // First verify passenger is participating (has going_home_at set)
      const { data: passenger, error: checkError } = await supabase
        .from('event_attendees')
        .select('going_home_at')
        .eq('event_id', eventId)
        .eq('profile_id', passengerId)
        .maybeSingle();

      if (checkError) throw checkError;
      
      if (!passenger?.going_home_at) {
        toast.error('Cannot confirm dropoff - passenger is not Participating in R@lly Home');
        return;
      }

      // Confirm the dropoff
      const { error } = await supabase
        .from('event_attendees')
        .update({
          dd_dropoff_confirmed_at: new Date().toISOString(),
          dd_dropoff_confirmed_by: profile.id,
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', passengerId);

      if (error) throw error;

      toast.success(`Confirmed drop-off for ${passengerName}!`);
      queryClient.invalidateQueries({ queryKey: ['event-safety-status', eventId] });
    } catch (error: any) {
      console.error('Dropoff confirmation error:', error);
      toast.error(error.message || 'Failed to confirm drop-off');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 font-montserrat">
          <Car className="h-4 w-4 text-primary" />
          DD Drop-off Confirmations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Confirm when you've safely dropped off passengers who are Participating in R@lly Home.
        </p>
        {participatingPassengers.map(passenger => (
          <div 
            key={passenger.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-background border"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={passenger.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {passenger.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {passenger.profile?.display_name || 'Unknown'}
              </p>
              <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px]">
                <Navigation className="h-2.5 w-2.5 mr-1" />
                Participating in R@lly Home
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConfirmDropoff(
                passenger.profile_id, 
                passenger.profile?.display_name || 'Passenger'
              )}
              disabled={loading === passenger.profile_id}
            >
              {loading === passenger.profile_id ? (
                'Confirming...'
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Dropped Off
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
