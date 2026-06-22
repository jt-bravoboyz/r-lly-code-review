# R@lly Tab Reel — Assets & Brand Direction

Deliverable: a folder of static screenshots, a 20-second Remotion MP4 mock reel, and a brand markdown doc — all under `/mnt/documents/rally-tab-reel/`, ready to hand to your editor.

Scenario throughout: **44 & King** (steakhouse vibe), 4 friends, realistic line items totaling ~$187.

---

## 1. Static screenshots (Playwright)

Drive the running preview with the pre-minted session and screenshot each step at 1280×1800. Output: `/mnt/documents/rally-tab-reel/stills/`.

Frames captured:
1. `01_splitcheck_home_empty.png` — SplitCheckHome with "New Tab" CTA prominent
2. `02_start_tab_dialog.png` — StartTabDialog open
3. `03_receipt_upload.png` — ReceiptUploader mid-parse (loading spinner state)
4. `04_review_items.png` — parsed items, tax, tip, total for 44 & King
5. `05_select_friends.png` — friend picker with avatars selected
6. `06_you_owe_tab.png` — "You Owe" tab, pending split with Pay button
7. `07_tab_pay_sheet.png` — TabPaySheet, Venmo/CashApp/PayPal/Apple Cash row
8. `08_did_you_send.png` — settlement-return confirmation sheet
9. `09_host_owed_to_you.png` — host's "Owed to You" tab with SettlementConfirmCard ("John says they sent $46.75 via Venmo")
10. `10_confirmed_state.png` — resolved split, green confirmed badge

Approach: where a real DB row is required (parsed receipt, pending settlement), seed via `supabase--insert` against the signed-in user, then navigate. Where the flow needs a second user (host view of someone else's payment), open a second context with a seeded peer session or screenshot the host UI against a seeded `split_check_targets` row.

Fallback: if any step can't be reached with seeded data (e.g. live OCR), I'll render a faithful HTML stand-in that re-uses the real Tailwind tokens and shadcn components, so it still matches the app exactly.

## 2. Remotion mock reel (20s, 1080×1920 portrait for Reels)

Project: `remotion/` (already exists in repo — I'll add a `RallyTab.tsx` composition alongside the current `WelcomeBack`).

Scene plan (30fps, ~600 frames):
- **0:00–0:03** Cold open — R@lly wordmark drops in, orange `@` glows, tagline "Nights That Matter" wipes
- **0:03–0:06** "+ NEW TAB" pill taps in, StartTabDialog springs up
- **0:06–0:09** Receipt snap → camera flash → line items stagger-fall into list (44 & King: ribeye, branzino, two old fashioneds, etc.)
- **0:09–0:13** Four avatars (orange-ringed) drop onto items, totals tick up per person
- **0:13–0:16** TabPaySheet slides up, Venmo tile pulses, "Did you send $46.75?" confirm
- **0:16–0:19** Host view: SettlementConfirmCard with green check, confetti burst
- **0:19–0:20** End card — R@lly logo + "Split it. Send it. Done."

Motion system: dark theme (#0a0a0a bg), R@lly Orange #F47A19 as the single accent, Montserrat throughout, glass cards with `filter: blur` (not backdrop-blur — sandbox constraint), spring entrances (damping 18), exits as inverse. Reuses real screenshots from step 1 where they sell the product harder than the mock.

Render: programmatic `scripts/render-rally-tab.mjs` → `/mnt/documents/rally-tab-reel/rally-tab-reel.mp4`.

Spot-check 4 key frames as stills before full render to catch layout/font issues.

## 3. Brand direction doc

File: `/mnt/documents/rally-tab-reel/BRAND.md` plus exported logo files alongside.

Contents pulled directly from `src/index.css`, `tailwind.config.ts`, and the Tab components (no guessing):
- **Color palette** — primary (R@lly Orange `hsl(27 91% 53%)` / `#F47A19`), background, card, muted, destructive, success-green, plus any gradients in the Tab UI (button glow, sheet headers). HSL + hex side-by-side.
- **Typography** — Montserrat weights/sizes actually used: headlines (700/800 at 24–32px), body (500/600 at 14–16px), buttons (600 uppercase tracking), monetary numbers. With CSS class references.
- **Logo** — copy `src/assets/logo.svg` (and any wordmark variants found) into the deliverable folder; document the orange `@` treatment with the exact fill/glow CSS.
- **Glow / shadow** — orange button glow values (box-shadow + drop-shadow) lifted from the components.
- **Iconography** — any Tab-specific icons (receipt, split, Venmo/CashApp/PayPal/Apple Cash tiles) listed with their lucide-react names + colors.
- **Voice** — "Nights That Matter", "Confident > Commanding", spelling rules (R@lly, R@llies).

## Technical notes

- Playwright uses the injected Supabase session env vars; localStorage write happens after `goto(localhost:8080)` per sandbox rules.
- Remotion install reuses existing `remotion/` folder; only adds a new composition + render script, doesn't touch `WelcomeBack`.
- All file writes for the editor go to `/mnt/documents/rally-tab-reel/` and surface via `<presentation-artifact>` tags.
- No app code is modified. No backend schema changes. Seeded rows are cleaned up after capture.

## Out of scope

- Real on-device screen recording (sandbox can't capture a phone screen — you'd do that separately if you want true device chrome).
- Sound design / voiceover for the reel (silent MP4; editor adds audio).
- Publishing to Instagram.
