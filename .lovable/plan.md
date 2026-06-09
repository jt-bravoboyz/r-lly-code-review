## Plan

**Receipt upload bug — root cause confirmed**
The storage policy requires the first folder segment to equal `auth.uid()`, but the upload uses `profile.id`. They don't always match, so storage rejects with RLS error before OCR can run.

**Fix (single small edit in `src/components/payments/StartTabDialog.tsx`, inside `handleFile`):**
- Call `supabase.auth.getUser()` at the top of the upload try-block.
- If no user, show a sign-in toast, return to `capture` step, abort.
- Build the upload path as `${user.id}/tabs/${crypto.randomUUID()}.${ext}` so it matches the active storage policy.
- Leave the signed URL flow and `parse-receipt` invocation unchanged.

**Already done (no work needed):**
- `StartTabDialog` is already converted from `Dialog` to `Sheet`.
- `SplashScreen` already renders `R@lly.` with no whitespace between the split spans, fixing the brand-name spacing issue.

No other files change.