import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveTrackingProps {
  eventId: string;
  destination: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  isLive?: boolean;
}

export function LiveTracking({ eventId, destination, isLive }: LiveTrackingProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { profile } = useAuth();

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Update location in database
        if (profile?.id) {
          await supabase
            .from('event_attendees')
            .update({
              current_lat: latitude,
              current_lng: longitude,
              last_location_update: new Date().toISOString(),
              share_location: true,
            })
            .eq('event_id', eventId)
            .eq('profile_id', profile.id);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    setWatchId(id);
    toast.success('Location tracking started');
  };

  const stopTracking = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);

    // Update database
    if (profile?.id) {
      await supabase
        .from('event_attendees')
        .update({ share_location: false })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);
    }

    toast.success('Location tracking stopped');
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const openDirections = () => {
    let url: string;
    
    if (destination.lat && destination.lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    } else if (destination.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.name)}`;
    }

    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }

    window.open(url, '_blank');
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-rally-dark font-montserrat">Live Tracking</h3>
          </div>
          {isLive && (
            <Badge className="bg-green-500 text-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-1.5" />
              LIVE
            </Badge>
          )}
        </div>

        {/* Current Destination */}
        <div className="bg-white rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Current Rally Point</span>
          </div>
          <p className="font-bold text-rally-dark">{destination.name}</p>
          {destination.address && (
            <p className="text-sm text-muted-foreground">{destination.address}</p>
          )}
        </div>

        {/* Tracking Status */}
        {isTracking && userLocation && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sharing your location with the group</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={isTracking ? "destructive" : "secondary"}
            onClick={isTracking ? stopTracking : startTracking}
            className="rounded-full font-montserrat"
          >
            {isTracking ? 'Stop Sharing' : 'Share Location'}
          </Button>
          
          <Button
            onClick={openDirections}
            className="rounded-full bg-primary hover:bg-primary/90 font-montserrat"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Directions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
