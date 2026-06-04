// Touch ID unlock for macOS (desktop only) — Developer-ID-friendly approach.
//
// macOS's biometric-gated *keychain ACL* (data protection keychain) needs a
// provisioning-profile entitlement a Developer ID app can't carry. So instead:
//   - the master password is stored in the normal login Keychain (via `keyring`),
//   - reads are gated by a Touch ID / login-password prompt (via `robius`).
//
// The OS doesn't ACL-lock the item to biometrics, so the protection is an
// app-level gate, not OS-enforced-at-rest. Honest tradeoff for this distribution
// type; the password is still in the Keychain, never plaintext on disk.
//
// One entry per vault file, keyed by its path. Crypto stays in the webview (JS).

#![cfg(target_os = "macos")]

use keyring::{Entry, Error as KeyringError};
use robius_authentication::{
    AndroidText, BiometricStrength, Context, Policy, PolicyBuilder, Text, WindowsText,
};

const SERVICE: &str = "ApiPass";

fn entry(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account).map_err(|e| e.to_string())
}

/// Store (or replace) the master password for `account` (the vault path).
#[tauri::command]
pub fn biometric_store(account: String, secret: String) -> Result<(), String> {
    entry(&account)?.set_password(&secret).map_err(|e| e.to_string())
}

/// Whether a stored credential exists for `account`. No Touch ID prompt.
#[tauri::command]
pub fn biometric_has(account: String) -> bool {
    matches!(entry(&account), Ok(e) if e.get_password().is_ok())
}

/// Remove the stored credential for `account`.
#[tauri::command]
pub fn biometric_delete(account: String) -> Result<(), String> {
    let e = entry(&account)?;
    match e.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

/// Retrieve the master password for `account`, gated by Touch ID.
/// Returns Err("CANCELLED") if the prompt is dismissed or auth fails.
#[tauri::command]
pub fn biometric_get(account: String, prompt: String) -> Result<String, String> {
    let policy: Policy = PolicyBuilder::new()
        .biometrics(Some(BiometricStrength::Strong))
        .password(true) // allow login-password fallback
        .build()
        .ok_or_else(|| "could not build auth policy".to_string())?;

    let text = Text {
        android: AndroidText { title: "ApiPass", subtitle: None, description: None },
        apple: &prompt, // shown as "ApiPass is trying to <prompt>"
        windows: WindowsText::new("ApiPass", &prompt)
            .ok_or_else(|| "prompt text too long".to_string())?,
    };

    match Context::new(()).blocking_authenticate(text, &policy) {
        Ok(()) => entry(&account)?.get_password().map_err(|e| e.to_string()),
        Err(_) => Err("CANCELLED".into()),
    }
}
