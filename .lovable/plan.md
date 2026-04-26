# Master Remediation Plan — R@lly Audit Fixes

Three-phase rollout addressing the 2 Fail and 4 Polish items from the audit.

---

## Phase 1 — Database & Backend (Logic Layer)

**Single SQL migration** containing:

### 1A. Double-Booking Guard (`ride_passengers`)
- New `BEFORE INSERT` trigger `prevent_duplicate_ride_request()`.
- Logic: For the incoming `passenger_profile_id`, look up the `event_id` of the target ride. Reject if the same passenger already has a row joined to a ride for the same event with status in (`pending`, `accepted`).
- Returns clear error: `"You already have an active ride request for this R@lly"` so the UI can surface it as a toast.

### 1B. Archive Deep-Link Fix (`auto_complete_stale_rallies`)
- Update the function so the `data` JSONB written into `notifications` includes `'url': '/events/' || v_event.id`.
- All other behavior unchanged.

### 1C. Admin Analytics View (`admin_invite_history_view`)
- New view selecting from `invite_history` with **no** `hidden_at` filter.
- Restrict via RLS / grants so only `has_role(auth.uid(), 'admin')` can SELECT.
- Used by admin dashboard hooks instead of the table directly so soft-deleted rows still show in growth stats.

---

## Phase 2 — Global UI Infrastructure (Resilience Layer)

### 2A. Connection Status Banner
- New file: `src/components/layout/ConnectionStatusBanner.tsx`.
- Listens to `window` `online` / `offline` events and Supabase realtime channel state.
- When offline: fixed top banner, R@lly-orange, copy "Reconnecting… Hold tight." with a subtle pulse.
- When recovered: brief green "Back online" toast then auto-hide.
- Mount once in `src/App.tsx` above the router so it overlays all routes.

### 2B. Identity Leak Sweep
- Replace hardcoded `'Anonymous'`, `'Unknown'`, `'Unknown User'`, and bare `'User'` fallbacks with `getPublicName(profile)` from `src/lib/identity.ts`.
- Files in scope (from audit, ~30 occurrences): `Index.tsx`, `EventPhotoFeed.tsx`, ride/DD components, recap components, notification renderers, chat sender labels, friend lists.
- Where only an ID is known and no profile is loaded, fall back to `"A R@llier"` (brand-voice fallback) instead of `"Unknown"`.

---

## Phase 3 — Component Polish (Vibe Layer)

### 3A. Image Resilience
- Add `onError` to raw `<img>` tags in:
  - `EventPhotoFeed.tsx`
  - Recap timeline components (hero, grid tiles, attendee avatars where raw)
- On error: hide the `<img>` and reveal a sibling div with a R@lly-orange → magenta gradient placeholder so the layout never collapses to a broken-icon.
- Lightweight pattern using a single `useState('loaded' | 'error')` per image, no new dependency.

---

## Technical Notes

**Trigger SQL sketch (1A):**
```sql
CREATE OR REPLACE FUNCTION public.prevent_duplicate_ride_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_id uuid;
BEGIN
  SELECT event_id INTO v_event_id FROM rides WHERE id = NEW.ride_id;
  IF EXISTS (
    SELECT 1 FROM ride_passengers rp
    JOIN rides r ON r.id = rp.ride_id
    WHERE rp.passenger_profile_id = NEW.passenger_profile_id
      AND r.event_id = v_event_id
      AND rp.status IN ('pending','accepted')
  ) THEN
    RAISE EXCEPTION 'You already have an active ride request for this R@lly'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
```

**Admin view (1C):**
```sql
CREATE OR REPLACE VIEW public.admin_invite_history_view AS
SELECT * FROM public.invite_history;
REVOKE ALL ON public.admin_invite_history_view FROM anon, authenticated;
GRANT SELECT ON public.admin_invite_history_view TO authenticated;
-- enforced by has_role check in hook + future RLS once view-policies are in place
```

**Banner placement (2A):** mounted inside `App.tsx` outside `<BrowserRouter>` children so it persists across route changes.

---

## Files Touched

- `supabase/migrations/<new>.sql` (Phase 1, all three SQL items)
- `src/components/layout/ConnectionStatusBanner.tsx` (new)
- `src/App.tsx` (mount banner)
- `src/lib/identity.ts` (verify `getPublicName` handles all fallback cases; minor tweak if needed)
- ~30 component files across `src/` for identity sweep
- `src/components/events/EventPhotoFeed.tsx` and recap components for `onError` handlers
- `src/hooks/useAdminInviteHistory.ts` (or equivalent) to read from `admin_invite_history_view`

No breaking changes to existing flows; all additions are additive or graceful fallbacks.