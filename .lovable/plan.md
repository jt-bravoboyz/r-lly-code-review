## Remove Max Attendees Completely

Strip the unused "Max Attendees" cap from R@lly creation, the event detail page, and the database.

### 1. `src/components/events/CreateEventDialog.tsx`
- Drop `max_attendees: z.string().optional()` from `eventSchema`.
- Drop `max_attendees: ''` from `defaultValues`.
- Drop `max_attendees: data.max_attendees ? parseInt(data.max_attendees) : null` from the insert payload.
- Delete the entire `<FormField name="max_attendees">` block (label, input, the whole Optional Details row).

### 2. `src/pages/EventDetail.tsx`
- Replace `{attendeeCount} attending{event.max_attendees && \` · ${event.max_attendees} max\`}` with just `{attendeeCount} attending`.

### 3. `src/components/events/EventCard.tsx`
- Remove `max_attendees: number | null;` from the `event` prop type.

### 4. Database migration
- `ALTER TABLE public.events DROP COLUMN IF EXISTS max_attendees;`
- Recreate `get_event_safe` and `list_events_safe` without the `max_attendees` column in their SELECT lists (these RPCs return `SETOF events` and rely on positional column matching, so they must be regenerated to stay aligned).

### 5. Auto-regenerated
- `src/integrations/supabase/types.ts` regenerates after the migration — no manual edit needed.

### Out of scope
- No other fields, toggles, layouts, or copy change.
- Dress Code and Song Rec's features remain untouched.