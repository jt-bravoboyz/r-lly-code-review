import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsDD } from '@/hooks/useDDManagement';
import { toast } from 'sonner';
import { getPublicName } from '@/lib/identity';

interface AddPassengerDialogProps {
  eventId: string;
}

export function AddPassengerDialog({ eventId }: AddPassengerDialogProps) {
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch DD's ride
  const { data: myRide } = useQuery({
    queryKey: ['dd-ride', eventId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('rides')
        .select('id, available_seats')
        .eq('event_id', eventId)
        .eq('driver_id', profile.id)
        .in('status', ['active', 'full', 'paused'])
        .maybeSingle();
      return data;
    },
    enabled: !!isDD && !!profile?.id && open,
  });

  // Fetch attendees + already-accepted passengers across all rides
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['add-passenger-candidates', eventId, myRide?.id],
    queryFn: async () => {
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('profile_id, is_dd, ride_pickup_location, ride_pickup_lat, ride_pickup_lng, status')
        .eq('event_id', eventId)
        .neq('status', 'pending');

      const profileIds = (attendees || [])
        .map((a: any) => a.profile_id)
        .filter((id: string | null) => id && id !== profile?.id);

      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, full_name, nickname, avatar_url')
        .in('id', profileIds.length > 0 ? profileIds : ['__none__']);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const { data: allRides } = await supabase
        .from('rides')
        .select('id')
        .eq('event_id', eventId);
      const rideIds = (allRides || []).map((r) => r.id);

      let accepted = new Set<string>();
      if (rideIds.length > 0) {
        const { data: rps } = await supabase
          .from('ride_passengers')
          .select('passenger_id')
          .in('ride_id', rideIds)
          .eq('status', 'accepted');
        accepted = new Set((rps || []).map((p) => p.passenger_id));
      }

      return (attendees || [])
        .filter((a: any) => {
          const prof = profileMap.get(a.profile_id);
          return prof && a.profile_id !== profile?.id && !a.is_dd && !accepted.has(a.profile_id);
        })
        .map((a: any) => {
          const prof = profileMap.get(a.profile_id) as any;
          return {
            id: prof.id,
            name: getPublicName(prof),
            avatarUrl: prof.avatar_url,
            pickupLocation: a.ride_pickup_location,
            pickupLat: a.ride_pickup_lat,
            pickupLng: a.ride_pickup_lng,
          };
        });
    },
    enabled: open && !!profile?.id,
  });

  const handleAdd = async (candidate: NonNullable<typeof candidates>[number]) => {
    if (!myRide?.id) {
      toast.error('You need to be DD with an active ride');
      return;
    }
    setAddingId(candidate.id);
    try {
      const { error } = await supabase.from('ride_passengers').insert({
        ride_id: myRide.id,
        passenger_id: candidate.id,
        pickup_location: candidate.pickupLocation,
        pickup_lat: candidate.pickupLat,
        pickup_lng: candidate.pickupLng,
        status: 'accepted',
      });
      if (error) {
        if (error.code === '23505') {
          toast.info('Already in a ride.');
        } else {
          throw error;
        }
      } else {
        // Clear any broadcast flag
        await supabase
          .from('event_attendees')
          .update({ needs_ride: false })
          .eq('event_id', eventId)
          .eq('profile_id', candidate.id);

        toast.success(`Added ${candidate.name} to your ride 🚗`);
        queryClient.invalidateQueries({ queryKey: ['rides'] });
        queryClient.invalidateQueries({ queryKey: ['unassigned-riders', eventId] });
        queryClient.invalidateQueries({ queryKey: ['my-ride-accepted-count'] });
        queryClient.invalidateQueries({ queryKey: ['add-passenger-candidates', eventId] });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add passenger');
    } finally {
      setAddingId(null);
    }
  };

  if (!isDD) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Add a passenger to your ride
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Add Passenger</DialogTitle>
          <DialogDescription className="text-sm">
            Pick any attendee to add to your car.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !candidates || candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No available attendees to add.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {c.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.pickupLocation && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          📍 {c.pickupLocation}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAdd(c)}
                    disabled={addingId === c.id}
                  >
                    {addingId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
