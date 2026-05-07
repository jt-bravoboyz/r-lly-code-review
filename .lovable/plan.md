## Issue
The time-edit pencil is gated by `new Date(event.start_time) > new Date()`, so it disappears the moment the R@lly's scheduled start passes — even if the host hasn't actually kicked it off yet. The location pencil has no such gate, which is why it stays visible.

## Fix
Match the location pencil's rule: show the time pencil whenever the host can manage the event AND it isn't completed.

In `src/pages/EventDetail.tsx` line 615, change:

```tsx
{canManage && new Date(event.start_time) > new Date() && (
```

to:

```tsx
{canManage && event.status !== 'completed' && (
```

That's the only change. Notification + dialog logic stays the same.
