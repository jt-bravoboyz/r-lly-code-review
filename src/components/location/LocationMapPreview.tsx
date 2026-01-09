import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationMapPreviewProps {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
  height?: string;
  interactive?: boolean;
}

export function LocationMapPreview({
  lat,
  lng,
  name,
  className,
  height = "h-32",
  interactive = false,
}: LocationMapPreviewProps) {
  const { token, isLoading, error } = useMapboxToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
      <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
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
      <div className={cn("rounded-lg bg-muted flex items-center justify-center", height, className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className={cn("rounded-lg bg-muted flex items-center justify-center gap-2", height, className)}>
        <MapPin className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">{name || 'Location selected'}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", height, className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      {name && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-xs font-medium truncate">{name}</p>
        </div>
      )}
    </div>
  );
}
