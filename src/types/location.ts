/**
 * Structured location object for consistent location data handling
 */
export interface StructuredLocation {
  location_name: string;
  place_id: string | null;
  formatted_address: string;
  lat: number;
  lng: number;
}

/**
 * Empty location object for initialization
 */
export const EMPTY_LOCATION: StructuredLocation = {
  location_name: '',
  place_id: null,
  formatted_address: '',
  lat: 0,
  lng: 0,
};

/**
 * Check if a location object is valid (has name and valid coordinates)
 */
export function isValidLocation(loc: StructuredLocation | null): boolean {
  return loc !== null && 
         loc.location_name.trim() !== '' && 
         loc.lat !== 0 && 
         loc.lng !== 0;
}

/**
 * Convert a location search result to a structured location
 */
export function toStructuredLocation(result: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string | null;
}): StructuredLocation {
  return {
    location_name: result.name,
    place_id: result.place_id || null,
    formatted_address: result.address,
    lat: result.lat,
    lng: result.lng,
  };
}
