/**
 * Determines the ride status for an attendee based on rides data.
 * Used to replace "Undecided" with meaningful ride-related labels.
 */

export type RideStatusType = 'dd' | 'riding_with' | 'needs_dd' | 'self_ride';

export interface RideStatus {
  type: RideStatusType;
  label: string;
  ddName?: string;
  seatsLeft?: number;
}

interface RideData {
  id: string;
  driver_id: string;
  driver?: { id: string; display_name: string | null } | null;
  available_seats?: number | null;
  passengers?: Array<{
    passenger?: { id: string; display_name: string | null } | null;
    status?: string | null;
  }>;
}

interface AttendeeData {
  profile_id: string;
  is_dd?: boolean | null;
  needs_ride?: boolean | null;
  not_participating_rally_home_confirmed?: boolean | null;
}

export function getRideStatus(
  attendee: AttendeeData,
  rides: RideData[] | undefined
): RideStatus {
  // 1. DD check
  if (attendee.is_dd) {
    const driverRide = rides?.find(r => r.driver_id === attendee.profile_id);
    const acceptedPassengers = driverRide?.passengers?.filter(p => p.status === 'accepted')?.length ?? 0;
    const totalSeats = driverRide?.available_seats ?? 4;
    const seatsLeft = totalSeats - acceptedPassengers;
    
    return {
      type: 'dd',
      label: driverRide && seatsLeft > 0 ? `DD • ${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left` : 'DD',
      seatsLeft: seatsLeft > 0 ? seatsLeft : undefined,
    };
  }

  // 2. Riding with a DD (accepted passenger)
  if (rides) {
    for (const ride of rides) {
      const accepted = ride.passengers?.find(
        p => p.passenger?.id === attendee.profile_id && p.status === 'accepted'
      );
      if (accepted) {
        const ddName = ride.driver?.display_name?.split(' ')[0] || 'DD';
        return {
          type: 'riding_with',
          label: `Riding with ${ddName}`,
          ddName,
        };
      }
    }
  }

  // 3. Needs a DD (pending ride request or needs_ride flag)
  if (attendee.needs_ride) {
    return { type: 'needs_dd', label: 'Needs a DD' };
  }
  if (rides) {
    for (const ride of rides) {
      const pending = ride.passengers?.find(
        p => p.passenger?.id === attendee.profile_id && p.status === 'pending'
      );
      if (pending) {
        return { type: 'needs_dd', label: 'Needs a DD' };
      }
    }
  }

  // 4. Self Ride (explicitly opted out of R@lly rides)
  if (attendee.not_participating_rally_home_confirmed === true) {
    return { type: 'self_ride', label: 'Self Ride' };
  }

  // Default: no ride decision yet
  return { type: 'needs_dd', label: 'Needs a DD' };
}
