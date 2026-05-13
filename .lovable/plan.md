# Scan Receipt — additive sub-flow inside Split Check

A new optional path inside `RequestPaymentDialog`'s **Itemized** tab that lets the host snap a receipt, watch an AI scan animation, tap which line items are theirs, and pass a calculated total straight into the existing split-check submission. Zero changes to existing manual entry, hooks, schemas, or payment logic.

## Entry point

In `RequestPaymentDialog.tsx`, when the user opens the **Itemized** tab and hasn't started yet (no items, no scan in progress), render a **two-card chooser** above the existing form:

```text
┌───────────────────┐  ┌───────────────────┐
│  📷 Scan Receipt  │  │ ✏️ Add Manually  │
│  AI reads it for  │  │ Type items in    │
│  you              │  │ yourself         │
└───────────────────┘  └───────────────────┘
```

- Both cards: glassmorphic (`bg-white/5 backdrop-blur-xl border border-white/10`), R@lly orange icon accent, equal weight.
- "Add Manually" simply dismisses the chooser and reveals the **existing** ReceiptUploader + items grid — no logic change to that path.
- "Scan Receipt" mounts the new `<ScanReceiptFlow />` overlay component.
- If items already exist (i.e. user already started), skip the chooser — preserves current behavior on edit.

## New components (all new files, nothing edited beyond the chooser injection)

```
src/components/payments/scan-receipt/
  ScanReceiptFlow.tsx          ← orchestrator, holds local state machine
  ScanCaptureView.tsx          ← Step 1: Take Photo / Upload, framed overlay
  ScanProcessingView.tsx       ← Step 2: scan-line animation
  ScanItemSelectView.tsx       ← Steps 3 + 4: line items + live totals
  ScanCheckbox.tsx             ← custom 40px circular checkbox w/ spring + haptic
  scanReceiptTypes.ts          ← local types
```

State machine inside `ScanReceiptFlow`: `chooser → capture → processing → select → error`. Emits `onComplete({ items, subtotal_cents, tax_cents, tip_cents })` back to `RequestPaymentDialog`, which **reuses the existing `sendItemized` path** by populating the same `items`, `subtotal`, `tax`, `tip` state already in the dialog. No new edge function for submission.

## Step 1 — Capture (`ScanCaptureView`)

- Two buttons: **Take Photo** (`<input capture="environment">`) and **Upload from Library** (`<input>` no capture).
- Header: **"Align the receipt."**
- A framed overlay (4 orange `#F47A19` corner brackets, ~24px L-shapes, 3px stroke) drawn over the camera trigger area as a visual guide.
- Glassmorphic shutter button at the bottom triggers the file input.

## Step 2 — AI Scan (`ScanProcessingView`)

- Full-screen glass card showing the captured image, blurred backdrop behind it.
- A 2px R@lly orange horizontal line sweeps top→bottom on a 2.5s infinite loop (`@keyframes scan-sweep` added to `index.css`, or inline framer-motion).
- Status text: **"Scanning..."**
- **Image pipeline (client):** downscale to max 1024px width via `<canvas>`, re-encode JPEG quality 0.8, upload to existing `receipts` storage bucket (signed URL), then call new edge function `scan-receipt-vision`.
- **30s timeout** via `Promise.race` with `AbortController`.
- On error → `error` state with **"We couldn't read this one."** + `Retry` and `Add Manually` buttons. "Add Manually" closes the scan flow and reveals existing ReceiptUploader/manual editor untouched.

## New edge function `supabase/functions/scan-receipt-vision/index.ts`

- Mirrors `parse-receipt` shape so we don't break anything, but uses the **OpenAI GPT-4o Vision** model per the spec (existing `parse-receipt` uses Gemini and stays untouched).
- Reads `OPENAI_API_KEY` from secrets (will request via `add_secret` if missing).
- Input: `{ image_url: string }`. Returns:
  ```json
  {
    "items": [{ "name": "Margarita", "price": 12.50 }],
    "subtotal": 0, "tax": 0, "tip": 0, "total": 0
  }
  ```
- CORS headers, Zod input validation, 30s upstream timeout, structured tool-call output for reliability.

## Step 3 — Line item selection (`ScanItemSelectView`)

- Header: **"Tap what's yours."**
- Glass card list. Each row:
  - Left: item name (sentence case, `font-medium`)
  - Right: price `$XX.XX` with `tabular-nums`, right-aligned
  - Far right: `<ScanCheckbox>` 40×40 tap target
- Stagger entrance: each row `opacity 0 → 1`, `translateY 8px → 0`, 60ms stagger (framer-motion `staggerChildren`).

### `ScanCheckbox`

- Unchecked: hollow circle, `border-[1.5px] border-white/30`.
- Checked: filled `#F47A19`, white check icon.
- Tap: spring scale `0.9 → 1.05 → 1.0` (~250ms total) via framer-motion.
- Haptic: reuse existing `useHaptics` hook (`light` impact) on each toggle.

## Step 4 — Live totals (in `ScanItemSelectView`, sticky summary card)

Glassmorphic card under the list, recomputes on each toggle:

```text
selected_subtotal = sum(price of checked items)
ratio             = selected_subtotal / parsed.subtotal   (fallback 0 if subtotal=0)
your_tax          = parsed.tax * ratio
your_tip          = parsed.tip * ratio
your_total        = selected_subtotal + your_tax + your_tip
```

Display: Subtotal, Tax, Tip, then **"Your total."** large bold with subtle orange text-shadow glow.

## Step 5 — CTA

Sticky bottom button **"Send request."**:
- `bg-[#F47A19]`, full width, rounded matching app buttons.
- Apple-Pay gloss: top 30% `bg-gradient-to-b from-white/20 to-transparent` overlay, bottom inset shadow `shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]`.
- On tap: convert `items` to existing dollar/cent format the dialog expects, populate `RequestPaymentDialog`'s existing state (`setItems`, `setSubtotal`, `setTax`, `setTip`), close the scan overlay. The user lands on the existing attendee picker / Send Itemized Request flow already in the dialog. **Nothing new on the submission side.**

## Visual system

- Dark glass surfaces: `bg-white/5 backdrop-blur-xl border border-white/10`.
- Orange `#F47A19` only on: scan line, active checkboxes, total emphasis, primary CTA, capture corner guides.
- All motion via framer-motion springs (`stiffness: 300, damping: 24`), max 350ms.
- Reuse Montserrat + existing radii/spacing tokens.

## Exact copy strings used

`Scan receipt.` · `Align the receipt.` · `Scanning...` · `Tap what's yours.` · `Your total.` · `Send request.` · `We couldn't read this one.`

## Guardrails (explicit non-changes)

- `PaySplitShareDialog`, `ClaimItemsView`, `useSplitCheck`, `request-split-check`, `parse-receipt`, `process-fluid-pay`, DB schema → **untouched**.
- The existing `ReceiptUploader` + manual items grid in `RequestPaymentDialog` → **untouched**, only conditionally hidden behind the new chooser when neither path has been chosen yet.
- No new routes, no nav changes, no tab changes.

## Open question

OpenAI key: do you want to use **OpenAI GPT-4o Vision** (requires adding an `OPENAI_API_KEY` secret), or should I substitute Lovable AI's vision-capable Gemini model (no key needed, already used by the existing `parse-receipt` function)? The UX is identical either way — only the backend model differs.
