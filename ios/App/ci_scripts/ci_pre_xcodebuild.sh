#!/bin/sh
# Xcode Cloud pre-build script
set -e

echo "=== Environment Info ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "PWD: $PWD"
sw_vers
uname -m

echo "=== Setting up Homebrew PATH ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
if [ -f /opt/homebrew/bin/brew ]; then
  export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
  echo "Homebrew found at /opt/homebrew"
elif [ -f /usr/local/bin/brew ]; then
  export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
  echo "Homebrew found at /usr/local"
else
  echo "ERROR: Homebrew not found"
  exit 1
fi

echo "=== Installing Node.js ==="
if command -v node &>/dev/null; then
  echo "Node already installed: $(node --version)"
else
  brew install node@20
  export PATH="/opt/homebrew/opt/node@20/bin:/usr/local/opt/node@20/bin:$PATH"
fi
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
