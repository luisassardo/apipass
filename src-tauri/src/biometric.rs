// Touch ID / biometric unlock for macOS (desktop only).
//
// The vault's master password is stored in the macOS Keychain under an access
// control that requires user presence (Touch ID, or the login password as the
// OS-enforced fallback) to READ. The item is device-only and never syncs.
// Each vault file gets its own entry, keyed by its path.
//
// Crypto stays in the webview (JS); this module only guards the stored password.

#![cfg(target_os = "macos")]

use core_foundation::base::{CFType, TCFType, CFTypeRef};
use core_foundation::boolean::CFBoolean;
use core_foundation::data::CFData;
use core_foundation::dictionary::CFDictionary;
use core_foundation::string::{CFString, CFStringRef};
use std::os::raw::c_void;
use std::ptr;

type SecAccessControlRef = *const c_void;
type CFErrorRef = *const c_void;
type CFAllocatorRef = *const c_void;
type OSStatus = i32;
type CFOptionFlags = usize;

const SERVICE: &str = "ApiPass";
const K_SEC_ACCESS_CONTROL_USER_PRESENCE: CFOptionFlags = 1 << 0; // Touch ID or passcode
const ERR_SEC_SUCCESS: OSStatus = 0;
const ERR_SEC_ITEM_NOT_FOUND: OSStatus = -25300;
const ERR_SEC_USER_CANCELED: OSStatus = -128;

#[link(name = "Security", kind = "framework")]
extern "C" {
    static kSecClass: CFStringRef;
    static kSecClassGenericPassword: CFStringRef;
    static kSecAttrService: CFStringRef;
    static kSecAttrAccount: CFStringRef;
    static kSecValueData: CFStringRef;
    static kSecAttrAccessControl: CFStringRef;
    static kSecReturnData: CFStringRef;
    static kSecMatchLimit: CFStringRef;
    static kSecMatchLimitOne: CFStringRef;
    static kSecUseOperationPrompt: CFStringRef;
    static kSecAttrAccessibleWhenUnlockedThisDeviceOnly: CFStringRef;
    static kSecUseDataProtectionKeychain: CFStringRef;

    fn SecAccessControlCreateWithFlags(
        allocator: CFAllocatorRef,
        protection: CFTypeRef,
        flags: CFOptionFlags,
        error: *mut CFErrorRef,
    ) -> SecAccessControlRef;
    fn SecItemAdd(attributes: CFTypeRef, result: *mut CFTypeRef) -> OSStatus;
    fn SecItemCopyMatching(query: CFTypeRef, result: *mut CFTypeRef) -> OSStatus;
    fn SecItemDelete(query: CFTypeRef) -> OSStatus;
}

// Wrap a +0 (get-rule) static CFStringRef constant as a CFString we can use.
fn key(s: CFStringRef) -> CFString {
    unsafe { CFString::wrap_under_get_rule(s) }
}

fn base_pairs(account: &str) -> Vec<(CFString, CFType)> {
    unsafe {
        vec![
            (key(kSecClass), key(kSecClassGenericPassword).as_CFType()),
            (key(kSecAttrService), CFString::new(SERVICE).as_CFType()),
            (key(kSecAttrAccount), CFString::new(account).as_CFType()),
        ]
    }
}

fn delete_internal(account: &str) -> OSStatus {
    let dict = CFDictionary::from_CFType_pairs(&base_pairs(account));
    unsafe { SecItemDelete(dict.as_CFTypeRef()) }
}

/// Store (or replace) the master password for `account` (the vault path),
/// gated by Touch ID / user presence.
#[tauri::command]
pub fn biometric_store(account: String, secret: String) -> Result<(), String> {
    // Replace any prior entry for this vault.
    let _ = delete_internal(&account);

    let mut err: CFErrorRef = ptr::null();
    let ac = unsafe {
        SecAccessControlCreateWithFlags(
            ptr::null(),
            key(kSecAttrAccessibleWhenUnlockedThisDeviceOnly).as_CFTypeRef(),
            K_SEC_ACCESS_CONTROL_USER_PRESENCE,
            &mut err,
        )
    };
    if ac.is_null() {
        return Err("could not create access control".into());
    }
    let ac_cf: CFType = unsafe { CFType::wrap_under_create_rule(ac as CFTypeRef) };

    let mut pairs = base_pairs(&account);
    unsafe {
        pairs.push((key(kSecValueData), CFData::from_buffer(secret.as_bytes()).as_CFType()));
        pairs.push((key(kSecAttrAccessControl), ac_cf));
        pairs.push((key(kSecUseDataProtectionKeychain), CFBoolean::true_value().as_CFType()));
    }
    let dict = CFDictionary::from_CFType_pairs(&pairs);
    let status = unsafe { SecItemAdd(dict.as_CFTypeRef(), ptr::null_mut()) };
    if status == ERR_SEC_SUCCESS {
        Ok(())
    } else {
        Err(format!("keychain add failed ({})", status))
    }
}

/// Retrieve the master password for `account`. Triggers the Touch ID prompt.
/// Returns Err("CANCELLED") if the user dismisses the prompt.
#[tauri::command]
pub fn biometric_get(account: String, prompt: String) -> Result<String, String> {
    let mut pairs = base_pairs(&account);
    unsafe {
        pairs.push((key(kSecReturnData), CFBoolean::true_value().as_CFType()));
        pairs.push((key(kSecMatchLimit), key(kSecMatchLimitOne).as_CFType()));
        pairs.push((key(kSecUseOperationPrompt), CFString::new(&prompt).as_CFType()));
        pairs.push((key(kSecUseDataProtectionKeychain), CFBoolean::true_value().as_CFType()));
    }
    let dict = CFDictionary::from_CFType_pairs(&pairs);
    let mut result: CFTypeRef = ptr::null();
    let status = unsafe { SecItemCopyMatching(dict.as_CFTypeRef(), &mut result) };
    if status == ERR_SEC_USER_CANCELED {
        return Err("CANCELLED".into());
    }
    if status != ERR_SEC_SUCCESS || result.is_null() {
        return Err(format!("keychain read failed ({})", status));
    }
    let data: CFData = unsafe { CFData::wrap_under_create_rule(result as _) };
    String::from_utf8(data.bytes().to_vec()).map_err(|e| e.to_string())
}

/// Whether a biometric credential exists for `account` — does NOT prompt
/// (no data is requested, so the OS doesn't decrypt the item).
#[tauri::command]
pub fn biometric_has(account: String) -> bool {
    let dict = CFDictionary::from_CFType_pairs(&base_pairs(&account));
    let status = unsafe { SecItemCopyMatching(dict.as_CFTypeRef(), ptr::null_mut()) };
    status == ERR_SEC_SUCCESS
}

/// Remove the stored credential for `account`.
#[tauri::command]
pub fn biometric_delete(account: String) -> Result<(), String> {
    let status = delete_internal(&account);
    if status == ERR_SEC_SUCCESS || status == ERR_SEC_ITEM_NOT_FOUND {
        Ok(())
    } else {
        Err(format!("keychain delete failed ({})", status))
    }
}
