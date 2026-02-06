

# Fix: Rally Join RLS Error + Host Approval Flow

## Problem

When your friend enters the invite code, they get the error:
> "new row violates row-level security policy for table event_attendees"

This happens because:
1. The INSERT policy on `event_attendees` does a nested query to `profiles` table
2. The `profiles` table has its own RLS policies that may block this lookup
3. This creates an RLS "chicken and egg" problem

## Solution

We'll fix this with a secure database function and add the host approval flow you requested.

---

## How It Will Work

```text
Friend enters invite code → "Join This Rally"
                ↓
┌─────────────────────────────────────────────────────┐
│  Request is created with status = 'pending'         │
│  Friend sees: "Request sent! Waiting for approval"  │
└─────────────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────┐
│  HOST'S SCREEN (Event Detail page)                  │
│                                                     │
│  🔔 Join Requests (1)                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Avatar] John Doe                           │   │
│  │ Wants to join your rally                    │   │
│  │                                             │   │
│  │   [✓ Accept]    [✗ Decline]                │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                ↓
If Accept → Friend gets full access to rally
If Decline → Request is removed, friend notified
```

---

## Technical Changes

### Part 1: Database - Secure Join Function

Create a `SECURITY DEFINER` function that bypasses the nested RLS evaluation:

```sql
CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_result jsonb;
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
  
  -- Insert with pending status
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, 'pending')
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;
```

### Part 2: RLS Policy Updates

Add policies for host approval:

```sql
-- Hosts can approve pending requests (update status to attending)
CREATE POLICY "Hosts can approve pending attendees"
ON public.event_attendees
FOR UPDATE
TO authenticated
USING (
  status = 'pending' 
  AND is_event_host_or_cohost(event_id, auth.uid())
);

-- Hosts can decline/remove pending requests
CREATE POLICY "Hosts can decline pending attendees"
ON public.event_attendees
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND is_event_host_or_cohost(event_id, auth.uid())
);
```

---

### Part 3: Frontend - Join Rally Page

**File: `src/pages/JoinRally.tsx`**

Update the join flow to:
1. Call the new secure function instead of direct insert
2. Show "Request Sent" confirmation for pending status
3. Display "Waiting for host approval" message

---

### Part 4: New Components for Host

**New File: `src/components/events/PendingJoinRequests.tsx`**

A card that shows pending join requests with:
- Requester's avatar and name
- "Accept" button (green checkmark)
- "Decline" button (red X)
- Real-time updates when new requests arrive

**New File: `src/hooks/useJoinRequests.tsx`**

Hook to:
- Query pending attendees for an event
- Accept a join request (update status to 'attending')
- Decline a join request (delete the record)

---

### Part 5: EventDetail Page Update

**File: `src/pages/EventDetail.tsx`**

Add the PendingJoinRequests component for hosts:
- Shows only to event creators and co-hosts
- Positioned prominently near the top
- Badge showing number of pending requests

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Secure join function + RLS policies |
| `src/pages/JoinRally.tsx` | Modify | Use secure function, show pending UI |
| `src/hooks/useJoinRequests.tsx` | Create | Query/respond to join requests |
| `src/components/events/PendingJoinRequests.tsx` | Create | Host approval interface |
| `src/pages/EventDetail.tsx` | Modify | Add pending requests for hosts |

---

## User Experience After Fix

**For the person joining:**
1. Enter invite code
2. See event preview, click "Join This Rally"
3. See success: "Request sent! Waiting for host approval..."
4. When approved → Navigate to event page

**For the host:**
1. See notification badge: "1 pending request"
2. Card shows who wants to join
3. Click Accept → Person joins the rally
4. Click Decline → Request removed

