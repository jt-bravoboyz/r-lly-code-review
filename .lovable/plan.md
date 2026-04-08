

# Full Application Audit & Logic Flow Analysis

## 1. THE FUNCTIONAL FLOW (Logic Audit)

### 1A. The Handshake: Invite Link → Sign Up → Auto-Join Event

```text
User clicks /join/ABC123
        │
        ▼
  JoinRally.tsx loads
  ┌─ Fetches event via RPC: get_event_preview_by_invite_code
  │
  ├─ User NOT logged in?
  │   └─ localStorage.setItem('pendingRallyCode', code)   ← persists across browser close ✅
  │   └─ navigate('/auth')
  │
  ▼
  /auth → AppEntry.tsx renders:
  ┌─ SplashScreen (5s) → Onboarding slides → Auth page
  │
  ├─ User signs up or signs in
  │   └─ Auth.tsx useEffect fires autoJoinRallyOrSquad()
  │       ├─ Reads localStorage.getItem('pendingRallyCode')    ✅
  │       ├─ Removes it immediately (cleanup)                   ✅
  │       ├─ Fetches event via get_event_preview_by_invite_code
  │       ├─ Calls request_join_event({ p_has_invite_code: true })
  │       │   └─ RPC returns status: 'attending' (auto-accepted) ✅
  │       └─ Navigates to /events/{id} with "You're in! 🎉" toast
  │
  └─ Guard: autoJoinAttempted.current ref prevents duplicate calls ✅
```

**Status: WORKING.** The `localStorage` persistence (switched from `sessionStorage`) survives browser close. The `p_has_invite_code: true` parameter ensures invitees bypass host approval.

**Potential Issue Found:** The `AppEntry` component always shows Splash → Onboarding → Auth in sequence. If a returning user hits `/auth` (e.g., logged out), they see the full onboarding again unless `rally-onboarding-complete` is set in `localStorage`. This is by design — `/auth/return` is the dedicated returning-user route. However, if a new invitee closes the browser mid-onboarding, the `pendingRallyCode` persists but they must re-complete onboarding on return. This is correct behavior.

### 1B. The Plan: Rider/DD Selection → Event Attendees

```text
User joins event → TransportModeSelector opens (auto or via "Edit My Plan")
        │
        ▼
  TransportModeSelector
  ├─ Saves arrival_transport_mode to event_attendees
  ├─ On complete → opens SafetyChoiceModal
  │
  SafetyChoiceModal
  ├─ "R@lly Got Me" → opens RidesSelectionModal
  │   ├─ DD path: sets is_dd=true, creates ride in rides table
  │   ├─ Rider path: sets needs_ride=true, creates ride_passenger entry
  │   └─ Hype screen with random quote → complete
  │
  ├─ "I'm Good" → sets not_participating_rally_home_confirmed=true
  │   └─ Opens LocationSharingModal
  │
  └─ DB flags set on event_attendees:
      ├─ arrival_transport_mode (how they're getting there)
      ├─ is_dd / needs_ride (role selection)
      ├─ location_prompt_shown (join flow complete marker)
      └─ not_participating_rally_home_confirmed (opted out of safety)
```

**Status: WORKING.** The `hasCompletedJoinFlow` guard (`arrival_transport_mode + location_prompt_shown`) correctly prevents re-prompting. The `rides` and `ride_passengers` tables are separate from `event_attendees` — the DD/Rider relationship lives in the rides system while safety status flags live on attendees.

### 1C. The Cascade: DD Arrival Trigger

```text
DD clicks "DD: I've Arrived Home Safely"
        │
        ▼
  DDArrivedButton.tsx
  ├─ Updates event_attendees: arrived_safely=true, arrived_at=now()
  ├─ Awards safe_arrival points (with duplicate guard)
  ├─ Sends notification to host/cohosts
  │
  ▼
  DATABASE TRIGGER: cascade_dd_arrival_to_passengers
  ├─ Fires on UPDATE of event_attendees WHERE arrived_safely changes to true
  ├─ Joins: event_attendees → rides (driver_id) → ride_passengers (status IN accepted,confirmed)
  ├─ Sets passenger's arrived_safely=true, arrived_at=DD's exact timestamp
  ├─ Sets dd_dropoff_confirmed_at and dd_dropoff_confirmed_by
  │
  └─ EXCLUSION: Skips passengers who have a rogue_alerts entry for this event
      └─ NOT EXISTS (SELECT 1 FROM rogue_alerts WHERE event_id AND profile_id)  ✅
```

