import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Navigation, MapPin, ExternalLink, RefreshCw, Settings, Battery, BatteryLow, BatteryMedium, BatteryCharging, Wifi } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocationContext } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrackingSettings } from './TrackingSettings';

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
  const [isTracking, setIsTracking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { profile } = useAuth();
  
  const {
    currentPosition,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
    isTracking: isContextTracking,
    movementState,
    updateInterval,
    batteryInfo,
    trackingMode,
    indoorInfo,
  } = useLocationContext();

  // Sync local state with context
  useEffect(() => {
    setIsTracking(isContextTracking);
  }, [isContextTracking]);

  // Auto-start tracking if user already has share_location enabled for this event
  useEffect(() => {
    if (!profile?.id || !eventId || isContextTracking) return;
    
    let cancelled = false;
    
    supabase
      .from('event_attendees')
      .select('share_location')
      .eq('event_id', eventId)
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.share_location === true) {
          startLocationTracking(eventId);
        }
      });
    
    return () => { cancelled = true; };
  }, [profile?.id, eventId]); // intentionally exclude deps that would cause loops

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    startLocationTracking(eventId);
    toast.success('Location tracking started');
  };

  const stopTracking = async () => {
    await stopLocationTracking();
    toast.success('Location tracking stopped');
  };

  const openDirections = () => {
    let url: string;
    
    if (destination.lat && destination.lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    } else if (destination.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.address)}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination.name)}`;
    }

    if (currentPosition) {
      url += `&origin=${currentPosition.lat},${currentPosition.lng}`;
    }

    window.open(url, '_blank');
  };

  const getBatteryIcon = () => {
    if (batteryInfo.charging) return <BatteryCharging className="h-3 w-3 text-green-500" />;
    if (batteryInfo.level === null) return <Battery className="h-3 w-3" />;
    if (batteryInfo.level < 0.2) return <BatteryLow className="h-3 w-3 text-red-500" />;
    if (batteryInfo.level < 0.5) return <BatteryMedium className="h-3 w-3 text-yellow-500" />;
    return <Battery className="h-3 w-3 text-green-500" />;
  };

  const getTrackingModeLabel = () => {
    switch (trackingMode) {
      case 'high_accuracy': return 'High';
      case 'balanced': return 'Balanced';
      case 'battery_saver': return 'Saver';
    }
  };

  const getMovementLabel = () => {
    switch (movementState) {
      case 'stationary': return 'Still';
      case 'walking': return 'Walking';
      case 'running': return 'Running';
      case 'driving': return 'Driving';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground font-montserrat">Live Tracking</h3>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-green-500 text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-1.5" />
                LIVE
              </Badge>
            )}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Tracking Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-y-auto max-h-[calc(80vh-80px)] pb-8">
                  <TrackingSettings />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Current Destination */}
        <div className="bg-card rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Current R@lly Point</span>
          </div>
          <p className="font-bold text-foreground">{destination.name}</p>
          {destination.address && (
            <p className="text-sm text-muted-foreground">{destination.address}</p>
          )}
        </div>

        {/* Tracking Status */}
        {isTracking && currentPosition && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="flex-1">Sharing your location with the group</span>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {getBatteryIcon()}
                <span className="ml-1">{getTrackingModeLabel()}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getMovementLabel()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {updateInterval < 1000 ? `${updateInterval}ms` : `${Math.round(updateInterval / 1000)}s`} updates
              </Badge>
              {indoorInfo.isActive && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                  <Wifi className="h-3 w-3 mr-1" />
                  Indoor ({indoorInfo.beaconCount})
                </Badge>
              )}
            </div>
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
