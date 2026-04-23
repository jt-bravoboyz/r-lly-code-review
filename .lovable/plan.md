

# Profile Edit — Make Save Always Reachable

When Ryley taps to edit her bio, the only Save controls are tiny icon buttons sitting *above* the bio textarea inside the card. On mobile with the keyboard open, those icons get pushed off-screen and the bottom nav hides anything below. Three coordinated fixes in `src/pages/Profile.tsx`:

## 1. Sticky "Edit Mode" Action Bar (primary fix)

When `isEditing === true`, render a **sticky bottom action bar** that floats above the BottomNav and stays visible above the keyboard:

- Position: `fixed bottom-0 left-0 right-0 z-50`, with `pb-[env(safe-area-inset-bottom)]` and a backdrop-blur glass surface matching the app's 2026 Glass/Liquid system (R@lly Orange primary).
- Contains: full-width **"Save Changes"** primary button (orange gradient, large 48px touch target) + **"Cancel"** ghost button.
- Disable Save while `isSaving`, with inline spinner + "Saving…" label.
- When this bar is mounted, increase the page's bottom padding (swap `pb-28` for `pb-44` while editing) so the form scrolls clear of the bar.
- Hide the regular `BottomNav` while editing (or let the action bar sit above it) — cleaner focus, matches iOS modal-edit pattern.

## 2. Header-Level "Save" Affordance

Promote the existing inline Save/Cancel icons (currently small ghost icons next to the avatar at lines 432-440) into a clearer, larger pair:

- Replace the icon-only buttons with a **labeled "Save" pill button** (orange, with check icon) + a **"Cancel"** text button.
- Sized for thumbs (h-9, px-4), placed at the top of the profile card so it's the first thing visible on scroll-to-top — gives users two obvious save paths (top of card + sticky bar at bottom).

## 3. Keyboard-Aware Scroll & Auto-Scroll on Focus

- Confirm the page root scrolls (it already uses `min-h-[100dvh]` with the document body as scroller — good). Add `scroll-pb-44` to the main container so focused inputs aren't hidden behind the new sticky bar.
- On the bio `<Textarea>`, add `onFocus` that calls `el.scrollIntoView({ block: 'center', behavior: 'smooth' })` after a 150ms delay (lets the keyboard finish animating in on iOS).
- Apply the same `onFocus` scroll helper to the email and phone inputs for consistency.

## Files Touched

- `src/pages/Profile.tsx` — only file changed. Edit-mode UI changes plus new sticky action bar component inline.

No new dependencies, no DB changes, no other files affected. BottomNav and Header are untouched (the sticky bar is local to Profile edit mode).

## Result

Ryley taps **Edit** → keyboard opens for Bio → a glassy orange **Save Changes** bar is pinned right above her keyboard, and a labeled **Save** pill sits at the top of the card. She can't lose it.

