import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Users, Locate, Signal, SignalLow, SignalZero, Compass } from 'lucide-react';
import { useLocationContext } from '@/contexts/LocationContext';
import { MemberLocationCard } from './MemberLocationCard';
import { toast } from 'sonner';

interface LiveMemberTrackerProps {
  eventId: string;
  isLive?: boolean;
}

export function LiveMemberTracker({ eventId, isLive }: LiveMemberTrackerProps) {
  const {
    currentPosition,
    compassHeading,
    isTracking,
    memberLocations,
    startTracking,
    stopTracking,
    signalQuality,
  } = useLocationContext();

  // Sort members by distance
  const sortedMembers = Array.from(memberLocations.values()).sort((a, b) => {
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
      toast.success('Location sharing stopped');
    } else {
      startTracking(eventId);
      toast.success('Location sharing started');
    }
  };

  // Request compass permission on iOS
  const requestCompassPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          toast.success('Compass enabled');
        }
      } catch (error) {
        toast.error('Could not enable compass');
      }
    }
  };

  const getSignalIcon = () => {
    switch (signalQuality) {
      case 'good':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'fair':
        return <SignalLow className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <SignalZero className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 font-montserrat">
            <Users className="h-5 w-5 text-primary" />
            Crew Locations
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isTracking && (
              <>
                {getSignalIcon()}
                {compassHeading !== null && (
                  <Badge variant="outline" className="text-xs px-2">
                    <Compass className="h-3 w-3 mr-1" />
                    {Math.round(compassHeading)}°
                  </Badge>
                )}
              </>
            )}
            
            {isLive && (
              <Badge className="bg-green-500 text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-1" />
                LIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tracking toggle */}
        <div className="flex gap-2">
          <Button
            onClick={handleToggleTracking}
            variant={isTracking ? 'destructive' : 'default'}
            className="flex-1 rounded-full font-montserrat"
          >
            <Locate className="h-4 w-4 mr-2" />
            {isTracking ? 'Stop Sharing' : 'Share My Location'}
          </Button>
          
          {compassHeading === null && (
            <Button
              onClick={requestCompassPermission}
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <Compass className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Current position info */}
        {isTracking && currentPosition && (
          <div className="bg-primary/5 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Your location is being shared</span>
              <span className="font-mono text-xs">
                ±{Math.round(currentPosition.accuracy)}m
              </span>
            </div>
          </div>
        )}

        {/* Member list */}
        {sortedMembers.length > 0 ? (
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <MemberLocationCard
                key={member.profileId}
                {...member}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No crew members sharing location</p>
            <p className="text-sm mt-1">
              {isTracking 
                ? "Waiting for others to share their location..." 
                : "Start sharing to see your crew"
              }
            </p>
          </div>
        )}

        {/* Legend */}
        {sortedMembers.length > 0 && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Live</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Recent</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="h-3 w-3 text-primary" />
              <span>Direction</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
