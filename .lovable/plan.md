# Sprint 3 — Hardening + Engine Features (Expanded)

13 atomic changes. Sprint 3 core (1-8) followed by Sprint 3.5 hardening (9-13) pulled forward from the deferred backlog.

---

## SPRINT 3 CORE

## 1. Revert SplitCheckSection debug override
**File:** `src/components/events/SplitCheckSection.tsx`
- Replace `{(canManage || true) && (` with `{canManage && (`.
- Remove the `// DRAFT: forced visible for layout testing` comment.

## 2. Branded biometric opt-in AlertDialog
**Files:** `src/pages/Auth.tsx`, `src/pages/ReturningAuth.tsx`
- Remove the two `if (confirm('Would you like to enable Face ID...')) { ... }` blocks.
- Stash pending success callback in a ref; open `<AlertDialog>` instead.
- Title: "Skip the password next time?" / Body: "Enable Face ID / Fingerprint to slide back into R@lly instantly. Nights move fast — your login should too."
- Action: "Enable" — R@lly Orange primary. Cancel: "Not now".
- Reuse `@/components/ui/alert-dialog`.

## 3. Standalone Tab notification deep-link
**File:** `src/pages/Notifications.tsx`
- In `split_check_request` branch: if `!data.event_id`, navigate to `/tabs/pay/${token}` (token from `data.token ?? data.guest_token ?? data.share_token`) or fall back to `/tabs`. Existing event routing remains for event-bound tabs.

## 4. R@lly Tab ledger empty state
**File:** `src/pages/SplitCheckHome.tsx`
- When both hosted and owed arrays are empty (post-load), render a centered glass card: orange-gradient Receipt icon, headline "No tabs yet.", body "Start a tab to split a check, settle a round, or front the bar. Nights that matter, math that doesn't.", primary CTA "Start a Tab".

## 5. EventCard split-check + tier badge indicators
**Files:** `src/components/events/EventCard.tsx`, `src/hooks/useEvents.tsx`
- Extend `useEvents` SELECT to include `split_check` and creator tier (via safe_profiles join).
- Add a `Split` pill (Receipt icon, primary tint) in the badge row when `event.split_check`.
- Overlay `<TierBadgeIcon tier={event.creator?.tier} size="xs" />` over the first creator avatar bubble when tier is set.

## 6. Mark all read
**Files:** `src/pages/Notifications.tsx`, `src/hooks/useNotifications.tsx`
- Add `useMarkAllNotificationsRead()` (UPDATE read=true WHERE profile_id=me AND read=false).
- Render right-aligned text button "Mark all read" in page header when `unreadCount > 0`. Sonner toast "All caught up." on success.

## 7. Dedicated `/friends` roster page
**New:** `src/pages/Friends.tsx`, route added in `src/App.tsx`.
- `<Tabs>` with `All Friends` / `Requests` / `Blocked`.
- Top search input filters active tab by display_name.
- Glass cards with avatar + TierBadgeIcon overlay + `ProfileTapWrapper`.
- Requests tab splits Incoming (Accept/Decline) vs Sent (Cancel).
- Blocked tab supports Unblock.
- Branded empty states per tab.
- Link entry added in Profile page.

## 8. Soft-flag event declines
**Migration:**
- Add `declined_at TIMESTAMPTZ`, `declined_by UUID` columns on `event_attendees`.
- Drop existing DELETE policy `Hosts can decline pending attendees`; replace with UPDATE policy permitting host/cohost to flip pending → declined.
- New RPCs (SECURITY DEFINER, search_path=public):
  - `host_decline_attendee(_event_id, _profile_id)` — sets status='declined', stamps decline metadata.
  - `host_reinvite_attendee(_event_id, _profile_id)` — flips back to 'pending', clears decline fields, inserts fresh `event_invites` row.

**Frontend:**
- `PendingJoinRequests.tsx`: Decline calls `host_decline_attendee`. Add collapsible "Previously declined" section with Re-invite buttons.
- Add `.neq('status','declined')` filters to attendee SELECTs in `useEvents`, `useMyEvents`, and attendee count aggregations.

---

## SPRINT 3.5 — HARDENING (PULLED FORWARD)

