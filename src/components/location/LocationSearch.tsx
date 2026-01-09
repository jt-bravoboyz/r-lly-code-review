import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Home, Building, Star, Utensils, Edit2, Heart, Briefcase, BookmarkPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useSavedLocations, SavedLocation } from '@/hooks/useSavedLocations';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { LocationMapPreview } from './LocationMapPreview';

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
  source: 'google' | 'mapbox' | 'saved';
  types: string[];
  rating?: number;
  isOpen?: boolean;
  icon?: string;
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
  showMapPreview?: boolean;
  className?: string;
}

export function LocationSearch({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search for a place or address...",
  allowCustomName = true,
  showMapPreview = true,
  className,
}: LocationSearchProps) {
  const { token: mapboxToken, isLoading: tokenLoading } = useMapboxToken();
  const { savedLocations, saveLocation } = useSavedLocations();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSavedLocations, setShowSavedLocations] = useState(false);
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

  // Handle location selection - always select first, then allow rename
  const handleSelectLocation = (result: SearchResult) => {
    setSelectedLocation(result);
    setShowResults(false);
    setCustomName('');
    
    // Set the location immediately
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
  };

  // Enable custom name editing
  const handleEditName = () => {
    if (selectedLocation) {
      setCustomName(selectedLocation.name);
      setShowCustomNameInput(true);
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

  // Get icon based on place type or saved location
  const getPlaceIcon = (result: SearchResult) => {
    // Saved locations use their stored icon
    if (result.source === 'saved') {
      if (result.icon === 'home') return <Home className="h-4 w-4 text-secondary" />;
      if (result.icon === 'work') return <Briefcase className="h-4 w-4 text-secondary" />;
      if (result.icon === 'heart') return <Heart className="h-4 w-4 text-secondary" />;
      return <Star className="h-4 w-4 text-secondary fill-secondary" />;
    }
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

  // Handle selecting a saved location
  const handleSelectSavedLocation = (saved: SavedLocation) => {
    const result: SearchResult = {
      id: `saved-${saved.id}`,
      name: saved.name,
      address: saved.address,
      lat: saved.lat,
      lng: saved.lng,
      source: 'saved',
      types: [],
      icon: saved.icon,
    };
    handleSelectLocation(result);
    setShowSavedLocations(false);
  };

  // Save current location as favorite
  const handleSaveCurrentLocation = () => {
    if (!selectedLocation) return;
    saveLocation.mutate({
      name: selectedLocation.name,
      address: selectedLocation.address,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      icon: 'pin',
    });
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
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
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
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Saved Locations Quick Access */}
          {savedLocations.length > 0 && !query && !selectedLocation && (
            <div className="flex flex-wrap gap-2 mb-2">
              {savedLocations.slice(0, 4).map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => handleSelectSavedLocation(saved)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary text-sm font-medium transition-colors"
                >
                  {saved.icon === 'home' && <Home className="h-3 w-3" />}
                  {saved.icon === 'work' && <Briefcase className="h-3 w-3" />}
                  {saved.icon === 'heart' && <Heart className="h-3 w-3" />}
                  {!['home', 'work', 'heart'].includes(saved.icon) && <Star className="h-3 w-3 fill-current" />}
                  {saved.name}
                </button>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-9"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowResults(true);
                else if (!query && savedLocations.length > 0) setShowSavedLocations(true);
              }}
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

          {/* Saved Locations Dropdown */}
          {showSavedLocations && savedLocations.length > 0 && !showResults && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground">Saved Locations</p>
              </div>
              <ScrollArea className="max-h-48">
                {savedLocations.map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => handleSelectSavedLocation(saved)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="mt-0.5">
                      {saved.icon === 'home' && <Home className="h-4 w-4 text-secondary" />}
                      {saved.icon === 'work' && <Briefcase className="h-4 w-4 text-secondary" />}
                      {saved.icon === 'heart' && <Heart className="h-4 w-4 text-secondary" />}
                      {!['home', 'work', 'heart'].includes(saved.icon) && <Star className="h-4 w-4 text-secondary fill-secondary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{saved.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{saved.address}</p>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          )}

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

          {/* Map Preview with Rename and Save Options - Show after selection */}
          {selectedLocation && showMapPreview && !showResults && !showSavedLocations && (
            <div className="space-y-2">
              <LocationMapPreview
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
                name={selectedLocation.name}
                address={selectedLocation.address}
                showDirections={false}
              />
              <div className="flex gap-2">
                {allowCustomName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    onClick={handleEditName}
                  >
                    <Edit2 className="h-3 w-3 mr-1.5" />
                    Rename
                  </Button>
                )}
                {selectedLocation.source !== 'saved' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-secondary"
                    onClick={handleSaveCurrentLocation}
                    disabled={saveLocation.isPending}
                  >
                    <BookmarkPlus className="h-3 w-3 mr-1.5" />
                    Save
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
