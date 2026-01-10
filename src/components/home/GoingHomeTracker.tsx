import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Home, Navigation, CheckCircle2, Clock, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface GoingHomeAttendee {
  id: string;
  profile_id: string;
  destination_name: string | null; // Now privacy-controlled via view
  going_home_at: string | null;
  arrived_home: boolean;
  arrived_at: string | null;
  destination_visibility: string | null;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface GoingHomeTrackerProps {
  eventId: string;
}

export function GoingHomeTracker({ eventId }: GoingHomeTrackerProps) {
  const [goingHome, setGoingHome] = useState<GoingHomeAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoingHome = async () => {
      // Use the safe_event_attendees view which respects privacy settings
      const { data, error } = await supabase
        .from('safe_event_attendees')
        .select(`
          id,
          profile_id,
          destination_name,
          destination_visibility,
          going_home_at,
          arrived_home,
          arrived_at
        `)
        .eq('event_id', eventId)
        .not('going_home_at', 'is', null)
        .order('going_home_at', { ascending: false });

      if (!error && data) {
        // Fetch profile info separately since view doesn't include it
        const profileIds = data.map(d => d.profile_id).filter(Boolean);
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('safe_profiles')
            .select('id, display_name, avatar_url')
            .in('id', profileIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          const enrichedData = data.map(attendee => ({
            ...attendee,
            profile: profileMap.get(attendee.profile_id) || null
          }));
          setGoingHome(enrichedData as GoingHomeAttendee[]);
        } else {
          setGoingHome(data as GoingHomeAttendee[]);
        }
      }
      setLoading(false);
    };

    fetchGoingHome();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`going-home-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchGoingHome();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (loading) {
    return null;
  }

  if (goingHome.length === 0) {
    return null;
  }

  const arrivedCount = goingHome.filter(a => a.arrived_home).length;
  const enRouteCount = goingHome.filter(a => !a.arrived_home).length;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-secondary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 font-montserrat">
          <Home className="h-5 w-5 text-secondary" />
          Heading Home
          <Badge variant="secondary" className="ml-auto">
            {arrivedCount}/{goingHome.length} arrived
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goingHome.map((attendee) => (
          <div
            key={attendee.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              attendee.arrived_home 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-white border border-muted'
            }`}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {attendee.arrived_home ? (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center animate-pulse">
                  <Navigation className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {attendee.profile?.display_name || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {attendee.destination_name ? (
                  attendee.destination_name
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Going home
                  </>
                )}
              </p>
            </div>

            <div className="text-right">
              {attendee.arrived_home ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Safe
                </Badge>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {attendee.going_home_at && formatDistanceToNow(new Date(attendee.going_home_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        ))}

        {enRouteCount > 0 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            {enRouteCount} {enRouteCount === 1 ? 'person' : 'people'} still en route
          </p>
        )}
      </CardContent>
    </Card>
  );
}
