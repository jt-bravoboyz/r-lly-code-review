import { MapPin, Loader2 } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useTheme } from '@/contexts/ThemeContext';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { InfoTip } from './InfoTip';

interface EventLocation {
  id: string;
  lat: number;
  lng: number;
  locationName: string | null;
}

interface HeatMapProps {
  eventLocations: EventLocation[];
  span?: 6 | 12;
}

/**
 * Geographic hot zones — uses Mapbox Static Images API (same pattern as AttendeeMap).
 * Renders a small orange marker per host-provided event location. Auto-fits bounds.
 * Privacy: only host-provided event coordinates. Never user GPS.
 */
export function HeatMap({ eventLocations, span = 6 }: HeatMapProps) {
  const { token: mapboxToken, isLoading } = useMapboxToken();
  const { theme } = useTheme();

  const generateMapUrl = () => {
    if (!mapboxToken || eventLocations.length === 0) return null;
    const style = theme === 'dark' ? 'dark-v11' : 'light-v11';
    // Cap at 100 markers — Static Images URL length limits.
    const markers = eventLocations
      .slice(0, 100)
      .map(e => `pin-s+E66210(${e.lng},${e.lat})`)
      .join(',');
    const position = eventLocations.length > 1 ? 'auto' : `${eventLocations[0].lng},${eventLocations[0].lat},10`;
    return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${markers}/${position}/800x320@2x?access_token=${mapboxToken}&padding=40`;
  };

  const mapUrl = generateMapUrl();

  return (
    <BentoCard span={span}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Where R@llies Ignite</h3>
          <InfoTip text="A map of the cities and venues hosting R@llies. Bigger clusters mean stronger local momentum. Only event locations are shown — never individual user locations." />
        </div>
        <MetricPill tone="muted">{eventLocations.length} locations</MetricPill>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-muted/30 border border-border/40 aspect-[16/7]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : mapUrl ? (
          <img
            src={mapUrl}
            alt="Map of R@lly hot zones"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <MapPin className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Hot zones will appear once R@llies have geolocation data attached.
            </p>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
