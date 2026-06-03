# Deploying ApiPass

Two artifacts ship from this repo:

1. **Desktop app** → GitHub Releases (signed + notarized `.dmg`).
2. **Landing + web app** → Cloudflare Pages at **apipass.c-lab.tools**.

---

## Cloudflare Pages (landing + web app)

The site is git-connected: every push to `main` rebuilds and redeploys automatically.

### One-time setup (Cloudflare dashboard)

**Workers & Pages → Create → Pages → Connect to Git → `luisassardo/apipass`**, then:

| Setting | Value |
|---|---|
| Project name | `apipass` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `bash build-site.sh` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

`build-site.sh` assembles `dist/`:
- `/` → landing page (`landing/`)
- `/app/` → the web app (`frontend/`)
- `/_headers` → strict CSP (`connect-src 'none'`)

### Custom domain

Project → **Custom domains → Set up a custom domain** → `apipass.c-lab.tools`.
If `c-lab.tools` is a zone in the same Cloudflare account, the CNAME + SSL are created
automatically. If not, add a CNAME `apipass` → `apipass.pages.dev` in that DNS.

### Local preview / manual deploy

```bash
./build-site.sh                 # assemble dist/
python3 -m http.server 8124 --directory dist   # preview at localhost:8124
# manual deploy (needs a wrangler login with Pages:Edit on the account):
npx wrangler pages deploy dist --project-name apipass --branch main
```

---

## GitHub Release (desktop `.dmg`)

Prereqs: Developer ID cert installed; app-specific password.

```bash
export APPLE_ID="…@…"; export APPLE_PASSWORD="app-specific-pw"; export APPLE_TEAM_ID="LWSXUT3Y4S"
npx tauri build                 # sign + notarize + staple → ApiPass_X.Y.Z_aarch64.dmg

# stage assets (versioned + stable alias + checksums)
DMG=src-tauri/target/release/bundle/dmg/ApiPass_X.Y.Z_aarch64.dmg
cp "$DMG" ApiPass-macOS-arm64.dmg          # stable name for landing download button
shasum -a 256 ApiPass_*.dmg ApiPass-macOS-arm64.dmg > SHA256SUMS.txt

gh release create vX.Y.Z --title "ApiPass vX.Y.Z" --notes-file notes.md \
  "$DMG" ApiPass-macOS-arm64.dmg SHA256SUMS.txt
```

The landing "Download" button points at the stable alias:
`https://github.com/luisassardo/apipass/releases/latest/download/ApiPass-macOS-arm64.dmg`

> Apple's notary upload can fail with transient `NWError 54 (connection reset)`. Just retry —
> it succeeds within a couple of attempts. Same for `gh release upload` on flaky networks.