**Status: WORKING.** Rogue users are correctly excluded. The timestamp sync uses the DD's exact `arrived_at` rather than `now()`. Realtime subscription on `useMyAttendeeStatus` ensures passengers see their status update instantly.

---

## 2. LAYOUT & UI AUDIT

### 2A. Phase-Specific UI (EventDetail.tsx)

| Event Status | Edit My Plan | Going Rogue | R@lly Home | Tabs/Actions | Recap |
|---|---|---|---|---|---|
| `scheduled` | Visible (line 723) ✅ | Hidden ✅ | Hidden ✅ | Visible ✅ | Hidden ✅ |
| `live` | Hidden ✅ | Visible (line 735) ✅ | Visible (line 694) ✅ | Visible ✅ | Hidden ✅ |
| `after_rally` | Hidden ✅ | Visible ✅ | Visible ✅ | Visible ✅ | Hidden ✅ |
| `completed` | Hidden ✅ | Hidden ✅ | Hidden ✅ | Hidden (line 811) ✅ | Visible (line 763) ✅ |

**Status: CORRECT.** All phase guards use the correct boolean flags (`isScheduled`, `isLive`, `isAfterRally`, `isCompleted`).

### 2B. The Recap Layout

- `RallyRecapScreen` renders at line 763 **outside** the event header card `</div>` (which closes at line 760) ✅
- Full-width rendering confirmed — not trapped in a bordered card
- Rogue Timeline uses `bg-[#1a1a2e]` (Midnight Theme) even in light mode ✅
- Masonry grid uses `columns-2 gap-3 space-y-3` for Pinterest-style layout ✅
- "View All" button appears when `galleryPhotos.length > 6` ✅
- Safe & Sound badge with gold accents and "Mission Accomplished" brand line ✅

**Status: CORRECT.**

### 2C. Navigation Dead Ends

| Action | Post-Action Navigation | Status |
|---|---|---|
| Join Rally (JoinRally.tsx) | → Safety modal → Event page | ✅ No dead end |
| Join Squad (JoinSquad.tsx) | → Squad page or onboarding | ✅ |
| Complete R@lly (host) | → RallyCompleteOverlay → navigate('/') | ✅ |
| Leave Event | Stays on page (event still visible) | ⚠️ Minor — could navigate to /events |
| Go Rogue | Stays on page, badge shown | ✅ |
| Auth signup (no invite) | → navigate('/') → Index | ✅ |

**One Minor Issue:** After leaving an event, the user stays on the EventDetail page where they can see the event but can no longer interact (no Join button appears because `!isCreator && !isAttending` — but if they just left, `isAttending` is now false, so the JOIN button reappears). This is actually correct — they can rejoin if they want.

---

## 3. CRITICAL BUG SCAN

### 3A. Stale States After RPC Calls

| Action | Invalidation | Status |
|---|---|---|
| "I'm Home Safe" (DDArrivedButton) | `['event-safety-status', eventId]` + `['my-attendee-status', eventId]` | ✅ |
| "Going Rogue" | `['rogue-alerts', eventId]` + `['my-attendee-status', id]` (prefix match) + resets `joinFlowFiredRef` | ✅ |
| R@lly Home departure | `refetchMyAttendee()` called | ✅ |
| After R@lly opt-in | `['my-attendee-status', eventId, profileId]` invalidated | ✅ |
| Transport mode selection | `['event', eventId]` + `refetchMyAttendee()` | ✅ |

**Realtime backup:** `useMyAttendeeStatus` has a Postgres changes subscription on `event_attendees` filtered by `event_id`, so even if invalidation fails, the realtime channel catches updates within seconds.