## 9. OCR re-upload retry
**Files:** `src/components/payments/StartTabDialog.tsx`, `supabase/functions/parse-receipt/index.ts`
- Have `parse-receipt` return `confidence: number` (0-1) alongside parsed items (basic heuristic: presence of subtotal + ≥2 items with prices + parseable tax).
- In StartTabDialog `review` state, if `confidence < 0.6` OR the parse error path fires, render an inline warning card "We couldn't read this receipt clearly." with two CTAs: "Retake photo" (re-runs capture state) and "Edit manually" (drops into the manual review form with empty rows).
- Persist the original `receiptStoragePath` so retake replaces but doesn't orphan; orphans cleaned by existing storage policy.

## 10. Offline payment queue
**New:** `src/lib/paymentQueue.ts` (IndexedDB-backed via `idb-keyval`-style API using `localStorage` fallback for simplicity — no new deps; reuse existing `useOfflineQueue` hook pattern).
**Files:** `src/lib/paymentService.ts`, `src/components/payments/FluidPayCardForm.tsx`, `src/components/layout/ConnectionStatusBanner.tsx`
- When `process-fluid-pay` invocation fails due to network (`navigator.onLine === false` or fetch TypeError), enqueue payload `{splitTargetId, amountCents, paymentMethodToken, idempotencyKey, queuedAt}`.
- On `window.addEventListener('online', ...)` and on app boot, drain queue sequentially; on success show sonner "Payment cleared." On final failure after 3 retries surface a sticky toast with "Retry" action.
- Surface count in `ConnectionStatusBanner` ("1 payment pending — will retry when back online").

## 11. Cover-charge chip on EventCard
**File:** `src/components/events/EventCard.tsx` (extends step 5)
- When `event.cover_charge > 0`, render a chip `<DollarSign /> ${event.cover_charge}` in the badge row using `bg-amber-500/15 text-amber-500 border-amber-500/20` to differentiate from Split.
- Include `cover_charge` in the `useEvents` SELECT.

## 12. Squad-level upcoming events feed
**Files:** `src/pages/SquadDetail.tsx`, `src/hooks/useSquads.tsx` (or new `useSquadEvents.tsx`)
- Query: events whose `creator_id` is any member of the squad OR whose `event_attendees` join contains ≥2 squad members AND `start_time >= now() - 4h` AND status not in (completed, cancelled). Limit 20, order by start_time.
- New `useSquadEvents(squadId)` returning that joined result.
- Render new section "Upcoming R@llies" inside SquadDetail above the chat/media section, using existing `<EventCard>`. Branded empty state: "This squad hasn't locked in a night yet. Be the spark."
- No RLS changes needed — existing `events` SELECT policy (authenticated) covers visibility; squad member fetch already gated.

## 13. Expiring invite codes
**Migration:**
- Add `events.invite_code_expires_at TIMESTAMPTZ NULL` and `events.invite_code_rotated_at TIMESTAMPTZ NULL`.
- New RPC `rotate_event_invite_code(_event_id uuid, _ttl_hours int default 168)` (SECURITY DEFINER) that regenerates `invite_code` (8-char base36), sets new expiry now() + ttl, and bumps rotated_at — gated by host/cohost check.
- Update `request_join_event` to reject when `invite_code_expires_at IS NOT NULL AND invite_code_expires_at < now()` with `error='invite_expired'`.

**Frontend:**
- `src/components/events/InviteToEventDialog.tsx`: show current code with "Expires in Xh" badge (computed from `invite_code_expires_at`) and a "Rotate code" button calling the RPC.
- `src/pages/JoinRally.tsx`: catch `invite_expired` and render branded screen "This invite has expired." with CTA to "Request a new link" (deep-links to inviter via existing flow when possible, otherwise navigates Home).

---

## Technical notes
- All UI uses semantic tokens + Montserrat. No raw hex.
- Migrations run sequentially in two batches: (a) step 8 soft-decline; (b) step 13 invite TTL. Step 8 must land before its UI refactor; step 13 likewise.
- No new env vars or secrets. No new npm packages (offline queue uses native APIs).
- Steps 1–7 and 9–12 are pure frontend or use existing RPCs/edge functions.

## Verification checklist
- Build passes (auto).
- StartTabDialog opens, captures, parses; manual fallback renders.
- Notifications "Mark all read" clears badge; standalone tab deep-link routes correctly.
- `/friends` mounts; tabs switch; search filters.
- Host decline keeps row visible in "Previously declined"; re-invite restores it to pending.
- Offline queue retries on regained connectivity.
- EventCard displays Split + cover-charge chips and tier overlay.
- Expired invite blocks join with branded error.