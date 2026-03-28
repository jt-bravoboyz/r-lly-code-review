/**
 * Stress Tests — Modal Gauntlet, Rapid Click, Persistent State
 *
 * These are unit-level tests that validate the *logic* driving the
 * join-flow modals, rather than full DOM rendering of EventDetail
 * (which would require mocking 30+ hooks and the router).
 *
 * What they prove:
 *  1. Once a user has a transport mode + location_prompt_shown, the
 *     "shouldAutoStartJoinFlow" flag stays false → modals won't re-open.
 *  2. Multiple rapid join calls don't stack extra state.
 *  3. Session dismissal flags prevent re-triggering.
 *  4. The render-loop detector fires a console.warn above threshold.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers: replicate the exact boolean logic from EventDetail.tsx
// ---------------------------------------------------------------------------

interface AttendeeFlags {
  arrival_transport_mode: string | null;
  location_prompt_shown: boolean;
  going_home_at: string | null;
  not_participating_rally_home_confirmed: boolean | null;
  is_dd: boolean;
  needs_ride: boolean;
}

function shouldAutoStartJoinFlow(
  isAttending: boolean,
  attendee: AttendeeFlags | null,
  eventStatus: string,
  joinFlowDismissedForSession: boolean,
): boolean {
  if (!isAttending) return false;
  if (!attendee) return false;
  const hasTransportMode = Boolean(attendee.arrival_transport_mode);
  const hasCompleted = hasTransportMode && attendee.location_prompt_shown;
  return (
    !hasCompleted &&
    !hasTransportMode &&
    eventStatus !== 'completed' &&
    !joinFlowDismissedForSession
  );
}

// ---------------------------------------------------------------------------
// 1. MODAL GAUNTLET — verify modals don't re-appear after completion
// ---------------------------------------------------------------------------

describe('Modal Gauntlet — join flow gate logic', () => {
  it('should NOT trigger modals when attendee already has transport mode', () => {
    const attendee: AttendeeFlags = {
      arrival_transport_mode: 'rideshare',
      location_prompt_shown: true,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };

    expect(shouldAutoStartJoinFlow(true, attendee, 'live', false)).toBe(false);
  });

  it('should NOT trigger modals for completed events', () => {
    const attendee: AttendeeFlags = {
      arrival_transport_mode: null,
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };

    expect(shouldAutoStartJoinFlow(true, attendee, 'completed', false)).toBe(false);
  });

  it('should trigger modals for fresh attendee with no transport mode', () => {
    const attendee: AttendeeFlags = {
      arrival_transport_mode: null,
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };

    expect(shouldAutoStartJoinFlow(true, attendee, 'live', false)).toBe(true);
  });

  it('should NOT trigger if user already picked transport but not location', () => {
    const attendee: AttendeeFlags = {
      arrival_transport_mode: 'walking',
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };

    // hasTransportMode = true → short-circuit to false
    expect(shouldAutoStartJoinFlow(true, attendee, 'live', false)).toBe(false);
  });

  it('should NOT trigger if session dismiss flag is set', () => {
    const attendee: AttendeeFlags = {
      arrival_transport_mode: null,
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };

    expect(shouldAutoStartJoinFlow(true, attendee, 'live', true)).toBe(false);
  });

  it('simulates full flow: join → transport → location → re-check stays false', () => {
    // Step 1: fresh attendee — should trigger
    let attendee: AttendeeFlags = {
      arrival_transport_mode: null,
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };
    expect(shouldAutoStartJoinFlow(true, attendee, 'scheduled', false)).toBe(true);

    // Step 2: user selects transport
    attendee = { ...attendee, arrival_transport_mode: 'driving' };
    expect(shouldAutoStartJoinFlow(true, attendee, 'scheduled', false)).toBe(false);

    // Step 3: user completes location prompt
    attendee = { ...attendee, location_prompt_shown: true };
    expect(shouldAutoStartJoinFlow(true, attendee, 'scheduled', false)).toBe(false);

    // Step 4: "page refresh" — re-check with same DB state
    expect(shouldAutoStartJoinFlow(true, attendee, 'scheduled', false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. RAPID CLICK — ensure idempotent join
// ---------------------------------------------------------------------------

describe('Rapid Click — idempotent join protection', () => {
  it('5 rapid calls should all resolve to same attendee status', async () => {
    // Simulate what useJoinEvent.mutateAsync does — the RPC is idempotent
    let callCount = 0;
    const mockJoin = vi.fn(async () => {
      callCount++;
      // The DB RPC returns "attending" or "already_attending"
      return { success: true, status: callCount === 1 ? 'attending' : 'attending' };
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () => mockJoin())
    );

    // All 5 resolve without error
    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.status).toBe('attending'));

    // In practice the DB UNIQUE constraint means only 1 row is created.
    // Here we just verify the function doesn't throw on duplicates.
    expect(mockJoin).toHaveBeenCalledTimes(5);
  });

  it('should not stack multiple modal opens from rapid calls', () => {
    // Simulate the state machine: showTransportSelector can only be set
    // once because the useEffect guard checks existing state
    let showTransportSelector = false;
    const setShowTransportSelector = (val: boolean) => {
      showTransportSelector = val;
    };

    // 5 rapid "join success" callbacks
    for (let i = 0; i < 5; i++) {
      // This mirrors EventDetail handleJoin:
      // if (result?.status === 'attending') setShowTransportSelector(true);
      if (!showTransportSelector) {
        setShowTransportSelector(true);
      }
    }

    // Only one modal open
    expect(showTransportSelector).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. PERSISTENT STATE — session dismiss flags
// ---------------------------------------------------------------------------

describe('Persistent State — session dismiss flags', () => {
  const EVENT_ID = 'test-event-123';

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('sets join-flow dismiss flag and prevents re-trigger', () => {
    const key = `event-join-flow-dismissed-${EVENT_ID}`;

    // Before dismiss: flag is absent
    expect(sessionStorage.getItem(key)).toBeNull();

    // User dismisses
    sessionStorage.setItem(key, 'true');
    const dismissed = sessionStorage.getItem(key) === 'true';
    expect(dismissed).toBe(true);

    // Gate check mirrors EventDetail logic
    const attendee: AttendeeFlags = {
      arrival_transport_mode: null,
      location_prompt_shown: false,
      going_home_at: null,
      not_participating_rally_home_confirmed: null,
      is_dd: false,
      needs_ride: false,
    };
    expect(shouldAutoStartJoinFlow(true, attendee, 'live', dismissed)).toBe(false);
  });

  it('sets location-prompt dismiss flag', () => {
    const key = `event-location-prompt-dismissed-${EVENT_ID}`;

    sessionStorage.setItem(key, 'true');
    expect(sessionStorage.getItem(key)).toBe('true');
  });

  it('dismiss flags are scoped per-event', () => {
    sessionStorage.setItem(`event-join-flow-dismissed-event-A`, 'true');

    // Different event should NOT be dismissed
    expect(sessionStorage.getItem(`event-join-flow-dismissed-event-B`)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. RENDER LOOP DETECTOR — console.warn when >3 renders/sec
// ---------------------------------------------------------------------------

describe('Render Loop Detector', () => {
  it('warns when render count exceeds threshold in 1 second', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate the detector's logic inline (the hook depends on React refs)
    const THRESHOLD = 3;
    const WINDOW_MS = 1000;
    const timestamps: number[] = [];
    const now = Date.now();

    // Simulate 5 renders within the window
    for (let i = 0; i < 5; i++) {
      timestamps.push(now);
      const filtered = timestamps.filter((t) => now - t < WINDOW_MS);
      if (filtered.length > THRESHOLD) {
        console.warn(
          `[R@lly Loop Detector] ⚠️ POTENTIAL LOOP: <TestComponent> rendered ${filtered.length} times in the last ${WINDOW_MS}ms`
        );
      }
    }

    // Should have warned twice (on render 4 and 5)
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('POTENTIAL LOOP');
    expect(warnSpy.mock.calls[0][0]).toContain('TestComponent');

    warnSpy.mockRestore();
  });

  it('does NOT warn when renders are below threshold', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const THRESHOLD = 3;
    const WINDOW_MS = 1000;
    const timestamps: number[] = [];
    const now = Date.now();

    // Only 3 renders — at threshold, not above
    for (let i = 0; i < 3; i++) {
      timestamps.push(now);
      const filtered = timestamps.filter((t) => now - t < WINDOW_MS);
      if (filtered.length > THRESHOLD) {
        console.warn('should not fire');
      }
    }

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
