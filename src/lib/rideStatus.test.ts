import { describe, it, expect } from 'vitest';
import { getRideStatus } from './rideStatus';

describe('getRideStatus', () => {
  it('returns DD with seats-left label when driver has open seats', () => {
    const r = getRideStatus(
      { profile_id: 'u1', is_dd: true },
      [{ id: 'r1', driver_id: 'u1', available_seats: 4, passengers: [
        { passenger: { id: 'p1', display_name: 'P' }, status: 'accepted' },
      ] }]
    );
    expect(r.type).toBe('dd');
    expect(r.seatsLeft).toBe(3);
    expect(r.label).toContain('3 seat');
  });

  it('returns plain DD label when no matching ride row', () => {
    const r = getRideStatus({ profile_id: 'u1', is_dd: true }, []);
    expect(r.type).toBe('dd');
    expect(r.label).toBe('DD');
  });

  it('returns "Riding with <first name>" when accepted passenger on a ride', () => {
    const r = getRideStatus(
      { profile_id: 'p1' },
      [{ id: 'r1', driver_id: 'u1', driver: { id: 'u1', display_name: 'Jordan Smith' },
         passengers: [{ passenger: { id: 'p1', display_name: 'P' }, status: 'accepted' }] }]
    );
    expect(r.type).toBe('riding_with');
    expect(r.label).toBe('Riding with Jordan');
  });

  it('returns needs_dd when needs_ride flag is set', () => {
    const r = getRideStatus({ profile_id: 'x', needs_ride: true }, []);
    expect(r.type).toBe('needs_dd');
  });

  it('returns self_ride when explicitly not participating', () => {
    const r = getRideStatus(
      { profile_id: 'x', not_participating_rally_home_confirmed: true },
      []
    );
    expect(r.type).toBe('self_ride');
    expect(r.label).toBe('Self Ride');
  });

  it('defaults to needs_dd when no signal present', () => {
    const r = getRideStatus({ profile_id: 'x' }, []);
    expect(r.type).toBe('needs_dd');
  });
});
