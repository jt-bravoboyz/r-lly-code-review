import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X, Home, Building, Star, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GooglePlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
}

interface MapboxResult {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

type SearchResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: 'google' | 'mapbox';
  types: string[];
  rating?: number;
  isOpen?: boolean;
};

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  allowCustomName?: boolean;
  className?: string;
}

export function LocationSearch({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search for a place or address...",
  allowCustomName = true,
  className,
}: LocationSearchProps) {
  const { token: mapboxToken, isLoading: tokenLoading } = useMapboxToken();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [customName, setCustomName] = useState('');
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get user's current location for proximity bias
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Could not get user location for search bias:', error);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search using Google Places API for businesses
  const searchGooglePlaces = async (searchQuery: string): Promise<SearchResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: {
          query: searchQuery,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        },
      });

      if (error) {
        console.error('Google Places search error:', error);
        return [];
      }

      return (data.results || []).map((place: GooglePlaceResult) => ({
        id: `google-${place.id}`,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        source: 'google' as const,
        types: place.types,
        rating: place.rating,
        isOpen: place.isOpen,
      }));
    } catch (error) {
      console.error('Google Places search failed:', error);
      return [];
    }
  };

  // Search using Mapbox Geocoding API for addresses (with proximity bias)
  const searchMapbox = async (searchQuery: string): Promise<SearchResult[]> => {
    if (!mapboxToken) return [];

    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?` +
        `access_token=${mapboxToken}&limit=5&types=address,place&language=en`;

      // Add proximity bias for better nearby results
      if (userLocation) {
        url += `&proximity=${userLocation.lng},${userLocation.lat}`;
      }

      const response = await fetch(url);

      if (!response.ok) throw new Error('Mapbox search failed');

      const data = await response.json();
      
      return (data.features || []).map((result: MapboxResult) => ({
        id: `mapbox-${result.id}`,
        name: result.text,
        address: result.place_name,
        lat: result.center[1],
        lng: result.center[0],
        source: 'mapbox' as const,
        types: result.place_type,
      }));
    } catch (error) {
      console.error('Mapbox search error:', error);
      return [];
    }
  };

  // Combined search - Google for businesses, Mapbox for addresses
  const searchLocations = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Run both searches in parallel
      const [googleResults, mapboxResults] = await Promise.all([
        searchGooglePlaces(searchQuery),
        searchMapbox(searchQuery),
      ]);

      // Combine results: Google places first (businesses), then Mapbox (addresses)
      // De-duplicate by checking if addresses are similar
      const combinedResults: SearchResult[] = [...googleResults];
      
      for (const mapboxResult of mapboxResults) {
        // Check if we already have a similar result from Google
        const isDuplicate = googleResults.some(
          (gr) => 
            calculateDistance(gr.lat, gr.lng, mapboxResult.lat, mapboxResult.lng) < 50 // Within 50 meters
        );
        
        if (!isDuplicate) {
          combinedResults.push(mapboxResult);
        }
      }

      setResults(combinedResults.slice(0, 8));
      setShowResults(true);
    } catch (error) {
      console.error('Location search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Debounced search
  const handleInputChange = (inputValue: string) => {
    setQuery(inputValue);
    onChange(inputValue);
    setSelectedLocation(null);
    setShowCustomNameInput(false);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchLocations(inputValue);
    }, 300);
  };

  // Handle location selection
  const handleSelectLocation = (result: SearchResult) => {
    setSelectedLocation(result);
    setShowResults(false);

    // Check if this is an address (from Mapbox) that might need a custom name
    const isAddress = result.source === 'mapbox' && result.types.includes('address');
    
    if (allowCustomName && isAddress) {
      // Show custom name input for addresses (like someone's house)
      setShowCustomNameInput(true);
      setQuery(result.address);
    } else {
      // Use the place name directly for businesses/POIs
      setQuery(result.name);
      onChange(result.name);
      
      if (onLocationSelect) {
        onLocationSelect({
          name: result.name,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
        });
      }
    }
  };

  // Confirm custom name for address
  const handleConfirmCustomName = () => {
    if (!selectedLocation) return;

    const finalName = customName.trim() || selectedLocation.name;
    onChange(finalName);
    setQuery(finalName);
    setShowCustomNameInput(false);

    if (onLocationSelect) {
      onLocationSelect({
        name: finalName,
        address: selectedLocation.address,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });
    }
  };

  // Get icon based on place type
  const getPlaceIcon = (result: SearchResult) => {
    if (result.source === 'google') {
      // Check for restaurant/food types
      if (result.types.some(t => ['restaurant', 'food', 'meal_delivery', 'meal_takeaway', 'cafe', 'bar'].includes(t))) {
        return <Utensils className="h-4 w-4 text-primary" />;
      }
      return <Building className="h-4 w-4 text-primary" />;
    }
    if (result.types.includes('address')) {
      return <Home className="h-4 w-4 text-muted-foreground" />;
    }
    return <MapPin className="h-4 w-4 text-muted-foreground" />;
  };

  // Get distance text if user location is available
  const getDistanceText = (result: SearchResult): string | null => {
    if (!userLocation) return null;
    const distance = calculateDistance(userLocation.lat, userLocation.lng, result.lat, result.lng);
    
    if (distance < 1000) {
      return `${Math.round(distance)}m away`;
    }
    return `${(distance / 1000).toFixed(1)}km away`;
  };

  if (tokenLoading) {
    return (
      <div className={cn("relative", className)}>
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Loading..."
          disabled
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Custom name input overlay */}
      {showCustomNameInput && selectedLocation ? (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <MapPin className="inline h-3 w-3 mr-1" />
            {selectedLocation.address}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Name this place (e.g., Mike's House)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
            <Button 
              type="button"
              size="sm" 
              onClick={handleConfirmCustomName}
            >
              Done
            </Button>
            <Button 
              type="button"
              size="sm" 
              variant="ghost"
              onClick={() => {
                setShowCustomNameInput(false);
                setSelectedLocation(null);
                setQuery('');
                onChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-9"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!isSearching && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onChange('');
                  setResults([]);
                  setSelectedLocation(null);
                }}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
              <ScrollArea className="max-h-72">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectLocation(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="mt-0.5">
                      {getPlaceIcon(result)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{result.name}</p>
                        {result.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {result.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.address}
                      </p>
                      {getDistanceText(result) && (
                        <p className="text-xs text-primary mt-0.5">
                          {getDistanceText(result)}
                        </p>
                      )}
                    </div>
                    {result.isOpen !== undefined && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        result.isOpen 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {result.isOpen ? 'Open' : 'Closed'}
                      </span>
                    )}
                  </button>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* No results message */}
          {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">No locations found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
