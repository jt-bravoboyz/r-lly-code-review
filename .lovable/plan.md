
# Fix Event Creation Blocking Mason at “Add People”

## Problem

The current Create R@lly flow requires `selectedSquads.length > 0` before the Create/Next action can be clicked:

```ts
const hasAudience = selectedSquads.length > 0;
...
disabled={... || !hasAudience}
```

But the creation screen only offers **Invite Squads**. If Mason has no squads, or wants to invite individual people/phone contacts, there is no usable “add people” path inside creation. He gets blocked by a requirement he cannot satisfy.

## Plan

### 1. Make “Add People” Optional During Creation

Update `src/components/events/CreateEventDialog.tsx` so event creation is not blocked by audience selection.

- Change `hasAudience` from a hard requirement into an optional state indicator.
- Remove `!hasAudience` from the Create button disabled condition.
- Replace the blocking copy:
  - From: “Add at least one friend or squad to start the R@lly.”
  - To: “You can invite people now or after the R@lly is created.”
- Keep squad selection as a convenience, but not a gate.

### 2. Add a Clear “Invite After Creation” Path

When no squads are selected, make the create button still feel safe and intentional:

- Button remains enabled once required form fields are valid.
- Copy can stay “Create R@lly” or become “Create R@lly — Invite Next” if no audience is selected.
- After creation, the existing navigation to `/events/:id` remains, where the full invite flow already supports:
  - Contacts
  - Phone invites
  - Squads
  - Share link
  - Invite history

This fixes Mason’s immediate blocker without needing to build a complex pre-create invite queue.

### 3. Improve the Empty Squad State

If the user has no squads, show a small helper panel in the audience area instead of hiding the section entirely:

- “No squads yet.”
- “Create the R@lly first, then invite people by contact, phone number, or share link.”
- Optional lightweight visual with the `Users` icon and R@lly Orange accent.

If squads exist, keep the current squad pill selector.

### 4. Keep Existing Auto-Invite Behavior

Preserve the current squad auto-invite logic:

- If Mason selects one or more squads before creating, those squad members are invited after the event is created.
- If he selects no squads, the event still creates normally and he can invite people from the event page.

### 5. Also Fix Quick R@lly if It Has the Same Gate

`src/components/events/QuickRallyDialog.tsx` has the same pattern: it disables submission when no squad is selected.

Apply the same rule there:

- Squad invites are optional.
- No selected squad should not block starting/scheduling a Quick R@lly.
- Update helper copy to explain that invites can happen after creation.

## Files to Change

- `src/components/events/CreateEventDialog.tsx`
- `src/components/events/QuickRallyDialog.tsx`

## Result

Mason can create the event immediately, even if he has no squads or cannot find the right person during setup. Adding people becomes a follow-up action instead of a hard blocker, while squad auto-invites still work when selected.