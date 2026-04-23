

# Stop Re-Prompting Users for Their Handle on Every Login

## The Bug

The `IdentitySetupDialog` reopens on every login for users whose display name happens to be a single word matching their email prefix (e.g. `JT`, `Amer`, `Sko`, `Henry IV` if email starts with "henry"). The "email-username fallback" detection ignores the authoritative `needs_name_setup=false` flag on the profile, so even users who already set their handle keep getting re-prompted.

## The Fix

**`src/components/profile/NameSetupDialog.tsx`** — make `needs_name_setup` authoritative:

- If `profile.needs_name_setup === false`, the dialog stays closed. Period. The user already chose their handle; we don't second-guess it.
- Only show the dialog when `needs_name_setup === true` OR `display_name` is genuinely missing (`null`/empty/whitespace/`'R@lly Member'`).
- Drop the email-prefix heuristic entirely from the trigger — it's too aggressive and doesn't account for legitimate single-word handles or nicknames.

**`src/hooks/useTutorial.tsx`** — relax the matching last-name guard:

- The walkthrough guard added in the previous pass blocks the tutorial when `display_name` doesn't contain a space. That same logic re-blocks legitimate single-word handles. Update it to mirror the dialog: only block when `needs_name_setup === true` or the name is actually missing/default. A user who saved "JT" or "Sko" on purpose should get the tutorial.

## Result

- Existing single-word handles (`JT`, `Amer`, `Sko`, `Henry IV`, etc.) no longer trigger the dialog on login.
- Brand-new users who haven't set a name (flag `true` or default `R@lly Member`) still get gated correctly.
- The "First + Last required" enforcement still applies inside the dialog itself for users who do go through setup — we're just not falsely flagging existing accounts as incomplete.

## Files Touched

- `src/components/profile/NameSetupDialog.tsx` — remove email-prefix fallback from `needsSetup`
- `src/hooks/useTutorial.tsx` — remove the "must contain a space" guard

No database changes. No migrations.

