/**
 * ARCH-3: Unified ride state utility
 * Derives the user's ride plan from their attendee record.
 */

interface AttendeeRideData {
  is_dd?: boolean | null;
  needs_ride?: boolean | null;
  ride_pickup_location?: string | null;
  ride_dropoff_location?: string | null;
}

export type RidePlan = 'dd' | 'rider' | 'self' | 'unset';

export interface UserRideState {
  plan: RidePlan;
  pickupLocation: string | null;
  dropoffLocation: string | null;
}

export function getUserRideState(attendee: AttendeeRideData | null | undefined): UserRideState {
  if (!attendee) {
    return { plan: 'unset', pickupLocation: null, dropoffLocation: null };
  }

  const pickupLocation = attendee.ride_pickup_location ?? null;
  const dropoffLocation = attendee.ride_dropoff_location ?? null;

  if (attendee.is_dd) {
    return { plan: 'dd', pickupLocation, dropoffLocation };
  }

  if (attendee.needs_ride) {
    return { plan: 'rider', pickupLocation, dropoffLocation };
  }

  // Has a plan set (through location_prompt_shown or explicit choice) but not DD/rider
  return { plan: 'self', pickupLocation, dropoffLocation };
}
