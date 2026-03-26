

# Notifications → R@lly Command Center Redesign

## Approach
Single file change: `src/pages/Notifications.tsx`. Add keyframes to `src/index.css` for new animations. No logic, navigation, or data flow changes.

---

## New CSS Keyframes (`src/index.css`)

Add 3 keyframes:
- **`command-pulse`** — slow green dot pulse (opacity 0.6→1 over 2s)
- **`icon-glow-breathe`** — radial orange glow breathing behind bell icon (3.5s cycle)
- **`text-shimmer`** — diagonal shimmer sweep across headline text (~7s cycle)
- **`card-float`** — subtle vertical drift for anticipation card (4s, ±3px)

---

## Notifications Page Rewrite (`src/pages/Notifications.tsx`)

### Structure (preserving all existing logic & hooks)

```text
┌─────────────────────────────────┐
│  Existing Header (unchanged)    │
├─────────────────────────────────┤
│  SYSTEM STATUS BAR              │
│  🟢 R@lly System Active        │
│  Last sync: just now            │
├─────────────────────────────────┤
│  [if notifications exist]       │
│    Activity header + badges     │
│    PendingInvites               │
│    Notification cards (glass)   │
│  [if empty]                     │
│    Bell icon + orange glow      │
│    "You're locked in"           │
│    shimmer subtext              │
│    Anticipation card (glass)    │
│      "Squad hasn't moved yet"   │
│      CTA: Start a R@lly        │
├─────────────────────────────────┤
│  Ambient bg orbs (absolute)     │
│  BottomNav (unchanged)          │
└─────────────────────────────────┘
```

### 1. System Status Bar
- Thin glass strip below header: `backdrop-blur-xl bg-card/60 border-b border-white/10`
- Green pulsing dot (animate-command-pulse) + "R@lly System Active" + "Last sync: just now"
- Uses `useState` with `useEffect` interval to update relative timestamp (no new hooks — just `useState`/`useEffect`)

### 2. Enhanced Empty State
- Bell icon: 48px, surrounded by radial orange glow div (`animate-icon-glow-breathe`)
- Headline: "You're locked in" with shimmer text effect via `bg-clip-text` gradient animation
- Subtext: "We'll keep you posted when your crew makes a move"

### 3. Smart Anticipation Card
- Glassmorphism card: `backdrop-blur-xl bg-card/60 border border-primary/10`
- Floating animation (`animate-card-float`)
- Content: "Your squad hasn't made a move yet tonight"
- CTA `<Link to="/events">` styled as glass button: "Start a R@lly"
- Hover: glow intensifies, slight lift

### 4. Ambient Background
- 2 decorative orbs (existing `animate-orb-float` classes) positioned absolute behind content
- Soft radial gradient overlay for vignette effect

### 5. Notification Cards (when populated)
- Upgrade existing cards to glass treatment: `backdrop-blur-xl bg-card/60 border-white/10`
- Unread cards: `border-primary/15` with subtle glow

### What does NOT change
- All hooks, data fetching, markRead logic
- Header component and navigation
- BottomNav
- Notification type icons and click handlers
- PendingInvites component

---

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add 4 keyframes + 4 utility classes |
| `src/pages/Notifications.tsx` | Full visual upgrade — glass surfaces, system bar, enhanced empty state, anticipation card, ambient bg |

2 files. Pure visual/motion enhancement. Zero logic changes.

