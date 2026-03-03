

# R@lly Conversion Acceleration — Phase 2

Phase 2 changes are NOT yet implemented. Simple R@lly IS fully implemented. This plan covers only the missing Phase 2 items.

---

## Verified: Simple R@lly is Complete

All four conditions confirmed in the current codebase:
- Derived const at line 172 (not state)
- R@lly Home placeholder guarded at line 650
- Rides tab opacity at line 679
- RidePlanCard inherently hidden (parent guard `isLiveEvent || isAfterRally` is mutually exclusive with `isSimpleMode`)

No changes needed for Simple R@lly.

---

## File 1: `src/components/events/CreateEventDialog.tsx`

### 1a. Static Step Indicator
After the subtitle and before the `<Form>` tag, add a decorative progress row:

```tsx
<div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-montserrat uppercase tracking-wider pb-1">
  <span>Details</span>
  <span className="text-border">·</span>
  <span>Time & Place</span>
  <span className="text-border">·</span>
  <span>Review</span>
</div>
```

No state. No step logic. Pure decoration.

### 1b. Essentials / Optional Labels
- Add `<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-montserrat">Essentials</p>` above the Title field
- Change the Collapsible trigger text from `"More options"` to `"Optional details"`

### 1c. Validity Reinforcement
After the submit button, add:

```tsx
{form.formState.isValid && (
  <p className="text-xs text-green-600 font-medium text-center mt-1">
    Ready to rally.
  </p>
)}
```

Uses existing `form.formState.isValid`. No new state.

---

## File 2: `src/pages/EventDetail.tsx`

### 2a. Join Confirmation Animation
Add `animate-text-fade-in` class to the existing "You're in. Let's go." text. The keyframe already exists in `src/index.css`.

### 2b. Primary Button Micro-Interaction
Add `transition-transform active:scale-[0.98]` to the JOIN, START, and END button classNames in the PrimaryActionBar section. Pure CSS utility, zero logic.

### 2c. Social Momentum Text
After the avatar stack (inside the `attendeeCount > 0` guard), add:

```tsx
{attendeeCount >= 5 && (
  <p className="text-[10px] text-muted-foreground italic mt-0.5">
    This one's gaining momentum.
  </p>
)}
```

Conditional from existing `attendeeCount`. No new state.

---

## File 3: `src/components/chat/EventChat.tsx`

No changes. `attendeeCount` is not passed as a prop. Skipped per the "no new data plumbing" rule.

---

## Structural Safety

- No new useState: PASS
- No new useEffect: PASS
- No dependency array changes: PASS
- No mutation wrappers: PASS
- No form field unmounting: PASS
- No routing changes: PASS
- No data shape changes: PASS
- form.formState.isValid is existing react-hook-form API: PASS

