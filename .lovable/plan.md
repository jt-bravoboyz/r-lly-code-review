

# Fix: Edge Function Authentication Blocking All Notifications

## Root Cause
The `send-event-notification` edge function uses `userSupabase.auth.getClaims(token)` on line 126 — **this method does not exist** in the Supabase JS client library. It throws an error immediately, causing every call to return a 401 before any notification logic runs. This is why zero logs appear and zero notifications are created.

## Solution
Replace the broken `getClaims` authentication with `supabase.auth.getUser(token)`, which is the correct method for verifying a JWT and extracting the user ID.

### File: `supabase/functions/send-event-notification/index.ts`

**Change lines 120-135** — replace the auth block:

```typescript
// Before (broken):
const userSupabase = createClient(supabaseUrl, supabaseAnonKey, { ... });
const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
const userId = claimsData.claims.sub as string;

// After (working):
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: 'Invalid authentication' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const userId = user.id;
```

This is the only change needed. The rest of the function (notification insertion, phone matching, push delivery) is already correctly implemented — it just never executes because auth fails first.

