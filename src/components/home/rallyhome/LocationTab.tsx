import { useQuery } from '@tanstack/react-query';
import { MapPin, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AttendeeMap } from '@/components/tracking/AttendeeMap';
import { BarHopStopsMap } from '@/components/tracking/BarHopStopsMap';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocationContext } from '@/contexts/LocationContext';
import { getPrivateName } from '@/lib/identity';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as nativeGeo from '@/lib/nativeGeo';

interface LocationTabProps {
  event: any;
  isAttending: boolean;
  showMap: boolean;
  onInvite?: () => void;
}

export function LocationTab({ event, isAttending, showMap, onInvite }: LocationTabProps) {
  const { profile } = useAuth();
  const { isTracking, startTracking, stopTracking } = useLocationContext();

  const { data: roster } = useQuery({
    queryKey: ['rally-home-sharing-roster', event.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_attendees')
        .select('id, profile_id, share_location, current_lat, current_lng, last_location_update')
        .eq('event_id', event.id);

      const ids = (data || []).map((d: any) => d.profile_id).filter(Boolean);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, full_name, nickname, avatar_url')
        .in('id', ids);

      const map = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (data || []).map((a: any) => ({ ...a, profile: map.get(a.profile_id) }));
    },
    refetchInterval: 30000,
  });

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      await stopTracking();
      toast.success('Location sharing off');
      return;
    }
    if (!nativeGeo.isGeolocationAvailable()) {
      toast.error('Location is not available on this device');
      return;
    }
    startTracking(event.id);
    toast.success('Sharing your location with the squad');
  };

  const sharing = (roster || []).filter((a: any) => a.share_location === true);
  const notSharing = (roster || []).filter((a: any) => a.share_location !== true);

  return (
    <div className="space-y-4">
      {showMap && (
        <AttendeeMap
          eventId={event.id}
          attendees={event.attendees || []}
          eventLocation={
            event.location_lat && event.location_lng
              ? { lat: event.location_lat, lng: event.location_lng, name: event.location_name || undefined }
              : null
          }
        />
      )}

      {isAttending && (
        <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-montserrat font-bold text-primary">Share My Location</p>
              <p className="text-xs text-muted-foreground">Let your squad see your location</p>
            </div>
            <Switch
              checked={isTracking}
              onCheckedChange={handleToggle}
              className="data-[state=unchecked]:bg-primary/40 data-[state=checked]:bg-primary"
            />
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-2">
          {[...sharing, ...notSharing].map((a: any) => {
            const isSharing = a.share_location === true;
            const name = a.profile ? getPrivateName(a.profile) : 'Someone';
            return (
              <div key={a.id} className="flex items-center gap-3 px-2 py-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={a.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {(name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {a.profile_id === profile?.id ? 'You' : name}
                  </p>
                  <p className="text-xs text-white/50 truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {isSharing && a.current_lat ? 'Location live' : 'No location'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-xs font-medium', isSharing ? 'text-green-400' : 'text-white/40')}>
                    {isSharing ? 'Sharing' : 'Not Sharing'}
                  </span>
                  <span
                    className={cn('h-2 w-2 rounded-full', isSharing ? 'bg-green-400' : 'bg-white/30')}
                  />
                </div>
              </div>
            );
          })}
          {(roster || []).length === 0 && (
            <p className="px-2 py-4 text-sm text-white/50">No attendees yet.</p>
          )}

          {onInvite && (
            <button
              onClick={onInvite}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left text-primary hover:bg-white/5"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">Invite to R@lly</span>
            </button>
          )}
        </CardContent>
      </Card>

      {event.is_barhop && event.stops && event.stops.length > 0 && (
        <BarHopStopsMap
          stops={event.stops}
          eventLocation={{
            lat: event.location_lat,
            lng: event.location_lng,
            name: event.location_name,
          }}
        />
      )}
    </div>
  );
}
