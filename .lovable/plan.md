

# Security Fixes — 5 Findings

## Finding 1: squad_invites contact_value exposed to all authenticated users

The current `"Authenticated users can view pending invites"` policy lets every authenticated user read all pending invites platform-wide, including phone numbers in `contact_value`.

**Fix:** Restrict SELECT to users who are the inviter, a squad member/owner, or whose own contact matches.

```sql
DROP POLICY "Authenticated users can view pending invites" ON public.squad_invites;

CREATE POLICY "Relevant users can view pending invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
  AND (
    -- Inviter can see their own invites
    invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    -- Squad members/owners can see invites for their squad
    OR public.is_squad_member_or_owner(squad_id)
    -- Anyone with the exact invite code can view (for join flow — matched by code in WHERE clause)
    OR true  -- see note below
  )
);
```

**Important nuance:** The `JoinSquad` page queries by `invite_code` — it needs to read exactly one row. We can't filter by user contact since invite codes are shareable links. The safest approach: keep the policy permissive for code-based lookups but **drop `contact_value` from the query** in the JoinSquad page (it doesn't use it). Alternatively, restrict to squad members + inviter + a broad authenticated filter (since invite codes are the access control, not the policy).

**Revised approach:** Restrict to inviter or squad member/owner only. The JoinSquad page query joins through `squads` via `safe_profiles` — it needs the squad name, not `contact_value`. The query already filters by `invite_code`, so we need the row to be readable. We'll keep a broad authenticated SELECT but create a **database view** that excludes `contact_value`, or simply restrict the policy to squad members and inviters, and update the JoinSquad page to use an RPC function instead.

**Simplest safe fix:**
```sql
DROP POLICY "Authenticated users can view pending invites" ON public.squad_invites;

-- Squad owners, members, and the inviter can see full invite details
CREATE POLICY "Squad members can view invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR public.is_squad_member_or_owner(squad_id)
);
```

Then create a **security definer function** for the JoinSquad page to look up an invite by code (returns only safe fields, no `contact_value`):

```sql
CREATE OR REPLACE FUNCTION public.get_squad_invite_preview(p_invite_code text)
RETURNS TABLE(
  id uuid, squad_id uuid, invite_code text, status text, expires_at timestamptz,
  squad_name text, owner_display_name text, owner_avatar_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT si.id, si.squad_id, si.invite_code, si.status, si.expires_at,
         s.name, sp.display_name, sp.avatar_url
  FROM squad_invites si
  JOIN squads s ON s.id = si.squad_id
  LEFT JOIN safe_profiles sp ON sp.id = s.owner_id
  WHERE UPPER(si.invite_code) = UPPER(p_invite_code)
    AND si.status = 'pending'
    AND si.expires_at > now();
END;
$$;
```

Update `JoinSquad.tsx` to call this RPC instead of querying `squad_invites` directly.

## Finding 2: Any authenticated user can join any squad with a pending invite

The `squad_members` INSERT policy uses `is_valid_squad_invite(squad_id)` which only checks if **any** pending invite exists — not that the user has the code.

**Fix:** Replace `is_valid_squad_invite` usage in the INSERT policy. Instead, create a **security definer function** `join_squad_by_invite_code` that:
1. Validates the invite code exists and is pending/not expired
2. Inserts the caller into `squad_members`
3. Returns success/failure

```sql
CREATE OR REPLACE FUNCTION public.join_squad_by_invite_code(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_squad_id uuid;
  v_invite_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  SELECT id, squad_id INTO v_invite_id, v_squad_id
  FROM squad_invites
  WHERE UPPER(invite_code) = UPPER(p_invite_code)
    AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF v_squad_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite');
  END IF;

  -- Check not already a member
  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = v_squad_id AND profile_id = v_profile_id) THEN
    RETURN jsonb_build_object('error', 'Already a member');
  END IF;

  INSERT INTO squad_members (squad_id, profile_id)
  VALUES (v_squad_id, v_profile_id);

  RETURN jsonb_build_object('success', true, 'squad_id', v_squad_id);
END;
$$;
```

Then drop the vulnerable INSERT policy and replace with one that only allows the RPC path (or remove the direct INSERT policy entirely since the RPC uses SECURITY DEFINER):

```sql
DROP POLICY IF EXISTS "Users can join via valid invite" ON public.squad_members;
```

Update `JoinSquad.tsx` to call `supabase.rpc('join_squad_by_invite_code', { p_invite_code: code })` instead of direct insert.

## Finding 3: Barhop stops publicly readable

```sql
DROP POLICY "Anyone can view barhop stops" ON public.barhop_stops;

CREATE POLICY "Event members can view barhop stops"
ON public.barhop_stops
FOR SELECT
TO authenticated
USING (public.is_event_member(event_id));
```

## Finding 4: Capacitor CLI — already at ^8.0.1

Scanner is using cached data. Already resolved.

## Finding 5: Leaked Password Protection

This is a backend auth setting, not a code change. User can enable it via backend settings.

---

## Summary

| File/Target | Change |
|---|---|
| Migration: `squad_invites` SELECT policy | Restrict to inviter + squad members |
| Migration: new `get_squad_invite_preview` RPC | Safe invite lookup without contact_value |
| Migration: new `join_squad_by_invite_code` RPC | Validates invite code before join |
| Migration: drop `Users can join via valid invite` on `squad_members` | Remove vulnerable INSERT policy |
| Migration: `barhop_stops` SELECT policy | Restrict to authenticated event members |
| `src/pages/JoinSquad.tsx` | Use RPCs instead of direct queries/inserts |

Three migrations + one frontend file update. No other code changes needed.

