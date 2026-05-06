# Add Dress Code (Additive Only)

A purely additive feature — no existing fields, layouts, toggles, or "Who's Going" behavior change.

## 1. Database

New nullable column on `events`:

```sql
ALTER TABLE public.events
  ADD COLUMN dress_code text;
```

No RLS changes needed (existing policies cover all columns). No defaults — `null` when unset.

## 2. Rally Creation — `src/components/events/CreateEventDialog.tsx`

Inside the existing **Optional Details** `CollapsibleContent`, directly beneath the **Split Check** toggle row (line ~546), add a new toggle row + animated input — matching the Split Check row's exact styling (`flex items-center justify-between py-2`, `Label text-sm`, `Switch`).

- Add `dress_code_enabled: z.boolean()` and `dress_code: z.string().max(50).optional()` to `eventSchema`.
- Add to `defaultValues`: `dress_code_enabled: false`, `dress_code: ''`.
- Toggle row: Label "Dress Code" with muted subtext "Set the vibe for the night" (small `text-xs text-muted-foreground` under the label) + `<Switch>` bound to `form.watch('dress_code_enabled')`.
- When toggle flips OFF, also call `form.setValue('dress_code', '')` to clear.
- Conditionally render input below the toggle wrapped in a div with `animate-accordion-down` (existing keyframe) — use the existing `<Input className="rally-create-input" maxLength={50} placeholder="e.g. Black Tie, All White, Casual" />` so focus state and glass treatment match other inputs automatically.
- In `onSubmit`, include in `createEvent.mutateAsync` payload:

  ```ts
  dress_code: data.dress_code_enabled && data.dress_code?.trim()
    ? data.dress_code.trim()
    : null,
  ```

## 3. Data Layer — `src/hooks/useEvents.tsx`

`useEvent` already calls `get_event_safe` RPC which returns `events.*` shape — `dress_code` will flow through automatically. No code change required there. (The RPC selects by `select *` semantics; if it explicitly lists columns, we'll add `dress_code` to its return — verify on implementation.)

`useEvents` (list) similarly relies on `list_events_safe` — same note.

If either RPC explicitly lists columns, add a follow-up migration to include `dress_code` in their RETURNS TABLE / SELECT list.

## 4. Rally Detail Page — `src/pages/EventDetail.tsx`

Directly **below** the "Who's Going" `Card` (line 1002), add a conditional new `Card`:

```tsx
{event.dress_code && event.dress_code.trim() && (
  <Card className="border-l-2 border-l-primary">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <Shirt className="h-3.5 w-3.5 text-primary" />
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Dress Code
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-xl font-medium text-foreground">{event.dress_code}</p>
    </CardContent>
  </Card>
)}
```

- Import `Shirt` from `lucide-react` (minimal, refined; no new deps).
- Card inherits the global glass treatment from `src/components/ui/card.tsx` (backdrop-blur, dark glass background, shadow). Only addition: `border-l-2 border-l-primary` for the controlled R@lly Orange accent.
- Spacing rhythm matches other detail cards because parent `TabsContent` already applies consistent gap.

## 5. Acceptance

1. Toggle ON → input slides in → "Black Tie" → create → DB stores `'Black Tie'`.
2. Detail page: "Who's Going" card → directly below, glass card with orange left accent, hanger icon, "DRESS CODE" label, "Black Tie" body.
3. Toggle OFF → input hidden, value cleared → DB stores `null` → detail page shows no dress code card, no extra spacing.

## Out of scope

No edits to existing toggles, no edits to "Who's Going", no new dependencies, no animation library changes.
