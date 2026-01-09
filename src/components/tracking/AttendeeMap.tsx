import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Attendee {
  id: string;
  profile_id?: string;
  share_location?: boolean | null;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_update?: string | null;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface AttendeeMapProps {
  eventId: string;
  attendees: Attendee[];
}

export function AttendeeMap({ eventId, attendees }: AttendeeMapProps) {
  const [liveAttendees, setLiveAttendees] = useState<Attendee[]>(attendees);

  // Subscribe to realtime attendee location updates
  useEffect(() => {
    const channel = supabase
      .channel(`event-attendees-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setLiveAttendees(prev => 
            prev.map(a => 
              a.id === payload.new.id 
                ? { ...a, ...payload.new }
                : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const sharingAttendees = liveAttendees.filter(a => a.share_location && a.current_lat && a.current_lng);
  const notSharingAttendees = liveAttendees.filter(a => !a.share_location || !a.current_lat);

  const getTimeSinceUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Crew Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sharing location */}
        {sharingAttendees.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sharing Location ({sharingAttendees.length})
            </p>
            <div className="grid gap-2">
              {sharingAttendees.map((attendee) => (
                <div 
                  key={attendee.id}
                  className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-green-200 text-green-700 text-xs">
                        {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{attendee.profile?.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                      {getTimeSinceUpdate(attendee.last_location_update)}
                    </Badge>
                    <a
                      href={`https://www.google.com/maps?q=${attendee.current_lat},${attendee.current_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not sharing */}
        {notSharingAttendees.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Not sharing ({notSharingAttendees.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {notSharingAttendees.map((attendee) => (
                <div 
                  key={attendee.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{attendee.profile?.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {liveAttendees.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            No attendees yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
