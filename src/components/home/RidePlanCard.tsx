import { useState, useEffect } from 'react';
import { Car, Shield, Navigation, MapPin, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AttendeeWithSafetyStatus } from '@/hooks/useSafetyStatus';

type RidePlan = 'dd' | 'needs_ride' | 'self';

interface AssignedDriver {
  display_name: string | null;
  avatar_url: string | null;
}

interface RidePlanCardProps {
  myStatus: AttendeeWithSafetyStatus;
  eventId: string;
  onChangePlan: () => void;
  onSetDestination: () => void;
  hasDestination: boolean;
}

function getRidePlan(status: AttendeeWithSafetyStatus): RidePlan {
  if (status.is_dd) return 'dd';
  if (status.needs_ride) return 'needs_ride';
  return 'self';
}

function getPlanLabel(plan: RidePlan): string {
  switch (plan) {
    case 'dd': return 'You\'re a Designated Driver';
    case 'needs_ride': return 'Riding with a DD';
    case 'self': return 'Getting home on my own';
  }
}

function getPlanIcon(plan: RidePlan) {
  switch (plan) {
    case 'dd': return Shield;
    case 'needs_ride': return Car;
    case 'self': return MapPin;
  }
}

export function RidePlanCard({ myStatus, eventId, onChangePlan, onSetDestination, hasDestination }: RidePlanCardProps) {
  const [assignedDriver, setAssignedDriver] = useState<AssignedDriver | null>(null);
  const plan = getRidePlan(myStatus);
  const PlanIcon = getPlanIcon(plan);

  // Look up assigned driver for riders
  useEffect(() => {
    if (plan !== 'needs_ride') return;
    
    const fetchDriver = async () => {
      // Check ride_passengers for an accepted ride
      const { data: passengers } = await supabase
        .from('ride_passengers')
        .select('ride_id, status')
        .eq('passenger_id', myStatus.profile_id)
        .eq('status', 'accepted')
        .limit(1);

      if (passengers && passengers.length > 0) {
        const { data: ride } = await supabase
          .from('rides')
          .select('driver_id')
          .eq('id', passengers[0].ride_id)
          .eq('event_id', eventId)
          .maybeSingle();

        if (ride?.driver_id) {
          const { data: driverProfile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', ride.driver_id)
            .maybeSingle();
          
          if (driverProfile) {
            setAssignedDriver(driverProfile);
          }
        }
      }
    };
    
    fetchDriver();
  }, [plan, myStatus.profile_id, eventId]);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-montserrat text-muted-foreground uppercase tracking-wide">
            Your Plan Tonight
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary h-7 px-2"
            onClick={onChangePlan}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Change
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <PlanIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{getPlanLabel(plan)}</p>
            {plan === 'needs_ride' && assignedDriver && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" />
                Riding with {assignedDriver.display_name || 'your DD'}
              </p>
            )}
            {plan === 'needs_ride' && !assignedDriver && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Waiting for a DD to accept
              </p>
            )}
            {plan === 'needs_ride' && myStatus.ride_pickup_location && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📍 Pickup: {myStatus.ride_pickup_location}
              </p>
            )}
            {plan === 'dd' && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Thanks for keeping everyone safe! 🙌
              </p>
            )}
          </div>
        </div>

        {!hasDestination && plan === 'self' && (
          <Button
            className="w-full mt-1"
            variant="outline"
            size="sm"
            onClick={onSetDestination}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Set Destination
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
