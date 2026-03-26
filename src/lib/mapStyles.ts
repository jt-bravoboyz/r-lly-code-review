import mapboxgl from 'mapbox-gl';

/**
 * R@lly brand color tokens for map overrides.
 * Matches index.css light/dark design system.
 */
const RALLY_MAP_COLORS = {
  light: {
    land: '#F5F5F5',
    water: '#E8EEF2',
    road: '#E5E5E5',
    roadMinor: '#EFEFEF',
    poiText: '#737373',
  },
  dark: {
    land: '#111111',
    water: '#0F1418',
    road: '#1E1E1E',
    roadMinor: '#161616',
    poiText: '#BDBDBD',
  },
} as const;

/** Route colors by context */
export const RALLY_ROUTE_COLORS = {
  live: { glow: '#16A34A', core: '#16A34A' },
  afterRally: { glow: '#4B2E83', core: '#5B2D8C' },
} as const;

/** Marker brand colors */
export const RALLY_MARKER_COLORS = {
  orange: '#E66210',
  orangeBright: '#F97316',
  success: '#16A34A',
  completedBorder: '#BABABA',
} as const;

/**
 * Apply R@lly brand overrides to a Mapbox map after style loads.
 *
 * Safeguard 1: Composable POI filter — composes with existing filters.
 * Safeguard 2: Pattern-based layer detection — iterates actual layers.
 */
export function applyRallyMapOverrides(
  map: mapboxgl.Map,
  theme: 'light' | 'dark'
): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  const colors = RALLY_MAP_COLORS[theme];

  // — Nightlife POI filter (keep food_and_drink + entertainment) —
  const nightlifeFilter: mapboxgl.FilterSpecification = [
    'match',
    ['get', 'class'],
    ['food_and_drink', 'entertainment'],
    true,
    false,
  ];

  style.layers.forEach((layer) => {
    try {
      // Safeguard 1: Composable POI filtering
      if (layer.type === 'symbol' && layer.id.includes('poi')) {
        const existing = map.getFilter(layer.id);
        map.setFilter(
          layer.id,
          existing ? ['all', existing, nightlifeFilter] : nightlifeFilter
        );
        // Reduce POI text size slightly
        map.setPaintProperty(layer.id, 'text-color', colors.poiText);
      }

      // Safeguard 2: Pattern-based overrides

      // Land / background layers
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', colors.land);
      }

      // Water fills
      if (layer.id.includes('water') && layer.type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', colors.water);
      }

      // Road lines
      if (layer.id.includes('road') && layer.type === 'line') {
        const isMinor =
          layer.id.includes('minor') ||
          layer.id.includes('street') ||
          layer.id.includes('service') ||
          layer.id.includes('path');
        map.setPaintProperty(
          layer.id,
          'line-color',
          isMinor ? colors.roadMinor : colors.road
        );
      }

      // Hide transit / parking / airport / government
      if (
        layer.id.includes('transit') ||
        layer.id.includes('airport') ||
        layer.id.includes('parking') ||
        layer.id.includes('ferry') ||
        layer.id.includes('medical') ||
        layer.id.includes('industrial') ||
        layer.id.includes('government')
      ) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }

      // Hide neighborhood / place labels below zoom 13
      if (
        (layer.id.includes('place-neighborhood') ||
          layer.id.includes('place-suburb')) &&
        layer.type === 'symbol'
      ) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    } catch {
      // Silently skip layers that don't support the property
    }
  });
}

/**
 * Device-aware directions opener for deep callback chains (e.g. toast actions).
 * Mobile/touch → native maps app via location.href
 * Desktop → new tab via window.open
 */
export function openDirections(url: string) {
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer: coarse)').matches;

  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
