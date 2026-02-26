import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beer, MapPin } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { resolvedTheme } = useTheme();
  const routeCoordsHashRef = useRef<string>('');

  // Filter stops with valid coordinates
  const stopsWithCoords = useMemo(() => stops.filter(s => s.lat && s.lng), [stops]);

  // MAP-4/POL-5: Theme-aware map style
  const mapStyle = resolvedTheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

  // MAP-1: Initialize map once (depends on token only)
  useEffect(() => {
    if (!mapContainer.current || !token || stopsWithCoords.length === 0) return;
    if (map.current) return; // Already initialized

    mapboxgl.accessToken = token;
    
    const lats = stopsWithCoords.map(s => s.lat!);
    const lngs = stopsWithCoords.map(s => s.lng!);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [centerLng, centerLat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]); // Only token - map initialized once

  // Handle theme changes by updating style
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(mapStyle);
    routeCoordsHashRef.current = '';
  }, [mapStyle]);

  // MAP-1: Update markers/routes separately (depends on stops/currentStopIndex/mapStyle)
  useEffect(() => {
    if (!map.current || stopsWithCoords.length === 0) return;

    const updateMarkersAndRoute = () => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Clean up existing cluster layers/source before re-adding
      if (map.current?.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
      if (map.current?.getLayer('clusters')) map.current.removeLayer('clusters');
      if (map.current?.getSource('stops-cluster')) map.current.removeSource('stops-cluster');

      stopsWithCoords.forEach((stop, index) => {
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center';
        
        const isCurrentStop = index === currentStopIndex;
        const isPastStop = index < currentStopIndex;
        
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

        const popup = new mapboxgl.Popup({ offset: 25, className: 'barhop-popup-dark' }).setHTML(`
          <div style="background:#1e1b2e;color:#c4b5fd;padding:10px 14px;border-radius:8px;min-width:160px;">
            <p style="font-weight:700;color:#d8b4fe;margin:0 0 4px;">Stop ${stop.stop_order}: ${escapedName}</p>
            ${stop.address ? `<p style="font-size:13px;color:#a78bfa;margin:0 0 2px;">${escapedAddress}</p>` : ''}
            ${stop.arrived_at ? '<p style="font-size:12px;color:#86efac;margin:4px 0 0;">✓ Visited</p>' : ''}
          </div>
        `);
        
        marker.setPopup(popup);
        markersRef.current.push(marker);
      });

      // MAP-2: Add clustering source for stops
      if (stopsWithCoords.length > 1 && map.current) {
        const clusterFeatures = stopsWithCoords.map(stop => ({
          type: 'Feature' as const,
          properties: { stop_order: stop.stop_order, name: stop.name },
          geometry: { type: 'Point' as const, coordinates: [stop.lng!, stop.lat!] },
        }));

        map.current.addSource('stops-cluster', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: clusterFeatures },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'stops-cluster',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#f97316',
            'circle-radius': ['step', ['get', 'point_count'], 18, 4, 24, 8, 30],
            'circle-opacity': 0.7,
          },
        });

        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'stops-cluster',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 14,
          },
          paint: { 'text-color': '#ffffff' },
        });
      }

      // MAP-3: Fetch road-based route, memoized by coordinate hash
      if (stopsWithCoords.length > 1) {
        const sortedStops = [...stopsWithCoords].sort((a, b) => a.stop_order - b.stop_order);
        const coordinates = sortedStops.map(s => [s.lng!, s.lat!]);
        const coordsHash = JSON.stringify(coordinates);

        // Only refetch if coordinates changed
        if (coordsHash !== routeCoordsHashRef.current) {
          routeCoordsHashRef.current = coordsHash;
          
          // Remove existing route
          if (map.current?.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
          }

          // Try Directions API first, fall back to straight line
          const coordString = coordinates.map(c => c.join(',')).join(';');
          fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${token}`)
            .then(res => res.json())
            .then(data => {
              if (!map.current) return;
              const geometry = data.routes?.[0]?.geometry || {
                type: 'LineString',
                coordinates,
              };

              if (map.current.getSource('route')) {
                (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
                  type: 'Feature',
                  properties: {},
                  geometry,
                });
              } else {
                map.current.addSource('route', {
                  type: 'geojson',
                  data: { type: 'Feature', properties: {}, geometry },
                });
                map.current.addLayer({
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: { 'line-color': '#f97316', 'line-width': 3, 'line-dasharray': [2, 2] },
                });
              }
            })
            .catch(() => {
              // Fallback to straight line
              if (!map.current || map.current.getSource('route')) return;
              map.current.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates },
                },
              });
              map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#f97316', 'line-width': 3, 'line-dasharray': [2, 2] },
              });
            });
        }
      }

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      stopsWithCoords.forEach(s => bounds.extend([s.lng!, s.lat!]));
      map.current?.fitBounds(bounds, { padding: 50 });
    };

    // Wait for map style to load before adding layers
    if (map.current.isStyleLoaded()) {
      updateMarkersAndRoute();
    } else {
      map.current.once('style.load', updateMarkersAndRoute);
    }
  }, [stopsWithCoords, currentStopIndex, token, mapStyle]);

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
