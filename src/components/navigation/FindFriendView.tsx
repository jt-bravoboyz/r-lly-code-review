import { useState } from 'react';
import { ArrowLeft, Navigation, Compass, Target, MapPin, Building2, TreePine, Wifi, Signal, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLocationContext } from '@/contexts/LocationContext';
import { TurnByTurnNav } from './TurnByTurnNav';
import { AccuracyIndicator, EnvironmentBadge } from '@/components/tracking/AccuracyIndicator';
import { PoorSignalAlert } from '@/components/tracking/PoorSignalAlert';
import { AccuracyHistoryChart } from '@/components/tracking/AccuracyHistoryChart';

interface MemberLocation {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  lastUpdate: number;
  distance?: number;
  bearing?: number;
}

interface FindFriendViewProps {
  member: MemberLocation;
  onClose: () => void;
}

export function FindFriendView({ member, onClose }: FindFriendViewProps) {
  const [showTurnByTurn, setShowTurnByTurn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { compassHeading, currentPosition, signalQuality, environmentInfo, accuracyHistory } = useLocationContext();

  // Calculate the arrow rotation relative to device heading
  const getArrowRotation = () => {
    if (member.bearing === undefined || compassHeading === null) return 0;
    return member.bearing - compassHeading;
  };

  // Format distance for display
  const formatDistance = (meters: number | undefined) => {
    if (meters === undefined) return '--';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get walking time estimate (average walking speed ~5km/h = 1.4m/s)
  const getWalkingTime = (meters: number | undefined) => {
    if (meters === undefined) return '--';
    const seconds = meters / 1.4;
    if (seconds < 60) return 'Less than a minute';
    if (seconds < 3600) return `~${Math.round(seconds / 60)} min walk`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `~${hours}h ${mins}m walk`;
  };

  // Get freshness indicator
  const getFreshness = () => {
    const ageMs = Date.now() - member.lastUpdate;
    if (ageMs < 30000) return { label: 'Live', color: 'bg-green-500', textColor: 'text-green-500' };
    if (ageMs < 120000) return { label: 'Recent', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    return { label: 'Last seen a while ago', color: 'bg-red-500', textColor: 'text-red-500' };
  };

  const freshness = getFreshness();
  const rotation = getArrowRotation();

  if (showTurnByTurn) {
    return (
      <TurnByTurnNav
        target={{
          profileId: member.profileId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          lat: member.lat,
          lng: member.lng,
        }}
        onClose={() => setShowTurnByTurn(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b">
        <div className="h-6" />
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold font-montserrat">Find {member.displayName}</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${freshness.color} animate-pulse`} />
              <span className={`text-xs ${freshness.textColor}`}>{freshness.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Large compass-style direction indicator */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white text-center">
              {/* Direction arrow */}
              <div className="relative w-48 h-48 mx-auto mb-4">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-white/30" />
                
                {/* Compass points */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-bold opacity-60">N</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold opacity-60">S</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold opacity-60">W</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold opacity-60">E</div>

                {/* Central avatar with direction */}
                <div className="absolute inset-8 flex items-center justify-center">
                  <div 
                    className="relative transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    {/* Direction arrow */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                      <Navigation 
                        className="h-12 w-12 text-white fill-white drop-shadow-lg" 
                        style={{ transform: 'rotate(-45deg)' }}
                      />
                    </div>
                    
                    {/* Avatar */}
                    <Avatar className="h-20 w-20 ring-4 ring-white shadow-xl">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl font-bold">
                        {member.displayName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>

              {/* Distance display */}
              <div className="space-y-1">
                <p className="text-5xl font-bold font-montserrat">
                  {formatDistance(member.distance)}
                </p>
                <p className="text-white/80">
                  {getWalkingTime(member.distance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compass heading info */}
        {compassHeading !== null && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Compass className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your heading</p>
                    <p className="font-bold">{Math.round(compassHeading)}°</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Target bearing</p>
                  <p className="font-bold">{member.bearing !== undefined ? `${Math.round(member.bearing)}°` : '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Poor signal alert */}
        {currentPosition && (
          <PoorSignalAlert
            accuracy={currentPosition.accuracy}
            isIndoor={environmentInfo.isIndoor}
            indoorConfidence={environmentInfo.confidence}
            signalQuality={signalQuality}
          />
        )}

        {/* Location accuracy with enhanced display */}
        {currentPosition && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <AccuracyIndicator
                accuracy={currentPosition.accuracy}
                signalQuality={signalQuality}
                isIndoor={environmentInfo.isIndoor}
                indoorConfidence={environmentInfo.confidence}
                source={currentPosition.source}
                showDetails={true}
              />
              
              {/* Toggle accuracy history */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
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
              
              {showHistory && (
                <AccuracyHistoryChart 
                  data={accuracyHistory}
                  showTitle={false}
                  height={100}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full h-14 text-lg gradient-primary rounded-xl"
            onClick={() => setShowTurnByTurn(true)}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Start Turn-by-Turn Navigation
          </Button>

          <Button 
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${member.lat},${member.lng}${
                currentPosition ? `&origin=${currentPosition.lat},${currentPosition.lng}` : ''
              }&travelmode=walking`;
              window.open(url, '_blank');
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Open in Google Maps
          </Button>
        </div>

        {/* Tips based on environment */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium">Tips for finding your friend:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Point your phone in the direction of the arrow</li>
            <li>• Walk towards the arrow to get closer</li>
            <li>• The distance updates in real-time</li>
            {environmentInfo.isIndoor && environmentInfo.confidence > 0.5 ? (
              <>
                <li className="flex items-center gap-1.5 text-orange-600">
                  <Building2 className="h-3.5 w-3.5" />
                  You appear to be indoors - accuracy may be reduced
                </li>
                <li>• Try moving near windows for better GPS signal</li>
                <li>• Consider using turn-by-turn navigation</li>
              </>
            ) : (
              <li className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Good GPS signal for accurate tracking
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}