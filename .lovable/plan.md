# Invite Dialog "Hamilton" Rework

Fully rework `src/components/events/InviteToEventDialog.tsx` into a cleaner, on-brand 3-tab invite flow with the "Hamilton" refinements: a premium share-link header, segmented-control pill tabs, grouped friend list, SMS preview, soft "Invited" transitions, and an Influence footer badge.

## Final Layout

```text
┌────────────────────────────────────────────┐
│  Invite to R@lly                           │
├────────────────────────────────────────────┤
│  ╭────────────────────────────────╮        │  ← premium tinted header
│  │ INVITE CODE  AB12X4   [Copy✓][Share] │  │     (gradient + blur)
│  ╰────────────────────────────────╯        │
├────────────────────────────────────────────┤
│  ⟪ On R@lly │ Squads │ Text ⟫  ← pill tabs│
├────────────────────────────────────────────┤
│  Search friends…                           │
│  ─ Suggested              3                │  ← tabular-nums counts
│    [avatar] Jamie     [Invite]             │
│  ─ All Friends           14                │
│    [avatar] Casey     [✓ Invited]          │
├────────────────────────────────────────────┤
│  History  ●                  ✦ Influence   │  ← top-tier badge
└────────────────────────────────────────────┘
```

## Refinement-by-Refinement

### Premium Header Card
- Replaces the old "Link" tab. Gradient `from-primary/[0.08] via-primary/[0.04] to-transparent`, `backdrop-blur-xl`, primary-tinted border.
- Shows compact Invite Code (tabular-nums) + side-by-side **Copy** / **Share** buttons.
- **Copy** button transitions to filled primary background with a check icon for ~1.8s on success (immediate visual feedback).

### Segmented Pill Tabs
- `TabsList` uses `rounded-full bg-muted/70 p-1`; each `TabsTrigger` is `rounded-full` and lifts to `bg-background shadow-sm` when active — matching the Admin Dashboard pill aesthetic.
- 3 tabs only: **On R@lly**, **Squads**, **Text**.

### On R@lly Tab (default)
- Search input at top.
- Pulls from `useRallyFriends()`.
- Two grouped sections, each with a small uppercase label + tabular-nums count:
  - **Suggested** — friends in `useInviteHistory()` recent 8 OR flagged `isReferral` (most likely re-invites).
  - **All Friends** — everyone else.
- Friend rows: avatar + name + small subtitle ("R@lly Friend" / "Squad Mate") + Invite button.
- Filtered by search query; excludes already-invited/attending via the existing `alreadyInvitedOrAttending` Set.

### Squads Tab
- Same data + flow as today, restyled to `rounded-xl` cards with `transition-all duration-300` and `tabular-nums` counts.

### Text Invite Tab
- **SMS Preview box** — muted rounded card showing the exact pre-filled SMS body (`"You're in. {eventTitle} — Tap to join the crew: {shareLink}"`).
- `PhoneInviteInput` for typing a number directly.
- Compact `ContactSyncButton` card to pull the phone book.
- "Recently Texted" list (last 5 from `phoneInvites`) for at-a-glance audit.

### Soft "Invited" State Transition
- Buttons use `transition-all duration-300`.
- Local `invitedFriendIds` / `invitingFriendId` state drives an instant swap: `Send → Sending… → ✓ Invited` (ghost button, primary text). No layout shift.
- Squad cards likewise fade their action button into a `Check`-prefixed badge.

### Influence Footer Badge
- Footer row holds the **Invite History** ghost button (replaces the dead History tab → routes to `/invite-history`) on the left.
- On the right, when `useInviteHistory().length >= 10`, a small outlined `✦ Influence` badge appears in primary tint with a `Crown` icon.

## File To Edit

- `src/components/events/InviteToEventDialog.tsx` — full rewrite of the component body. No prop signature changes, so all call sites continue to work untouched.

## Data / Hook Sources (all already exist)

- `useRallyFriends()` — On R@lly list.
- `useInviteHistory()` — Suggested grouping + Influence badge threshold.
- `useAllMySquads()` — Squads tab.
- `useEventInvites()` / `useEventPhoneInvites()` — already-invited filtering.
- `useCreateEventInvites()` / `useCreatePhoneInvite()` / `openSMSInvite()` — sending.
- `useRecordInvite()` — history tracking.

No DB / RLS / migration changes. No new hooks. No prop changes.