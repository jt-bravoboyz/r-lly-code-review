import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Users, Locate, Signal, SignalLow, SignalZero, Compass, Building2, TreePine, Wifi, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocationContext } from '@/contexts/LocationContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MemberLocationCard } from './MemberLocationCard';
import { AccuracyIndicator, EnvironmentBadge } from './AccuracyIndicator';
import { PoorSignalAlert } from './PoorSignalAlert';
import { AccuracyHistoryChart } from './AccuracyHistoryChart';
import { toast } from 'sonner';

interface LiveMemberTrackerProps {
  eventId: string;
  isLive?: boolean;
}

export function LiveMemberTracker({ eventId, isLive }: LiveMemberTrackerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const { profile } = useAuth();
  
  const {
    currentPosition,
    compassHeading,
    isTracking,
    memberLocations,
    startTracking,
    stopTracking,
    signalQuality,
    environmentInfo,
    isWifiPositioningActive,
    accuracyHistory,
  } = useLocationContext();

  // Auto-start tracking if user already has share_location enabled for this event
  useEffect(() => {
    if (!profile?.id || !eventId || isTracking) return;
    
    let cancelled = false;
    
    supabase
      .from('event_attendees')
      .select('share_location')
      .eq('event_id', eventId)
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.share_location === true) {
          startTracking(eventId);
        }
      });
    
    return () => { cancelled = true; };
  }, [profile?.id, eventId]); // intentionally exclude isTracking/startTracking to avoid loops

  // Sort members by distance
  const sortedMembers = Array.from(memberLocations.values()).sort((a, b) => {
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
      toast.success('Location sharing stopped');
    } else {
      // Check permission before starting
      if (navigator.geolocation) {
        try {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              (err) => {
                if (err.code === 1) reject(err);
                else resolve(); // timeout/unavailable is fine
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
          startTracking(eventId);
          toast.success('Location sharing started');
        } catch {
          toast.error("Location is off. Turn it on to let the squad keep tabs.", {
            action: {
              label: 'Try Again',
              onClick: () => handleToggleTracking(),
            },
          });
        }
      } else {
        toast.error('Geolocation is not supported by your browser');
      }
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
            Squad Locations
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

        {/* Poor signal alert */}
        {isTracking && currentPosition && (
          <PoorSignalAlert
            accuracy={currentPosition.accuracy}
            isIndoor={environmentInfo.isIndoor}
            indoorConfidence={environmentInfo.confidence}
            signalQuality={signalQuality}
          />
        )}

        {/* Current position info with enhanced accuracy */}
        {isTracking && currentPosition && (
          <div className="bg-primary/5 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Your location is being shared</span>
                <EnvironmentBadge 
                  isIndoor={environmentInfo.isIndoor} 
                  confidence={environmentInfo.confidence} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {getSignalIcon()}
                <span className="font-mono">±{Math.round(currentPosition.accuracy)}m</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {currentPosition.source === 'wifi' || currentPosition.source === 'network' ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Wi-Fi enhanced</span>
                  </>
                ) : (
                  <>
                    <Signal className="h-3 w-3" />
                    <span>GPS</span>
                  </>
                )}
              </div>
            </div>
            {environmentInfo.isIndoor && environmentInfo.confidence > 0.5 && (
              <p className="text-xs text-muted-foreground">
                {environmentInfo.recommendation}
              </p>
            )}
            
            {/* Toggle accuracy history */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs mt-2"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide signal history
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show signal history
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Accuracy history chart */}
        {isTracking && showHistory && (
          <AccuracyHistoryChart 
            data={accuracyHistory}
            showTitle={true}
            height={120}
          />
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
            <p className="font-medium">No squad members sharing location</p>
            <p className="text-sm mt-1">
              {isTracking 
                ? "Waiting for others to share their location..." 
                : "Start sharing to see your squad"
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
