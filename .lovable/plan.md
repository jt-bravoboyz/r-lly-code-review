

# Cross-Platform Compatibility Plan — Implementation

All existing features (PWA prompt, service worker caching strategy, browser-safe timer types) are preserved. Six targeted changes across 5 files.

---

## 1. index.html — Viewport & Mobile Meta Tags

Update viewport meta (line 5) to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover">
```

Add three tags before `</head>` (after line 24):
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Theme color `#F97316` already present — no change needed.

---

## 2. public/sw.js — Auth Route Bypass

Insert after line 56 (after the `/assets/` and `/src/` exclusion):
```javascript
// Never intercept auth/OAuth routes — must always hit network
if (url.pathname.includes('~oauth') || url.pathname.startsWith('/auth')) {
  return;
}
```

Prevents "white screen" during login flows on mobile.

---

## 3. public/manifest.json — PWA Identity & Icons

- Add `"id": "/?source=pwa"` to root
- 192px icon: keep `"purpose": "any maskable"`
- 512px icon: change `"purpose"` to `"any"` (splash screen usage)

---

## 4. capacitor.config.ts — Native Config

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.30a08aa7cdeb4250a60c0605f836113c',
  appName: 'R@lly',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://30a08aa7-cdeb-4250-a60c-0605f836113c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  }
};
```

---

## 5. Safe-Area CSS — Bottom Nav & Global Layout

**src/index.css** — Add at the end of the base layer:
```css
body {
  padding-top: env(safe-area-inset-top);
}
```

**src/components/layout/BottomNav.tsx** — Update the nav element to respect the home indicator:
- Change the bottom safe-area div from `h-safe-area-inset-bottom` to use `env(safe-area-inset-bottom)` via inline style or a utility class
- Add `pb-[env(safe-area-inset-bottom)]` to the nav container so buttons sit above the iPhone home bar

---

## Summary

| File | Change |
|---|---|
| `index.html` | Viewport update + 3 mobile meta tags |
| `public/sw.js` | Auth route bypass |
| `public/manifest.json` | Add `id`, fix 512px icon purpose |
| `capacitor.config.ts` | Update appId, add hot-reload server |
| `src/index.css` | Safe-area top padding |
| `src/components/layout/BottomNav.tsx` | Safe-area bottom padding |

6 changes across 5 files (BottomNav + index.css for safe-area). No new dependencies. No backend changes.

**Post-implementation reminder:** Once you upload a 1024x1024 source icon and splash screen to the `assets/` folder, run `npx @capacitor/assets generate` to produce all required native icon and splash sizes.

