import { MapPin, Navigation, Share2, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
import { RequestRideDialog } from '@/components/rides/RequestRideDialog';
import { DDVolunteerButton } from '@/components/rides/DDVolunteerButton';
import { RallyHomeButton } from '@/components/home/RallyHomeButton';
import { openMapsDirections } from '@/lib/nativeLinks';
import { shareContent } from '@/lib/nativeShare';

interface PlanTabProps {
  event: any;
  isAttending: boolean;
  isLive: boolean;
  onHeadingHomeStart: (destination: string) => void;
  onArrived: () => void;
  widgetAction: 'heading-home' | 'arrived' | null;
  onWidgetActionHandled: () => void;
}

export function PlanTab({
  event,
  isAttending,
  isLive,
  onHeadingHomeStart,
  onArrived,
  widgetAction,
  onWidgetActionHandled,
}: PlanTabProps) {
  const handleDirections = () => {
    openMapsDirections({
      lat: event.location_lat ?? undefined,
      lng: event.location_lng ?? undefined,
      address: event.location_address || event.location_name || undefined,
      label: event.location_name || event.title,
      mode: event.location_lat || event.location_name ? 'directions' : 'search',
    });
  };

  const handleShareLocation = async () => {
    await shareContent({
      title: event.location_name || event.title,
      text: `R@lly point: ${event.location_name || event.title}`,
      url: event.location_lat && event.location_lng
        ? `https://maps.apple.com/?ll=${event.location_lat},${event.location_lng}`
        : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Your Plan Tonight */}
      {isAttending && (
        <section className="space-y-2">
          <RallyHomeButton
            eventId={event.id}
            eventStatus={event.status}
            eventTitle={event.title}
            eventLocationName={event.location_name || undefined}
            eventLocationLat={event.location_lat || undefined}
            eventLocationLng={event.location_lng || undefined}
            onHeadingHomeStart={onHeadingHomeStart}
            onArrived={onArrived}
            externalAction={widgetAction}
            onExternalActionHandled={onWidgetActionHandled}
          />
        </section>
      )}

      {/* Current R@lly Point */}
      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-montserrat font-extrabold text-white truncate">
                Current R@lly Point
              </h3>
            </div>
            {isLive && (
              <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30">Live</Badge>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-white truncate">
              {event.location_name || 'Location TBD'}
            </p>
            {event.location_address && (
              <p className="text-xs text-white/60 truncate">{event.location_address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={handleDirections}
            >
              <Navigation className="h-4 w-4 shrink-0" />
              <span className="text-sm">Directions</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={handleShareLocation}
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span className="text-sm">Share Location</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ride options */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Ride Options</p>
        <RideshareDeepLinkButtons
          eventLat={event.location_lat}
          eventLng={event.location_lng}
          eventName={event.title}
          eventAddress={event.location_name}
        />
      </div>

      {isAttending && (
        <div className="space-y-2">
          <RequestRideDialog
            eventId={event.id}
            eventName={event.title}
            trigger={
              <Button className="w-full h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-montserrat font-bold">
                <Navigation className="h-4 w-4 shrink-0" />
                Request a Ride
              </Button>
            }
          />
          <div className="[&>button]:w-full [&>button]:h-12 [&_button]:font-montserrat">
            <DDVolunteerButton
              eventId={event.id}
              eventLocationName={event.location_name}
              eventLocationLat={event.location_lat}
              eventLocationLng={event.location_lng}
            />
          </div>
        </div>
      )}
    </div>
  );
}
