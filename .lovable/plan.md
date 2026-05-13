## Cover Charge — Glass + Apple Pay Polish

Refine `CoverChargeDialog` and `FluidPayCardForm` so the screen feels like a premium Apple Pay sheet with R@lly's glass/liquid language, plus a clear "your info is safe" trust moment.

### Visual direction

- **Glass sheet container**: swap the flat `DialogContent` for a layered glass panel — `backdrop-blur-2xl`, soft inner highlight (top 1px white/10), subtle outer glow in R@lly Orange at low opacity, rounded-3xl. Ambient drift behind (orange → purple) like the rest of the app.
- **Hero amount card**: replace the gray `bg-muted` block with a tilted Apple Pay–style card visual:
  - Frosted gradient (white/8 → white/2 in dark, white/60 → white/30 in light)
  - Event title + host avatar top-left, R@lly mark top-right
  - Big `$5.00` in Montserrat, "Cover" label below
  - Soft spotlight shimmer on mount (one-shot, ~1.2s)
- **Pay button**: tall pill, R@lly Orange gradient with inner highlight + soft outer glow, haptic-feel press scale. Apple Pay-style "Hold to confirm" optional; default = single tap.
- **Card form (when shown)**: inputs upgraded to glass (already styled, but tighten) — floating labels, monospace card number with brand glyph that swaps live (Visa/MC/Amex), subtle success tick when fields validate.
- **One-tap saved card row**: shown as a mini Apple Pay card chip with brand + ••••last4 and a chevron.

### Trust moment

A dedicated **Secure Payment** strip directly under the amount, not as a tiny footer:

```text
[lock icon]  Encrypted end-to-end
             Powered by Fluid Pay · PCI-DSS Level 1
```

- Glass pill, lock icon in R@lly Orange, two lines of micro-copy.
- Tappable → opens a small popover with: "We never see or store your card number. Your card is tokenized by Fluid Pay (PCI-DSS Level 1) the moment you tap Pay."
- Replaces the current tiny "Powered by Fluid Pay" badge (which moves into the popover).

### Files to touch

- `src/components/payments/CoverChargeDialog.tsx` — restructure layout, add hero card, trust strip, glass shell.
- `src/components/payments/FluidPayCardForm.tsx` — input polish, live brand glyph, inline validation states.
- `src/components/payments/PoweredByFluidPay.tsx` — extend into a `SecurePaymentBadge` with popover variant (keeps old export for compatibility).
- No business logic, no backend, no schema changes. Sandbox/simulated payment path untouched.

### Next step

Before I build, I'll generate 3 visual directions of the new cover charge sheet so you can pick the exact glass/Apple Pay flavor, then implement the chosen one.
