# api-pass — desktop app (Tauri 2.x) scoping

Goal: ship api-pass as a real, signed desktop app (KeePassXC-style) **without rewriting**.
We wrap the existing `index.html` / `app.js` / `styles.css` / `crypto.js` frontend in a
[Tauri 2.x](https://v2.tauri.app/) shell — a thin Rust process hosting the OS-native
webview (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux).

> Decided 2026-06-02: **Tauri 2.x**. Crypto placement (JS vs Rust) deferred — see §6.

---

## 1. Strategy: one frontend, two distributions

The same HTML/JS/CSS powers both targets. Nothing forks.

```
                ┌─────────────────────────┐
   frontend/    │ index.html app.js        │  ← single source of truth
   (shared)     │ styles.css crypto.js     │
                └───────────┬─────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                                 ▼
   Cloudflare Pages                   Tauri desktop app
   (static web, as today)             (macOS / Win / Linux)
   - download-to-save                 - real in-place file save
   - WebCrypto + PBKDF2               - native FS, optional Rust crypto
```

So the web version on Cloudflare Pages keeps working exactly as it does now; the desktop
app is an *additive* target that gains native powers (§5).

## 2. Proposed repo layout

Keep the current static files as the shared frontend; add a Tauri project beside them.

```
api-pass/
  frontend/              # ← move the existing static files here (the shared UI)
    index.html
    app.js
    crypto.js            # stays for web; app may bypass it (see §6)
    styles.css
    _headers             # web-only (Cloudflare)
  src-tauri/             # ← new: the native shell
    tauri.conf.json      # app metadata, window, bundle, signing config
    Cargo.toml           # Rust deps (tauri, and argon2/aes-gcm if crypto moves to Rust)
    src/
      main.rs            # Tauri entrypoint + #[command] handlers (open/save/crypto)
      vault.rs           # (if native crypto) Argon2id + AES-GCM, .apikeys I/O
    icons/               # generated app icons
    capabilities/        # Tauri v2 permission scopes (fs, dialog, clipboard)
  PLAN.md  README.md  DESKTOP.md  LICENSE  .gitignore
```

> Migration is a `git mv` of the four static files into `frontend/`. The web deploy
> just points at `frontend/` instead of the folder root. No code changes required.

## 3. Toolchain / setup (this machine)

Already present: Node 25.9, npm 11.12, Homebrew 5.1, Xcode **Command Line Tools**.

To add:

```bash
# Rust (rustup is the recommended installer; brew also works)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Tauri CLI (project-local dev dependency)
cd api-pass && npm init -y && npm install --save-dev @tauri-apps/cli@^2
# Scaffold src-tauri pointing at the existing frontend
npx tauri init        # set frontendDist = "../frontend", devUrl = http://localhost:8123
```

Dev loop: `npx tauri dev` (hot-reloads the webview). Build: `npx tauri build`.

⚠️ **Notarization** (§4) uses `xcrun notarytool`, historically bundled with **full Xcode**.
CLT alone gives `codesign` (signing) but may not give `notarytool` — verify, and install
full Xcode from the App Store if missing. Building/signing works on CLT; only the notarize
step is in question.

## 4. Platform + signing matrix

Your Apple Developer ID covers **macOS only**. The other OSes are independent.

| OS | Bundle | Signing | Your situation |
|---|---|---|---|
| **macOS** | `.dmg` / `.app` | Developer ID Application cert + **notarization** (outside App Store) | ✅ Covered by your Apple Dev ID. No "unidentified developer" warning once notarized. |
| **Windows** | `.msi` / `.exe` | Authenticode code-signing cert (separate vendor, ~$100–400/yr) | ❌ Not covered by Apple ID. Unsigned → SmartScreen warning. Optional for v0.1. |
| **Linux** | `.AppImage` / `.deb` | Usually unsigned (normal); optional GPG/repo signing | Ship unsigned AppImage; document checksum verification (ties to your hash-checker tool). |

macOS signing config goes in `src-tauri/tauri.conf.json` (`bundle.macOS.signingIdentity`)
plus notarization env vars passed to `tauri build`. Never commit those — use a local
`.env` / keychain.

### Verified on this machine (2026-06-02)

- ✅ `notarytool` **is** present in the Command Line Tools (v1.1.2) — **full Xcode not
  required** after all. `codesign` present too.
- ⚠️ `security find-identity -v -p codesigning` → **0 valid identities**. The Apple
  Developer *account* is active, but the **"Developer ID Application"** certificate is not
  yet installed in the login keychain. That is the one remaining prerequisite to sign.

### Concrete signing recipe (when ready)

1. In the Apple Developer portal, create a **Developer ID Application** certificate, download
   it, and double-click to install into the login keychain. Confirm:
   `security find-identity -v -p codesigning` now lists `Developer ID Application: Luis … (TEAMID)`.
2. Create an app-specific password (appleid.apple.com → Sign-In & Security) for notarization.
3. Add to `src-tauri/tauri.conf.json` under `bundle`:
   ```json
   "macOS": {
     "signingIdentity": "Developer ID Application: Luis Assardo (TEAMID)",
     "hardenedRuntime": true
   }
   ```
4. Export notarization creds in a local (git-ignored) `.env`, then build:
   ```bash
   export APPLE_ID="you@example.com"
   export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"   # app-specific password
   export APPLE_TEAM_ID="TEAMID"
   npx tauri build            # signs, notarizes, and staples automatically
   ```
   Tauri runs `notarytool submit --wait` then `stapler staple` on the `.app`/`.dmg`.

**Recommendation:** macOS-first for v0.1 (you can sign+notarize today once the cert is
installed). Add Windows/Linux bundles in CI once the app stabilizes; defer the Windows cert
until there's demand.

## 5. What the app version gains over the web version

| Capability | Web (today) | Tauri app | Needs Rust crypto? |
|---|---|---|---|
| Open/save the actual `.apikeys` file in place | ❌ download a new copy | ✅ native FS dialog + write-back | No (FS only) |
| Argon2id KDF without a WASM blob | ⚠️ needs vendored WASM | ✅ Rust `argon2` crate | **Yes** |
| Touch ID / biometric unlock | ❌ | ✅ via macOS LocalAuthentication | Yes (key handling in Rust) |
| OS keychain / Secure Enclave for the vault key | ❌ | ✅ | Yes |
| Auto-lock on system sleep/lock | ⚠️ only tab-blur/idle | ✅ OS power events | No (event only) |
| Trusted signature (no scare screen) | n/a | ✅ notarized | No |
| Auto-update | manual reload | ✅ Tauri updater (signed) | No |

The first row (real file save) and the signature are reason enough on their own. The rows
marked "needs Rust crypto" depend on the §6 decision.

## 6. The deferred decision — where crypto lives

Both keep the **same `.apikeys` envelope format**, so vaults stay interchangeable between
web and app regardless.

- **Option L — Light wrap.** ✅ **Implemented in desktop v0.1.** `crypto.js` (WebCrypto +
  PBKDF2) runs in the webview; Rust only does file open/save (`read_vault`/`write_vault`
  commands + dialog plugin). `app.js` detects `window.__TAURI__` and routes open/save
  natively, else falls back to the web download. Biometric/keychain not available yet (key
  never leaves JS).
- **Option R — Native crypto.** Move encrypt/decrypt + KDF into Rust (`argon2`, `aes-gcm`
  audited crates); JS sends plaintext-to-seal / receives decrypted entries over Tauri
  `#[command]` calls. *Unlocks Argon2id, biometric, keychain.* More work; the master key
  lives in Rust memory, not JS — a security plus.

**Leaning:** start **Option L** to get a signed, working app fast (proves the pipeline,
the real file-save UX, notarization), then graduate to **Option R** as "v0.2 desktop" when
adding Argon2id + Touch ID. The shared file format makes that a non-breaking internal change.

## 7. Roadmap

- **desktop v0.1** — ✅ Tauri shell, shared frontend, native open/save (Option L).
  ✅ **Signed + notarized**: Developer ID Application "Luis Assardo (LWSXUT3Y4S)",
  hardened runtime, `spctl` → `accepted / Notarized Developer ID`, ticket stapled to `.app`
  (and `.dmg`). Build with `APPLE_ID` / `APPLE_PASSWORD` (app-specific) / `APPLE_TEAM_ID`
  env vars + `npx tauri build`. ⏳ Remaining: GUI smoke test (`npx tauri dev`); auto-lock on
  system sleep.
- **desktop v0.2** — Option R: Argon2id + AES-GCM in Rust; Touch ID unlock; keychain option.
- **desktop v0.3** — Windows + Linux bundles in CI; Tauri signed auto-updater.

## 8. Open questions before scaffolding

1. Install Rust now (rustup) so we can scaffold + run `tauri dev`? (~few hundred MB toolchain.)
2. macOS-only for v0.1, or wire all three bundles from the start?
3. Confirm Option L (light wrap) for the first desktop build, native crypto deferred to v0.2.
