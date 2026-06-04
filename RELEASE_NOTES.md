**ApiPass v0.5.0 — new ARGUS design.**

ApiPass now wears the shared **ARGUS / C-LAB** design: a tactical dark theme with Space Grotesk + IBM Plex Mono, matching [hashcheck.c-lab.tools](https://hashcheck.c-lab.tools) and [apipass.c-lab.tools](https://apipass.c-lab.tools). Same vault, same crypto, new look.

Universal build: runs natively on **Intel and Apple Silicon** Macs. Signed + notarized by Apple, opens with no warning. Or use it in the browser at **https://apipass.c-lab.tools**.

### New
- **Redesigned interface** — the ARGUS node design system: dark tactical theme, corner chrome, live UTC clock, vendored fonts (no CDN, fully offline).
- **Two-column lock screen** — the ApiPass identity beside the unlock / create panel, so the vault controls stay on the first screen. Collapses cleanly on small windows and phones (tool first).
- Fonts and styles are served from the app itself; nothing loads from the network.

### Unchanged
- AES-256-GCM with an Argon2id-derived key. Old vaults open as before.
- Touch ID unlock, attachments, settings, `.env` import/export, rotation reminders, clipboard auto-clear, idle auto-lock.
- 100% offline. No server, no telemetry, no cloud.

### Verify your download
```
shasum -a 256 ApiPass-macOS.dmg
```
Compare against `SHA256SUMS.txt`.

### What it does NOT protect against
A compromised device (malware, keylogger, malicious extension) can read keys while the vault is open. ApiPass protects keys at rest in the file, not a compromised endpoint.
