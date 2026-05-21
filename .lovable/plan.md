# Capture screenshots of all R@lly feature screens

Walk through the app in the browser sandbox at mobile viewport (390×844) and capture every feature screen I listed earlier, even without a populated R@lly. Most will show empty-state UI, which still demonstrates the layout, header, action bar, and design system.

## What gets captured

**Public / pre-auth** (work logged out — re-shoot at mobile size)
1. Landing
2. Onboarding 1–3
3. Sign Up
4. Sign In
5. Legal & Policies

**Auth-gated — empty/seed state** (will show login wall if not logged in)
6. R@lly Feed home (Coming Soon)
7. Events list
8. Create Event flow (Apple 2026 sticky form)
9. Event Detail — hero / dress code / playlist sections
10. Add People sheet
11. Squads list + Squad Detail
12. Ride Logistics panel (inside event)
13. R@lly Home command dashboard (host view)
14. Safety Tracker (attendee view)
15. After R@lly opt-in dialog
16. Photo gallery + upload
17. Profile + Payment Method (Coming Soon) + Payout (Coming Soon)
18. Notifications Command Center
19. Achievements / Tier Ladder
20. R@lly Tabs (Coming Soon)

## How

- Browser sandbox, viewport 390×844 (iPhone 14 Pro).
- For each route: `navigate_to_sandbox` → `screenshot` → save under `/mnt/documents/rally-screens/NN-name.png`.
- Auth-gated screens that bounce to `/auth` will be captured as-is (showing the redirect/login gate) and flagged in the index.
- Zip everything into `/mnt/documents/rally-screens.zip` and emit as a `<presentation-artifact>`.

## Heads up
Without being logged in, **screens 6–20 will mostly show the login redirect, not the actual feature UI**. If you want the real populated screens (DD assignments, attendee grids, live tracking map, photo gallery with photos, etc.), the only way is to log into the preview iframe first — then I can re-run capture for the auth-gated set.

Approve and I'll start shooting. After login, say the word and I'll re-shoot the gated set with real data.
