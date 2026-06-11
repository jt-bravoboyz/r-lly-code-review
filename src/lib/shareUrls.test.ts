import { describe, it, expect } from 'vitest';
import { buildRallyShareUrl, buildRallyShareUrlClean, buildTabShareUrl } from './shareUrls';

describe('buildRallyShareUrl', () => {
  it('prefers invite code over event id in the target', () => {
    const url = buildRallyShareUrl({ eventId: 'evt-1', inviteCode: 'ABC123' });
    expect(url).toContain('to=');
    expect(decodeURIComponent(url)).toContain('/join/ABC123');
    expect(url).toContain('type=event');
    expect(url).toContain('id=evt-1');
  });
  it('falls back to event id when no invite code', () => {
    const url = buildRallyShareUrl({ eventId: 'evt-2' });
    expect(decodeURIComponent(url)).toContain('/events/evt-2');
  });
  it('appends referrer id when provided', () => {
    const url = buildRallyShareUrl({ eventId: 'e' }, { referrerId: 'user-9' });
    expect(url).toContain('r=user-9');
  });
});

describe('buildRallyShareUrlClean', () => {
  it('returns a plain rlly.cloud URL without query when no referrer', () => {
    const url = buildRallyShareUrlClean({ eventId: 'e', inviteCode: 'XYZ' });
    expect(url).toBe('https://rlly.cloud/join/XYZ');
  });
  it('adds ?r= when referrer set', () => {
    const url = buildRallyShareUrlClean({ eventId: 'e' }, { referrerId: 'u1' });
    expect(url).toBe('https://rlly.cloud/events/e?r=u1');
  });
});

describe('buildTabShareUrl', () => {
  it('uses pay token target when present', () => {
    const url = buildTabShareUrl({ requestId: 'req-1', payToken: 'tok' });
    expect(decodeURIComponent(url)).toContain('/tab/pay/tok');
    expect(url).toContain('type=tab');
  });
  it('falls back to tabs/:requestId without token', () => {
    const url = buildTabShareUrl({ requestId: 'req-2' });
    expect(decodeURIComponent(url)).toContain('/tabs/req-2');
  });
});
