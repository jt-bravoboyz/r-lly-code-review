import { Clock, Car, MapPin } from 'lucide-react';
import { useDriverETA, formatETA, formatDistance } from '@/hooks/useDriverETA';
import { Skeleton } from '@/components/ui/skeleton';

interface RiderETADisplayProps {
  driverId: string;
  driverName?: string;
  passengerLat?: number | null;
  passengerLng?: number | null;
  eventId?: string | null;
}

export function RiderETADisplay({
  driverId,
  driverName,
  passengerLat,
  passengerLng,
  eventId,
}: RiderETADisplayProps) {
  const { driverLocation, distanceKm, etaMinutes, isLoading } = useDriverETA(
    driverId,
    passengerLat ?? undefined,
    passengerLng ?? undefined,
    eventId
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Car className="h-3.5 w-3.5 text-muted-foreground" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Driver not sharing location or no pickup coordinates
  if (!driverLocation || !passengerLat || !passengerLng) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <Car className="h-3.5 w-3.5" />
        <span>{driverName || 'Driver'} is on the way</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2 text-xs">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground">
          ETA: {formatETA(etaMinutes)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>{formatDistance(distanceKm)}</span>
      </div>
    </div>
  );
}
