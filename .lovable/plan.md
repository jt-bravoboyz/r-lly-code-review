# Event Detail — Hyper-Pro Theme Polish

Scope: pure presentation. Three files only. Theme system already computes light/dark contrast in `EventThemeProvider` — we'll extend it, not replace it.

## Files touched

1. `src/components/events/EventThemeProvider.tsx` — expose two new CSS vars + safe `hexToRgb`
2. `src/index.css` — tighten themed card chrome + tab pop + frosted header utility
3. `src/pages/EventDetail.tsx` — wrap header/metadata block; polish copy-invite pill; restyle TabsList

No business logic, no data flow, no new components.

---

## 🔒 Locked CSS — ship verbatim

This block must land exactly as written in `src/index.css` (replacing the current lines 2155–2157 active-tab rule):

```css
.event-themed [role="tab"][data-state="active"] {
  background: var(--theme-accent-soft) !important;
  color: var(--theme-accent) !important;
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.08);
}
```

Depends on `--theme-accent-soft` being injected by the provider (see §1).

---

## 1. Contrast guard tokens + safe `hexToRgb` (EventThemeProvider.tsx)

Provider already derives `mode`, `ink`, `meta`, `glassTint`, `glassBorder` from theme luminosity. Add two new vars:

- `--theme-ink-strong` → `#0B0F1A` (light mode) / `#FFFFFF` (dark mode) — for H1/numerics over dynamic gradients.
- `--theme-accent-soft` → `rgba(r, g, b, 0.14)` — required by the locked CSS above.

### Defensive `hexToRgb` (drop-in alongside existing `parseRgba`)

Current `flyerThemes.ts` palettes are all 6-digit hex (`#F47A19`, `#5C3CFF`, …), but the helper must defensively accept any host-supplied accent without ever emitting `rgba(NaN, NaN, NaN, 0.14)`. Spec:

```ts
/** Parse "#rgb", "#rrggbb", or "#rrggbbaa" into {r,g,b}. Returns null on failure. */
function hexToRgb(input: string): { r: number; g: number; b: number } | null {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');

  // Expand 3-digit shorthand (#f00 → #ff0000) and 4-digit (#f00a → #ff0000aa)
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map((c) => c + c).join('');
  }

  // Accept 6 (rgb) or 8 (rgba — alpha discarded, we override it)
  if (h.length !== 6 && h.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(h)) return null;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

/** Build the accent-soft token. Falls back to neutral ink-tinted glass if parse fails. */
function buildAccentSoft(accentHex: string, fallbackInk: string): string {
  const rgb = hexToRgb(accentHex);
  if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
  // Fallback: neutral tint derived from --theme-ink so the active tab still pops
  // without ever rendering an invalid rgba() string.
  return fallbackInk === '#FFF5E8'
    ? 'rgba(255, 245, 232, 0.14)'
    : 'rgba(26, 17, 8, 0.10)';
}
```

Wired in the existing `useMemo` block:
```ts
const accentSoft = buildAccentSoft(accent, ink);
// ...
['--theme-accent-soft' as any]: accentSoft,
['--theme-ink-strong' as any]: mode === 'light' ? '#0B0F1A' : '#FFFFFF',
```

**Why this matters:** if a future host theme adds `#f00` shorthand or someone fat-fingers a 5-char hex, the page still renders a valid translucent tint instead of a CSS parser bailing out — the active tab keeps its readable pop. Additive only; existing themes are unaffected.

## 2. Themed CSS upgrades (index.css, append + targeted edits)

```text
/* Heavily frosted container for over-gradient header/metadata blocks */
.event-themed .ev-frost {
  background: var(--theme-glass-tint);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
  border: 1px solid var(--theme-glass-border);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.05),
    0 10px 40px -20px rgba(0,0,0,0.45);
  border-radius: 1rem;
}
.event-themed--light .ev-frost {
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.6),
    0 8px 30px -16px rgba(0,0,0,0.18);
}

/* Max-contrast text inside dynamic theme contexts */
.event-themed .ev-ink-strong { color: var(--theme-ink-strong) !important; }
```

**Tighten existing themed card chrome (modify lines 2108–2125):**
- Border tightened to ~22% alpha on dark, ~14% on light (Apple-grade definition).
- Inner shadow on dark mode: explicitly `inset 0 1px 0 0 rgba(255,255,255,0.05)`.
- Outer shadow tightened to `0 14px 44px -24px` for the "lifted glass" feel.

**Tabs chrome (wraps the locked active-tab rule above):**
```text
.event-themed [role="tablist"] {
  background: var(--theme-glass-tint);
  border: 1px solid var(--theme-glass-border);
  backdrop-filter: blur(20px) saturate(1.15);
  border-radius: 0.75rem;
  padding: 4px;
}
.event-themed [role="tab"] {
  color: var(--theme-meta) !important;
  transition: background-color .2s ease, color .2s ease;
  border-radius: 0.55rem;
}
/* 🔒 locked active-tab rule — see top of plan */
```

## 3. EventDetail.tsx surgical edits

**Header/metadata wrap (≈ lines 594–646):** wrap the "Header context line + Copy invite link + Rotate" cluster in `<div className="ev-frost px-3 py-2 mt-1">`. Apply `ev-ink-strong` to the event title `<h1>` and the attendee count number.

**Copy invite pill (lines 599–611):** restyle to a real pill:
- Container: `flex items-center gap-2.5 mt-2`
- Button: `inline-flex items-center gap-1.5 text-xs font-medium pl-2.5 pr-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 dark:border-black/10 hover:bg-background/55 transition shadow-sm`
- Icon: `Link2 className="h-3.5 w-3.5 opacity-80"` → swaps to `<Check />` for 1.2s after copy.
- "Rotate": same pill chrome, accent-tinted (`text-[var(--theme-accent)] bg-[var(--theme-accent-soft)] border-transparent`).
- Expiry chip: `rounded-full px-2 py-0.5` to match the pill radius family.

**TabsList (line 987):** keep `grid grid-cols-5` semantics. The new `[role="tablist"]` + locked active-tab CSS paint the chrome — TabsTrigger components need no class changes.

**"Who's Going" / "Dress Code" / Map Cards (lines 1044, 1081, 1150):** already render shadcn `<Card>` which the themed CSS auto-upgrades via `[class*="bg-card"]`. Tightened border + inset shadow from §2 picks them up for free. Zero per-card edits.

---

## Out of scope (intentional)

- After-R@lly card (`gradient-after-rally`) — its own purple takeover.
- Hero/cover image carousel — already correct.
- Data, RPCs, queries, routing.
- Light/dark global theme — only the **event-themed** layer.

## QA pass

1. Open `/events/:id` across each of the 9 flyer themes. Verify:
   - Title is always >7:1 contrast over the backdrop.
   - Active tab tints with the theme accent without losing legibility.
   - Copy-invite pill reads cleanly on both light + dark scrims.
2. Devtools: manually set `--theme-accent` to `#f00`, `#abc`, empty string → confirm `--theme-accent-soft` stays a valid `rgba(...)` (no `NaN`).
3. Switch to After R@lly mode → header frost still readable, backdrop suppressed.
4. Mobile 560px viewport — pill row wraps cleanly, tabs grid still 5-up.

Estimated diff: ~60 lines CSS, ~25 lines TSX, ~25 lines provider (including `hexToRgb` + fallback).