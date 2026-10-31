fn main() {
    // App commands must be listed here so they get ACL permissions; the YTM page is a remote
    // origin and can only call commands its capability explicitly allows.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "settings_get_state",
            "settings_update",
            "plugins_get_state",
            "plugins_enable",
            "plugins_disable",
            "download_track_select_path",
            "download_track_download",
        ]),
    ))
    .expect("failed to run tauri build script");
}
