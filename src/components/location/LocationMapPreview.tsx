import { useEffect, useRef, useState, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LocationMapPreviewProps {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  className?: string;
  height?: string;
  interactive?: boolean;
  showDirections?: boolean;
}

export const LocationMapPreview = forwardRef<HTMLDivElement, LocationMapPreviewProps>(
  function LocationMapPreview({
    lat,
    lng,
    name,
    address,
    className,
    height = "h-32",
    interactive = false,
    showDirections = true,
  }, ref) {
    const { token, isLoading, error } = useMapboxToken();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Open directions in native maps app
    const handleGetDirections = () => {
      const destination = encodeURIComponent(address || name || `${lat},${lng}`);
      const coords = `${lat},${lng}`;
      
      // Detect platform and open appropriate maps app
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        // Apple Maps
        window.open(`maps://maps.apple.com/?daddr=${coords}&q=${destination}`, '_blank');
      } else if (isAndroid) {
        // Google Maps on Android
        window.open(`google.navigation:q=${coords}`, '_blank');
      } else {
        // Fallback to Google Maps web
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=${destination}`, '_blank');
      }
    };

    useEffect(() => {
      if (!token || !mapContainer.current || map.current) return;

      mapboxgl.accessToken = token;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 15,
        interactive: interactive,
        attributionControl: false,
      });

      map.current.on('load', () => {
        setMapReady(true);
      });

      // Add marker
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center';
      el.innerHTML = `
        <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white" style="background: hsl(var(--primary));">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `;

      marker.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current);

      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    }, [token, lat, lng, interactive]);

    // Update map center when coordinates change
    useEffect(() => {
      if (map.current && mapReady) {
        map.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 500,
        });
        
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        }
      }
    }, [lat, lng, mapReady]);

    if (isLoading) {
      return (
        <div ref={ref} className={cn("rounded-lg bg-muted flex items-center justify-center", height, className)}>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error || !token) {
      return (
        <div ref={ref} className={cn("rounded-lg bg-muted flex flex-col items-center justify-center gap-2 p-4", height, className)}>
          <MapPin className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground text-center">{name || 'Location selected'}</span>
          {showDirections && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetDirections}
              className="mt-1"
            >
              <Navigation className="h-3 w-3 mr-1.5" />
              Get Directions
            </Button>
          )}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative rounded-lg overflow-hidden", height, className)}>
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Bottom overlay with name and directions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {name && (
                <p className="text-white text-sm font-medium truncate">{name}</p>
              )}
            </div>
            {showDirections && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleGetDirections}
                className="shrink-0 h-7 text-xs"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Directions
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
