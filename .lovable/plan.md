

# Fix: Rally Join via Invite Code + Host Approval Flow

## Problem Identified

When a user enters an invite code on the "Join a R@lly" screen, they receive a **"new row violates row level security"** error. This happens because:

1. The current `JoinRally.tsx` attempts to directly insert into `event_attendees` 
2. The RLS policy checks that `profile_id` matches the authenticated user's profile
3. There may be timing issues between authentication and profile loading

Additionally, the user wants a **host approval flow** where:
- User enters invite code → Request goes to host
- Host can accept or decline
- Only after acceptance → User joins the rally

---

## Solution Overview

We'll implement a **"Join Request"** flow using the existing `event_attendees.status` column:

```text
User enters invite code
         ↓
┌─────────────────────────────────────────────────────┐
│  Creates event_attendees row with status='pending'  │
└─────────────────────────────────────────────────────┘
         ↓
Host receives notification: "John wants to join your rally"
         ↓
┌────────────────────────────────────────────────────────────┐
│  Host sees banner/card with Accept/Decline buttons         │
└────────────────────────────────────────────────────────────┘
         ↓
If Accept: status = 'attending' → User gets full access
If Decline: Row is deleted → User notified
```

---

## Part 1: Database Changes

### 1.1 Update RLS Policy for event_attendees INSERT

Current policy only allows insert with `status='attending'` (implicit). We need to allow `status='pending'` as well:

```sql
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can join events" ON public.event_attendees;

-- Create new policy allowing pending joins
CREATE POLICY "Users can join events with pending status"
ON public.event_attendees
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND status IN ('attending', 'pending')
);
```

### 1.2 Add Host Approval Policy

Allow hosts/cohosts to update pending requests:

```sql
-- Hosts can approve/decline join requests
CREATE POLICY "Hosts can manage pending attendees"
ON public.event_attendees
FOR UPDATE
TO authenticated
USING (
  status = 'pending' 
  AND is_event_host_or_cohost(event_id, auth.uid())
)
WITH CHECK (
  status IN ('attending', 'declined')
);

-- Hosts can delete declined requests
CREATE POLICY "Hosts can remove declined attendees"
ON public.event_attendees
FOR DELETE
TO authenticated
USING (
  status IN ('pending', 'declined')
  AND is_event_host_or_cohost(event_id, auth.uid())
);
```

### 1.3 Update is_event_member Function

Ensure pending users can see basic event info but not full member access:

```sql
CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_attendees
    WHERE event_id = p_event_id
    AND profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND status = 'attending'  -- Only full members
  )
  OR EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
$$;
```

---

## Part 2: Frontend Changes

### 2.1 Update JoinRally.tsx

Modify the join flow to create a pending request instead of immediate join:

**Changes:**
- When user clicks "Join This Rally", insert with `status='pending'`
- Show "Request Sent" confirmation instead of immediate access
- Display message: "Waiting for host approval..."

```typescript
// In handleJoin function:
const { error } = await supabase
  .from('event_attendees')
  .insert({ 
    event_id: event.id, 
    profile_id: profile.id,
    status: 'pending'  // NEW: Start as pending
  });

if (!error) {
  toast.success("Request sent! Waiting for host approval...");
  // Show waiting UI
}
```

### 2.2 Create New Component: PendingJoinRequests.tsx

Display pending join requests for hosts on the EventDetail page:

```typescript
// src/components/events/PendingJoinRequests.tsx
// Shows cards for each pending attendee with Accept/Decline buttons
// Only visible to hosts and cohosts
```

**Features:**
- Avatar, name, and time of request
- "Accept" button (green) → Updates status to 'attending'
- "Decline" button (red) → Deletes the record
- Realtime updates when new requests come in

### 2.3 Create Hook: useJoinRequests.tsx

```typescript
// src/hooks/useJoinRequests.tsx
export function usePendingJoinRequests(eventId: string) {
  // Query pending attendees for this event
  return useQuery({
    queryKey: ['join-requests', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_attendees')
        .select('*, profile:profiles(id, display_name, avatar_url)')
        .eq('event_id', eventId)
        .eq('status', 'pending');
      return data;
    },
  });
}

export function useRespondToJoinRequest() {
  // Accept or decline a join request
}
```

### 2.4 Update EventDetail.tsx

Add the PendingJoinRequests component for hosts:

```tsx
{isHost && <PendingJoinRequests eventId={id} />}
```

---

## Part 3: Notifications

### 3.1 Send Notification to Host

When a join request is created, notify the host:

```typescript
// After successful pending insert in JoinRally.tsx
await supabase.functions.invoke('send-event-notification', {
  body: {
    type: 'join_request',
    eventId: event.id,
    eventTitle: event.title,
    requesterName: profile.display_name,
    profileIds: [event.creator.id], // Host profile ID
  },
});
```

### 3.2 Send Notification to Requester on Decision

When host accepts/declines:

```typescript
// On accept
await supabase.functions.invoke('send-push-notification', {
  body: {
    profileIds: [requesterId],
    title: "You're in! 🎉",
    body: `You've been accepted to ${eventTitle}`,
    data: { url: `/events/${eventId}` },
  },
});

// On decline
await supabase.functions.invoke('send-push-notification', {
  body: {
    profileIds: [requesterId],
    title: "Request Declined",
    body: `Your request to join ${eventTitle} was declined`,
  },
});
```

---

## Part 4: Integration with Onboarding Flow

The existing 3-step onboarding flow (invite banner → rides → location) works for **direct invites** where the host invites someone by profile. 

For **invite code joins**, after host approval:
1. User receives push notification: "You're in!"
2. Tapping notification opens the event
3. The 3-step onboarding could optionally trigger for first-time joiners

---

## Summary of Files

### New Files
| File | Purpose |
|------|---------|
| `src/components/events/PendingJoinRequests.tsx` | Host view of pending requests |
| `src/hooks/useJoinRequests.tsx` | Query and respond to join requests |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/JoinRally.tsx` | Insert as 'pending' instead of 'attending' |
| `src/pages/EventDetail.tsx` | Add PendingJoinRequests for hosts |
| Database migration | Update RLS policies, update is_event_member function |

---

## Testing Checklist

**Join Request Flow:**
- [ ] User can enter invite code and submit request
- [ ] Request creates `event_attendees` row with `status='pending'`
- [ ] No RLS error occurs
- [ ] User sees "Request sent, waiting for approval" message

**Host Approval:**
- [ ] Host sees pending requests on event page
- [ ] Host receives push notification for new requests
- [ ] "Accept" changes status to 'attending'
- [ ] "Decline" removes the record
- [ ] Requester receives notification of decision

**Access Control:**
- [ ] Pending users cannot access full event features
- [ ] Pending users cannot see chat, tracking, etc.
- [ ] Approved users get full access
