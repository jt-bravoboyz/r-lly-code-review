# Download Photos to Device — with Batch, Haptics & Permission Guard

Let users save R@lly photos to their camera roll / downloads from the fullscreen viewer **and** in batches from the grid, with native haptic feedback and a branded permission prompt before iOS/Android asks for Photos access.

## What you'll see

### Single photo (fullscreen)
- Glassmorphism **Download** icon (R@lly Orange) in the top-right of every expanded photo
- Lives in both viewers: photo grid (`EventPhotoFeed`) and hero carousel (`RallyHeroMediaCarousel`)
- Tap → saves the **original high-res** image, fires a `light` haptic + `"Photo Saved! 📸"` toast
- **Long-press** keeps working natively (we don't disable the context menu)

### Batch download (new)
- New **"Select"** button in the photo grid header (next to "Add")
- Tapping it enters Select Mode:
  - Each photo shows a circular checkbox in the top-right corner
  - Tapping a photo toggles selection (no longer opens the viewer)
  - Header transforms into: `[Cancel]   3 selected   [Save (3)]`
- **Save** triggers a sequential download of all selected photos
  - Progress toast: `"Saving 2 of 3…"` updates in place using `toast.loading` + `toast.success`
  - On completion: `success` haptic + `"3 photos saved! 📸"`
  - Exits Select Mode automatically

### Permission guard (new)
- Before the first save attempt on **native iOS/Android**, check Photos permission
- If not granted → show a **R@lly-branded modal** (`PhotoPermissionDialog`) instead of letting the OS popup hit cold:
  - Header: `"Save to Your Camera Roll"`
  - Copy: `"R@lly needs permission to save photos to your library. Your photos stay on your device — we don't access your existing camera roll."`
  - R@lly Orange primary button: `"Allow Access"` → triggers the native OS permission prompt
  - Ghost secondary button: `"Not Now"`
- If user previously denied → modal explains how to enable in Settings, with an `"Open Settings"` deep-link button
- Web/PWA path skips this entirely (browsers handle downloads without permission)

## Where it goes

| Surface | File | Change |
|---|---|---|
| Photo Feed viewer + grid | `src/components/events/EventPhotoFeed.tsx` | Add Download button in viewer + Select Mode in grid |
| Hero carousel viewer | `src/components/events/RallyHeroMediaCarousel.tsx` | Add Download button (photos only) |
| Download utility | `src/lib/downloadMedia.ts` *(new)* | `downloadPhoto()` + `downloadPhotosBatch()` |
| Permission guard | `src/components/events/PhotoPermissionDialog.tsx` *(new)* | Branded modal |
| Permission helper | `src/lib/photoPermissions.ts` *(new)* | `checkPhotoPermission()`, `requestPhotoPermission()`, `openAppSettings()` |

## Technical implementation

**1. Capacitor plugins to install**

```bash
@capacitor/haptics
@capacitor/filesystem
@capacitor/share
@capacitor/app          # for openAppSettings on Android/iOS
```

We'll use the share sheet as the cross-platform "save to camera roll" path because it's reliable on both iOS and Android without an extra community plugin and exposes the native "Save Image" action. (If we later want true silent save, we can swap in `@capacitor-community/media`.)

**2. `src/lib/downloadMedia.ts`**

```ts
export async function downloadPhoto(url: string, filename?: string): Promise<void>
export async function downloadPhotosBatch(
  items: { url: string; id: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<{ saved: number; failed: number }>
```

- **Native**: fetch URL → blob → base64 → `Filesystem.writeFile` to `Cache` → `Share.share({ files: [uri] })` which surfaces "Save Image" / "Save to Photos"
- **Web/PWA**: fetch → blob → anchor `download` attribute click
- Filename: `rally-{eventIdPrefix}-{photoIdPrefix}.{ext}` (ext parsed from URL)

**3. `src/lib/photoPermissions.ts`**

```ts
export async function checkPhotoPermission(): Promise<'granted' | 'denied' | 'prompt' | 'na'>
export async function requestPhotoPermission(): Promise<'granted' | 'denied'>
export async function openAppSettings(): Promise<void>
```

Returns `'na'` on web (skip the modal entirely). Uses `Filesystem.checkPermissions()` / `requestPermissions()` on native; `App.openUrl({ url: 'app-settings:' })` on iOS and the package-settings intent on Android.

**4. Haptics integration**

Use the existing `useHaptics()` hook. Call:
- `triggerHaptic('light')` on single download success
- `triggerHaptic('success')` on batch completion
- `triggerHaptic('error')` if any save fails
- Respects user's existing haptic settings — already gated through `useHaptics`

**5. `PhotoPermissionDialog.tsx`**

Built on the existing `Dialog` shadcn primitive. R@lly Orange CTA, glass card styling consistent with `PolicyAcceptanceDialog` and other branded modals. Two states:
- `prompt` — first-time ask
- `denied` — settings deep-link variant

Shown via a small wrapper inside `EventPhotoFeed.tsx`:

```ts
const ensurePermission = async () => {
  const status = await checkPhotoPermission();
  if (status === 'na' || status === 'granted') return true;
  setPermissionDialogState(status); // 'prompt' or 'denied'
  return new Promise<boolean>((resolve) => { permissionResolverRef.current = resolve; });
};
```

The dialog calls `requestPhotoPermission()` on Allow, resolves the promise with the result, and closes.

**6. Select Mode UI in `EventPhotoFeed.tsx`**

- New state: `selectMode: boolean`, `selectedIds: Set<string>`
- Header conditionally renders Select toolbar vs default toolbar
- Each grid item shows an animated checkbox overlay when `selectMode` is on
- Tapping a photo in select mode toggles `selectedIds` instead of opening the viewer
- Save flow: `ensurePermission()` → `downloadPhotosBatch()` with progress toast → haptic → exit mode

**7. CORS / Storage**

The `rally-media` bucket is public (uses `getPublicUrl`), so `fetch()` works without preflight changes. No DB / RLS / storage policy work needed.

## Notes

- The user's prompt referenced `PhotoGallery.tsx` / `ExpandedPhoto.tsx` which don't exist — actual surfaces are `EventPhotoFeed.tsx` and `RallyHeroMediaCarousel.tsx`. Both are covered.
- **Hero carousel** gets the single-photo download button only (no batch — it's a curated featured set, batch lives in the grid).
- **Videos** are excluded from download for now (large files, different save semantics). Easy follow-up if you want it.
- Haptics and Permission Guard are **native-only** code paths; the PWA/web build is unaffected and just downloads via anchor.
