

# Fix: Google OAuth `invalid_client` Error

## Root Cause
The auth logs confirm: `oauth2: "invalid_client" "The provided client secret is invalid."` — the Google OAuth credentials stored in Lovable Cloud are stale or incorrect. Apple OAuth works because it uses a different credential set.

## Changes

### 1. Reset Managed Google Auth (Backend)
- Use the Configure Social Auth tool to toggle/refresh the managed Google OAuth provider
- This forces Lovable Cloud to regenerate or re-validate the stored Google client credentials

### 2. Harden `redirect_uri` to production domain (Code)
Currently both `Auth.tsx` and `ReturningAuth.tsx` use `window.location.origin` which changes between preview and production. Update to prefer the production domain:

**`src/pages/Auth.tsx`** and **`src/pages/ReturningAuth.tsx`**:
```typescript
const result = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: 'https://rlly.cloud',
});
```

This ensures the redirect URI is stable and matches the authorized origins in Google Cloud Console regardless of which URL the user is currently on.

### What stays the same
- Apple OAuth — already working
- Email/password auth — unrelated
- `useAuth.tsx` session handling — already hardened in previous fix
- All other auth flows

### Important Note
If the managed auth refresh does not resolve the `invalid_client` error, it means the Google Cloud Console credentials need to be manually updated. In that case, you would need to:
1. Go to Google Cloud Console → APIs & Credentials
2. Verify the OAuth 2.0 Client ID and Secret
3. Ensure `https://lovzfxppnxictkvymyot.supabase.co/auth/v1/callback` is in Authorized Redirect URIs
4. Re-enter the credentials in Lovable Cloud auth settings

