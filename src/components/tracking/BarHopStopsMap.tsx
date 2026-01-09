import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beer, MapPin, Navigation } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { escapeHtml } from '@/lib/sanitize';
interface BarHopStop {
  id: string;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  stop_order: number;
  arrived_at?: string | null;
  departed_at?: string | null;
}

interface BarHopStopsMapProps {
  stops: BarHopStop[];
  eventLocation?: {
    lat?: number | null;
    lng?: number | null;
    name?: string | null;
  };
  currentStopIndex?: number;
}

export function BarHopStopsMap({ stops, eventLocation, currentStopIndex = 0 }: BarHopStopsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { token, isLoading } = useMapboxToken();

  // Filter stops with valid coordinates
  const stopsWithCoords = stops.filter(s => s.lat && s.lng);

  useEffect(() => {
    if (!mapContainer.current || !token || stopsWithCoords.length === 0) return;

    // Initialize map
    mapboxgl.accessToken = token;
    
    // Calculate center from all stops
    const lats = stopsWithCoords.map(s => s.lat!);
    const lngs = stopsWithCoords.map(s => s.lng!);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [centerLng, centerLat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for each stop
    map.current.on('load', () => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      stopsWithCoords.forEach((stop, index) => {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center';
        
        const isCurrentStop = index === currentStopIndex;
        const isPastStop = index < currentStopIndex;
        
        // Use escapeHtml to prevent XSS attacks from user-controlled stop names
        const escapedName = escapeHtml(stop.name);
        const escapedAddress = escapeHtml(stop.address);
        
        el.innerHTML = `
          <div class="relative">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
              isCurrentStop 
                ? 'bg-secondary ring-4 ring-secondary/30 animate-pulse' 
                : isPastStop 
                  ? 'bg-green-500' 
                  : 'bg-primary'
            }">
              ${stop.stop_order}
            </div>
            ${isCurrentStop ? '<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rounded-full animate-ping"></div>' : ''}
          </div>
          <div class="mt-1 px-2 py-0.5 bg-background/90 rounded text-xs font-medium max-w-24 truncate shadow">
            ${escapedName}
          </div>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng!, stop.lat!])
          .addTo(map.current!);

        // Add popup with sanitized content
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <p class="font-bold">Stop ${stop.stop_order}: ${escapedName}</p>
            ${stop.address ? `<p class="text-sm text-gray-600">${escapedAddress}</p>` : ''}
            ${stop.arrived_at ? '<p class="text-xs text-green-600 mt-1">✓ Visited</p>' : ''}
          </div>
        `);
        
        marker.setPopup(popup);
        markersRef.current.push(marker);
      });

      // Draw route line between stops
      if (stopsWithCoords.length > 1) {
        const coordinates = stopsWithCoords
          .sort((a, b) => a.stop_order - b.stop_order)
          .map(s => [s.lng!, s.lat!]);

        map.current?.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.current?.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#f97316',
            'line-width': 3,
            'line-dasharray': [2, 2],
          },
        });
      }

      // Fit bounds to show all stops
      const bounds = new mapboxgl.LngLatBounds();
      stopsWithCoords.forEach(s => bounds.extend([s.lng!, s.lat!]));
      map.current?.fitBounds(bounds, { padding: 50 });
    });

    return () => {
      map.current?.remove();
    };
  }, [token, stopsWithCoords, currentStopIndex]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (stopsWithCoords.length === 0) {
    return (
      <Card>
        <CardContent className="h-32 flex flex-col items-center justify-center text-muted-foreground">
          <MapPin className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Add stops with locations to see the map</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Beer className="h-5 w-5 text-secondary" />
          Bar Hop Route
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="h-64 w-full" />
        
        {/* Legend */}
        <div className="p-3 border-t bg-muted/30 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Upcoming</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
