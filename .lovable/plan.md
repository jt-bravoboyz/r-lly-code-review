## Emergency Stability — Event Creation

Scoped, surgical fixes for the create flows (`CreateEventDialog`, `QuickRallyDialog`) so the Drunkies event tonight ships cleanly.

---

### 1. Crash Protection — Error Boundary

New `src/components/ErrorBoundary.tsx` (class component):
- Catches render errors in subtree
- Glass-styled fallback: "Something glitched" + small **Retry** button that resets the boundary (bumps a `resetKey`)
- Logs full error + stack to console in dev
- Optional `name` prop for log tagging

Wrap both create flows where they're rendered (the dialogs themselves, not their triggers) so a form crash never blanks the host page:
- `src/components/events/CreateEventDialog.tsx` — wrap the entire `<DialogContent>` body in `<ErrorBoundary name="CreateEventDialog">`
- `src/components/events/QuickRallyDialog.tsx` — same treatment

(Outer app-wide boundary is out of scope for this emergency fix — focus is the create surface.)

---

### 2. Permission Audit — events INSERT policy

Confirmed against live DB:

```
Policy: "Users can create events"
Command: INSERT
WITH CHECK: creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
```

This is correct and **not blocked** by stealth or After R@lly logic — those are runtime UI flags, not RLS conditions. The only requirement is `creator_id` = the caller's own profile id, which both dialogs already pass (`creator_id: profile.id`). **No migration needed.**

The plan adds one defensive check in the submit handler: bail with a clear toast if `profile?.id` is somehow missing before hitting the insert (prevents a cryptic RLS rejection in the unlikely auth-race case).

---

### 3. Loading States — double-click hardening

Both dialogs already have `isSubmittingRef` + `disabled={createEvent.isPending || ...}`. Tightening:

- Add a `<Loader2 className="animate-spin" />` inside the primary submit button while pending so the user *sees* it's working (currently the button just goes flat-disabled, which invites a second tap).
- Add `aria-busy={submitting}` and keep the button disabled until the post-submit navigation begins, not just until the insert resolves.
- Apply same treatment in `QuickRallyDialog` submit button.

No new state is needed — derive `submitting` from existing `createEvent.isPending || isSubmittingRef.current || isUploading`.

---

### 4. Submission Validation — typed try/catch + log

Wrap the `createEvent.mutateAsync({...})` call in both dialogs with a focused try/catch that:
- Logs `error.code`, `error.message`, `error.details`, `error.hint` to console (Postgres errors from supabase-js expose all four)
- Surfaces user-friendly toast based on common codes:
  - `23505` (unique_violation) → "Looks like that R@lly already exists — give it a moment."
  - `42501` / RLS reject → "Permission denied. Try logging out and back in."
  - default → existing generic toast
- Re-throws so the outer `finally` still resets `isSubmittingRef`

Also strip the `as any` cast on the insert payload in `CreateEventDialog` line 178 — it hides type errors that would otherwise warn us when the events schema changes.

---

### Files touched

**New**
- `src/components/ErrorBoundary.tsx`

**Edited**
- `src/components/events/CreateEventDialog.tsx` — boundary wrap, spinner-on-submit, typed try/catch with code logging
- `src/components/events/QuickRallyDialog.tsx` — same three changes

### Out of scope

- DB migrations (RLS already correct)
- Virtualization, image compression, indexes, realtime cleanup (separate Stability & Scale plan if you want to revisit it after tonight)

### Verification

- Open Create dialog, intentionally throw inside the form → only the dialog body shows the Retry card; rest of the page (Events list) stays interactive
- Spam-click the submit button → only one network insert hits `events` (check Network tab)
- Sign out, force a stale session, then submit → console shows the exact PG error code and user sees the auth-friendly toast
