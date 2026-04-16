

# Plan: Fix OAuth Redirects & Walkthrough Logic

## Problem
1. **Google OAuth** in both `Auth.tsx` and `ReturningAuth.tsx` uses `supabase.auth.signInWithOAuth` directly instead of the managed `lovable.auth.signInWithOAuth`. This bypasses the Lovable Cloud OAuth broker, causing redirect failures.
2. **Walkthrough** requires `localStorage('rally-onboarding-complete') === 'true'` (line 227-228 of `useTutorial.tsx`), which is only set during the email signup carousel flow. OAuth users never hit that flow, so the tutorial never triggers.

## Changes

### 1. Migration: Add `walkthrough_completed` to `profiles`
```sql
ALTER TABLE public.profiles ADD COLUMN walkthrough_completed boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET walkthrough_completed = true WHERE created_at < now() - interval '24 hours';
```
Backfills existing users so they are not re-prompted.

### 2. Fix Google OAuth — Switch to managed auth

**`src/pages/Auth.tsx` (lines 441-446)**: Replace `supabase.auth.signInWithOAuth({ provider: 'google', ... })` with:
```typescript
const result = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: window.location.origin,
});
if (result.error) throw result.error;
if (result.redirected) return;
localStorage.setItem('rally-has-account', 'true');
```

**`src/pages/ReturningAuth.tsx` (lines 251-257)**: Same change. Also add `import { lovable } from '@/integrations/lovable/index';` at the top.

### 3. Rewrite tutorial auto-start gate (`src/hooks/useTutorial.tsx`, lines 217-248)

Remove the `rally-onboarding-complete` localStorage prerequisite. New logic:
1. `(profile as any).walkthrough_completed === true` → skip (DB truth)
2. `localStorage 'rally-walkthrough-seen' === 'true'` → skip (device guard)
3. Profile age < 24h → start tutorial

Also add `user` to the provider value so `endTutorial`/`skipTutorial` can access it.

### 4. Persist completion to DB (`src/hooks/useTutorial.tsx`)

In `endTutorial` and `skipTutorial`, after setting localStorage flags, also call:
```typescript
if (user) {
  supabase.from('profiles').update({ walkthrough_completed: true } as any).eq('user_id', user.id);
}
```

### Files Modified
- 1 new SQL migration
- `src/pages/Auth.tsx` — Google OAuth to managed auth
- `src/pages/ReturningAuth.tsx` — Google OAuth to managed auth + import
- `src/hooks/useTutorial.tsx` — Logic rewrite + DB persistence

