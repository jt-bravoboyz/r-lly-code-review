## Goal
Fix the "Profile not found" bug and make every attendee in the event Details > Who's Going grid open the profile quick-view sheet, with a polished loading + error experience.

## Root cause
The `PublicProfileSheet` queries `safe_profiles` for `founder_number`, but that column only lives on `safe_profiles_with_connection`. PostgREST returns an error, the query yields no row, and the sheet falls into the generic "Profile not found" state — even when the profile exists.

Separately, the attendee tiles in `EventDetail.tsx` Who's Going grid render as static `<div>`s with no tap handler, so they never open the quick-view.

## Changes

1) `src/components/profile/PublicProfileSheet.tsx`
- Switch the query source from `safe_profiles` to `safe_profiles_with_connection` (still safe public fields — no PII added).
- Surface query errors instead of silently treating them as "not found":
  - Track `isError` from `useQuery`, return `error` from `queryFn` (no swallow).
  - Render distinct states: loading skeleton, error fallback, empty (truly no row), and success.
- Replace the spinner with a Skeleton loader (avatar circle + two text lines + chip + button) so the sheet feels instant.
- Error fallback: friendly card "Couldn't load this profile. They may have left R@lly or set their profile to private." + a clear Close button. No infinite spinner.
- Keep contextual friend action button as-is (Add / Requested / Accept+Decline / Friends + Message). Confirm muted "Friends ✓" state remains for accepted state.

2) `src/pages/EventDetail.tsx` — Who's Going grid (around lines 967–998)
- Import `ProfileTapWrapper` from `@/components/profile/ProfileTapWrapper`.
- Wrap each attendee tile with `ProfileTapWrapper`, using canonical ID priority: `attendee.profile_id ?? attendee.profile?.id`.
- Make the wrapper cover the full tile (avatar + name) so the tap target is comfortable on mobile.
- Keep the DD badge overlay absolutely positioned on the avatar so it stays pixel-perfect on the tappable tile.
- Preserve existing layout (flex column, 12px avatar, name truncation).

3) Header avatar stack, host row, co-host chips (lines 547–712)
- Standardize on canonical IDs: prefer `a.profile_id ?? a.profile?.id`, `event.creator_id ?? event.creator?.id`, `cohost.profile_id ?? cohost.profile?.id`.
- Leave existing onClick `openProfile` calls; just harden the ID fallback so taps never silently no-op when the nested profile object is partial.

4) No DB migrations. No new dependencies.

## Verification

- Network: open quick-view sheet on an attendee — confirm the request hits `/rest/v1/safe_profiles_with_connection?...` and returns the row with `founder_number`. The previous failing `safe_profiles?...founder_number` request is gone.
- Behavior:
  - Tap a name/avatar in Who's Going → sheet opens with full data.
  - Tap host avatar/name → sheet opens.
  - Tap a co-host chip → sheet opens.
  - Tap an attendee in the small header avatar stack → sheet opens.
  - Force a bad ID (devtools) → see the "Couldn't load this profile" fallback with Close, never an infinite loader.
- Visual: skeleton renders for ~loading window; sheet retains glass/liquid styling, 44px touch targets, DD badge stays correctly anchored on the tappable tile.

## Out of scope (next pass)
- DOB capture and 18+/21+ event toggle.
- Pinned media for hosts/co-hosts.
- Public event feed.