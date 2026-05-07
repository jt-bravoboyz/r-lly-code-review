## Goal
Let the host (or a co-host) edit the start time (and optional end time) of a planned R@lly before it begins, and notify all attendees that the time changed.

## 1. New component: `src/components/events/EditEventTimeDialog.tsx`
Mirrors `EditEventLocationDialog`.

- Props: `eventId`, `currentStartTime: string`, `currentEndTime?: string | null`, `eventTitle: string`, `attendeeProfileIds: string[]`, `currentProfileId: string`.
- Trigger: small `Edit2` pencil button next to the displayed date/time.
- Body:
  - `<input type="datetime-local">` for **Start time**, prefilled from `currentStartTime` (converted to local TZ).
  - Optional **End time** input with "+ Add end time" toggle when none exists.
  - Inline validation: start must be in the future; end (if set) must be after start.
- Save handler:
  1. `useUpdateEvent().mutateAsync({ eventId, updates: { start_time, end_time } })` — uses ISO strings. RLS already allows host/co-host updates.
  2. Fire push + in-app notifications to attendees (see step 3).
  3. `toast.success('🕒 Time updated — your crew was notified')` and close.

## 2. Wire into `src/pages/EventDetail.tsx`
Around the existing date/time row (line 611-614), conditionally render the new dialog when `canManage` is true and the event is still upcoming:

```tsx
const isUpcoming = new Date(event.start_time) > new Date();
...
<Calendar className="h-4 w-4 text-primary" />
<span>{format(new Date(event.start_time), 'EEEE, MMMM d · h:mm a')}</span>
{canManage && isUpcoming && (
  <EditEventTimeDialog
    eventId={event.id}
    currentStartTime={event.start_time}
    currentEndTime={event.end_time}
    eventTitle={event.title}
    attendeeProfileIds={(event.attendees ?? []).map(a => a.profile_id)}
    currentProfileId={activeProfile?.id}
  />
)}
```

## 3. Notify attendees of the time change
Reuse the existing `send-event-notification` Edge Function — it already supports `type: 'event_update'`, push delivery, and writing rows into the `notifications` table. **No new Edge Function needed; no schema changes.**

In the dialog's save handler, after `updateEvent` succeeds:

```ts
await supabase.functions.invoke('send-event-notification', {
  body: {
    type: 'event_update',
    eventId,
    eventTitle,
    title: `🕒 ${eventTitle} — new time`,
    body: `Start: ${format(new Date(newStart), 'EEE MMM d · h:mm a')}`,
    targetProfileIds: attendeeProfileIds.filter(id => id !== currentProfileId),
    data: { kind: 'time_change', start_time: newStart, end_time: newEnd ?? null },
  },
});
```

This piggybacks on the existing notification pipeline used by Bar Hop transitions and ride updates, so attendees see it in the in-app notification center and (if subscribed) get a push.

## Guardrails (surgical)
- Only `EventDetail.tsx` and the new dialog file are touched.
- `useUpdateEvent` is reused as-is — invalidates `['event', eventId]` and `['events']`, so the UI updates everywhere.
- Pencil only shows for host/co-host AND while the R@lly is upcoming (hidden during live and completed events).
- No DB migrations, no edge function changes, no other tabs/screens affected.
- Existing ride/safety/map/chat/notification logic is untouched.

## Out of scope
- Editing recurring events.
- Adjusting Bar Hop stop ETAs based on the new start time (can be a follow-up).
- Letting attendees confirm the new time.
