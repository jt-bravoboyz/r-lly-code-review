

# App Icon — iOS Native Match

## Current State
Your PWA icons (manifest, favicon, apple-touch-icon) are already updated with the correct files. The `logo.svg`, `rally-icon-192.png`, and `rally-icon-1024.png` were replaced in previous messages and all references in `manifest.json` and `index.html` point to them correctly.

## What This Covers

### For PWA (Add to Home Screen)
Already done — no changes needed. The manifest icons and apple-touch-icon already use your uploaded assets.

### For Native iOS (Capacitor/Xcode)
If you're building a native iOS app via Capacitor, the home screen icon is NOT controlled by the manifest — it's set in the Xcode asset catalog (`ios/App/App/Assets.xcassets/AppIcon.appiconset/`). This requires:

1. **Generating the required icon sizes** from your uploaded PNG (1024x1024 source):
   - 1024x1024 (App Store)
   - 180x180 (iPhone @3x)
   - 120x120 (iPhone @2x)
   - 167x167 (iPad Pro @2x)
   - 152x152 (iPad @2x)
   - 76x76 (iPad @1x)
   - 40x40, 60x60, 58x58, 80x80, 87x87, 120x120 (Spotlight, Settings)

2. **Replacing all icons** in the Xcode asset catalog after running `npx cap add ios` / `npx cap sync`

### Recommended Approach
Since Capacitor native builds happen on your local machine (not in Lovable's environment), the steps are:

1. Export your project to GitHub and pull locally
2. Use a tool like [appicon.co](https://appicon.co) — upload the `rally-icon-1024.png` and it generates all required iOS sizes as an `AppIcon.appiconset` folder
3. Replace the contents of `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with the generated files
4. Run `npx cap sync ios` then `npx cap run ios`

## What I Can Do Now
No code changes are needed — all web-layer icon references are already correct. The native iOS icon replacement is a local build step on your machine.

## Files
No files to change.

