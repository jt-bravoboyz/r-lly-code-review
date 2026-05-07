import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { AttendeeLocationItem } from './AttendeeLocationItem';
import { AvatarPin } from './AvatarPin';

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

interface MarkerEntry {
  marker: mapboxgl.Marker;
  root: Root;
  el: HTMLDivElement;
  lat: number;
  lng: number;
  avatarUrl: string | null;
  displayName: string | null;
  isCurrentUser: boolean;
}

export function AttendeeMap({ eventId, attendees, eventLocation }: AttendeeMapProps) {
  const [liveAttendees, setLiveAttendees] = useState<Attendee[]>(attendees);
  const { token: mapboxToken, isLoading } = useMapboxToken();
  const { theme } = useTheme();
  const { profile: me } = useAuth();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const eventMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const styleLoadedRef = useRef(false);

  useEffect(() => {
    setLiveAttendees(attendees);
  }, [attendees]);

  // Realtime location updates
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
            prev.map(a => (a.id === payload.new.id ? { ...a, ...payload.new } : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const sharingAttendees = liveAttendees.filter(
    a => a.share_location && a.current_lat && a.current_lng
  );
  const notSharingAttendees = liveAttendees.filter(
    a => !a.share_location || !a.current_lat
  );

  // Open in Maps URL (preserved)
  const mapLinkUrl = (() => {
    const first = sharingAttendees[0];
    if (first?.current_lat && first?.current_lng) {
      return `https://www.google.com/maps?q=${first.current_lat},${first.current_lng}`;
    }
    if (eventLocation?.lat && eventLocation?.lng) {
      return `https://www.google.com/maps?q=${eventLocation.lng ? `${eventLocation.lat},${eventLocation.lng}` : ''}`;
    }
    return null;
  })();

  // Initialize map once token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || mapRef.current) return;
    if (sharingAttendees.length === 0 && !eventLocation) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter: [number, number] = eventLocation
      ? [eventLocation.lng, eventLocation.lat]
      : [sharingAttendees[0].current_lng!, sharingAttendees[0].current_lat!];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 14,
      attributionControl: false,
    });
    map.scrollZoom.disable();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      styleLoadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker, root }) => {
        marker.remove();
        try { root.unmount(); } catch {}
      });
      markersRef.current.clear();
      eventMarkerRef.current?.remove();
      eventMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, !!eventLocation, sharingAttendees.length > 0]);

  // React to theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12');
  }, [theme]);

  // Sync markers with attendee data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    sharingAttendees.forEach(a => {
      const key = a.profile_id || a.id;
      seen.add(key);
      const lat = a.current_lat!;
      const lng = a.current_lng!;
      const avatarUrl = a.profile?.avatar_url ?? null;
      const displayName = a.profile?.display_name ?? null;
      const isCurrentUser = !!(me?.id && a.profile_id === me.id);

      const existing = markersRef.current.get(key);
      if (!existing) {
        const el = document.createElement('div');
        el.style.willChange = 'transform';
        el.style.transition = 'transform 400ms ease-in-out';
        const root = createRoot(el);
        root.render(
          <AvatarPin avatarUrl={avatarUrl} displayName={displayName} isCurrentUser={isCurrentUser} />
        );
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.set(key, {
          marker, root, el, lat, lng, avatarUrl, displayName, isCurrentUser,
        });
      } else {
        // Update position only when changed
        if (existing.lat !== lat || existing.lng !== lng) {
          existing.marker.setLngLat([lng, lat]);
          existing.lat = lat;
          existing.lng = lng;
        }
        // Re-render only if avatar/name/isMe changed
        if (
          existing.avatarUrl !== avatarUrl ||
          existing.displayName !== displayName ||
          existing.isCurrentUser !== isCurrentUser
        ) {
          existing.root.render(
            <AvatarPin avatarUrl={avatarUrl} displayName={displayName} isCurrentUser={isCurrentUser} />
          );
          existing.avatarUrl = avatarUrl;
          existing.displayName = displayName;
          existing.isCurrentUser = isCurrentUser;
        }
      }
    });

    // Remove stale markers
    markersRef.current.forEach((entry, key) => {
      if (!seen.has(key)) {
        entry.marker.remove();
        try { entry.root.unmount(); } catch {}
        markersRef.current.delete(key);
      }
    });

    // Event location pin — R@lly flag logo + concentric beacon rings
    if (eventLocation?.lat && eventLocation?.lng) {
      if (!eventMarkerRef.current) {
        const el = document.createElement('div');
        el.style.position = 'relative';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.pointerEvents = 'none';
        el.innerHTML = `
          <div style="position:absolute;top:50%;left:50%;width:48px;height:48px;border-radius:50%;border:1px solid #F47A19;box-shadow:0 0 8px rgba(244,122,25,0.5);will-change:transform,opacity;transform:translate(-50%,-50%) scale(0.5);opacity:0;animation:rally-beacon-ring 3.6s ease-out infinite;animation-delay:0s;"></div>
          <div style="position:absolute;top:50%;left:50%;width:48px;height:48px;border-radius:50%;border:1px solid #F47A19;box-shadow:0 0 8px rgba(244,122,25,0.5);will-change:transform,opacity;transform:translate(-50%,-50%) scale(0.5);opacity:0;animation:rally-beacon-ring 3.6s ease-out infinite;animation-delay:1.2s;"></div>
          <div style="position:absolute;top:50%;left:50%;width:48px;height:48px;border-radius:50%;border:1px solid #F47A19;box-shadow:0 0 8px rgba(244,122,25,0.5);will-change:transform,opacity;transform:translate(-50%,-50%) scale(0.5);opacity:0;animation:rally-beacon-ring 3.6s ease-out infinite;animation-delay:2.4s;"></div>
          <img src="/logo.svg" alt="" draggable="false" style="position:absolute;top:50%;left:50%;width:44px;height:44px;border-radius:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));" />
        `;
        eventMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([eventLocation.lng, eventLocation.lat])
          .addTo(map);
      } else {
        eventMarkerRef.current.setLngLat([eventLocation.lng, eventLocation.lat]);
      }
    }

    // Fit bounds
    const points: [number, number][] = sharingAttendees
      .map(a => [a.current_lng!, a.current_lat!] as [number, number]);
    if (eventLocation?.lat && eventLocation?.lng) {
      points.push([eventLocation.lng, eventLocation.lat]);
    }
    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new mapboxgl.LngLatBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 15 });
    } else if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: 14, duration: 400 });
    }
  }, [sharingAttendees, eventLocation, me?.id]);

  const showMap = sharingAttendees.length > 0 || !!eventLocation;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Squad Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map */}
        {showMap && (
          <div className="relative rounded-xl overflow-hidden bg-muted">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mapboxToken ? (
              <>
                <div ref={mapContainer} className="w-full h-48" />
                {mapLinkUrl && (
                  <a
                    href={mapLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium shadow-md hover:bg-background transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Maps
                  </a>
                )}
              </>
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
              <span className="text-[10px] text-muted-foreground mt-0.5">Last Updated</span>
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
