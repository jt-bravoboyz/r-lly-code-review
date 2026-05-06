## Add "Song Rec's" Feature — Additive Only

A purely additive collaborative song-recommendation module, gated by a new opt-in toggle on rally creation. No existing code, styling, or behavior (including the Dress Code feature) changes.

---

### 1. Database (new migration)

**A. Add column to `events`:**
```sql
ALTER TABLE public.events
  ADD COLUMN song_recs_enabled boolean NOT NULL DEFAULT false;
```

**B. New table `song_recs`:**
```sql
CREATE TABLE public.song_recs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_name text NOT NULL CHECK (char_length(song_name) BETWEEN 1 AND 100),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX song_recs_event_idx ON public.song_recs(event_id, created_at DESC);
ALTER TABLE public.song_recs ENABLE ROW LEVEL SECURITY;
```

**C. RLS policies (mirror chat/event-attendee patterns):**
- **SELECT**: `is_event_member(event_id)` — any event member can read recs.
- **INSERT**: `is_event_member(event_id)` AND `profile_id = current_profile_id()` — only attendees/host insert as themselves.
- **DELETE**: `profile_id = current_profile_id()` — users only delete their own. (No UPDATE policy → immutable, matches spec.)

**D. Realtime:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.song_recs;` so inserts/deletes propagate live.

**E. Update `get_event_safe` and `list_events_safe` RPCs** to include `song_recs_enabled` in their return shape (recreate the functions adding the column to the SELECT list / RETURNS TABLE definition). No other RPC behavior changes.

---

### 2. Rally Creation — `src/components/events/CreateEventDialog.tsx`

Insert directly **below the Dress Code toggle row** (after line ~580, before the closing of Optional Details).

- Schema: add `song_recs_enabled: z.boolean()` to `eventSchema`.
- Default values: `song_recs_enabled: false`.
- `onSubmit` payload: `song_recs_enabled: data.song_recs_enabled`.
- New row, **identical structure / classes to the Dress Code toggle row**:
  - Label: `Song Rec's` (`text-sm`)
  - Subtext: `Let friends drop song recommendations for the night` (`text-xs text-muted-foreground`)
  - `<Switch>` bound to `form.watch('song_recs_enabled')` / `form.setValue('song_recs_enabled', v)`
- No conditional input below — toggle alone.

---

### 3. Data Layer — `src/hooks/useEvents.tsx`

`useEvent` and `useEvents` rely on `get_event_safe` / `list_events_safe`, which after the migration return `song_recs_enabled` automatically. No structural change needed beyond the RPC update.

---

### 4. New Hook — `src/hooks/useSongRecs.tsx`

Encapsulates fetch + realtime + mutations:

- `useSongRecs(eventId)`:
  - `useQuery` keyed on `['song-recs', eventId]`.
  - Fetches `song_recs` filtered by `event_id`, joined manually with `safe_profiles` (`id, display_name, avatar_url`) — same join pattern used in `useEvent` for attendees.
  - Order: `created_at DESC`.
  - Subscribes to a Supabase realtime channel `song-recs:{eventId}` for INSERT/DELETE → invalidates the query.
- `useAddSongRec()`: `mutationFn` inserts `{ event_id, profile_id, song_name, artist }`; on success invalidates `['song-recs', eventId]`.
- `useDeleteSongRec()`: deletes by `id` (RLS enforces ownership); invalidates the query.

---

### 5. New Component — `src/components/events/SongRecsCard.tsx`

Self-contained collapsible glass module. Props: `{ eventId, isParticipant }`.

**Structure:**
- `<Card>` (inherits global glass treatment) wrapping `<Collapsible>`.
- `<CollapsibleTrigger asChild>`: full-width header row, `flex items-center justify-between`, `p-4`:
  - Left: `<Music2 className="h-3.5 w-3.5 text-primary" />` + `SONG REC'S` label (`text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground`) — matches Dress Code label exactly.
  - Right: count badge (rendered only when `count > 0`): `text-xs font-semibold text-primary` in a small rounded `bg-primary/10 px-2 py-0.5` pill.
  - `<ChevronDown />` rotating 180° on open via `data-[state=open]:rotate-180 transition-transform duration-300`.
