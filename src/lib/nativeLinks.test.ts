import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }));

import { buildSmsUrl, buildMailtoUrl, buildMapsUrl } from './nativeLinks';

describe('buildSmsUrl', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 12)',
    });
  });
  it('uses ?body= on non-iOS', () => {
    expect(buildSmsUrl('+15551234567', 'hi there')).toBe(
      'sms:+15551234567?body=hi%20there'
    );
  });
  it('uses &body= on iOS-like UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    });
    expect(buildSmsUrl('', 'hello')).toBe('sms:&body=hello');
  });
  it('URL-encodes special characters in the body', () => {
    expect(buildSmsUrl('1', 'a&b c')).toContain('a%26b%20c');
  });
});

describe('buildMailtoUrl', () => {
  it('builds bare mailto with no params', () => {
    expect(buildMailtoUrl('a@b.com')).toBe('mailto:a@b.com');
  });
  it('encodes subject + body', () => {
    const out = buildMailtoUrl('a@b.com', { subject: 'Hi there', body: 'x&y' });
    expect(out).toContain('subject=Hi%20there');
    expect(out).toContain('body=x%26y');
  });
});

describe('buildMapsUrl', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Windows NT 10.0)',
    });
  });
  it('builds a Google Maps directions URL with destination coords', () => {
    const url = buildMapsUrl({ lat: 40.7, lng: -74 });
    expect(url).toContain('https://www.google.com/maps/dir/');
    expect(url).toContain('destination=40.7%2C-74');
  });
  it('adds origin when provided', () => {
    const url = buildMapsUrl({ lat: 1, lng: 2, originLat: 3, originLng: 4 });
    expect(url).toContain('origin=3%2C4');
  });
  it('uses search endpoint for search mode', () => {
    const url = buildMapsUrl({ address: '1 Main St', mode: 'search' });
    expect(url).toContain('/maps/search/');
    expect(url).toContain('query=1%20Main%20St');
  });
  it('adds travelmode=transit when mode=transit', () => {
    const url = buildMapsUrl({ lat: 1, lng: 2, mode: 'transit' });
    expect(url).toContain('travelmode=transit');
  });
});
