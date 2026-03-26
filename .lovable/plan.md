

# Swipe-to-Dismiss — Notifications Page

## Approach

Create a `SwipeDismissCard` wrapper component used per notification card. It leverages the existing `useSwipeGesture` hook (already in the project) with both directions triggering dismiss. Add a `useDeleteNotification` mutation to `useNotifications.tsx` for backend removal. Add a CSS keyframe for the dismiss slide-out animation.

---

## File 1: `src/hooks/useNotifications.tsx`

Add a new `useDeleteNotification` hook (after `useMarkNotificationRead`):
- Optimistically removes the notification from the query cache before the DB call
- Calls `supabase.from('notifications').delete().eq('id', notificationId)`
- On error, invalidates to restore

---

## File 2: `src/components/notifications/SwipeDismissCard.tsx` (new)

A wrapper component that:
- Uses `useSwipeGesture` with `resistance: 1` (1:1 finger tracking), `threshold: 120` (~30% of screen)
- Both `onSwipeLeft` and `onSwipeRight` trigger dismiss
- Renders a background layer behind the card with a Trash icon that fades in based on `|offset|`
- Applies to the card: `translateX(offset)`, subtle `rotate` (max ±3°), and `opacity` decrease as offset grows
- On dismiss: sets a `dismissed` state → card gets `translate-x-full` / `-translate-x-full` + `opacity-0` with transition → after 300ms, sets `removed` state → card collapses height to 0 with transition
- Triggers haptic feedback via `useHaptics` on successful dismiss
- Accepts `onDismiss` callback prop

---

## File 3: `src/index.css`

No new keyframes needed — transitions handled inline via Tailwind classes and style props.

---

## File 4: `src/pages/Notifications.tsx`

- Import `SwipeDismissCard` and `useDeleteNotification`
- Wrap each notification `<Card>` inside `<SwipeDismissCard onDismiss={() => deleteNotification.mutate(id)}>`
- The empty state transition happens naturally — when all notifications are dismissed, React renders the "You're locked in" state

---

## What Does NOT Change
- Layout, header, BottomNav, empty state design
- PendingInvites (not swipeable — those are actionable invites)
- Glass styling, glow effects, animation system
- Notification data structure or realtime subscription

## Files

| File | Change |
|------|--------|
| `src/hooks/useNotifications.tsx` | Add `useDeleteNotification` mutation |
| `src/components/notifications/SwipeDismissCard.tsx` | New wrapper — swipe gesture + dismiss animation |
| `src/pages/Notifications.tsx` | Wrap notification cards with SwipeDismissCard |

3 files. Swipe interaction + backend deletion + smooth collapse animation.

