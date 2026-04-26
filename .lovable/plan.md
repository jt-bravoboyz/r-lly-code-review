# Final 2 Caroline Polish Items

## 1. QuickRallyDialog — Recently Friended Row

**File:** `src/components/events/QuickRallyDialog.tsx`

- Import `useRecentlyFriended` from `@/hooks/useFriendships`.
- Call `const { data: recentlyFriended = [] } = useRecentlyFriended(8);` inside the component.
- Insert a "Recently Friended" chip row directly above the existing "R@lly Friends" block (around line 431), mirroring the orange-tinted pill styling already used in `CreateEventDialog.tsx` (lines 530–559):
  - `bg-primary/10` / `border-primary/30` for unselected state
  - `bg-primary text-primary-foreground` when selected
  - Uses `friend.profile_id` (not `friend.id`) since the hook returns the friendship row shape
  - Same `toggleFriendSelection` handler — no new state needed

No other logic changes; selected IDs already feed into the existing `selectedFriendIds` array used at submit time.

## 2. Branded System Notification — Caroline Kay + JT

**Migration SQL** (insert into `public.notifications`, gated by `dedupe_key` so it can't double-fire if re-run):

```sql
INSERT INTO public.notifications (profile_id, type, title, body, data)
SELECT
  p.id,
  'system_message',
  '⚡ You spoke. We r@llied.',
  CASE
    WHEN p.full_name ILIKE 'Caroline%'
      THEN 'Founding Member feedback shipped: identity in chat, smart invites, clickable avatars, dedupe on alerts, 8-hour auto-end, and badge fixes — all live. Thank you for making R@lly sharper. 🧡'
    ELSE 'Founder verification ping — Caroline''s feedback shipped: identity, smart invites, avatar profile cards, notification dedupe, 8-hour auto-end, badge rendering. Confirm branding & badge formatting end-to-end.'
  END,
  jsonb_build_object(
    'dedupe_key', 'caroline-polish-shipped-2026-04-26',
    'source', 'founder-feedback',
    'campaign', 'caroline-polish-v1'
  )
FROM public.profiles p
WHERE p.id IN (
  'a5bdc43f-7fa7-4893-8343-da76cfc4a77f',  -- Caroline Kay
  '536e4694-245b-48d8-9930-018d72f266e0'   -- JT
)
AND NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.profile_id = p.id
    AND n.data->>'dedupe_key' = 'caroline-polish-shipped-2026-04-26'
);
```

Both notifications will appear instantly in the in-app Command Center via the existing realtime subscription on the `notifications` table.

## Files Touched
- `src/components/events/QuickRallyDialog.tsx` (1 edit)
- New migration file (1 SQL insert)
