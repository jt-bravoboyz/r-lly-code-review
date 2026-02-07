
# Fix: Host Should Not Get Pending Status When Creating Rally

## Problem

When you create a rally, the system asks you to accept your own join request. This happens because:

1. After creating the event, the code calls `joinEvent.mutateAsync()` to add the creator as an attendee
2. This calls the `request_join_event` database function
3. That function **always** inserts with `status = 'pending'` — even for the event creator
4. The `PendingJoinRequests` component then shows this pending request to the host

## Solution

Modify the `request_join_event` database function to check if the user is the **host (creator) or a co-host** of the event. If they are, they should be added with `status = 'attending'` instead of `status = 'pending'`.

---

## Technical Changes

### 1. Database Migration

Update the `request_join_event` function to auto-approve hosts and co-hosts:

```sql
CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_final_status text;
BEGIN
  -- Get current user's profile ID directly (bypasses RLS)
  SELECT id INTO v_profile_id 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  -- Check if already an attendee
  SELECT status INTO v_existing_status
  FROM event_attendees
  WHERE event_id = p_event_id AND profile_id = v_profile_id;
  
  IF v_existing_status = 'attending' THEN
    RETURN jsonb_build_object('error', 'Already attending', 'status', 'attending');
  ELSIF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already pending', 'status', 'pending');
  END IF;
  
  -- Check if user is the host (creator) or a co-host
  v_is_host := EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = v_profile_id
  ) OR EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_id = p_event_id AND profile_id = v_profile_id
  );
  
  -- Hosts/co-hosts get auto-approved, others get pending status
  v_final_status := CASE WHEN v_is_host THEN 'attending' ELSE 'pending' END;
  
  -- Insert with appropriate status
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$function$;
```

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Update `request_join_event` function to auto-approve hosts |

---

## What This Fixes

- Hosts will be added as `attending` immediately when they create a rally
- Co-hosts will also be auto-approved
- Regular attendees joining via invite code still go through the approval flow
- No changes needed to any frontend components

---

## What Stays the Same

- `PendingJoinRequests` component — unchanged
- `useJoinEvent` hook — unchanged  
- Event creation dialogs — unchanged
- Invite acceptance flow — unchanged