**Status: NO STALE STATE BUGS FOUND.**

### 3B. Onboarding Not Bypassed by Auto-Join

The auto-join in `Auth.tsx` fires inside `useEffect` which depends on `[user, profile]`. The `AppEntry` component gates the Auth page behind `SplashScreen → Onboarding → Auth`. The key flow:

1. New user clicks invite → JoinRally stores code in `localStorage` → redirects to `/auth`
2. `/auth` renders `AppEntry` → Splash → Onboarding → Auth form
3. User signs up → `user` and `profile` become available → auto-join fires
4. Tutorial starts via `startTutorial()` in `executeSignUp()` (line 379)

**The onboarding is NOT bypassed.** The splash/onboarding screens render before the Auth form is even visible. The auto-join only fires after the user completes signup, which requires completing onboarding first.

**One consideration:** For squad auto-join (line 139), if onboarding isn't complete, the squad join still happens but redirect is deferred via `rally-pending-squad-redirect`. This is correct.

---

## 4. FLOW MAP

```text
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINTS                             │
├─────────────────────────────────────────────────────────────────┤
│  / (Index)          → Landing (no auth) or Dashboard (auth)     │
│  /auth              → AppEntry: Splash → Onboarding → Auth     │
│  /auth/return       → Returning user login (skip onboarding)    │
│  /join/:code        → JoinRally preview → auth redirect or join │
│  /join-squad/:code  → JoinSquad → auth redirect or join         │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│              AUTHENTICATED HOME (/)               │
│  ├─ Live Now events (pulsing)                    │
│  ├─ Upcoming events                              │
│  ├─ Past R@llies (collapsed, max 3)              │
│  ├─ Create R@lly / Quick R@lly buttons           │
│  └─ Pending Invite banners → Onboarding overlay  │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│           EVENT DETAIL (/events/:id)              │
│                                                  │
│  SCHEDULED PHASE:                                │
│  ├─ Hero carousel (featured media only)          │
│  ├─ Event info card with host/cohosts            │
│  ├─ JOIN button (or "You're in")                 │
│  ├─ Transport selector → Safety choice → Rides   │
│  ├─ "Edit My Plan" button (silent re-edit)       │
│  ├─ Tabs: Details | Photos | Chat | Track | Rides│
│  └─ Leave R@lly button (bottom)                  │
│                                                  │
│  LIVE PHASE:                                     │
│  ├─ All above minus "Edit My Plan"               │
│  ├─ + "Going Rogue 🔥" button (red alert style)  │
│  ├─ + R@lly Home card (prominent)                │
│  ├─ + DD Arrived / DD Dropoff buttons            │
│  └─ + Real-time rogue alert overlays             │
│                                                  │
│  AFTER R@LLY PHASE:                              │
│  ├─ Purple "After R@lly Mode" banner             │
│  ├─ After R@lly opt-in dialog (auto-skips DDs)   │
│  ├─ Safety Tracker + Host Safety Dashboard       │
│  ├─ R@lly Home + Going Rogue still visible       │
│  ├─ Bar Hop mode controls (if enabled)           │
│  └─ Host: "Complete R@lly" in dashboard          │
│                                                  │
│  COMPLETED PHASE:                                │
│  ├─ All buttons/tabs HIDDEN                      │
│  └─ RallyRecapScreen (full-width):               │
│      ├─ Hero: "Shot of the Night" + stats bar    │
│      ├─ Rogue Timeline (Midnight bg-[#1a1a2e])   │
│      ├─ Photo Bundle (masonry grid)              │
│      ├─ Squad Stars awards                       │
│      └─ Safe & Sound finale badge + Share        │
└──────────────────────────────────────────────────┘
```

---

## SUMMARY: No Critical Issues Found

The app's logic flow is **bulletproof** across all three audited journeys. The phase-specific UI correctly gates every button and section. Realtime subscriptions and query invalidation prevent stale states. The onboarding flow is never bypassed by auto-join logic.

The only minor polish opportunities are cosmetic (e.g., navigating away after leaving an event), but no functional bugs or dead ends exist in the current implementation.

