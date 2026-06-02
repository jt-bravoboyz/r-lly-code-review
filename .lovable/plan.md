## Restyle "How are you getting here?" modal to match R@lly Home family

The transport-mode modal (`src/components/events/TransportModeSelector.tsx`) currently uses a left-aligned header and small outline tiles, which clashes with the rest of the R@lly Home prompts (e.g. `SafetyChoiceModal`, `RallyHomeButton` entry cards) that use a centered header with a primary/10 icon badge, bold Montserrat title, and consistent rounded glass tiles.

### Changes (UI only, in `TransportModeSelector.tsx`)

1. **Header — match `SafetyChoiceModal`**
   - Center the header.
   - Add a circular `bg-primary/10` badge (size 16) above the title containing a `Car` icon in `text-primary`.
   - Title: `text-xl font-bold font-montserrat`, centered.
   - Description: `text-base text-muted-foreground`, centered. Keep copy "Helps your host plan a safe night."

2. **Option tiles — unify with R@lly Home tile styling**
   - Keep 2-column grid, but bump each tile to `h-24`, `rounded-2xl`, `border border-border/60`, `bg-card/60 backdrop-blur-xl`, subtle shadow, with `ring-2 ring-primary bg-primary/5` on selected.
   - Icon size `h-7 w-7`, label `text-sm font-semibold font-montserrat`.
   - Keep the five existing modes and their colors; no behavior changes.
   - "Public Transit" stays as the lone tile on the last row, left-aligned in the grid (current behavior).

3. **Skip control — match family**
   - Replace the ghost `Skip for now` button with centered muted text link styled like the helper line under `SafetyChoiceModal` ("You can change this later in the Rally"): `text-sm text-muted-foreground text-center pt-2 cursor-pointer hover:text-foreground`. Keep the same onSkip/onOpenChange handlers.

4. **DialogContent**
   - Add `hideCloseButton`, `onPointerDownOutside={(e) => e.preventDefault()}`, and `onEscapeKeyDown={(e) => e.preventDefault()}` to match the locked-in feel of `SafetyChoiceModal` (this is a safety prompt and shouldn't dismiss on stray taps).
   - Keep `max-w-sm`.

### Out of scope
- No changes to `RidesharePickerSheet`, no DB/schema changes, no logic changes in `handleSelect`/`finishSelection`, no copy changes beyond what's listed.
- No changes to other R@lly Home dialogs.

### Verification
- Navigate `/demo/rally-home` (or trigger via event page) and visually confirm the modal mirrors `SafetyChoiceModal` styling on mobile (757px viewport).