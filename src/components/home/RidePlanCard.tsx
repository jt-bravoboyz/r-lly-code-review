import { useState, useEffect } from 'react';
import { Car, Shield, Navigation, MapPin, RefreshCw, User, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { AttendeeWithSafetyStatus } from '@/hooks/useSafetyStatus';
import { getUserRideState, type RidePlan } from '@/lib/rideState';

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
  /** UX-6: Event status for phase-aware labels */
  eventStatus?: string;
}

function getPlanLabel(plan: RidePlan): string {
  switch (plan) {
    case 'dd': return 'You\'re Driving';
    case 'rider': return 'You\'re Riding';
    case 'self': return 'You\'re Solo';
    case 'unset': return 'No plan set';
  }
}

function getPlanIcon(plan: RidePlan) {
  switch (plan) {
    case 'dd': return Shield;
    case 'rider': return Car;
    case 'self': return MapPin;
    case 'unset': return MapPin;
  }
}

export function RidePlanCard({ myStatus, eventId, onChangePlan, onSetDestination, hasDestination, eventStatus }: RidePlanCardProps) {
  const [assignedDriver, setAssignedDriver] = useState<AssignedDriver | null>(null);
  const [isLoadingDriver, setIsLoadingDriver] = useState(false);
  
  // ARCH-3: Use unified ride state utility
  const rideState = getUserRideState(myStatus);
  const PlanIcon = getPlanIcon(rideState.plan);
  
  // UX-6: Phase-aware label
  const isPostEvent = eventStatus === 'after_rally' || eventStatus === 'completed';

  // MED-6: Look up assigned driver for riders with loading state
  useEffect(() => {
    if (rideState.plan !== 'rider') return;
    
    setIsLoadingDriver(true);
    const fetchDriver = async () => {
      try {
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
      } finally {
        setIsLoadingDriver(false);
      }
    };
    
    fetchDriver();
  }, [rideState.plan, myStatus.profile_id, eventId]);

  // Determine if there's detail content worth showing
  const hasDetails = rideState.plan === 'rider' || rideState.plan === 'dd';

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

        <Collapsible>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <PlanIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm">{getPlanLabel(rideState.plan)}</p>
                {hasDetails && (
                  <CollapsibleTrigger asChild>
                    <button className="p-0.5 rounded hover:bg-muted/50 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                )}
              </div>
            </div>
          </div>

          <CollapsibleContent>
            <div className="pl-[52px] pt-1 space-y-0.5">
              {rideState.plan === 'rider' && isLoadingDriver && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Looking up your DD...
                </p>
              )}
              {rideState.plan === 'rider' && !isLoadingDriver && assignedDriver && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Riding with {assignedDriver.display_name || 'your DD'}
                </p>
              )}
              {rideState.plan === 'rider' && !isLoadingDriver && !assignedDriver && (
                <p className="text-xs text-muted-foreground">
                  Waiting for a DD to accept
                </p>
              )}
              {rideState.plan === 'rider' && isPostEvent && rideState.dropoffLocation && (
                <p className="text-xs text-muted-foreground">
                  📍 Drop Off: {rideState.dropoffLocation}
                </p>
              )}
              {rideState.plan === 'rider' && !isPostEvent && rideState.pickupLocation && (
                <p className="text-xs text-muted-foreground">
                  📍 Pickup: {rideState.pickupLocation}
                </p>
              )}
              {rideState.plan === 'dd' && (
                <p className="text-xs text-muted-foreground">
                  Thanks for keeping everyone safe! 🙌
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {!hasDestination && rideState.plan === 'self' && (
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
