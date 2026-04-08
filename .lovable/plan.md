

# Fix: Ambiguous `request_join_event` Function Overload

## Problem
The database has two overloaded versions of `request_join_event`:
1. `request_join_event(p_event_id uuid)` — the original
2. `request_join_event(p_event_id uuid, p_has_invite_code boolean)` — added for frictionless joining

When any caller passes only `p_event_id` (e.g., Quick Rally creation in `useEvents.tsx`, invite acceptance in `useEventInvites.tsx`), Postgres throws: *"Could not choose the best candidate function."*

## Fix

### 1. Database Migration — Merge into single function
- **Drop** the old `request_join_event(uuid)` function
- **Replace** with a single `request_join_event(p_event_id uuid, p_has_invite_code boolean DEFAULT false)` that handles both cases
- The `DEFAULT false` means existing calls with only `p_event_id` work without changes

### 2. No Frontend Changes Needed
All four call sites will work as-is:
- `useEvents.tsx` (line 186): passes only `p_event_id` → uses default `false` → pending status
- `useEventInvites.tsx` (line 170): passes only `p_event_id` → uses default `false` → pending status
- `JoinRally.tsx` (line 142): passes `p_has_invite_code: true` → auto-accepted
- `Auth.tsx` (line 211): passes `p_has_invite_code: true` → auto-accepted
- `ReturningAuth.tsx` (line 106): passes only `p_event_id` → uses default `false` → pending status

## Files Modified
- **Database migration**: Drop old overload, create single function with default parameter

## What Is NOT Touched
| Feature | Status |
|---|---|
| Frictionless invite joining logic | Preserved — `p_has_invite_code` still works |
| Host approval for strangers | Preserved — default `false` keeps pending flow |
| All frontend code | Unchanged |

