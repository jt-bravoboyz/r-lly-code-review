# Polish Uber + Lyft Buttons — Real App Icons, Glass, Breathing Glow

Surgical visual rewrite of `src/components/rides/RideshareDeepLinkButtons.tsx`. No other files touched. Placement, deep-link URLs, click behavior, haptics, and analytics are unchanged.

## Single file edit: `src/components/rides/RideshareDeepLinkButtons.tsx`

### App icons (real, recognizable)

Replace the small monochrome wordmark with two squircle app-icon components rendered at **40×40px**, `borderRadius: 9px` (~22% — iOS continuous corner approximation), with subtle inner highlight + drop shadow:

- **`UberAppIcon`** — `background: #000000`, white "Uber" wordmark centered (inline SVG `<text>`, Helvetica/Arial 900, white fill). Shadow: `0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)`.
- **`LyftAppIcon`** — `background: #FF00BF` (Lyft pink), white "lyft" wordmark centered. Shadow: `0 2px 8px rgba(255,0,191,0.35), inset 0 1px 0 rgba(255,255,255,0.18)`.

Icons keep their authentic brand colors — buttons themselves stay glass.

### True glass buttons

Each button:
- `flex-1 h-[68px] rounded-2xl flex items-center justify-center gap-3 px-4`
- `bg-white/55 dark:bg-black/45`
- `backdrop-blur-xl` with inline `WebkitBackdropFilter: 'blur(20px) saturate(1.4)'`
- `border border-white/40 dark:border-white/10`
- `active:scale-[0.98] transition-transform duration-200 ease-out`
- `relative overflow-hidden`, `text-foreground`

### Breathing R@lly Orange glow (synced)

Inline `<style>` block defines a single keyframe `rideshare-breath` (3.6s ease-in-out infinite) animating `box-shadow` between:
- rest: soft depth shadow + faint `hsl(22 90% 52% / 0.12)` inset ring
- peak: stronger depth shadow + `hsl(22 90% 52% / 0.32)` inset ring + `0 0 18px hsl(22 90% 52% / 0.22)` outer halo

Both buttons get class `.rideshare-glass-btn` with `animation-delay: 0s`, so they breathe in **perfect sync**.

### Layout inside each button

Horizontal: `[AppIcon] [text-block]` centered together.
- Top text: label (`Uber` / `Lyft`) — `font-montserrat font-semibold text-[15px] text-foreground`
- Bottom text: `Open app` — `text-[11px] text-muted-foreground`

### Render

The two buttons are rendered via a small mapped array `[{key:'uber',...}, {key:'lyft',...}]` inside the existing `<div className="flex gap-3 w-full">` wrapper. Existing `handleClick`, `buildUberUrl`, `buildLyftUrl`, `useHaptics`, and `trackEvent` calls are preserved verbatim.

## Out of scope

- `src/pages/EventDetail.tsx` is not modified — placement above the DD/Need-a-Ride sections stays.
- No changes to deep link URLs, haptics, analytics, or any other component.
- Does not touch Dress Code, Song Rec's, alerts dedup, R@lly Feed placeholder, or any other shipped feature.
