# Contacts UI Cleanup Plan

## What's chaotic today

Three separate surfaces all do the same job, with different layouts and styling:

| Surface | What it shows |
|---|---|
| **Squads → Contacts tab** (`ContactsTab.tsx`) | Search + `AddPeopleSheet` button + 4 huge collapsible cards (R@lly Friends, Squad Members, Phone Contacts, Cloud Contacts) + R@lly Search card + Quick Add row |
| **"Invite from Contacts" button** (`ContactInviteDialog`) | Search + Quick Add + unified flat list + Import Options collapsible |
| **AddPeopleSheet** (the "Add People" pill) | Search + R@lly Friends list + Quick Add + Import Options collapsible |

Visual noise sources:
- Every section is a white card with a colored icon circle, bold heading, subtitle, and a chevron — even when there are 0 items
- 4 nested collapsibles stack tall white cards on the Contacts tab
- Two entry points ("Add People" pill + "Invite from Contacts" button) open two different sheets that do ~90% the same thing
- Native already has direct contact sync, so most "Import Options" are dead weight

## Proposed direction: one search, one flat list

Collapse all three into a **single clean pattern** used everywhere:

```text
┌─────────────────────────────────────┐
│ 🔍  Search name, handle, number…    │   ← single search, no card chrome
├─────────────────────────────────────┤
│ R@LLY FRIENDS                       │   ← tiny uppercase section label
│  • Avatar  Name              [Zap]  │      (no card, no chevron, no icon circle)
│  • Avatar  Name              [Zap]  │
│                                     │
│ FROM YOUR PHONE                     │
│  • Avatar  Name · 555-1234   [+]    │
│  • Avatar  Name · 555-5678   [+]    │
│                                     │
│ OTHER CONTACTS                      │
│  • Avatar  Name · email      [+]    │
└─────────────────────────────────────┘
[ Sync iPhone Contacts ]   (subtle, footer)
```

Key moves:
1. **Drop the per-section Cards + icon circles + chevrons.** Replace with flat uppercase section labels (matches the style already used inside `AddPeopleSheet` for "R@lly Friends"). Sections only render when they have items.
2. **Single flat alphabetized list** for phone + cloud contacts merged (dedup by phone/email — `ContactInviteDialog` already does this; reuse the logic).
3. **One entry point**, not two. Remove either the "Invite from Contacts" button or the "Add People" pill from Squads → Contacts and keep just one. Recommendation: keep `AddPeopleSheet` as the universal sheet (it's already used in multiple places) and delete the redundant `ContactInviteDialog` invocation from Squads.
4. **Multi-select + bottom action bar** (port the nice pattern from `ContactInviteDialog`: tap rows to select, sticky "R@lly N Contacts" button at bottom). This replaces the per-row `[Zap]` / `[+]` buttons on the Contacts tab.
5. **Hide "Import Options" by default on native** (already done in `AddPeopleSheet`). On native, the only secondary action shown is a single "Sync iPhone Contacts" button at the bottom. The VCF / Quick Paste / CSV trio stays web-only.
6. **Squad Members section: remove entirely** from the Contacts tab. Squad members already live one tab away under "Squads" — duplicating them here is the single biggest cause of visual stacking.
7. **R@lly Search results** (people you can friend-request) get folded into the same flat list under a `R@LLY MEMBERS` section that only appears while typing 2+ chars. No separate card.
8. **Search-first empty state**: when the list is collapsed because of search with no matches, show only the orange Quick Add row — nothing else. This is the cleanest invite path.

## Files to change

- `src/components/squads/ContactsTab.tsx` — strip the 4 Card+Collapsible blocks; reuse the flat search-list pattern; remove Squad Members section; remove the duplicate "Invite from Contacts" button at top of Squads `contacts` tab (drop the `<Button>` and `ContactInviteDialog` from `src/pages/Squads.tsx`).
- `src/components/contacts/AddPeopleSheet.tsx` — promote to the canonical multi-select sheet: merge in `ContactInviteDialog`'s unified-list + sticky-CTA pattern, keep the native gate for Import Options.
- `src/pages/Squads.tsx` — remove the standalone "Invite from Contacts" button and `ContactInviteDialog` import; the Contacts tab itself already exposes Add People.
- `src/components/contacts/ContactInviteDialog.tsx` — either delete (preferred) or keep as a thin re-export of the unified sheet. I'd recommend delete and update any remaining callers.

## Visual rules (apply everywhere)

- No nested cards. One outer surface (sheet/dialog), flat content inside.
- Section headers: `text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1` — no icons, no chevrons, no counts.
- Row: 40px avatar + name (sm, medium) + subline (xs, muted) + trailing action. No background unless selected (`bg-primary/10 ring-1 ring-primary/30`).
- Sticky bottom action bar inside the sheet for batch invite.
- Empty sections simply don't render — no "0 connected" placeholders.

## Out of scope

- No backend, RLS, or data-model changes.
- Friend-request logic, upsert logic, and native contact sync all stay as-is.
- No new icons or palette tokens — uses existing R@lly Orange (`#F47A19`) and muted/primary tokens.

Reply with **approve** to implement, or tell me which pieces you'd tweak (e.g. keep Squad Members, keep both entry points, prefer single-select over multi-select).
