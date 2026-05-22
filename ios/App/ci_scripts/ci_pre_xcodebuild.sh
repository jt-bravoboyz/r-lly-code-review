#!/bin/sh
# Xcode Cloud pre-build script
set -e

echo "=== Setting up Homebrew PATH ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_ENV_HINTS=1

if [ -f /opt/homebrew/bin/brew ]; then
  export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
elif [ -f /usr/local/bin/brew ]; then
  export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
else
  echo "ERROR: Homebrew not found"
  exit 1
fi

echo "=== Installing Node.js 22 ==="
brew install node@22
export PATH="/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:$PATH"

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

echo "=== Installing npm dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

echo "=== Building web assets ==="
npm run build

echo "=== Copying web assets to iOS ==="
npx cap copy ios

echo "=== Installing CocoaPods dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install --repo-update

echo "=== Pre-build complete ==="
