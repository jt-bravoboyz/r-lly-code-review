import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { useLocationContext } from '@/contexts/LocationContext';
import { formatDistanceToNow } from 'date-fns';

interface MemberLocationCardProps {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  lastUpdate: number;
  distance?: number;
  bearing?: number;
  proximitySignal?: 'gps' | 'ble' | 'wifi';
}

export function MemberLocationCard({
  profileId,
  displayName,
  avatarUrl,
  lat,
  lng,
  lastUpdate,
  distance,
  bearing,
  proximitySignal = 'gps',
}: MemberLocationCardProps) {
  const { compassHeading, navigateToMember } = useLocationContext();

  // Calculate the arrow rotation relative to device heading
  const getArrowRotation = () => {
    if (bearing === undefined || compassHeading === null) return 0;
    return bearing - compassHeading;
  };

  // Format distance for display
  const formatDistance = (meters: number | undefined) => {
    if (meters === undefined) return '--';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get freshness indicator
  const getFreshness = () => {
    const ageMs = Date.now() - lastUpdate;
    if (ageMs < 30000) return { label: 'Live', color: 'bg-green-500' };
    if (ageMs < 120000) return { label: formatDistanceToNow(lastUpdate, { addSuffix: false }), color: 'bg-yellow-500' };
    return { label: 'Stale', color: 'bg-red-500' };
  };

  const freshness = getFreshness();
  const rotation = getArrowRotation();

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-muted shadow-sm">
      {/* Avatar with direction indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        {/* Direction arrow */}
        {bearing !== undefined && compassHeading !== null && (
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <Navigation className="h-3.5 w-3.5 text-white fill-white" style={{ transform: 'rotate(-45deg)' }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{displayName}</span>
          <div className={`w-2 h-2 rounded-full ${freshness.color} animate-pulse`} />
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-lg font-bold text-primary">
            {formatDistance(distance)}
          </span>
          {proximitySignal === 'ble' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              <Wifi className="h-2.5 w-2.5 mr-0.5" />
              BLE
            </Badge>
          )}
          {proximitySignal === 'wifi' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-blue-600 border-blue-200">
              <Wifi className="h-2.5 w-2.5 mr-0.5" />
              WiFi
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => navigateToMember({
            profileId,
            displayName,
            avatarUrl,
            lat,
            lng,
            lastUpdate,
            distance,
            bearing,
            proximitySignal,
          })}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
