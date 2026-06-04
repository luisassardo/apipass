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

# Landing page at the root
cp "$ROOT/landing/index.html" "$ROOT/landing/styles.css" "$ROOT/landing/site.js" "$DIST/"

# The web app under /app
cp "$ROOT/frontend/index.html" "$ROOT/frontend/app.js" \
   "$ROOT/frontend/crypto.js" "$ROOT/frontend/argon2.js" "$ROOT/frontend/words.js" \
   "$ROOT/frontend/styles.css" "$DIST/app/"

# Site-wide security headers (strict CSP, connect-src 'none')
cp "$ROOT/frontend/_headers" "$DIST/_headers"

echo "Built site → $DIST"
find "$DIST" -type f | sed "s|$DIST/|  |" | sort
