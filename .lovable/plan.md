# Export R@lly to Xcode (iOS)

Good news: your project is **already wired for Capacitor** (`capacitor.config.ts` present, `@capacitor/ios` installed, appId `app.lovable.30a08aa7cdeb4250a60c0605f836113c`, appName `R@lly`). No code changes are needed — this is a one-time setup you run on your Mac.

## What you'll need
- A **Mac** with **Xcode 15+** installed (from the Mac App Store)
- **Node.js 20+** and **npm**
- **CocoaPods** (`sudo gem install cocoapods` if missing)
- An **Apple Developer account** (free is fine to test on your own device; $99/yr to ship to TestFlight / App Store)

## Step 1 — Get the code out of Lovable
1. In Lovable, top-right **GitHub → Connect to GitHub**, then **Create Repository**.
2. On your Mac:
   ```bash
   git clone https://github.com/<you>/<repo>.git rally
   cd rally
   npm install
   ```

## Step 2 — Add the iOS platform
```bash
npx cap add ios
npx cap update ios
```
This creates an `ios/` folder containing the native Xcode project.

## Step 3 — Build the web app + sync to native
```bash
npm run build
npx cap sync ios
```
Run `npm run build && npx cap sync ios` again **any time you pull new changes** from Lovable.

## Step 4 — Open in Xcode
```bash
npx cap open ios
```
This opens `ios/App/App.xcworkspace` in Xcode. From there:
- Select the **App** target → **Signing & Capabilities** → pick your **Team**.
- Plug in an iPhone (or pick a simulator) at the top, hit ▶︎ **Run**.

## Step 5 — iOS permissions (required for R@lly features)
Open `ios/App/App/Info.plist` in Xcode and add usage strings — iOS will crash without these the first time the feature is hit:

| Key | Why R@lly needs it |
|---|---|
| `NSLocationWhenInUseUsageDescription` | R@lly Home tracking, live ride ETAs, event map |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Background safety tracking on the way home |
| `NSContactsUsageDescription` | Invite squad from your contacts |
| `NSCameraUsageDescription` | Profile + squad photos, R@lly photo gallery |
| `NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription` | Upload + save R@lly photos |
| `NSMotionUsageDescription` | Auto-arrival / compass features |
| `NSBluetoothAlwaysUsageDescription` | Indoor positioning |

Suggested copy: *"R@lly uses your location to keep your squad safe and confirm everyone made it home."*

## Step 6 — Turn OFF the Lovable dev server for shipping builds
Your `capacitor.config.ts` already does this automatically — the `server.url` pointing back at the Lovable sandbox is only included when `NODE_ENV !== 'production'`. So:
- `npm run build` → ships a self-contained native app (correct for App Store / TestFlight).
- `npm run build:dev` → keeps live hot-reload from Lovable (handy while developing).

## Step 7 — Ship it
- **Test on your iPhone:** plug in, trust the cert in **Settings → General → VPN & Device Management**, hit Run.
- **TestFlight / App Store:** in Xcode, **Product → Archive → Distribute App**. You'll need an App Store Connect record at appstoreconnect.apple.com matching bundle ID `app.lovable.30a08aa7cdeb4250a60c0605f836113c` (you can rename this to your own bundle ID before archiving if you prefer, e.g. `com.rally.app`).

## One thing to flag
The Lovable preview keeps `R@lly` as the appName, but **iOS strips the `@`** from the home-screen label in some locales. If you want the home-screen icon to read exactly "R@lly", set the **CFBundleDisplayName** in `Info.plist` to `R@lly` explicitly.

## Reference
Full Lovable mobile guide: https://lovable.dev/blog/mobile-development

---

Want me to (after you approve this plan and switch to Build):
1. Add a `README-MOBILE.md` to the repo with these exact commands so it's checked into source, **and/or**
2. Pre-fill the iOS `Info.plist` permission strings via a small `scripts/ios-setup.sh` so you don't have to edit them by hand in Xcode?
