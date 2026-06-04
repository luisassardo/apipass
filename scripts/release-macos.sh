#!/usr/bin/env bash
# Build → sign → notarize → publish a universal macOS release of ApiPass.
#
# Usage (the app-specific password never gets committed — it lives in your env):
#   APPLE_ID="luisassardo@me.com" \
#   APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
#   APPLE_TEAM_ID="LWSXUT3Y4S" \
#   bash scripts/release-macos.sh
#
# Version is read from package.json. Release notes come from RELEASE_NOTES.md.
set -euo pipefail

: "${APPLE_ID:?set APPLE_ID (your Apple Developer email)}"
: "${APPLE_PASSWORD:?set APPLE_PASSWORD (app-specific password, not your real one)}"
: "${APPLE_TEAM_ID:?set APPLE_TEAM_ID (e.g. LWSXUT3Y4S)}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

REPO="luisassardo/apipass"
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
DMG="src-tauri/target/universal-apple-darwin/release/bundle/dmg/ApiPass_${VERSION}_universal.dmg"

echo "==> ApiPass ${TAG} — universal release"
rustup target add x86_64-apple-darwin aarch64-apple-darwin >/dev/null 2>&1 || true

echo "==> Building + signing + notarizing the universal app…"
npx tauri build --target universal-apple-darwin   # APPLE_* env → tauri notarizes + staples the .app

echo "==> Notarizing + stapling the .dmg (retries for flaky uploads)…"
# Note: capture to a file then grep it — piping notarytool into `grep -q` under
# `set -o pipefail` misreads success as failure (grep closes the pipe early →
# SIGPIPE → non-zero pipeline status even though the status WAS Accepted).
ok=0
for a in 1 2 3 4 5; do
  xcrun notarytool submit "$DMG" \
    --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" \
    --wait > /tmp/apipass-notary.log 2>&1 || true
  if grep -q "status: Accepted" /tmp/apipass-notary.log; then ok=1; break; fi
  echo "   notary retry ${a}…"; sleep 4
done
[ "$ok" = 1 ] || { echo "Notarization failed after retries — see /tmp/apipass-notary.log"; exit 1; }
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"
spctl -a -t open --context context:primary-signature -vv "$DMG"

echo "==> Staging assets + checksums…"
REL="$(mktemp -d)"
cp "$DMG" "$REL/ApiPass_${VERSION}_universal.dmg"
cp "$DMG" "$REL/ApiPass-macOS.dmg"               # stable arch-neutral name the landing button uses
( cd "$REL" && shasum -a 256 ApiPass_${VERSION}_universal.dmg ApiPass-macOS.dmg > SHA256SUMS.txt )

echo "==> Publishing GitHub release ${TAG}…"
gh release create "$TAG" --repo "$REPO" --title "ApiPass ${VERSION}" --notes-file RELEASE_NOTES.md \
  "$REL/ApiPass_${VERSION}_universal.dmg" "$REL/ApiPass-macOS.dmg" "$REL/SHA256SUMS.txt"

echo "==> Done. Verifying the live download resolves to ${TAG}:"
curl -sIL -o /dev/null -w "   latest download: HTTP %{http_code}\n" \
  "https://github.com/${REPO}/releases/latest/download/ApiPass-macOS.dmg"
echo "✅ Released ${TAG}."
