import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsDD } from '@/hooks/useDDManagement';
import { getPublicName } from '@/lib/identity';

interface MyPassengersListProps {
  eventId: string;
}

export function MyPassengersList({ eventId }: MyPassengersListProps) {
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const queryClient = useQueryClient();

  const { data: myRide } = useQuery({
    queryKey: ['my-passengers-ride', eventId, profile?.id],
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
    enabled: !!isDD && !!profile?.id,
  });

  const { data: passengers } = useQuery({
    queryKey: ['my-passengers', myRide?.id],
    queryFn: async () => {
      if (!myRide?.id) return [];
      const { data: rows } = await supabase
        .from('ride_passengers')
        .select('id, passenger_id, pickup_location, status')
        .eq('ride_id', myRide.id)
        .eq('status', 'accepted');

      if (!rows || rows.length === 0) return [];
      const ids = rows.map((r) => r.passenger_id);
      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, full_name, nickname, avatar_url')
        .in('id', ids);
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, passenger: byId.get(r.passenger_id) || null }));
    },
    enabled: !!myRide?.id,
  });

  // Realtime: refresh on any change to ride_passengers for this ride
  useEffect(() => {
    if (!myRide?.id) return;
    const ch = supabase
      .channel(`my-passengers-${myRide.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_passengers',
        filter: `ride_id=eq.${myRide.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-passengers', myRide.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myRide?.id, queryClient]);

  if (!isDD || !myRide) return null;

  const seats = myRide.available_seats ?? 0;
  const filled = passengers?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-montserrat">
          <Users className="h-4 w-4 text-primary" />
          Your Passengers
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {filled} of {seats} seats filled
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {filled === 0 ? (
          <p className="text-sm text-muted-foreground">
            No passengers yet — pick from the Rider Line or use Add Passenger.
          </p>
        ) : (
          <div className="space-y-2">
            {passengers!.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.passenger?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(getPublicName(p.passenger as any) || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {getPublicName(p.passenger as any) || 'Passenger'}
                  </p>
                  {p.pickup_location && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {p.pickup_location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
