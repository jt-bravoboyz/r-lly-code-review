
Goal: break the OAuth/login loop, keep the session after Google/Apple sign-in, and let the walkthrough start from profile state on first real landing.

What I found
- Google is not just looping in the UI: the auth logs show `invalid_client`, so Google sign-in is currently broken in the backend auth settings too.
- The OAuth buttons are already using managed auth in `src/pages/Auth.tsx` and `src/pages/ReturningAuth.tsx`; the fix is not to add `redirectTo` in `src/hooks/useAuth.tsx`. In this project, the correct parameter is `redirect_uri`, and those calls live in the page components.
- `walkthrough_completed` already exists, so no new migration is needed for this issue.
- The real handoff gap is after auth succeeds: `/auth` still renders `AppEntry` (splash/onboarding/auth) even if a session exists, and `Auth.tsx` / `ReturningAuth.tsx` currently `return null` when `user` exists instead of actively redirecting to `/`.
- `useAuth.tsx` still fetches the profile immediately during session restore; for first-time OAuth users that can race with session hydration or profile creation.
- The service worker already excludes `/auth` and `/~oauth`, so caching is not the primary cause here.

Plan
1. Fix Google sign-in configuration in Lovable Cloud
- Repair the Google provider setup causing `invalid_client`.
- Verify it is using valid Google credentials (or switch back to managed Google auth).
- Confirm the active app domains are valid for the provider flow.

2. Add a router-level auth handoff guard
- Add a small router-aware redirect component inside `BrowserRouter`.
- If auth is resolved and a user exists while the app is on `/auth` or `/auth/return`, immediately navigate to `/`.
- Show a brief loading state during the handoff so the app never flashes back to login.
- Keep this navigation inside the router layer rather than `useAuth.tsx`, since `AuthProvider` is currently outside the router.

3. Harden session/profile restoration in `src/hooks/useAuth.tsx`
- Split “auth restoring” from “profile loaded” so the app does not treat a restoring session as logged out.
- Before querying `profiles`, verify the session user is actually available; add a short retry path for first-time OAuth users.
- Keep founder/referral/profile sync work non-blocking from the auth listener.

4. Make auth screens session-aware
- Update `src/components/AppEntry.tsx` to skip splash/onboarding/auth UI when the user is already signed in.
- Update `src/pages/Auth.tsx` and `src/pages/ReturningAuth.tsx` to redirect authenticated users instead of returning `null`.
- Normalize Apple handling to match Google by checking `result.redirected` and not treating redirect start as a completed login.

5. Remove the last walkthrough race
- Keep `src/hooks/useTutorial.tsx` as the only walkthrough trigger.
- Remove the manual `startTutorial()` call after email signup so email, Google, and Apple all follow the same profile-based path.
- Keep `rally-founding25` until the user has a confirmed authenticated profile and completes the handoff to home.

Files/settings to update
- `src/hooks/useAuth.tsx`
- `src/components/AppEntry.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ReturningAuth.tsx`
- `src/App.tsx` or a small new router-level auth redirect component used there
- Lovable Cloud Google auth settings

Verification
- Google sign-up/login lands on `/`, stays signed in, and starts the walkthrough only for new profiles.
- Apple sign-up/login lands on `/`, stays signed in, and follows the same walkthrough rules.
- Existing users do not see the walkthrough again.
- Refresh after OAuth keeps the session.
- Failed Google attempts do not consume the Founder 25 flag.
