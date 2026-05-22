# Final Execution Pass — App Store Hardening + Premium Contacts UI

One coordinated sweep across native config, routing, and the Contacts surface. All changes preserve web compatibility via existing `Capacitor.isNativePlatform()` and `dark:` adaptive guards.

---

## Part 1 — App Store Pre-Upload Hardening 🔴

### `capacitor.config.ts`
- `appId`: `app.lovable.30a08aa7cdeb4250a60c0605f836113c` → **`com.bravoboyz.rally`**
- `SplashScreen.backgroundColor`: `#0F172A` → **`#F47A19`** (brand orange, kills navy flash)
- `StatusBar.style`: `'DARK'` → **`'LIGHT'`** (matches `nativeBootstrap.ts` runtime override, no flicker)
- `StatusBar.backgroundColor`: `#0F172A` → **`#F47A19`**

> Note for you, post-pull: a stale `ios/App/App/capacitor.config.json` may still hold the old bundle ID — delete it and re-run `npx cap sync ios`. Also create the App Store Connect record under the new ID before first upload.

### `scripts/ios-setup.sh`
Add a PlistBuddy helper for arrays and inject:
```
UIBackgroundModes = [ "location", "remote-notification" ]
```
Idempotent: detect existing entries, only add missing modes. Keeps the rest of the script untouched.

### `src/App.tsx`
- Import `Demo` from `./pages/Demo`
- Register `<Route path="/demo" element={<Demo />} />` above the `*` catch-all so the marketing prototype is reachable

---

## Part 2 — Premium Adaptive Contacts UI + Skeletons

### New: `src/components/contacts/ContactRowSkeleton.tsx`
Reusable frosted-glass pulse row matching the live contact row geometry (avatar + 2 text lines + trailing action chip). Adaptive tokens:
- `bg-white/60 dark:bg-white/[0.03]`
- `border-black/[0.04] dark:border-white/[0.06]`
- Uses `animate-pulse` + inner shimmer gradient for premium feel
- Accepts `count` prop (default 4) to stamp multiple rows without layout jump

### `src/components/squads/ContactsTab.tsx`
Preserve existing layout, just confirm/lock the already-applied adaptive tokens + add skeletons:
- Main island: `bg-white/70 dark:bg-[#0F0F12]` with `border-black/[0.05] dark:border-white/[0.08]`
- Both search bars keep their split-purpose semantics (R@lly network vs synced device) — confirm collapsibles are **closed by default**
- Search focus rings: `focus-visible:ring-2 focus-visible:ring-[#F47A19]` (already in place — verify)
- Section bullets: solid `bg-[#F47A19] shadow-[0_0_8px_rgba(244,122,25,0.7)]`
- **New:** while `isLoading` / `isSyncing` is true, render `<ContactRowSkeleton count={5} />` in place of the row map
- '+ ADD' trigger: `shadow-[0_4px_20px_rgba(244,122,25,0.35)] hover:shadow-[0_6px_28px_rgba(244,122,25,0.5)]`

### `src/components/contacts/AddPeopleSheet.tsx`
Preserve dual split-search architecture and 2-column grid:
- Sheet shell: `bg-white/80 dark:bg-[#121214] border-t border-black/[0.08] dark:border-white/15 backdrop-blur-2xl`
- **R@lly Network** search bar — accordion collapsed by default; orange focus ring; on search-in-flight render 4× `<ContactRowSkeleton />`
- **From Your Phone** collapsible — closed by default; on `requestContacts()` / sync-in-flight render 6× `<ContactRowSkeleton />` instead of empty/jumping list
- Web Import row + sticky batch-invite footer keep adaptive fills + orange aura `shadow-[0_4px_20px_rgba(244,122,25,0.35)]`
- All Capacitor-only paths stay behind `if (isNative)` so web build is identical

---

## Web compatibility guardrails (verified, no changes needed)
- `capacitor.config.ts` `useLovableLiveReload` opt-in stays intact — web preview untouched
- All Capacitor plugin calls remain inside `Capacitor.isNativePlatform()` blocks
- `sw.js` UA bailout for WKWebView untouched
- ThemeProvider already defaults to `'light'`, so the new orange splash/statusbar align with first paint

---

## File-change summary
| File | Change |
|---|---|
| `capacitor.config.ts` | Bundle ID + brand-orange splash/statusbar |
| `scripts/ios-setup.sh` | `UIBackgroundModes` injection |
| `src/App.tsx` | `/demo` route |
| `src/components/contacts/ContactRowSkeleton.tsx` | **NEW** adaptive skeleton |
| `src/components/squads/ContactsTab.tsx` | Skeleton wiring on loading states |
| `src/components/contacts/AddPeopleSheet.tsx` | Skeleton wiring on R@lly + Phone search states |

Approve and I'll execute the full sweep in one pass.
