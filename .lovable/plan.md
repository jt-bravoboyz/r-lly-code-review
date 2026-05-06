# Drunkies Hall of Fame + Batch Upload

## Part 1 — Hall of Fame UI

### New file: `src/components/events/recap/AwardWinners.tsx`
A self-contained, presentational component that renders the hardcoded Drunkies award roster. No DB lookups (winners are not in the system as resolvable profile IDs). Structure:

- **Three categorized sections**, each as a horizontally-scrolling row (`flex overflow-x-auto snap-x snap-mandatory` with `scrollbar-hide`):
  1. **Major Awards** — featured tier
  2. **Class Superlatives**
  3. **Party Legends**
- **Card primitive** built with the existing glass tokens used elsewhere in the recap (`backdrop-blur-xl bg-card/50 border border-border/40 rounded-2xl`), 64–72vw wide on mobile, snap-aligned.
- Each card shows: emoji, award title (small uppercase Montserrat), winner name (bold), optional subtitle (e.g. class year for superlatives).
- **Featured card** ("R@lly-er of the Century — Kiree"): full-width, separate hero block above the Major Awards row, with R@lly Orange gold-glow treatment — gradient ring (`ring-2 ring-primary/60`), outer glow (`shadow-[0_0_40px_hsl(27_91%_53%/0.35)]`), trophy 🏆 icon, and a slow CSS shimmer overlay (translating gradient via `@keyframes shimmer` in `index.css` — single new keyframe, no Tailwind config changes).
- **Reaction button** per card: small pill at the bottom-right with a 🍻 (Cheers) toggle. Uses `localStorage` keyed `rally_award_cheers_<eventId>_<awardKey>` to remember tap + show count (purely client-side, no DB writes — keeps scope tight for tonight). Haptic feedback via existing `useHaptics` hook.

### Award data (hardcoded inside `AwardWinners.tsx`)
```
Major:   R@lly-er of the Century (Kiree, featured), GOAT (Bennie),
         Life of the Party (Zach), Sober MVP (Martha)
Superlatives: Senior Crush (Meg), Picasso Patty (Erin), S.E.R.V.E (Amelia),
              Powerlift Princess (Kassi),
              Drunkest — Senior Ryann / Junior Max / Soph Alex C / Fresh Harrisyn,
              Highest — Senior Walker / Junior Kenzie / Soph Lis / Fresh Marley,
              Crossed — Queen Viv / King Jake,
              Royalty — Best Dressed Veronica / Potionmaster Mason /
                        Heavyweight Evan / Lightweight Ella C
Legends: Slap.com Olivia, Sofa Spooner Max McF, Just the TIP Brett,
         Overdraft Overlord Mads, Have Fun Auntie Kayleigh,
         Nights Get Lonely Liam, Honorary Junior Avery, Puke and R@lly Ailani,
         Greatest Sport Ethan & Tyler, Department Ally Livvy,
         Will they won't they Jordan & Blonde Freshman, JOMO Gab,
         Crushes Sarah Lash & Q
```

### Mount point: `src/components/events/recap/RecapTimeline.tsx`
Insert `<AwardWinners eventId={eventId} eventTitle={eventTitle} />` directly **above the existing "Squad Stars" section** (the auto-computed Guardian/Ghost/Paparazzi block stays as-is below it).

The component itself early-returns `null` unless `eventTitle` matches `/drunk/i` — so it lights up automatically for the Drunkies recap and stays invisible for every other event. This avoids needing an event flag column or admin toggle.

## Part 2 — Batch Upload (verification + small polish)

The 500-cap, parallel chunking, Portal progress pill, and "Retry failed" button are already implemented in `src/components/events/EventPhotoFeed.tsx` from the previous Stability pass:

- `MAX_PHOTOS_PER_EVENT = 500` (line 19) ✓
- `UPLOAD_CONCURRENCY = 4` via `Promise.allSettled` in `runChunkedUploads` ✓
- Sticky portal progress pill rendered via `createPortal` (line 688) ✓
- Retry CTA at top of feed (line 428) ✓

Two small hardenings to land in this same pass:

1. **Persist failed-file types accurately on retry.** Current `handleRetryFailed` re-derives `type` from `file.type.startsWith('video/')`, which fails for HEIC photos (empty MIME on some Androids). Switch to keeping the original `{file, type}` tuple in `failedUploads` state so retried items carry the same classification as the first attempt.
2. **Surface per-batch failure detail.** When `failed.length > 0` after a 350-file batch, also `console.warn` the failed filenames so QA can diff against camera roll. No UX change beyond the existing toast.

No DB / RLS / hook signature changes.

## Files

- **New** `src/components/events/recap/AwardWinners.tsx`
- **Edit** `src/components/events/recap/RecapTimeline.tsx` — import + render above Squad Stars
- **Edit** `src/index.css` — single `@keyframes shimmer` + `.award-shimmer` utility
- **Edit** `src/components/events/EventPhotoFeed.tsx` — retry-tuple fix + warn log

## Out of scope
- Wiring award winners to real `profile_id`s (names are free-text per the supplied list)
- Server-side persistence of 🍻 reactions (client-only for tonight)
- Touching `RallyRecapScreen.tsx` (timeline change is sufficient since AwardWinners renders inside the persistent timeline)
