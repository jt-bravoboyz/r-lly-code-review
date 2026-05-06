# Preview the Drunkies Recap before the event

## Why
The Drunkies event (`80e42cfb-…`) is still `scheduled`, so `RallyRecapScreen` doesn't render in `EventDetail.tsx` (gated by `isCompleted`). To inspect/tweak the recap UI — including the new Hall of Fame section — without flipping the event status (which would break the live experience), we add a host-only preview override.

## Change

**`src/pages/EventDetail.tsx`** — extend the existing `isCompleted` derivation:

```ts
const previewRecap =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('previewRecap') === '1' &&
  (isCreator || isCohost);
const isCompleted = isCompletedRaw || isStealthExcluded || previewRecap;
```

- Gated to `isCreator || isCohost` so attendees never see a fake recap.
- Activated via URL flag — no UI clutter, no toggles, no DB change.

## Verify
After landing the change I'll open `/events/80e42cfb-80df-4919-92b7-83d47a34b47b?previewRecap=1` in the browser at iPhone width and screenshot:
1. The R@lly Recap header / hero
2. The new gold-glow "R@lly-er of the Century — Kiree" featured card
3. The Major Awards / Class Superlatives / Party Legends rows with 🍻 reactions
4. Squad Stars + Closer

You can then call out any spacing/typography adjustments before Saturday.

## Files
- **Edit** `src/pages/EventDetail.tsx` (single 5-line patch around line 231)

## Cleanup
The flag is harmless to leave in — it's host-gated and opt-in via URL. We can keep it as a permanent recap-preview affordance for future events.
