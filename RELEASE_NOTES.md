**ApiPass v0.4.0 — attachments, settings, and a hardening pass.**

Universal build: runs natively on **Intel and Apple Silicon** Macs. Signed + notarized by Apple — opens with no warning. Or use it in the browser at **https://apipass.c-lab.tools**.

### New
- **Touch ID unlock** — unlock a vault with Touch ID (the master password is kept in the macOS Keychain, gated by Touch ID; login-password fallback). Per-vault, enabled in Settings.
- **Attachments** — keep certificates, service-account JSON and key files with each entry, encrypted inside the vault (1 MB/file).
- **Settings (⚙)** — clipboard auto-clear time, idle auto-lock, encryption strength (Argon2id Fast/Balanced/Strong), rotation threshold, language.
- **Change master password** — re-keys the whole vault.
- **Rotation reminders** — flags keys you haven't rotated in a while.
- **`.env` import/export**, **passphrase generator**, **password-strength meter**.
- **Keyboard:** `⌘/Ctrl+L` lock · `/` search · `Esc` close.
- Refreshed visual design with subtle, accessible motion.

### Hardened
- Argon2id key derivation (old PBKDF2 vaults still open).
- Clipboard is wiped when you lock; revealed secrets auto re-mask after 30s.

### Verify your download
```
shasum -a 256 ApiPass-macOS.dmg
```
Compare against `SHA256SUMS.txt`.

### What it does NOT protect against
A compromised device (malware, keylogger, malicious extension) can read keys while the vault is open. ApiPass protects keys at rest in the file, not a compromised endpoint.
