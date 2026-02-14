import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { formatDistanceToNow } from 'date-fns';

interface AttendeeLocationItemProps {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  lat: number | null;
  lng: number | null;
  lastUpdate: string | null;
}

export function AttendeeLocationItem({
  id,
  displayName,
  avatarUrl,
  lat,
  lng,
  lastUpdate,
}: AttendeeLocationItemProps) {
  const { address, isLoading } = useReverseGeocode(lat ?? undefined, lng ?? undefined);

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Unknown';
    const diff = Date.now() - new Date(lastUpdate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} hr ago`;
  };

  return (
    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-green-200 text-green-700 text-xs">
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{displayName}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {isLoading ? 'Loading...' : address || 'Location shared'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
          {getTimeSinceUpdate()}
        </Badge>
        {lat && lng && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
          </a>
        )}
      </div>
    </div>
  );
}
