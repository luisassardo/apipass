// api-pass desktop shell (Tauri 2.x).
//
// The frontend (../frontend) is the same HTML/JS/CSS that powers the web build.
// In v0.1 the crypto stays in JS (WebCrypto + PBKDF2); the Rust side only adds
// native file I/O so the app can open and save the actual .apikeys file in place,
// instead of the browser's download-a-new-copy flow.
//
// These two commands read/write a plaintext string (the already-encrypted vault
// envelope) at a path the user chose through the native dialog. They never see
// the master password or decrypted secrets — encryption happens in the webview.

#[tauri::command]
fn read_vault(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_vault(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

// Write a base64-encoded attachment to a path the user chose via the native
// save dialog. The bytes land UNENCRYPTED on disk (the UI warns first).
#[tauri::command]
fn write_file_b64(path: String, b64: String) -> Result<(), String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64.as_bytes())
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

// Open an external link in the user's default browser instead of navigating the
// app's webview. Restricted to http(s) so the webview can't be told to launch
// arbitrary URL schemes.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("unsupported scheme".into());
    }
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(target_os = "windows")]
    let program = "explorer";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";
    std::process::Command::new(program)
        .arg(&url)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_vault, write_vault, write_file_b64, open_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
