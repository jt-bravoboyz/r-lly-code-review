

# Replace X close button with back arrow on Squad Chat Sheet

## Change
In `SquadChatSheet.tsx`, add a back arrow (`ArrowLeft` from lucide-react) to the left side of the header that calls `onOpenChange(false)`. Hide the default Sheet X button by adding `[&>button]:hidden` to `SheetContent`.

### File: `src/components/chat/SquadChatSheet.tsx`
- Import `ArrowLeft` from lucide-react
- Add `[&>button]:hidden` class to `SheetContent` to hide the default X
- Add an `ArrowLeft` button at the start of the header row, before the squad icon, that calls `onOpenChange(false)`

One file changed, no backend changes.

