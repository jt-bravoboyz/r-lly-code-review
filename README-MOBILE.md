# R@lly — iOS / Xcode Build Guide

This project is already wired for Capacitor. Follow these steps on a **Mac with Xcode 15+** to get R@lly running on a real iPhone, TestFlight, or the App Store.

## Prerequisites
- macOS with **Xcode 15+** (Mac App Store)
- **Node.js 20+** and **npm**
- **CocoaPods** — `sudo gem install cocoapods` if missing
- **Apple Developer account** (free works for personal device install; $99/yr for TestFlight / App Store)

## One-time setup

```bash
# 1. Clone the GitHub repo Lovable pushes to
git clone https://github.com/<you>/<repo>.git rally
cd rally
npm install

# 2. Add the native iOS platform
npx cap add ios
npx cap update ios

# 3. Pre-fill iOS permission strings (required, see below)
bash scripts/ios-setup.sh

# 4. Build the web app and sync into the native shell
npm run build
npx cap sync ios

# 5. Open Xcode
npx cap open ios
```

In Xcode: select the **App** target → **Signing & Capabilities** → pick your **Team**, plug in an iPhone (or pick a simulator), hit ▶︎ **Run**.

## Every time you pull new changes from Lovable

```bash
git pull
npm install               # only if package.json changed
npm run build
npx cap sync ios
```

No need to re-run `cap add` or touch Xcode unless you change native config.

## Dev vs Production build

`capacitor.config.ts` automatically picks the right mode:

| Command | Behavior |
|---|---|
| `npm run build` | Self-contained native app. Use for App Store / TestFlight. |
| `npm run build:dev` | Keeps live hot-reload from the Lovable sandbox while you iterate. |

## iOS Permissions

R@lly needs the permission strings below or the app will **crash** the first time the feature is used. The `scripts/ios-setup.sh` script writes them for you.

| Info.plist key | Why R@lly needs it |
|---|---|
| `NSLocationWhenInUseUsageDescription` | R@lly Home tracking, live ride ETAs, event map |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Background safety tracking on the way home |
| `NSContactsUsageDescription` | Invite squad from your contacts |
| `NSCameraUsageDescription` | Profile + squad photos, R@lly photo gallery |
| `NSPhotoLibraryUsageDescription` | Upload R@lly photos |
| `NSPhotoLibraryAddUsageDescription` | Save R@lly photos to your library |
| `NSMotionUsageDescription` | Auto-arrival + compass |
| `NSBluetoothAlwaysUsageDescription` | Indoor positioning |

## Shipping to TestFlight / App Store

1. In Xcode: **Product → Archive → Distribute App**.
2. Create a matching app record at https://appstoreconnect.apple.com using bundle ID `app.lovable.30a08aa7cdeb4250a60c0605f836113c` (or rename to your own e.g. `com.rally.app` in Xcode first).
3. Upload, then add testers in TestFlight.

## Heads up on the `@` in "R@lly"
iOS strips `@` from the home-screen label in some locales. To force the exact spelling, set **`CFBundleDisplayName` = `R@lly`** in `ios/App/App/Info.plist` (the setup script does this).

---
Full Lovable mobile guide: https://lovable.dev/blog/mobile-development
