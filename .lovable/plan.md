

# R@lly Recap Implementation Plan

## Summary
Create the cinematic Recap screen that replaces the Tabs/Actions area when `event.status === 'completed'`. Three files created, one edited, one deleted.

## Changes

### 1. New: `src/hooks/useRecapData.tsx`
Aggregation hook that composes existing hooks and runs additional queries:
- Uses `useRogueAlerts(eventId)` for alerts + reactions
- Uses `useGalleryPhotos(eventId)` for photo bundle
- Queries `event_attendees` (where `is_dd = true`) joined with `ride_passengers` (status = 'accepted') to find the DD with most riders → **The Guardian**
- Queries `rally_media` grouped by `created_by` (where `is_featured = false`) for upload counts → **The Paparazzi**
- First rogue alert by `created_at` ASC → **The Ghost**
- Fetches winner display names/avatars from `safe_profiles`
- Returns `{ rogueTimeline, galleryPhotos, awards, stats, isLoading }`

### 2. New: `src/components/events/RallyRecapScreen.tsx`
Props: `eventId, eventTitle, eventType, attendeeCount, ddCount`

**Section 1 — Hero Header**
- First gallery photo as "Shot of the Night" with gold border (`ring-4 ring-yellow-400`) + badge overlay
- Glassmorphism summary bar: `📸 X Photos | 🔥 Y Rogues | 💬 Z Reactions`

**Section 2 — Rogue Timeline (Midnight Theme)**
- Forced dark: `bg-[#1a1a2e] rounded-2xl px-4 py-6`
- All text: `text-white`, `text-white/70`, `text-orange-400` for accents
- Each card: avatar from `safe_profiles`, display name, "Final Words" in `bg-white/10 border-l-2 border-orange-500` quote block, emoji reaction pills
- Staggered `animate-fade-in`

**Section 3 — Cinematic Photo Bundle**
- CSS `columns-2 gap-3` masonry with `break-inside-avoid`
- Frosted uploader tag: `backdrop-blur-md bg-white/20 rounded-full`
- "View All" toggle if >6 photos

**Section 4 — Squad Stars (Awards)**
- Glass cards (`backdrop-blur-xl bg-card/60 border border-border/50`)
- The Guardian 🛡️, The Ghost 🔥, The Paparazzi 📸
- Each shows emoji, title, winner avatar + name
- Staggered `animate-fade-in`

**Section 5 — Safe & Sound Finale**
- Large shield icon with gold ring accent
- "🐴 Mission Accomplished." in `font-montserrat` bold, gold text (`text-yellow-500`)
- "100% SECURED. THE HORSE IS BACK IN THE STABLE."
- "Share to Story" button via `navigator.share` + clipboard fallback
- "Powered by R@lly" footer

### 3. Edit: `src/pages/EventDetail.tsx`
- Import `RallyRecapScreen`
- Add `const isCompleted = event?.status === 'completed';`
- Wrap lines ~651–1051 (After R@lly Banner through Leave button) in `{!isCompleted && ( ... )}`
- After the closing `</div>` of the header card area (line ~743), add:
```tsx
{isCompleted && (
  <RallyRecapScreen
    eventId={event.id}
    eventTitle={event.title}
    eventType={event.event_type}
    attendeeCount={attendeeCount}
    ddCount={eventDDs?.length ?? 0}
  />
)}
```
- Hero carousel and event metadata header remain visible above

### 4. Delete: `src/components/events/RallyRecapCard.tsx`
Replaced entirely by `RallyRecapScreen`.

## Security Confirmation
- All avatar/name lookups use `safe_profiles` (already used by `useRogueAlerts` realtime handler)
- Rally-media bucket is public — no signed URLs needed (separate from private `chat-images` bucket)
- No raw PII exposed in any recap component
- Admin portal continues querying `profiles` directly — unchanged

## What Is NOT Touched
| Feature | Status |
|---|---|
| Going Rogue logic (safety reset, notifications, once-per-event) | Unchanged |
| Phase-specific buttons (Edit Plan / Rogue / Hidden) | Unchanged — hidden by `!isCompleted` guard |
| RallyCompleteOverlay (confetti + feedback) | Unchanged — fires on transition |
| Security hardening (RLS, safe_profiles, signed URLs) | Unchanged |
| Admin PII access | Unchanged |

## Files
- **New**: `src/hooks/useRecapData.tsx`
- **New**: `src/components/events/RallyRecapScreen.tsx`
- **Edit**: `src/pages/EventDetail.tsx`
- **Delete**: `src/components/events/RallyRecapCard.tsx`

