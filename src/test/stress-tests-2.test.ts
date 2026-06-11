/**
 * Stress Tests 2 — Settlement timing, event status transitions,
 * and Rally Home completion. Helpers are inlined (stress-test pattern)
 * so we don't couple to a specific component file.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Settlement auto-confirm window (24h)
// ---------------------------------------------------------------------------
function isAutoConfirmOverdue(sentAt: string, nowMs = Date.now()): boolean {
  const sent = Date.parse(sentAt);
  if (Number.isNaN(sent)) return false;
  return nowMs - sent >= 24 * 60 * 60 * 1000;
}

describe('isAutoConfirmOverdue', () => {
  const now = Date.parse('2026-06-11T12:00:00Z');
  it('false 1 hour after sent', () => {
    expect(isAutoConfirmOverdue('2026-06-11T11:00:00Z', now)).toBe(false);
  });
  it('false 23h59m after sent', () => {
    expect(isAutoConfirmOverdue('2026-06-10T12:01:00Z', now)).toBe(false);
  });
  it('true at exactly 24h', () => {
    expect(isAutoConfirmOverdue('2026-06-10T12:00:00Z', now)).toBe(true);
  });
  it('true well after 24h', () => {
    expect(isAutoConfirmOverdue('2026-06-09T00:00:00Z', now)).toBe(true);
  });
  it('false on invalid date', () => {
    expect(isAutoConfirmOverdue('not-a-date', now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Event status transitions
// ---------------------------------------------------------------------------
type EventStatus = 'upcoming' | 'live' | 'after_rally' | 'completed' | 'canceled';

function canHostEndEvent(s: EventStatus): boolean {
  return s === 'live' || s === 'after_rally';
}
function canAttendeesJoin(s: EventStatus): boolean {
  return s === 'upcoming' || s === 'live';
}
function isEventArchived(s: EventStatus): boolean {
  return s === 'completed' || s === 'canceled';
}

describe('event status predicates', () => {
  it('host can end only live or after_rally events', () => {
    expect(canHostEndEvent('live')).toBe(true);
    expect(canHostEndEvent('after_rally')).toBe(true);
    expect(canHostEndEvent('upcoming')).toBe(false);
    expect(canHostEndEvent('completed')).toBe(false);
    expect(canHostEndEvent('canceled')).toBe(false);
  });
  it('attendees can join upcoming or live, not after/completed/canceled', () => {
    expect(canAttendeesJoin('upcoming')).toBe(true);
    expect(canAttendeesJoin('live')).toBe(true);
    expect(canAttendeesJoin('after_rally')).toBe(false);
    expect(canAttendeesJoin('completed')).toBe(false);
  });
  it('archived covers completed and canceled', () => {
    expect(isEventArchived('completed')).toBe(true);
    expect(isEventArchived('canceled')).toBe(true);
    expect(isEventArchived('live')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Rally Home completion
// ---------------------------------------------------------------------------
interface RallyHomeAttendee {
  is_dd?: boolean | null;
  going_home_at?: string | null;
  arrived_home_at?: string | null;
  not_participating_rally_home_confirmed?: boolean | null;
}
function isRallyHomeComplete(a: RallyHomeAttendee): boolean {
  if (a.not_participating_rally_home_confirmed) return true;
  return Boolean(a.arrived_home_at);
}

describe('isRallyHomeComplete', () => {
  it('true when arrived_home_at set', () => {
    expect(isRallyHomeComplete({ arrived_home_at: '2026-06-11T03:00:00Z' })).toBe(true);
  });
  it('true when explicitly not participating', () => {
    expect(isRallyHomeComplete({ not_participating_rally_home_confirmed: true })).toBe(true);
  });
  it('false when only going_home_at is set (in transit)', () => {
    expect(isRallyHomeComplete({ going_home_at: '2026-06-11T02:00:00Z' })).toBe(false);
  });
  it('false when nothing set', () => {
    expect(isRallyHomeComplete({})).toBe(false);
  });
});
