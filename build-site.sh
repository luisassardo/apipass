#!/usr/bin/env bash
# Assemble the Cloudflare Pages site:
#   /        → landing page (landing/)
#   /app/    → the ApiPass web app (frontend/)
#   /_headers → strict security headers (CSP) for the whole site
#
# Output goes to dist/ (git-ignored). Deploy with:
#   npx wrangler pages deploy dist --project-name apipass
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST/app"

# Landing page at the root (+ shared ARGUS design assets and vendored fonts)
cp "$ROOT/landing/index.html" "$ROOT/landing/styles.css" "$ROOT/landing/site.js" \
   "$ROOT/landing/node.css" "$ROOT/landing/icons.js" "$ROOT/landing/node.js" "$DIST/"
mkdir -p "$DIST/fonts"
cp "$ROOT/landing/fonts/"*.woff2 "$DIST/fonts/"

# The web app under /app (+ shared ARGUS design assets and vendored fonts)
cp "$ROOT/frontend/index.html" "$ROOT/frontend/app.js" \
   "$ROOT/frontend/crypto.js" "$ROOT/frontend/argon2.js" "$ROOT/frontend/words.js" \
   "$ROOT/frontend/styles.css" \
   "$ROOT/frontend/node.css" "$ROOT/frontend/icons.js" "$ROOT/frontend/node.js" "$DIST/app/"
mkdir -p "$DIST/app/fonts"
cp "$ROOT/frontend/fonts/"*.woff2 "$DIST/app/fonts/"

# Site-wide security headers (strict CSP, connect-src 'none')
cp "$ROOT/frontend/_headers" "$DIST/_headers"

echo "Built site → $DIST"
find "$DIST" -type f | sed "s|$DIST/|  |" | sort
