

# Join R@lly Screen — Full Visual Redesign

## Current Problems
- Line 203: `bg-white shadow-sm` header — solid white bar, no safe-area handling
- Line 204: `h-6` hardcoded spacer instead of `env(safe-area-inset-top)`
- Line 201: `bg-background` — no ambient glow or gradient
- Card and input use default styling, not the premium glass system

## Changes

### `src/pages/JoinRally.tsx`

**1. Remove solid white header (lines 202-215)**
Replace with a transparent floating back button:
```tsx
<div className="fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 1.5rem)' }}>
  <div className="flex items-center justify-between px-4 py-3">
    <Button variant="ghost" size="sm" asChild>
      <Link to="/events"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
    </Button>
    <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
    <div className="w-16" />
  </div>
</div>
```

**2. Full-bleed immersive background (line 200-201)**
Replace outer div with full-screen centered layout + ambient glow:
```tsx
<div className="min-h-[100dvh] bg-black relative overflow-hidden flex flex-col">
  {/* Ambient radial glow */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#F47A19]/15 blur-[120px]" />
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-[#F47A19]/8 blur-[100px]" />
  </div>
```

**3. Center the main content (line 217)**
Replace `<main>` with a vertically centered flex container:
```tsx
<main className="flex-1 flex items-center justify-center relative z-10 px-4" 
      style={{ paddingTop: 'env(safe-area-inset-top, 1.5rem)' }}>
```

**4. Upgrade manual code entry card (lines 220-243)**
Glass card with glow border:
```tsx
<div className="w-full max-w-sm backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
```
- Title: `text-2xl font-bold text-white font-montserrat`
- Subtitle: `text-sm text-white/50`
- Input: add `bg-white/[0.06] border-white/[0.1] text-white` glass styling
- Button: keep existing `gradient-primary` class

**5. Apply same glass treatment to event preview card and not-found card**

**6. Update loading state container** to match dark/centered layout

**7. Also update the auth-loading return** (lines 190-198) to use `bg-black` instead of `bg-background`

## What does NOT change
- All functionality, navigation logic, input behavior, form submission
- Safety modals, rides selection flow
- Button actions and state management

## Files

| File | Change |
|------|--------|
| `src/pages/JoinRally.tsx` | Full visual overhaul — transparent header, full-bleed dark background with ambient glow, glass cards, centered layout |

1 file. Visual-only changes.

