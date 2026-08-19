import { useState } from 'react';
import { Car, ChevronDown, Navigation, Shield, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RequestRideDialog } from '@/components/rides/RequestRideDialog';
import { DDVolunteerButton } from '@/components/rides/DDVolunteerButton';
import { DDRequestBanner } from '@/components/rides/DDRequestBanner';
import { RiderLine } from '@/components/rides/RiderLine';
import { MyPassengersList } from '@/components/rides/MyPassengersList';
import { AddPassengerDialog } from '@/components/rides/AddPassengerDialog';
import { DDArrivedButton } from '@/components/home/DDArrivedButton';
import { DDDropoffButton } from '@/components/rides/DDDropoffButton';
import { useRides } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { getPublicName } from '@/lib/identity';
import { cn } from '@/lib/utils';

interface RidesTabProps {
  event: any;
  isAttending: boolean;
  isLive: boolean;
  isAfterRally: boolean;
  isDD: boolean;
  myDDRequest?: any;
}

export function RidesTab({ event, isAttending, isLive, isAfterRally, isDD, myDDRequest }: RidesTabProps) {
  const { profile } = useAuth();
  const { data: rides } = useRides(event.id);
  const [showCars, setShowCars] = useState(true);

  return (
    <div className="space-y-4">
      {myDDRequest && profile && (
        <DDRequestBanner
          request={myDDRequest}
          eventId={event.id}
          userName={profile.display_name || 'You'}
        />
      )}

      {/* Need a Ride? */}
      {isAttending && (
        <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-montserrat font-extrabold text-black">Need a Ride?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Request a ride from a DD or use a ride service.
            </p>
            <RequestRideDialog
              eventId={event.id}
              eventName={event.title}
              trigger={
                <Button className="w-full h-12 gap-2 bg-zinc-900 text-muted-foreground hover:bg-zinc-800 font-montserrat font-bold">
                  <Car className="h-4 w-4 shrink-0" />
                  Request a Ride
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Become a DD */}
      {isAttending && (
        <Card className="rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-800 shrink-0" />
              <h3 className="font-montserrat font-extrabold text-purple-800">Become a Designated Driver</h3>
            </div>
            <p className="text-xs text-muted-foreground">Help your squad get home safe.</p>
            <div className="[&>button]:w-full [&>button]:h-12 [&_button]:font-montserrat">
              <DDVolunteerButton
                eventId={event.id}
                eventLocationName={event.location_name}
                eventLocationLat={event.location_lat}
                eventLocationLng={event.location_lng}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Who needs a ride home */}
      <RiderLine eventId={event.id} />

      {/* DD assignment */}
      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <button
            className="flex w-full items-center justify-between gap-2"
            onClick={() => setShowCars((v) => !v)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-montserrat font-extrabold text-white truncate">DD Assignment</h3>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 text-white/60 transition-transform shrink-0', showCars && 'rotate-180')}
            />
          </button>

          {showCars && (
            <div className="space-y-2">
              {(rides || []).length === 0 && (
                <p className="text-sm text-white/50">No DDs yet. Volunteer to keep your crew safe!</p>
              )}
              {(rides || []).map((ride: any, i: number) => {
                const accepted = (ride.passengers || []).filter(
                  (p: any) => p.status === 'accepted' || p.status === 'picked_up' || p.status === 'dropped_off'
                );
                const seats = ride.available_seats ?? 0;
                return (
                  <div
                    key={ride.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Car className="h-4 w-4 text-white/70 shrink-0" />
                        <span className="text-sm font-semibold text-white truncate">
                          Car {i + 1}
                        </span>
                        <span className="text-xs text-white/50 shrink-0">· {seats} seats</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-primary/20 text-primary border-0 text-[10px]"
                      >
                        {accepted.length} / {seats}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/10 pl-1 pr-2.5 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={ride.driver?.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px]">
                            {(ride.driver?.display_name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-white">
                          {getPublicName(ride.driver) || 'Driver'}
                        </span>
                        <Badge className="bg-primary/30 text-primary border-0 text-[9px] px-1 py-0">DD</Badge>
                      </span>
                      {accepted.map((p: any) => (
                        <span
                          key={p.id}
                          className="flex items-center gap-1.5 rounded-full bg-white/10 pl-1 pr-2.5 py-1"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={p.passenger?.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px]">
                              {(p.passenger?.display_name || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-white">
                            {getPublicName(p.passenger) || 'Rider'}
                          </span>
                        </span>
                      ))}
                      {accepted.length === 0 && (
                        <span className="text-xs text-white/40 py-1">No riders yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isDD && (
        <div className="space-y-3">
          <MyPassengersList eventId={event.id} />
          <AddPassengerDialog eventId={event.id} />
          {(isLive || isAfterRally) && <DDArrivedButton eventId={event.id} />}
          {isAfterRally && <DDDropoffButton eventId={event.id} />}
        </div>
      )}
    </div>
  );
}
