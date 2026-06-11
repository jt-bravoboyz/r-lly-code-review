import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }));

import {
  buildSmsUrl,
  buildMailtoUrl,
  buildMapsUrl,
  openExternalLink,
  openSms,
  openMailto,
  openMapsDirections,
  openProtocolLink,
} from './nativeLinks';

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

// ---- Side-effecting open* functions -------------------------------------
//
// SPEC DELTA: The spec asked us to verify that `openSms`, `openMailto`, and
// `openMapsDirections` call `window.open` with the sms:/mailto:/maps URL.
// In the real implementation those go through `openProtocolLink` /
// `openDirectionsLink`, which use `window.location.href = url` so iOS/Android
// can hand the protocol off to the native app. `_blank` would open a blank
// in-app WKWebView on native. We therefore assert on `window.location.href`
// for protocol/mobile paths, and on `window.open` for desktop https links.

describe('open* side effects', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let hrefValue = '';
  let originalLocation: Location;

  beforeEach(() => {
    openSpy = vi.fn().mockReturnValue(null);
    window.open = openSpy as unknown as typeof window.open;

    hrefValue = '';
    originalLocation = window.location;
    // jsdom blocks navigation on href assignment; replace with a plain object.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = {
      get href() {
        return hrefValue;
      },
      set href(v: string) {
        hrefValue = v;
      },
    } as unknown as Location;

    // matchMedia stub (desktop = not coarse pointer)
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Windows NT 10.0)',
    });
  });

  afterEach(() => {
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('openExternalLink opens the url in a new tab on web', async () => {
    await openExternalLink('https://example.com/foo');
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/foo',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('openProtocolLink sets window.location.href', () => {
    openProtocolLink('tel:+15551234567');
    expect(hrefValue).toBe('tel:+15551234567');
  });

  it('openSms navigates via sms: scheme', () => {
    openSms('+15551234567', 'hello');
    expect(hrefValue.startsWith('sms:+15551234567')).toBe(true);
    expect(hrefValue).toContain('body=hello');
  });

  it('openMailto navigates via mailto: scheme', () => {
    openMailto('a@b.com', { subject: 'Hi' });
    expect(hrefValue.startsWith('mailto:a@b.com')).toBe(true);
    expect(hrefValue).toContain('subject=Hi');
  });

  it('openMapsDirections opens a maps URL in a new tab on desktop web', () => {
    openMapsDirections({ lat: 40.7, lng: -74 });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url] = openSpy.mock.calls[0];
    expect(url).toContain('https://www.google.com/maps/dir/');
    expect(url).toContain('destination=40.7%2C-74');
  });

  it('openMapsDirections uses location.href on mobile web', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    });
    openMapsDirections({ lat: 1, lng: 2 });
    expect(hrefValue).toContain('maps.apple.com');
    expect(openSpy).not.toHaveBeenCalled();
  });
});
