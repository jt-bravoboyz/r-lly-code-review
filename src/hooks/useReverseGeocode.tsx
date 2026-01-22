import { useState, useEffect, useRef } from 'react';
import { useMapboxToken } from './useMapboxToken';

interface GeocodedAddress {
  address: string | null;
  isLoading: boolean;
}

// Cache geocoded addresses to avoid repeated API calls
const addressCache = new Map<string, string>();

function getCacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places (~11m precision) for caching
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function useReverseGeocode(lat: number | undefined, lng: number | undefined): GeocodedAddress {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useMapboxToken();
  const lastCoordsRef = useRef<string>('');

  useEffect(() => {
    if (!lat || !lng || !token) {
      setAddress(null);
      return;
    }

    const cacheKey = getCacheKey(lat, lng);
    
    // Skip if same coordinates
    if (lastCoordsRef.current === cacheKey) {
      return;
    }
    lastCoordsRef.current = cacheKey;

    // Check cache first
    const cached = addressCache.get(cacheKey);
    if (cached) {
      setAddress(cached);
      return;
    }

    const fetchAddress = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi&limit=1`
        );
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const data = await response.json();
        const feature = data.features?.[0];
        
        if (feature) {
          // Get a short, readable address
          const placeName = feature.text || feature.place_name?.split(',')[0] || null;
          const context = feature.context?.find((c: any) => c.id?.startsWith('neighborhood') || c.id?.startsWith('locality'));
          
          let shortAddress = placeName;
          if (context?.text && placeName) {
            shortAddress = `${placeName}, ${context.text}`;
          } else if (feature.place_name) {
            // Fallback to first two parts of full address
            const parts = feature.place_name.split(',').slice(0, 2);
            shortAddress = parts.join(',').trim();
          }
          
          if (shortAddress) {
            addressCache.set(cacheKey, shortAddress);
            setAddress(shortAddress);
          }
        } else {
          setAddress(null);
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchAddress, 300);
    return () => clearTimeout(timeoutId);
  }, [lat, lng, token]);

  return { address, isLoading };
}

// Batch reverse geocode for multiple locations
export async function batchReverseGeocode(
  locations: Array<{ id: string; lat: number; lng: number }>,
  token: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Check cache first and filter uncached
  const uncached = locations.filter(loc => {
    const cacheKey = getCacheKey(loc.lat, loc.lng);
    const cached = addressCache.get(cacheKey);
    if (cached) {
      results.set(loc.id, cached);
      return false;
    }
    return true;
  });

  // Fetch uncached addresses (limit concurrent requests)
  const batchSize = 5;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (loc) => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${loc.lng},${loc.lat}.json?access_token=${token}&types=address,poi&limit=1`
          );
          
          if (!response.ok) return;
          
          const data = await response.json();
          const feature = data.features?.[0];
          
          if (feature) {
            const placeName = feature.text || feature.place_name?.split(',')[0];
            const context = feature.context?.find((c: any) => c.id?.startsWith('neighborhood') || c.id?.startsWith('locality'));
            
            let shortAddress = placeName;
            if (context?.text && placeName) {
              shortAddress = `${placeName}, ${context.text}`;
            } else if (feature.place_name) {
              const parts = feature.place_name.split(',').slice(0, 2);
              shortAddress = parts.join(',').trim();
            }
            
            if (shortAddress) {
              const cacheKey = getCacheKey(loc.lat, loc.lng);
              addressCache.set(cacheKey, shortAddress);
              results.set(loc.id, shortAddress);
            }
          }
        } catch (error) {
          console.error('Batch geocoding error:', error);
        }
      })
    );
  }

  return results;
}
