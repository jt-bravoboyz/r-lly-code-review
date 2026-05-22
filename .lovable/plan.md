# Squads → Contacts: Premium Liquid Glass Redesign

Apply the chosen "Premium liquid glass" direction to the Contacts tab and the Add People sheet. Brand tokens (R@lly Orange `#F47A19`, Montserrat, dark glass/liquid 2026 UI) are locked. All existing functionality, hooks, and data flows are preserved — this is a structural and visual restyle only.

## Files to edit

1. `src/components/squads/ContactsTab.tsx`
2. `src/components/contacts/AddPeopleSheet.tsx`

No changes to `src/pages/Squads.tsx`, no new components, no data/RLS changes, no logic changes.

## ContactsTab — dark glass "premium island"

Wrap the entire tab body in a dark glass card so it visually separates from the light Squads shell and reads as a flagship feature:

- Container: `bg-[#0F0F12] rounded-3xl border border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-5 space-y-5` with subtle ambient orange radial in the top-right corner (low opacity, blurred).
- Search row: dark glass input `h-12 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-500` + a compact pill "Add" button (`h-12 px-6 bg-[#F47A19] rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#F47A19]/20 active:scale-95`).
- `SectionLabel`: tiny orange bullet dot + `text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500`.
- Contact rows: `bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3` with a `h-12 w-12 rounded-full` avatar, white bold name, zinc subline; selected state swaps to `bg-[#F47A19]/10 border-[#F47A19]/30 ring-1 ring-[#F47A19]/40` with a filled orange check tile.
- Quick-Add no-match row: orange-gradient glass card, same orange tile + Montserrat black title.
- Sticky multi-select bar: orange button on `bg-black/40 backdrop-blur-xl` strip with safe-area padding.

## AddPeopleSheet — cinematic dark glass sheet

Rebuild the SheetContent shell and section composition while keeping every collapsible, search input, sync action, and import flow intact.

- Sheet shell: `bg-[#121214] border-t border-white/15 rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.8)]` with a centered drag handle (`w-12 h-1.5 bg-zinc-800 rounded-full`).
- Header: large `text-3xl font-black tracking-tighter text-white` title + orange tagline `text-[#F47A19] font-bold text-sm` ("Pull your crew into the night"), plus a glass close pill (`w-10 h-10 bg-white/5 border border-white/10 rounded-full`).
- Section headers: orange bullet for R@lly Network, zinc bullet for Your Phone, both with `tracking-[0.2em] text-[10px] font-black` labels (drop the horizontal divider lines).
- R@lly Network search: dark glass input with a small pulsing orange glow dot anchored top-right.
- R@lly Friends + Discover triggers: a 2-column grid of compact glass tiles (`h-16 bg-white/[0.03] border border-white/10 rounded-[1.25rem]` with name + orange count chip). Tapping expands the existing Collapsible content directly below the grid full-width.
- Quick-Add no-match: orange-glow glass row (same component as the ContactsTab quick-add).
- Your Phone hero "Sync Contacts": full-width gradient glass card (`bg-gradient-to-br from-[#F47A19]/10 to-transparent border border-[#F47A19]/20 rounded-[2rem] p-5`) with a `w-14 h-14 rounded-2xl bg-[#F47A19] shadow-xl shadow-[#F47A19]/20` icon tile, white black title, zinc subline, trailing chevron pill.
- "From Your Phone" list collapsible: compact dark glass trigger row with orange count chip; expanded rows match the new contact-row style.
- Web Import (web-only): single compact row with `VCF • CSV • XLS` micro caption on the right; existing Tabs content untouched on expand.
- Sticky batch-invite bar: orange button on `bg-black/60 backdrop-blur-xl` with safe-area padding.

## Out of scope

- No edits to `src/pages/Squads.tsx` (the orange header band already matches the prototype).
- No changes to `SmartPasteContacts`, `CSVContactImport`, `VCFContactImport`, `ContactSmartSearch`.
- No data/query/RLS changes; no new hooks.
- No new dependencies.

## Validation

- Open `/squads` → Contacts tab on the 390px viewport. Confirm the dark glass island, premium typography, and orange accent system render cleanly over the light Squads shell.
- Tap "Add People" → confirm the new cinematic sheet matches the chosen prototype's hierarchy (drag handle, title block, R@lly Network grid, Your Phone hero, Web Import row).
- Friends/Discover/Phone-list collapsibles still expand and search/sync/batch-invite still work end-to-end.
- Safe-area padding holds on iOS viewport heights; 44px touch targets preserved.
