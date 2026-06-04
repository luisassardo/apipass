# Changelog

All notable changes to ApiPass. Dates are when the work landed on `main`
(the web build deploys continuously; desktop versions are tagged releases).

## [0.4.0] — unreleased (desktop); live on web

### Added
- **Attachments** — per-entry files (certificates, service-account JSON, keys),
  encrypted inside the vault, 1 MB/file cap; native export on desktop.
- **Settings panel (⚙)** — clipboard auto-clear time, idle auto-lock time,
  lock-on-blur, Argon2id strength (Fast/Balanced/Strong), rotation threshold,
  remembered language. Stored in `localStorage` (never secrets).
- **Change master password** — re-keys the vault (fresh salt, full re-encrypt).
- **Rotation reminders** — ⚠ badge on keys older than a configurable threshold.
- **`.env` import/export.**
- **Master-passphrase generator** (diceware, ~56 bits) + strength meter.
- **Vault overview** — key count, stale count, total attachment size.
- **Keyboard** — `Cmd/Ctrl+L` lock, `/` search, `Esc` close, `Enter` submit.
- **Universal macOS build** (Intel + Apple Silicon).
- **CI** — GitHub Actions build/syntax checks on every push.

### Changed
- Default KDF is now **Argon2id** (was PBKDF2). Old PBKDF2 vaults still open.
- Revealed secrets auto re-mask after 30s.
- `Cache-Control: no-cache` on html/js/css so security updates aren't masked by
  a stale browser cache.

### Fixed
- **Security:** a copied secret was left on the clipboard when locking — the
  pending auto-wipe got cancelled. Lock now wipes the clipboard.

## [0.2.0] — 2026-06-03
- **Argon2id** key derivation replaces PBKDF2 (memory-hard).
- Desktop app signed + notarized (Developer ID), stapled.

## [0.1.0] — 2026-06-02
- First release: encrypted API-key vault, web + signed macOS desktop app.
- AES-256-GCM + PBKDF2, 100% offline, no backend/telemetry/CDN, ES/EN.
- KeePassXC-style copy with auto-clear; idle auto-lock; native file open/save.
