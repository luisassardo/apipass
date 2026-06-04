# api-pass — plan & threat model

A client-side, offline, encrypted vault for **API keys**, aimed at journalists and
human-rights defenders. Part of the [`tools-cybersecurity`](../CONVENTIONS.md) portfolio.

Inspired by KeePassXC, but specialized: API keys are consumed differently from
login passwords (per-project, per-environment, rotated, copy-pasted into configs
and dashboards), so the UX is built around *organize → unlock → find → copy safely*.

> Status: **v0.1 scaffold**. Reservado por default — not published until Luis decides.

---

## Audience & access decision

- **Primary user:** journalists / HRDs, not necessarily developers.
- **Access mode:** unlock the vault, search, **copy to clipboard** (auto-clearing).
  No shell/CI env injection in v0.1 — that's a CLI concern for a possible future
  sibling tool, kept out of scope here.

## Hard rules inherited from the portfolio

1. **No backend, no network, no telemetry, no external CDN.** 100% static, auditable.
   Enforced by CSP `connect-src 'none'`.
2. **The encrypted vault file is the privacy boundary** (web analogue of the USB rule).
   The app never stores or transmits it — the user holds the file and loads it to unlock.
3. **Honest about what we protect.** We protect keys *at rest in the vault file*. We do
   **not** protect against a compromised device, malicious browser extension, or keylogger.
   The UI says so plainly.
4. **Don't roll our own crypto primitives.** AES-GCM + a standard KDF via WebCrypto.

## Threat model (stated honestly in-app)

| Threat | Covered? | Notes |
|---|---|---|
| Vault file stolen at rest | ✅ | AES-256-GCM, key derived from master password via PBKDF2 (Argon2id in v0.2). |
| Vault file tampered | ✅ | GCM auth tag fails → decrypt rejected. |
| Weak master password / offline brute force | ⚠️ partial | KDF cost slows it; a weak password is still weak. Strength meter + guidance. |
| Compromised endpoint (malware, keylogger, evil extension) | ❌ | Out of scope — no web app can protect a compromised device. Stated in UI. |
| Clipboard scraping by other apps | ⚠️ mitigated | Copy auto-clears after a timeout; user warned. |
| Keys lingering in memory while unlocked | ⚠️ mitigated | Auto-lock on idle + tab blur; explicit Lock button. |
| Shoulder surfing | ⚠️ mitigated | Secrets masked by default, reveal is per-entry and momentary. |

## Crypto

Vault file is a single JSON **envelope** — versioned so the KDF can be upgraded
without breaking old vaults:

```json
{
  "format": "api-pass-vault",
  "version": 2,
  "kdf":    { "algo": "argon2id", "m": 65536, "t": 2, "p": 1, "salt": "<base64>" },
  "cipher": { "algo": "AES-256-GCM", "iv": "<base64>" },
  "ciphertext": "<base64>"
}
```

> Version 1 vaults (`kdf.algo: "PBKDF2-SHA256"`, 600k iters) still decrypt.

Plaintext (encrypted as the `ciphertext`) is the vault object:

```json
{
  "meta": { "app": "api-pass", "v": 1, "created": "<iso>", "modified": "<iso>" },
  "entries": [
    { "id", "service", "label", "secret", "env", "project", "notes",
      "created", "rotated" }
  ]
}
```

- **KDF (v0.2, current): Argon2id**, `m=65536` KiB (64 MiB), `t=2`, `p=1`, 32-byte key.
  Memory-hard → far stronger than PBKDF2 if a vault file is stolen. Vendored pure-JS from
  `@noble/hashes` (audited), bundled to `frontend/argon2.js` (~13 KB, no WASM, no CDN, no
  CSP change). ~1s per unlock in-browser. Params stored per-vault so they can be tuned
  later without breaking files.
  - **Backward compatibility:** vaults written with the old `kdf.algo == "PBKDF2-SHA256"`
    (version 1, 600k iters) still decrypt. New vaults are version 2 / Argon2id.
- **Cipher:** AES-256-GCM, fresh 12-byte IV per save, 16-byte auth tag.
- **Randomness:** `crypto.getRandomValues` for salt and IV.
- **Password strength meter** on vault creation: heuristic estimate (pool size + length,
  penalties for low diversity / repeats / common patterns) → Weak/Fair/Good/Strong.

## Entry model (API-key shaped, not password shaped)

| Field | Purpose |
|---|---|
| `service` | e.g. OpenAI, Stripe, AWS |
| `label` | human name to disambiguate multiple keys for one service |
| `secret` | the key/token (or several lines: key + secret pair) |
| `env` | dev / staging / prod |
| `project` | client / project tag for filtering |
| `notes` | scopes, rotation policy, where it's used |
| `created`, `rotated` | dates — surfaces stale keys for rotation |
| `attachments` | companion files (certs, service-account JSON, keys): `[{id,name,type,size,data(base64)}]`, encrypted in-vault, 1 MB/file cap. Export writes plaintext to disk (UI warns). |

## UX

- **Lock screen:** *Create new vault* or *Open vault file* → master password.
- **Unlocked:** searchable list (by service / project / env), masked secrets,
  per-entry reveal + copy (auto-clear), add / edit / delete.
- **Save:** re-encrypts and downloads the `.apikeys` file (the user replaces their copy).
- **Auto-lock:** idle timeout + on tab blur; explicit Lock button.
- **Bilingual:** ES / EN (matches hash-checker).

## File layout

```
api-pass/
  index.html      # structure + i18n hooks
  styles.css      # portfolio dark theme (shared look & feel)
  crypto.js       # envelope encrypt/decrypt, KDF, base64 helpers
  app.js          # vault state, UI, search, copy/auto-clear, auto-lock, i18n
  _headers        # CSP / security headers for Cloudflare Pages
  .gitignore
  LICENSE         # MIT
  README.md
  PLAN.md         # this file
```

## Roadmap

- **v0.1** — encrypted vault, CRUD, search, copy/auto-clear, auto-lock, ES/EN. *(this scaffold)*
- **v0.2** — Argon2id KDF (vendored WASM); password strength meter; import from `.env`.
- **v0.3** — optional KeePass KDBX interop via `kdbxweb` (open the same vault in KeePassXC).
- **future** — optional CLI sibling (`apikey run -- cmd`) for the developer audience,
  sharing the same vault format. Separate tool, separate decision.

## Open decisions

- KDF for v0.1 ships as PBKDF2 (above). Argon2id is the planned v0.2 hardening — confirm
  before promoting to default.
- Deploy target: open `index.html` locally and/or Cloudflare Pages (like hash-checker).
