# Expandable Notifications + Resend Caroline's Message to JT

## What was actually sent (verified in DB)

**Caroline Kay** received the correct founder-feedback notification:
- **Title:** `⚡ You spoke. We r@llied.`
- **Body:** "Founding Member feedback shipped: identity in chat, smart invites, clickable avatars, dedupe on alerts, 8-hour auto-end, and badge fixes — all live. Thank you for making R@lly sharper. 🧡"

We're leaving Caroline's notification untouched.

## Two fixes

### 1. Make notifications expandable so the full message is readable

`src/pages/Notifications.tsx` (line 206) currently renders the body with `line-clamp-2`, truncating long messages with no way to read the rest. Tapping a `system_message` only marks it read — there's no destination to navigate to, so the full body is unreachable.

**Change:** Add an `expandedId` state on the Notifications page. When a notification is tapped:
- If it's a `system_message` (or any type with no navigation target), toggle expansion — remove `line-clamp-2` and apply `whitespace-pre-line` so paragraph breaks render.
- Otherwise, keep the existing navigation behavior.
- Mark-as-read still fires on first tap.

Small, contained edit to one file (`src/pages/Notifications.tsx`).

### 2. Resend Caroline's exact notification to JT

Delete JT's existing `caroline-polish-shipped-2026-04-26` notification (the founder verification ping) and insert a copy of the **exact** message Caroline received — same title, same body — so you can preview what she sees end-to-end.

- **Recipient:** JT (`536e4694-245b-48d8-9930-018d72f266e0`)
- **Title:** `⚡ You spoke. We r@llied.`
- **Body:** (verbatim copy of Caroline's body above)
- **Data:** `{ dedupe_key: 'caroline-mirror-to-jt-2026-04-26', source: 'founder-feedback', campaign: 'caroline-polish-v1' }`

New dedupe key so the insert is idempotent and won't collide with the existing row.

## Files touched

- `src/pages/Notifications.tsx` — expandable system messages (1 edit)
- New data migration: delete JT's old `caroline-polish-shipped-2026-04-26` notification, insert mirror of Caroline's message under the new dedupe key

## What you'll see after deploy

- **Caroline:** unchanged — her existing alert stays exactly as is, but is now tappable to expand if she wants to read the full body.
- **JT:** one unread alert that mirrors Caroline's exact message, so you can verify her experience end-to-end.
- All other notification types (invites, chat unreads, rally started, etc.) keep their tap-to-navigate behavior.
