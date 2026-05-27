# Fix: Create R@lly form won't submit (silent validation failure)

## What's happening

In `src/components/events/CreateEventDialog.tsx`, the form uses Zod with required `title`, `date`, and `time` fields, and the submit button is a flex sibling **outside** the scrolling form area, wired in via `form="create-rally-form"`.

```ts
<form id="create-rally-form" onSubmit={form.handleSubmit(onSubmit)}>
```

`form.handleSubmit(onSubmit)` is called with **no error handler**. When validation fails (e.g. user skipped Date or Time, or title is < 3 chars), react-hook-form silently:

- Blocks `onSubmit` from running (so no toast, no network call, no spinner — looks "dead").
- Sets `errors` on the matching `FormMessage`, which lives deep in the scroll area and is almost always off-screen when the user is tapping the sticky bottom button.

Result: tap "Create R@lly" → nothing happens → user assumes the app is broken. This matches "form won't submit, everyone, no error message," and explains why the DB shows no new events for ~6 days even though no backend changed.

## The fix (UI-only, surgical)

Add an `onInvalid` handler to `form.handleSubmit` that:

1. **Toasts the first missing field** in plain language, e.g. _"Pick a date for your R@lly"_, _"Pick a start time"_, _"Title needs at least 3 characters"_, _"Add a location"_.
2. **Jumps the user to the right section** by calling `setActiveSection('essentials' | 'details')` and scrolling the relevant section ref into view inside `scrollContainerRef`.
3. **Focuses the first invalid field** via `form.setFocus(firstErrorKey)` so the inline `FormMessage` is visible.

Pseudocode (replaces line 412 wiring):

```ts
const onInvalid = (errors: FieldErrors<EventFormData>) => {
  const order: (keyof EventFormData)[] = ['title','date','time','location_name','event_type'];
  const first = order.find(k => errors[k]) ?? (Object.keys(errors)[0] as keyof EventFormData);
  const msg = errors[first]?.message as string | undefined;
  toast.error(msg || 'Fill in the highlighted fields to create your R@lly');
  // jump to the right anchor + focus
  if (['title','date','time','location_name','event_type'].includes(first as string)) {
    setActiveSection('essentials');
    essentialsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    setActiveSection('details');
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  try { form.setFocus(first as any); } catch {}
};

<form id="create-rally-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
```

Also apply the same `onInvalid` pattern to **`src/components/events/QuickRallyDialog.tsx`** so the Quick R@lly path has the same safety net.

## Out of scope

- No DB / RLS / schema changes (insert path itself is fine — `useCreateEvent` already toasts on real errors).
- No redesign of the form, fields, or button styling.
- No changes to media upload, invites, or the join-after-create flow.

## How we'll verify

1. Open Create R@lly, leave Date and Time blank, tap Create → expect toast "Pick a date for your R@lly", scroll snaps to Essentials, Date field is focused.
2. Fill everything correctly → event still creates and navigates to `/events/:id` (existing happy path untouched).
3. Repeat in Quick R@lly dialog.
