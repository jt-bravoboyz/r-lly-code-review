# Real-app screenshots (replace the HTML mocks)

You're right — the previous stills were stylized HTML mocks. To get true 1:1 with the production UI, I'll drive the live app at `localhost:8080` with Playwright, signed in as your pre-minted session, and capture the actual rendered components.

## Approach

For each frame:
1. Seed any required rows in Lovable Cloud (split_check_requests, split_check_items, split_check_targets, tab_settlements) tied to your `auth.uid()`.
2. Navigate the real route (`/tabs`, etc.).
3. If a dialog/sheet is needed, click the real trigger and wait for the component to mount.
4. Capture either a full-viewport (390×844 iPhone preset for true mobile chrome) or a clipped element screenshot.
5. Roll the seeded rows back at the end.

All screenshots saved at 2× DPR to `/mnt/documents/rally-tab-reel/stills-real/` so your existing `stills/` folder stays untouched as a fallback.

## Frame plan (real components)

| # | File | Route + state | How it's reached |
|---|---|---|---|
| 1 | `01_splitcheck_home_empty.png` | `/tabs`, no active splits | Wipe my user's pending rows, navigate |
| 2 | `02_start_tab_dialog.png` | `/tabs` with `<StartTabDialog>` open | Click "+ New Tab" via `getByRole` |
| 3 | `03_receipt_upload.png` | StartTabDialog mid-upload | Set file via Playwright's `setInputFiles` on the hidden `<input type="file">` using a seeded receipt JPG; intercept the `parse-receipt` edge function and stall its response so we land on the spinner state |
| 4 | `04_review_items.png` | StartTabDialog after parse returns | Mock `parse-receipt` to return a 44 & King payload (ribeye / branzino / caesar / old fashioneds / fries) |
| 5 | `05_select_friends.png` | `<ClaimItemsView>` for that draft | Seed split_check_items with the 44 & King rows and 4 friend targets (You + 3 seeded peer profiles), navigate |
| 6 | `06_you_owe_tab.png` | `/tabs`, "You Owe" tab, one pending split where I'm a target | Seed a split_check_request hosted by a peer profile, with me as a target owing $46.75 |
| 7 | `07_tab_pay_sheet.png` | TabPaySheet open from that pending split | Click "Pay" on the card from frame 6; ensure the host profile has Venmo/CashApp/PayPal/Apple Cash handles set so all four tiles render |
| 8 | `08_did_you_send.png` | Settlement-return confirm sheet | Trigger the `useSettlementReturn` flow by navigating with the `?return=settlement&method=venmo&amount=…` params the app uses |
| 9 | `09_host_owed_to_you.png` | `/tabs`, "Owed to You" tab, with `<SettlementConfirmCard>` | Seed a tab_settlement row where I'm the host and a peer marked "sent via Venmo" |
| 10 | `10_confirmed_state.png` | Same row, post-confirm | Update the tab_settlement to confirmed_at = now, status = confirmed |

## Multi-user trick

I can't open a real second auth session in the sandbox. For the host-side frame (#9) I'll seed the row directly as the host (you) with the peer profile referenced via `from_profile_id` — that's the exact state the real UI renders against. For frame #6 (where I need to be the *payer* and someone else is host), I'll seed a request with `host_profile_id = <peer profile uuid>` and `target.profile_id = auth.uid()`. The component reads from the DB the same way regardless of how the row got there, so the render is real.

## What's seeded vs faked

- **Real:** every pixel of every component, dark/light theme as the app defaults, real fonts, real glow tokens, real lucide icons, real Venmo/CashApp/PayPal/Apple Cash tile renders.
- **Faked-but-realistic:** the receipt OCR response (intercepted to return 44 & King items deterministically), and the peer profile ("John") seeded with avatar initials + payment handles.

## Cleanup

After capture, delete every seeded row (single SQL block keyed on a tag I set in `split_check_requests.metadata`). Your account ends in the same state it started.

## What I need from you

Two things:

1. **Theme:** the app defaults to **light** in production but my earlier mocks were dark per your original brief. For real-app stills, do you want **light** (matches what users actually see) or **dark** (matches the Reel direction)? I can capture both if you want.
2. **Cover frame for #1 ("empty tabs"):** if you have ever created a tab in this account, the real "You Owe / Owed to You / Settled" tabs are not empty. OK if I temporarily archive/hide your existing splits during capture and restore after? Or should I capture against the populated state and just pick a clean-looking shot?

## Out of scope

- Real screen *recording* (still impossible in sandbox — only stills). The screenshots remain Reel-ready 1080×1920 letterboxed onto the device frame.
- Editing/redesigning the actual app UI.
