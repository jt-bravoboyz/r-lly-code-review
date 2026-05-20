# Join a R@lly — Verification Audit

## 1. End-to-end test matrix (what I verified, what to manually smoke)

I ran a static + DB audit against the live schema. Below is the full test matrix — green rows are verified by reading the function definitions and call sites; yellow rows need a 30-second manual smoke on device.


| #   | Scenario                                                               | Expected                                                                    | Source of truth                                                                                                             | Status                                                                    |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | OkaHost shares link via `Share` → routed through `buildRallyShareUrl` | URL hits `/share-preview/:code` first, then `/join/:code`                   | `EventDetail.tsx`, `InviteToEventDialog.tsx`, `RecapTimeline.tsx`, `usePhoneInvites.tsx` all import from `lib/shareUrls.ts` | ✅ verified — only 5 files reference share URLs and **all** use the helper |
| 2   | iMessage/Slack unfurl shows themed flyer                               | `share-preview` edge function returns OG image                              | `supabase/functions/share-preview` + `render-event-og-image` deployed                                                       | ✅ verified deployed                                                       |
| 3   | SMS invite → tap → sign up → auto-attending                            | `claim_phone_invites` runs on `profiles` insert                             | Triggers `trigger_auto_claim_phone_invites_insert` + `trigger_auto_claim_phone_invites` active on `profiles`                | ✅ verified on DB                                                          |
| 4   | Authed user with code → `request_join_event(eventId, code)`            | Status = `attending` when code valid + not expired                          | `request_join_event` server-validates `upper(invite_code)` + `invite_code_expires_at`                                       | ✅ verified — boolean overload dropped, no stale callers in `src/`         |
| 5   | Authed user, NO code, public R@lly                                     | Status = `pending` (host approval)                                          | Same RPC, falls through to `event_invites` lookup                                                                           | ✅ verified                                                                |
| 6   | Authed user with stale/expired code                                    | Status = `pending` (not silently `attending`)                               | Server `invite_code_expires_at > now()` guard                                                                               | ✅ verified                                                                |
| 7   | Cover charge unpaid                                                    | RPC returns `cover_required`                                                | Payment EXISTS check, hosts/founders exempt                                                                                 | ✅ verified                                                                |
| 8   | Already attending                                                      | RPC returns `Already attending` early                                       | Pre-check on `event_attendees`                                                                                              | ✅ verified                                                                |
| 9   | Network blip on preview lookup                                         | "Trouble loading invite — Retry" card                                       | `JoinRally.tsx` `loadError` branch on structurally valid codes                                                              | ✅ verified                                                                |
| 10  | Auth.tsx + ReturningAuth.tsx post-signup → `pendingCode` consumed      | RPC called with `p_invite_code: pendingCode`                                | Both files, lines 237 / 110                                                                                                 | ✅ verified                                                                |
| 11  | Host dashboard counter ticks when invite accepted on another screen    | Real-time update without refresh                                            | `useEventInvites` is **per-event** scoped                                                                                   | ⚠️ known gap — see §3                                                     |
| 12  | Manual smoke: open R@lly link in fresh Safari (no app session)         | Themed preview → tap CTA → Auth → land back on `/events/:id` as `attending` | n/a                                                                                                                         | 🟡 user to verify on device                                               |
| 13  | Manual smoke: paste R@lly link into Slack DM                           | Unfurls with flyer + title within ~3s                                       | n/a                                                                                                                         | 🟡 user to verify                                                         |


**DB sanity:** 85 lifetime event invites, 59 accepted (~70% conversion). No orphaned `pending` records from the buggy boolean era visible.

**Bottom line:** The 4 hardening fixes from last loop hold up. The flow is production-clean. The only outstanding ergonomic gap is #11.

## 2. Recommendation — global hosting-invite realtime (Issue #4)

**My take: skip it for now. Defer until a host actually complains.**

Reasoning:

- Hosts who care about acceptance are almost always *on the event page* (where realtime already works). The dashboard counter is glanceable, not transactional.
- Adding a global `useMyHostingInvitesCount()` hook means an always-on `postgres_changes` subscription per host session — small cost but real, and it competes for the same WebSocket budget as ride tracking + chat.
- The 70% acceptance rate means counters move slowly anyway; a 30-second refresh-on-focus would feel identical.
- **Cheaper alternative:** invalidate `['hosting-invite-count']` inside the existing `visibilitychange` / `focus` listeners. Zero new subscriptions, feels real-time-ish.

**Ship the focus-invalidate fallback if you want any improvement. Skip the full realtime hook.**

## 3. Host check-in feature — should you build it?

You're not sold, so let me frame the decision.

**The R@lly product positioning argues AGAINST traditional check-in:**

- Auto-arrival geofencing (`useAutoArrival`, 100m radius) already moves attendees to "arrived" without anyone tapping anything. That's the "Nights That Matter" magic — no clipboards.
- Manual check-in implies a doorman/bouncer flow, which is a vibe mismatch for friend-led nights.

**But there are 2 legit cases where it earns its keep:**

1. **Commercial / paid events** — host wants ground-truth attendance for door revenue reconciliation, and geofence can fail (venue Wi-Fi jail, GPS drift indoors).
2. **Squad captains at large R@llies** — "I personally vouched these 3 humans showed up" → social proof + gamification hook.

**Recommendation:** Don't build a general check-in. If you build anything, build **"Vouch"** — a host/co-host action on the attendee row that flips `event_attendees.arrived_at` + `arrival_source = 'vouched_by_host'`. Reuses existing columns, no new UI surface area, opt-in per host. Defer until the first paid-event host asks.

## 4. Proposed next steps (pick any combo)

```text
A. Manual smoke tests #12 + #13 on your device          (5 min,  you do)
B. Add focus-invalidate fallback for dashboard counter  (10 min, low risk)
C. Skip global realtime hook                            (0 min,  recommended)
D. Park host check-in; revisit when a paid host asks    (0 min,  recommended)
E. (Optional) Build "Vouch" action on attendee row      (~45 min, only if you want it now)
```

Tell me which letters to execute and I'll create the implementation plan. My default if you just say "go" would be **B + C + D** — ship the cheap dashboard polish, skip the realtime overhead, park check-in.