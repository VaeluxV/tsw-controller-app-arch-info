use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            // Only for Linux
            #[cfg(any(
                target_os = "linux",
                target_os = "dragonfly",
                target_os = "freebsd",
                target_os = "netbsd",
                target_os = "openbsd"
            ))]
            {
                window.with_webview(|webview| {
                    use webkit2gtk::{WebViewExt, SettingsExt, glib::Cast};
                    let webview_inner = webview.inner();
                    let gtk_webview = webview_inner
                        .downcast_ref::<webkit2gtk::WebView>()
                        .expect("Webview is not WebKitGTK");
                    if let Some(settings) = gtk_webview.settings() {
                        settings.set_enable_media(true);
                        settings.set_enable_media_stream(true);
                    }
                }).unwrap();
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
