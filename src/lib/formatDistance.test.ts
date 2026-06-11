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
  it('rounds sub-meter metric distances', () => {
    expect(formatDistance(0.4, false)).toBe('0m');
  });
  it('formats exactly-1km as km in metric', () => {
    expect(formatDistance(1000, false)).toBe('1.0km');
  });
});

describe('formatDistanceAway', () => {
  it('appends " away" (US)', () => {
    expect(formatDistanceAway(30, true)).toMatch(/ away$/);
  });
  it('appends " away" (metric)', () => {
    expect(formatDistanceAway(2500, false)).toBe('2.5km away');
  });
});

describe('formatDistanceCompact', () => {
  it('rounds tens of feet for medium distances', () => {
    const out = formatDistanceCompact(100, true);
    expect(out.endsWith(' ft')).toBe(true);
    expect(Number(out.replace(' ft', '')) % 10).toBe(0);
  });
  it('uses raw feet under 100 ft (US)', () => {
    expect(formatDistanceCompact(15, true)).toBe('49 ft');
  });
  it('rounds whole miles for >10 mi (US)', () => {
    expect(formatDistanceCompact(20000, true)).toMatch(/^\d+ mi$/);
  });
  it('formats < 100m as raw meters (metric)', () => {
    expect(formatDistanceCompact(45, false)).toBe('45m');
  });
  it('rounds to nearest 10m for 100m–1km (metric)', () => {
    const out = formatDistanceCompact(456, false);
    expect(out.endsWith('m')).toBe(true);
    expect(out.endsWith('km')).toBe(false);
    expect(Number(out.replace('m', '')) % 10).toBe(0);
  });
  it('uses 1-decimal km for 1–10 km (metric)', () => {
    expect(formatDistanceCompact(2500, false)).toBe('2.5km');
  });
  it('uses km for large metric distances', () => {
    expect(formatDistanceCompact(15000, false)).toBe('15km');
  });
});
