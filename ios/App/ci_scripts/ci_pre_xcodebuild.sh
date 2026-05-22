#!/bin/sh
# Xcode Cloud pre-build script
# Runs before every Xcode Cloud build to install dependencies

set -e

echo "=== Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "=== Building web assets ==="
npm run build

echo "=== Syncing Capacitor ==="
npx cap sync ios

echo "=== Installing CocoaPods ==="
cd ios/App
pod install --repo-update

echo "=== Pre-build complete ==="
