#!/bin/sh
# Xcode Cloud pre-build script
set -e

echo "=== Setting up Homebrew PATH ==="
export PATH="/opt/homebrew/bin:$PATH"

echo "=== Installing Node.js ==="
brew install node@20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

echo "=== Node/npm versions ==="
node --version
npm --version

echo "=== Installing npm dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "=== Building web assets ==="
npm run build

echo "=== Copying web assets to iOS ==="
npx cap copy ios

echo "=== Installing CocoaPods dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install

echo "=== Pre-build complete ==="
