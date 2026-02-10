import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Users, MapPin, Loader2, Car, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsDD } from '@/hooks/useDDManagement';
import { formatDistanceCompact } from '@/lib/formatDistance';
import { toast } from 'sonner';

interface RiderLineProps {
  eventId: string;
}

interface UnassignedRider {
  passengerId: string;
  requestId: string;
  rideId: string;
  displayName: string;
  avatarUrl: string | null;
  pickupLocation: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  requestedDriverId: string | null;
  requestedAt: string | null;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function RiderLine({ eventId }: RiderLineProps) {
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const queryClient = useQueryClient();
  const [pickingId, setPickingId] = useState<string | null>(null);

  // Fetch DD's own location from event_attendees
  const { data: myLocation } = useQuery({
    queryKey: ['my-attendee-location', eventId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('event_attendees')
        .select('current_lat, current_lng')
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!isDD && !!profile?.id,
    refetchInterval: 15000,
  });

  // Fetch DD's ride (to know seat capacity and which riders requested this DD)
  const { data: myRide } = useQuery({
    queryKey: ['dd-ride', eventId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('rides')
        .select('id, available_seats, status')
        .eq('event_id', eventId)
        .eq('driver_id', profile.id)
        .in('status', ['active', 'full', 'paused'])
        .maybeSingle();
      return data;
    },
    enabled: !!isDD && !!profile?.id,
  });

  // Fetch all pending ride_passengers for this event (unassigned riders)
  const { data: unassignedRiders, isLoading } = useQuery({
    queryKey: ['unassigned-riders', eventId],
    queryFn: async () => {
      // Get all rides for this event
      const { data: eventRides } = await supabase
        .from('rides')
        .select('id, driver_id')
        .eq('event_id', eventId)
        .in('status', ['active', 'full', 'paused']);

      if (!eventRides || eventRides.length === 0) return [];

      const rideIds = eventRides.map((r) => r.id);
      const rideDriverMap = new Map(eventRides.map((r) => [r.id, r.driver_id]));

      // Get pending passengers across all rides
      const { data: pendingPassengers } = await supabase
        .from('ride_passengers')
        .select(`
          id, ride_id, status, pickup_location, pickup_lat, pickup_lng, requested_at,
          passenger:profiles!ride_passengers_passenger_id_fkey(id, display_name, avatar_url)
        `)
        .in('ride_id', rideIds)
        .eq('status', 'pending');

      if (!pendingPassengers) return [];

      // Also get riders' locations from event_attendees
      const passengerIds = pendingPassengers.map((p) => (p.passenger as any)?.id).filter(Boolean);
      const { data: riderLocations } = await supabase
        .from('event_attendees')
        .select('profile_id, current_lat, current_lng, share_location')
        .eq('event_id', eventId)
        .in('profile_id', passengerIds);

      const locationMap = new Map(
        (riderLocations || []).map((l) => [l.profile_id, l])
      );

      // Deduplicate by passenger (a rider might have requested multiple DDs)
      const seen = new Set<string>();
      const riders: (UnassignedRider & { riderLat: number | null; riderLng: number | null })[] = [];

      for (const p of pendingPassengers) {
        const passenger = p.passenger as any;
        if (!passenger?.id || seen.has(passenger.id)) continue;
        seen.add(passenger.id);

        const loc = locationMap.get(passenger.id);
        const riderLat = loc?.share_location ? loc.current_lat : null;
        const riderLng = loc?.share_location ? loc.current_lng : null;

        riders.push({
          passengerId: passenger.id,
          requestId: p.id,
          rideId: p.ride_id,
          displayName: passenger.display_name || 'Anonymous',
          avatarUrl: passenger.avatar_url,
          pickupLocation: p.pickup_location,
          pickupLat: p.pickup_lat || riderLat,
          pickupLng: p.pickup_lng || riderLng,
          requestedDriverId: rideDriverMap.get(p.ride_id) || null,
          requestedAt: p.requested_at,
          riderLat,
          riderLng,
        });
      }

      return riders;
    },
    refetchInterval: 10000,
  });

  // Sort by distance to DD
  const sortedRiders = useMemo(() => {
    if (!unassignedRiders || unassignedRiders.length === 0) return [];

    const ddLat = myLocation?.current_lat;
    const ddLng = myLocation?.current_lng;

    return [...unassignedRiders]
      .map((r) => {
        const rLat = r.pickupLat ?? r.riderLat;
        const rLng = r.pickupLng ?? r.riderLng;
        let distanceMeters: number | null = null;
        if (ddLat && ddLng && rLat && rLng) {
          distanceMeters = haversineMeters(ddLat, ddLng, rLat, rLng);
        }
        return { ...r, distanceMeters };
      })
      .sort((a, b) => {
        if (a.distanceMeters != null && b.distanceMeters != null)
          return a.distanceMeters - b.distanceMeters;
        if (a.distanceMeters != null) return -1;
        if (b.distanceMeters != null) return 1;
        return 0;
      });
  }, [unassignedRiders, myLocation]);

  // Compute seats info for DD
  const seatsInfo = useMemo(() => {
    if (!myRide) return null;
    // Count accepted passengers on DD's ride
    // We'll use the rides query which already has passengers
    return { total: myRide.available_seats || 4 };
  }, [myRide]);

  // Fetch accepted count for my ride
  const { data: acceptedCount } = useQuery({
    queryKey: ['my-ride-accepted-count', myRide?.id],
    queryFn: async () => {
      if (!myRide?.id) return 0;
      const { count } = await supabase
        .from('ride_passengers')
        .select('id', { count: 'exact', head: true })
        .eq('ride_id', myRide.id)
        .eq('status', 'accepted');
      return count || 0;
    },
    enabled: !!myRide?.id,
  });

  const seatsRemaining = seatsInfo ? seatsInfo.total - (acceptedCount || 0) : null;
  const carFull = seatsRemaining !== null && seatsRemaining <= 0;

  // Pick a rider (accept their request if it's for this DD, or create a new passenger entry)
  const handlePick = async (rider: (typeof sortedRiders)[0]) => {
    if (!profile?.id || !myRide?.id) return;
    if (carFull) {
      toast.error('Your car is full!');
      return;
    }

    setPickingId(rider.passengerId);
    try {
      // Check if the rider already requested THIS DD's ride
      if (rider.rideId === myRide.id) {
        // Accept the existing request
        const { error } = await supabase
          .from('ride_passengers')
          .update({ status: 'accepted' })
          .eq('id', rider.requestId)
          .eq('ride_id', myRide.id);

        if (error) throw error;
      } else {
        // Rider requested a different DD - add them to this DD's ride
        const { error: insertError } = await supabase
          .from('ride_passengers')
          .insert({
            ride_id: myRide.id,
            passenger_id: rider.passengerId,
            pickup_location: rider.pickupLocation,
            pickup_lat: rider.pickupLat,
            pickup_lng: rider.pickupLng,
            status: 'accepted',
          });

        if (insertError) {
          if (insertError.code === '23505') {
            toast.info('Already picked by another DD.');
            return;
          }
          throw insertError;
        }

        // Decline the original request
        await supabase
          .from('ride_passengers')
          .update({ status: 'declined' })
          .eq('id', rider.requestId);
      }

      toast.success(`Picked up ${rider.displayName}! 🚗`);
      queryClient.invalidateQueries({ queryKey: ['rides'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-riders', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-ride-accepted-count'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to pick rider');
    } finally {
      setPickingId(null);
    }
  };

  if (isLoading) return null;
  if (!sortedRiders || sortedRiders.length === 0) return null;

  const requestedMyRide = (rider: (typeof sortedRiders)[0]) =>
    myRide && rider.rideId === myRide.id;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Rider Line
          <Badge variant="secondary" className="text-xs">
            {sortedRiders.length}
          </Badge>
        </CardTitle>
        {isDD && seatsRemaining !== null && (
          <Badge
            variant={carFull ? 'destructive' : 'outline'}
            className="text-xs"
          >
            <Car className="h-3 w-3 mr-1" />
            {carFull
              ? 'Car Full'
              : `${seatsRemaining} seat${seatsRemaining !== 1 ? 's' : ''} left`}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {sortedRiders.map((rider) => {
              const isPicking = pickingId === rider.passengerId;
              const requestedMe = requestedMyRide(rider);
              const isSelf = rider.passengerId === profile?.id;

              return (
                <div
                  key={rider.passengerId}
                  className="flex flex-col items-center gap-1.5 min-w-[80px] max-w-[90px]"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage src={rider.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {rider.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {requestedMe && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <span className="text-xs font-medium text-center truncate w-full">
                    {rider.displayName.split(' ')[0]}
                  </span>

                  {/* Distance label (DD only) */}
                  {isDD && rider.distanceMeters != null && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {formatDistanceCompact(rider.distanceMeters)}
                    </span>
                  )}
                  {isDD && rider.distanceMeters == null && (
                    <span className="text-[10px] text-muted-foreground/50">
                      No location
                    </span>
                  )}

                  {/* Status chip */}
                  {requestedMe && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Requested you
                    </Badge>
                  )}

                  {/* Action button */}
                  {isDD && !isSelf && (
                    <Button
                      size="sm"
                      variant={requestedMe ? 'default' : 'secondary'}
                      className="h-6 text-[10px] px-2 w-full"
                      disabled={isPicking || carFull}
                      onClick={() => handlePick(rider)}
                    >
                      {isPicking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : carFull ? (
                        'Full'
                      ) : requestedMe ? (
                        'Accept'
                      ) : (
                        'Pick'
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
