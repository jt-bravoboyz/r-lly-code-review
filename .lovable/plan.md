## Fix squad chat header clipped under iOS status bar

The `SquadChatSheet` header (back arrow + squad name) sits flush at the top of the screen, so on iPhones the notch/status bar covers it (as shown in the screenshot — "Co..." gets clipped by the Dynamic Island).

### Change

**`src/components/chat/SquadChatSheet.tsx`** — add safe-area top inset to the `SheetHeader`:
- Update the header's className to include top padding using `env(safe-area-inset-top)` with a sensible minimum, e.g. inline style `paddingTop: 'max(env(safe-area-inset-top), 1rem)'` (keeping existing `p-4` for horizontal/bottom).

That's the only change — no logic, routing, or other UI affected. Other chat surfaces (DirectMessageSheet, EventChat) aren't in scope unless you want me to audit them too.