- `<CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">` — uses existing tailwind keyframes (`animate-accordion-down/up`, ~300ms ease-out per `tailwind.config.ts`). Cinematic, not bouncy.

**Inside content (`px-4 pb-4 space-y-4`):**

**A. Submission row** (only when `isParticipant`):
- `<form>` with `flex gap-2`:
  - `<Input className="rally-create-input" maxLength={100} placeholder="Song Name" />` (flex-1)
  - `<Input className="rally-create-input" maxLength={100} placeholder="Artist" />` (flex-1)
  - `<Button size="icon" disabled={!song.trim() || !artist.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_0_0_hsl(var(--primary))] active:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-shadow">` with `<Plus />` icon. R@lly Orange via existing `--primary` token.
- `onSubmit`: call `useAddSongRec`, clear both inputs.

**B. List:**
- Map sorted recs (already DESC). Each row keyed by `id`, wrapped in motion-friendly classes: `animate-fade-in` (newcomers fade+slide via the existing `fade-in` keyframe which translates from `translateY(10px)`).
- Row layout: `flex items-start gap-3 py-3 border-b border-border/40 last:border-b-0`:
  - `<Avatar className="h-8 w-8">` + fallback initials.
  - Stack: submitter name (`text-xs text-muted-foreground`), song name (`text-base font-medium text-foreground`), artist (`text-sm text-muted-foreground`).
- **Long-press to delete (own rows only):** wrap each row in a `ContextMenu` (`@/components/ui/context-menu`, already in the project) — on touch devices Radix maps long-press to context menu. `ContextMenuItem` "Delete" only rendered when `rec.profile_id === currentProfileId`. On click, call `useDeleteSongRec` with optimistic removal triggering `animate-fade-out` (already defined: fades + slides 10px down) before invalidation.
- **Empty state:** when `recs.length === 0`, render centered `<p className="text-sm text-muted-foreground text-center py-6">No recs yet. Be the first to set the tone.</p>` — no card, just text inside the expanded module.

---

### 6. Mount on Detail Page — `src/pages/EventDetail.tsx`

Directly **below the Dress Code conditional card** (after line 1017, before the next existing card):

```tsx
{(event as any).song_recs_enabled && (
  <SongRecsCard
    eventId={event.id}
    isParticipant={isHost || isCohost || hasRSVPd}
  />
)}
```

- Reuse the page's existing host/cohost/RSVP booleans (already computed for other gated UI in the file).
- Spacing rhythm is automatic — parent `TabsContent` gap drives it, identical to Dress Code.
- Add `import { SongRecsCard } from '@/components/events/SongRecsCard';` alongside existing imports.

---

### 7. Acceptance Mapping

1. Toggle ON → create → detail page shows collapsed `SONG REC'S` header below Dress Code (or Who's Going if no dress code).
2. Tap header → `animate-accordion-down` smoothly reveals input + empty-state message.
3. Submit song → optimistic insert + realtime confirms → appears at top with avatar + name.
4. Submit second → newest stays on top (DESC sort).
5. Long-press own row → ContextMenu Delete → fades out, list collapses.
6. Long-press someone else's row → no Delete item rendered.
7. Toggle OFF on a different rally → section never renders, no extra spacing.
8. Dress Code untouched — schema, toggle, and detail card all unchanged.

---

### Out of Scope

- No edits to existing toggles, Dress Code, Who's Going, or any other detail-page section.
- No external music APIs.
- No new dependencies (Music2, Plus, ChevronDown all from existing `lucide-react`; ContextMenu, Card, Collapsible, Switch, Input, Button, Avatar all already in `src/components/ui`).
- No new animation libraries — uses existing Tailwind keyframes (`accordion-down/up`, `fade-in`, `fade-out`).
