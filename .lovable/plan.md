

# Final Implementation: Identity Gate + Google Auth + Sequential Walkthrough

## 1. Google OAuth — Active (Not Skipped)

**Status**: Google managed auth is already enabled and the code already uses `lovable.auth.signInWithOAuth('google', { redirect_uri: 'https://rlly.cloud' })` in both `Auth.tsx` and `ReturningAuth.tsx`. The `AuthRedirectGuard` already routes authenticated users from `/auth` → `/` on `SIGNED_IN`.

**Action**: No code changes needed for Google OAuth. The managed credentials are active. If the `invalid_client` error persists, the issue is in Google Cloud Console (redirect URIs or stale secret) — not in the app code.

## 2. Enforce Name Setup (First & Last Name)

### `src/components/profile/NameSetupDialog.tsx`
- Replace single `name` input with **two fields**: `firstName` and `lastName`
- Broaden trigger: open when `needs_name_setup === true` **OR** `display_name` is null/empty/equals "R@lly Member"
- "Lock It In" disabled until both fields have content
- On save: write `display_name: "${firstName} ${lastName}"`, set `needs_name_setup: false`
- Update copy: "First Name" and "Last Name" placeholders

## 3. Sequential Walkthrough Guard

### `src/hooks/useTutorial.tsx` (line ~226)
Add guard before the profile-age check:
```
if ((profile as any).needs_name_setup === true) return;
if (!profile.display_name || profile.display_name === 'R@lly Member') return;
```
This ensures the walkthrough only fires **after** the user has completed their identity setup.

## Files Changed

| File | Change |
|------|--------|
| `src/components/profile/NameSetupDialog.tsx` | Split into First/Last name fields, broaden open condition |
| `src/hooks/useTutorial.tsx` | Add name-setup guard before walkthrough auto-start |

No database migrations needed — `needs_name_setup` and `display_name` already exist on `profiles`.

