/**
 * Centralized distance formatting utility for the R@lly app.
 * Converts meters to feet/miles (US) or keeps metric (international).
 */

// Conversion constants
const FEET_PER_METER = 3.28084;
const FEET_PER_MILE = 5280;

/**
 * Format a distance in meters to a human-readable string.
 * @param meters - Distance in meters
 * @param useFeet - If true, uses feet/miles (US). If false, uses meters/km.
 * @returns Formatted distance string (e.g., "150 ft", "0.5 mi", "150m", "0.5km")
 */
export function formatDistance(meters: number, useFeet: boolean = true): string {
  if (useFeet) {
    const feet = meters * FEET_PER_METER;
    if (feet < FEET_PER_MILE) {
      return `${Math.round(feet)} ft`;
    }
    const miles = feet / FEET_PER_MILE;
    return `${miles.toFixed(1)} mi`;
  }
  
  // Metric
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format a distance with "away" suffix.
 * @param meters - Distance in meters
 * @param useFeet - If true, uses feet/miles (US). If false, uses meters/km.
 * @returns Formatted distance string with "away" (e.g., "150 ft away")
 */
export function formatDistanceAway(meters: number, useFeet: boolean = true): string {
  return `${formatDistance(meters, useFeet)} away`;
}

/**
 * Format a distance for compact display (navigation cards, etc.)
 * Uses shorter format for small distances.
 * @param meters - Distance in meters
 * @param useFeet - If true, uses feet/miles (US). If false, uses meters/km.
 * @returns Formatted distance string
 */
export function formatDistanceCompact(meters: number, useFeet: boolean = true): string {
  if (useFeet) {
    const feet = meters * FEET_PER_METER;
    if (feet < 100) {
      return `${Math.round(feet)} ft`;
    }
    if (feet < FEET_PER_MILE) {
      // Round to nearest 10 feet for medium distances
      return `${Math.round(feet / 10) * 10} ft`;
    }
    const miles = feet / FEET_PER_MILE;
    if (miles < 10) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(miles)} mi`;
  }
  
  // Metric
  if (meters < 100) {
    return `${Math.round(meters)}m`;
  }
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10}m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}
