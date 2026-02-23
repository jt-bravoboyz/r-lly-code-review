import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { AttendeeLocationItem } from './AttendeeLocationItem';

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
  eventLocation?: { lat: number; lng: number; name?: string } | null;
}

export function AttendeeMap({ eventId, attendees, eventLocation }: AttendeeMapProps) {
  const [liveAttendees, setLiveAttendees] = useState<Attendee[]>(attendees);
  const { data: googleMapsKey, isLoading: loadingKey } = useGoogleMapsKey();

  // Update when attendees prop changes
  useEffect(() => {
    setLiveAttendees(attendees);
  }, [attendees]);

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

  // Generate Google Maps Static API URL with markers
  const generateMapUrl = () => {
    if (!googleMapsKey) return null;
    
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      size: '600x300',
      maptype: 'roadmap',
      key: googleMapsKey,
    });

    // Add markers for each attendee sharing location
    sharingAttendees.forEach((attendee, index) => {
      if (attendee.current_lat && attendee.current_lng) {
        const initial = attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?';
        // Use different colors for different attendees
        const colors = ['red', 'blue', 'green', 'purple', 'orange', 'yellow'];
        const color = colors[index % colors.length];
        params.append('markers', `color:${color}|label:${initial}|${attendee.current_lat},${attendee.current_lng}`);
      }
    });

    // Add event location marker if available
    if (eventLocation?.lat && eventLocation?.lng) {
      params.append('markers', `color:black|label:E|${eventLocation.lat},${eventLocation.lng}`);
    }

    // If no markers, center on event location or first attendee
    if (sharingAttendees.length === 0 && eventLocation?.lat && eventLocation?.lng) {
      params.set('center', `${eventLocation.lat},${eventLocation.lng}`);
      params.set('zoom', '14');
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const mapUrl = generateMapUrl();

  // Open Google Maps with all locations
  const openFullMap = () => {
    if (sharingAttendees.length === 0 && eventLocation) {
      window.open(`https://www.google.com/maps?q=${eventLocation.lat},${eventLocation.lng}`, '_blank');
      return;
    }
    
    // Open with first attendee location
    const first = sharingAttendees[0];
    if (first?.current_lat && first?.current_lng) {
      window.open(`https://www.google.com/maps?q=${first.current_lat},${first.current_lng}`, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Squad Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Preview */}
        {(sharingAttendees.length > 0 || eventLocation) && (
          <div className="relative rounded-xl overflow-hidden bg-muted">
            {loadingKey ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mapUrl ? (
              <button onClick={openFullMap} className="w-full cursor-pointer group">
                <img 
                  src={mapUrl} 
                  alt="Attendee locations map"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium shadow-lg">
                    <ExternalLink className="h-4 w-4" />
                    Open in Google Maps
                  </div>
                </div>
              </button>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Map unavailable
              </div>
            )}
          </div>
        )}

        {/* Sharing location */}
        {sharingAttendees.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sharing Location ({sharingAttendees.length})
              </p>
              <span className="text-[10px] text-muted-foreground mr-11 mt-0.5">Last Updated</span>
            </div>
            <div className="grid gap-2">
              {sharingAttendees.map((attendee) => (
                <AttendeeLocationItem
                  key={attendee.id}
                  id={attendee.id}
                  displayName={attendee.profile?.display_name || null}
                  avatarUrl={attendee.profile?.avatar_url || null}
                  lat={attendee.current_lat || null}
                  lng={attendee.current_lng || null}
                  lastUpdate={attendee.last_location_update || null}
                />
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
