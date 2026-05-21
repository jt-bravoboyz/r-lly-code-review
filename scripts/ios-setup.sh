#!/usr/bin/env bash
# R@lly — one-shot iOS Info.plist permission setup.
# Run AFTER `npx cap add ios`. Idempotent — safe to re-run.
#
# Usage:
#   bash scripts/ios-setup.sh

set -euo pipefail

PLIST="ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "❌ $PLIST not found. Run 'npx cap add ios' first."
  exit 1
fi

if ! command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
  echo "❌ PlistBuddy not available. This script must be run on macOS."
  exit 1
fi

PB=/usr/libexec/PlistBuddy

set_string() {
  local key="$1"
  local value="$2"
  if $PB -c "Print :$key" "$PLIST" >/dev/null 2>&1; then
    $PB -c "Set :$key $value" "$PLIST"
    echo "  ↻  $key"
  else
    $PB -c "Add :$key string $value" "$PLIST"
    echo "  +  $key"
  fi
}

echo "🛠  Patching $PLIST ..."

# Display name — force exact "R@lly" spelling (iOS strips @ in some locales)
set_string "CFBundleDisplayName" "R@lly"

# Location — R@lly Home, ride ETAs, event map
set_string "NSLocationWhenInUseUsageDescription" \
  "R@lly uses your location for live ride ETAs, the event map, and to confirm you made it home safe."
set_string "NSLocationAlwaysAndWhenInUseUsageDescription" \
  "R@lly Home keeps tracking in the background so your squad knows you made it home safe."
set_string "NSLocationAlwaysUsageDescription" \
  "R@lly Home keeps tracking in the background so your squad knows you made it home safe."

# Contacts — invite the squad
set_string "NSContactsUsageDescription" \
  "R@lly uses your contacts so you can invite your squad in seconds."

# Camera + Photos — profile, squad, and R@lly photo gallery
set_string "NSCameraUsageDescription" \
  "R@lly uses the camera for profile pics, squad photos, and shared R@lly galleries."
set_string "NSPhotoLibraryUsageDescription" \
  "R@lly uses your photo library to upload pics to your profile, squad, and R@lly gallery."
set_string "NSPhotoLibraryAddUsageDescription" \
  "R@lly saves shared R@lly photos to your library so you keep the memories."

# Motion — auto-arrival, compass
set_string "NSMotionUsageDescription" \
  "R@lly uses motion data for auto-arrival and the in-app compass."

# Bluetooth — indoor positioning
set_string "NSBluetoothAlwaysUsageDescription" \
  "R@lly uses Bluetooth for indoor positioning when GPS is weak."

echo "✅ Done. Next: npm run build && npx cap sync ios && npx cap open ios"
