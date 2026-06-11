import { describe, it, expect } from 'vitest';
import { formatDistance, formatDistanceAway, formatDistanceCompact } from './formatDistance';

describe('formatDistance', () => {
  it('formats short distances in feet (US)', () => {
    expect(formatDistance(30, true)).toBe('98 ft');
  });
  it('formats long distances in miles (US)', () => {
    expect(formatDistance(3219, true)).toBe('2.0 mi');
  });
  it('formats short distances in meters (metric)', () => {
    expect(formatDistance(150, false)).toBe('150m');
  });
  it('formats long distances in km (metric)', () => {
    expect(formatDistance(2500, false)).toBe('2.5km');
  });
});

describe('formatDistanceAway', () => {
  it('appends " away"', () => {
    expect(formatDistanceAway(30, true)).toMatch(/ away$/);
  });
});

describe('formatDistanceCompact', () => {
  it('rounds tens of feet for medium distances', () => {
    const out = formatDistanceCompact(100, true);
    expect(out.endsWith(' ft')).toBe(true);
    expect(Number(out.replace(' ft', '')) % 10).toBe(0);
  });
  it('uses km for large metric distances', () => {
    expect(formatDistanceCompact(15000, false)).toBe('15km');
  });
});
