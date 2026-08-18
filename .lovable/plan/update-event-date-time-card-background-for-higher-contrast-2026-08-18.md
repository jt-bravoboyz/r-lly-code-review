# Update Event Date/Time Card Background for Higher Contrast

## Goal
Make the event date/time card in `src/pages/EventDetail.tsx` pop more so black weekday text, orange time text, and white venue text are all clearly readable against the card background.

## Selected Direction
**High contrast glass** — solid, high-opacity glass surface with a clean white/light gray date block and a distinct orange time pill, while preserving the R@lly orange accent (#F47A19).

## Changes
1. **Date/time card background** at line ~681
   - Replace `bg-background/80 dark:bg-zinc-900/80` with a more opaque glass surface: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl`.
   - Increase border strength: `border border-white/40 dark:border-zinc-800/50`.
   - Add a stronger shadow: `shadow-[0_20px_50px_rgba(0,0,0,0.15)]`.
   - Keep `rounded-2xl` (or slightly bump to `rounded-3xl` if the rest of the app uses consistent radius; match existing card radius).

2. **Calendar date block** inside the card
   - Change from `bg-[var(--theme-button)]` to a neutral high-contrast block: `bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50`.
   - Make month label `text-zinc-500 dark:text-zinc-400` and day number `text-zinc-950 dark:text-white` for maximum pop.

3. **Time display**
   - Wrap the time in a small pill or keep it as a bold accent element using `text-[#F47A19]` with a subtle `bg-[#F47A19]/10` pill so the orange pops without blending into a warm background.

4. **Venue text**
   - Keep venue text as a strong muted color: `text-muted-foreground` or `text-zinc-500 dark:text-zinc-400` so it remains readable but doesn't compete with the orange/black.

5. **Text alignment check**
   - Ensure the weekday label (`text-foreground`) is rendered in a high-contrast dark color in light mode and white in dark mode.

## Verification
- Open the event detail page for `fccb6359-f364-4ef3-b6d7-66df64ab9b99` in the preview and confirm the date/time card background is noticeably more opaque and the weekday, time, and venue text all remain readable.
- Check the same card in both light and dark mode if available.

## Scope
This is a visual-only change to the date/time card. No layout, content, or functional changes to other event detail sections.