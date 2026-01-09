import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X, Home, Building } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

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
  const { token, isLoading: tokenLoading } = useMapboxToken();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [customName, setCustomName] = useState('');
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Search for locations using Mapbox Geocoding API
  const searchLocations = async (searchQuery: string) => {
    if (!token || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?` +
        `access_token=${token}&limit=8&types=poi,address,place&language=en`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.features || []);
      setShowResults(true);
    } catch (error) {
      console.error('Location search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
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

    // Check if this looks like a residential address (not a business/POI)
    const isAddress = result.place_type.includes('address');
    
    if (allowCustomName && isAddress) {
      // Show custom name input for addresses (like someone's house)
      setShowCustomNameInput(true);
      setQuery(result.place_name);
    } else {
      // Use the place name directly for businesses/POIs
      const locationName = result.text || result.place_name;
      setQuery(locationName);
      onChange(locationName);
      
      if (onLocationSelect) {
        onLocationSelect({
          name: locationName,
          address: result.place_name,
          lat: result.center[1],
          lng: result.center[0],
        });
      }
    }
  };

  // Confirm custom name for address
  const handleConfirmCustomName = () => {
    if (!selectedLocation) return;

    const finalName = customName.trim() || selectedLocation.text;
    onChange(finalName);
    setQuery(finalName);
    setShowCustomNameInput(false);

    if (onLocationSelect) {
      onLocationSelect({
        name: finalName,
        address: selectedLocation.place_name,
        lat: selectedLocation.center[1],
        lng: selectedLocation.center[0],
      });
    }
  };

  // Get icon based on place type
  const getPlaceIcon = (placeTypes: string[]) => {
    if (placeTypes.includes('poi')) {
      return <Building className="h-4 w-4 text-primary" />;
    }
    if (placeTypes.includes('address')) {
      return <Home className="h-4 w-4 text-muted-foreground" />;
    }
    return <MapPin className="h-4 w-4 text-muted-foreground" />;
  };

  // Get context (city, state) from result
  const getContext = (result: SearchResult) => {
    if (!result.context) return '';
    const city = result.context.find(c => c.id.startsWith('place'))?.text;
    const region = result.context.find(c => c.id.startsWith('region'))?.text;
    return [city, region].filter(Boolean).join(', ');
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
            {selectedLocation.place_name}
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
              <ScrollArea className="max-h-64">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectLocation(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="mt-0.5">
                      {getPlaceIcon(result.place_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.text}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {getContext(result) || result.place_name}
                      </p>
                    </div>
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
