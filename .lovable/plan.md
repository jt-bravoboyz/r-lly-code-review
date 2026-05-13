## Use the real R@lly logo on the cover charge card

Replace the generated flag glyph (`rally-flag-flat-glyph-1024.png`) in the top-right of the Apple Pay–style hero card with the actual brand logo (`rally-logo.png`) — the same file used in the app header.

### Change
- File: `src/components/payments/CoverChargeDialog.tsx`
  - Replace the import `rally-flag-flat-glyph-1024.png` with `@/assets/rally-logo.png`.
  - Keep the same orange rounded-square mark slot in the top-right; render the logo inside it (object-contain, slight inset so it reads cleanly against the orange).

No other layout, copy, or behavior changes.
