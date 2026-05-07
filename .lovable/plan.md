# Rideshare Picker Sheet — Plan

## Bug

In `src/components/events/TransportModeSelector.tsx` ("How are you getting here?"), tapping the **Rideshare** option calls `handleSelect('rideshare')` which just saves the mode and closes — but downstream flow then surfaces the post-rally "How are you getting home?" check-in sheet ("R@lly got me" / "I'm good"). Wrong sheet for the pre-rally planning moment.

## Fix Strategy

Intercept the Rideshare tap inside `TransportModeSelector` and open a new dedicated sheet — `RidesharePickerSheet` — that reuses the existing `RideshareDeepLinkButtons` component from the Rides tab. All three actions on that sheet save the user's `arrival_transport_mode` as `'rideshare'` (same value as today, so host views are unchanged).

No other transport options change. The post-rally "How are you getting home?" check-in is a separate component and is not touched.

## Files

### New: `src/components/events/RidesharePickerSheet.tsx`

A bottom-sheet built on shadcn's `Sheet` (`side="bottom"`) with custom glass styling.

Props:
- `open`, `onOpenChange`
- `eventId`, `profileId`
- `eventLat`, `eventLng`, `eventName`, `eventAddress`
- `onSaved()` — called after plan is persisted (Uber, Lyft, or self) so the parent can advance the flow exactly like `handleSelect` did

Behavior:
- Header: "Pick your ride." (large, bold) + "Your rally's pre-loaded." (muted)
- Top-right `X` close (no save) — also swipe-down dismiss via Sheet
- Body row: `<RideshareDeepLinkButtons … />` — reused as-is, passing the event coords/name/address. We wrap each button click via a thin intercept: on pointerdown of the row container, call `saveRideshareMode()` once (idempotent). The component's existing deep-link logic then fires unchanged.
  - Implementation detail: rather than fork the component, wrap `<RideshareDeepLinkButtons>` in a `<div onPointerDownCapture={savePlan}>` so the save runs before navigation. `savePlan` is debounced via a `savedRef` so multiple taps don't double-write.
- Below, separated by ~20px: full-width glass button "I'll figure out my own ride" — neutral glass (no orange breath). On press: haptic, save plan as `rideshare`, dismiss, call `onSaved()`.

Sheet visual:
- `SheetContent side="bottom"` with className overriding default solid bg:
  - `bg-white/55 dark:bg-black/45 backdrop-blur-2xl [-webkit-backdrop-filter:blur(24px)_saturate(1.4)]`
  - `border border-white/40 dark:border-white/10`
  - `rounded-t-[28px]`
  - `shadow-[0_-12px_40px_rgba(0,0,0,0.35)]`
  - generous padding (`p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]`)
- Slide-up/slide-down already provided by shadcn Sheet bottom variant.

Save logic:
```ts
await supabase.from('event_attendees')
  .update({ arrival_transport_mode: 'rideshare' })
  .eq('event_id', eventId).eq('profile_id', profileId);
```
(matches the exact write in `TransportModeSelector.handleSelect`).

### Edit: `src/components/events/TransportModeSelector.tsx`

- Add prop `eventLat?, eventLng?, eventName?, eventAddress?` (all optional, forwarded by EventDetail).
- Local state `showRideshareSheet`.
- In `handleSelect`, if `mode === 'rideshare'`, do NOT write to DB or close — instead `setShowRideshareSheet(true)` and return.
- Render `<RidesharePickerSheet>` as a sibling. Its `onSaved` runs the same post-save flow as the existing successful select (toast + `onOpenChange(false)` + `onComplete?.()`).
- Keep all other modes (`dd`, `driving`, `walking`, `public_transit`) untouched.

### Edit: `src/pages/EventDetail.tsx`

In the existing `<TransportModeSelector …>` JSX (line ~1312), pass through:
```
eventLat={event.latitude}
eventLng={event.longitude}
eventName={event.name}
eventAddress={event.address}
```
(Use whichever field names the `event` object already exposes — confirmed during edit.)

## What is NOT changed

- `RideshareDeepLinkButtons.tsx` — reused as-is, no edits.
- Post-rally "R@lly got me / I'm good" sheet — untouched.
- DD / Driving / Walking / Public Transit options — untouched.
- Rides tab on EventDetail — untouched (same shared button component).
- Dress Code, Song Rec's, alerts dedup, R@lly Feed placeholder, unified messaging — untouched.
- DB schema — no migration; we keep writing the existing `'rideshare'` value to `arrival_transport_mode`.

## Acceptance

Matches the 10-point acceptance test in the request: tap Rideshare → glass picker sheet → Uber/Lyft launch deep links with destination pre-filled and save plan as Rideshare; "I'll figure out my own ride" saves and dismisses; X / swipe-down dismisses without saving; works in light + dark; post-rally home check-in and Rides tab buttons unchanged.
