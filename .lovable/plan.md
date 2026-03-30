

# Fix Email Logo Shape + Add Instagram Link

## Changes across all 6 email templates

### 1. Make the logo circular
The `<Img>` tag currently renders as a rectangle (`width="120" height="40"`). Change it to equal width/height (e.g. `width="60" height="60"`) and apply `borderRadius: '50%'` to make it a circle. This works across all major email clients.

### 2. Add Instagram link
Add a `<Link>` element in the footer area pointing to `https://instagram.com/asap.rally` with text like "Follow us @asap.rally" styled in R@lly orange.

### Files to update (same pattern in each)
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`

### In each file
- Change `<Img>` to `width="60" height="60"` with `borderRadius: '50%'` in the logo style
- Import `Link` from `@react-email/components` (if not already imported)
- Add Instagram link below the existing footer text

### Redeploy
Deploy `auth-email-hook` edge function to apply changes.

