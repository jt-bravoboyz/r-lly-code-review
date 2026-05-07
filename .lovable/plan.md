## Surgical Addition: Uber + Lyft on R@lly Rides Sheet

### File to edit
`src/components/events/RidesSelectionModal.tsx` — only the `view === 'choice'` branch (lines ~302–345).

### Changes

1. Add import at top:
   ```ts
   import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
   ```

2. Insert a new block between the existing `Become a DD` button container (closes line 335) and the existing "Back to safety choice" ghost button (line 337). No edits to existing buttons.

   New block:
   ```tsx
   <div className="pt-4 space-y-3">
     <div className="flex items-center gap-3">
       <div className="flex-1 h-px bg-border/60" />
       <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
         Or grab a ride
       </span>
       <div className="flex-1 h-px bg-border/60" />
     </div>
     <RideshareDeepLinkButtons
       eventLat={eventLocationLat}
       eventLng={eventLocationLng}
       eventName={eventTitle}
       eventAddress={eventLocationName}
     />
   </div>
   ```

   Rationale:
   - Reuses the existing shipped `RideshareDeepLinkButtons` component (same glass, app icons, synced breathing glow, deep-link logic, App Store fallback, haptics).
   - Uses props already available on `RidesSelectionModalProps` (`eventLocationLat/Lng/eventTitle/eventLocationName`) — no new props, no parent edits.
   - Divider with small uppercase muted "OR GRAB A RIDE" label matches the requested quiet segmenter look in both light and dark mode (uses `border` and `muted-foreground` tokens).

3. Optional sheet auto-dismiss after deep link: `RideshareDeepLinkButtons` is shared with the Rides tab and the "Pick your ride." sheet, where it does NOT auto-dismiss its parent. To keep behavior consistent across surfaces and avoid touching the shared component, do NOT add dismiss logic here. (User leaves the app via deep link; returning shows the sheet, which they can close — same as on the Rides tab today.)

### What is NOT changed
- `Request a Ride`, `Become a DD`, and `Back to safety choice` elements — untouched in markup, classes, handlers, position.
- `RideshareDeepLinkButtons.tsx` — untouched.
- `RidesharePickerSheet`, Rides tab on EventDetail, "How are you getting here?" flow, Dress Code, Song Rec's, alerts dedup, R@lly Feed, unified messaging — untouched.
- No prop, type, or DB changes.

### Acceptance mapping
Order on the sheet becomes: car icon → R@LLY RIDES header → Request a Ride → Become a DD → "OR GRAB A RIDE" divider → Uber/Lyft → Back to safety choice. Uber/Lyft visuals and behavior identical to other surfaces because it's the same component instance.
