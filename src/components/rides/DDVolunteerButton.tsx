import { useState } from 'react';
import { Car, Shield, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DDSetupDialog } from './DDSetupDialog';
import { useIsDD } from '@/hooks/useDDManagement';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DDVolunteerButtonProps {
  eventId: string;
  eventLocationName?: string;
  eventLocationLat?: number;
  eventLocationLng?: number;
}

export function DDVolunteerButton({ 
  eventId, 
  eventLocationName,
  eventLocationLat,
  eventLocationLng,
}: DDVolunteerButtonProps) {
  const [showSetup, setShowSetup] = useState(false);
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);

  // Check for existing active ride
  const { data: existingRide } = useQuery({
    queryKey: ['dd-ride', eventId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('rides')
        .select('id, available_seats, pickup_location')
        .eq('event_id', eventId)
        .eq('driver_id', profile.id)
        .in('status', ['active', 'full', 'paused'])
        .maybeSingle();
      return data ? { ...data, notes: null } : null;
    },
    enabled: !!eventId && !!profile?.id && !!isDD,
  });

  // If already DD with active ride, show "Edit Ride" option
  if (isDD && existingRide) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <Badge className="bg-primary/20 text-primary border-primary">
            <Car className="h-3 w-3 mr-1" />
            You're the DD
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetup(true)}
            className="text-xs h-7"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Ride
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-right max-w-32">
          Remember to confirm your own arrival after all drop-offs
        </p>
        <DDSetupDialog
          eventId={eventId}
          eventLocationName={eventLocationName}
          eventLocationLat={eventLocationLat}
          eventLocationLng={eventLocationLng}
          open={showSetup}
          onOpenChange={setShowSetup}
          onComplete={() => setShowSetup(false)}
          mode="edit"
          existingRide={existingRide}
        />
      </div>
    );
  }

  // If DD but no ride yet - show setup
  if (isDD) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-primary/20 text-primary border-primary">
          <Car className="h-3 w-3 mr-1" />
          You're the DD
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
          Set Up Ride
        </Button>
        <DDSetupDialog
          eventId={eventId}
          eventLocationName={eventLocationName}
          eventLocationLat={eventLocationLat}
          eventLocationLng={eventLocationLng}
          open={showSetup}
          onOpenChange={setShowSetup}
          onComplete={() => setShowSetup(false)}
          mode="setup"
        />
      </div>
    );
  }

  // Not DD yet - show volunteer button
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSetup(true)}
        className="border-primary text-primary hover:bg-primary/10"
      >
        <Shield className="h-4 w-4 mr-2" />
        Volunteer as DD
      </Button>

      <DDSetupDialog
        eventId={eventId}
        eventLocationName={eventLocationName}
        eventLocationLat={eventLocationLat}
        eventLocationLng={eventLocationLng}
        open={showSetup}
        onOpenChange={setShowSetup}
        onComplete={() => setShowSetup(false)}
        mode="full"
      />
    </>
  );
}
