use std::path::{Path, PathBuf};

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, Url};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_shell::ShellExt;

use super::Plugin;
use crate::settings::YTMUSIC_BASE_URL;

/// Adds a download button to the player bar (`web/page/download_button.ts`) that saves the
/// current track as mp3 through the yt-dlp and ffmpeg sidecars.
pub struct DownloadTrackPlugin;

impl Plugin for DownloadTrackPlugin {
    fn name(&self) -> &'static str {
        "DownloadTrack"
    }

    fn can_be_enabled(&self) -> bool {
        false
    }
}

fn watch_url(track_id: &str) -> String {
    format!("https://youtube.com/watch?v={track_id}")
}

/// Sidecars are bundled next to the main executable, with the target triple stripped.
fn sidecar_path(name: &str) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    Some(
        exe.parent()?
            .join(format!("{name}{}", std::env::consts::EXE_SUFFIX)),
    )
}

async fn run_ytdlp(app: &AppHandle, args: Vec<String>) -> Result<Vec<u8>, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|err| err.to_string())?
        .args(args)
        .output()
        .await
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    Ok(output.stdout)
}

/// Runs `yt-dlp -J` for a track and returns the parsed info JSON.
pub async fn ytdlp_info(app: &AppHandle, track_id: &str) -> Result<Value, String> {
    let stdout = run_ytdlp(
        app,
        vec!["-J".into(), "--no-playlist".into(), watch_url(track_id)],
    )
    .await?;
    serde_json::from_slice(&stdout).map_err(|err| err.to_string())
}

/// Exports the webview's YouTube cookies in Netscape format so yt-dlp can access the same
/// account (age-restricted and premium content).
async fn write_cookies_file(app: &AppHandle, path: &Path) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    let url = Url::parse(YTMUSIC_BASE_URL).map_err(|err| err.to_string())?;
    let cookies = window.cookies_for_url(url).map_err(|err| err.to_string())?;

    let mut lines = vec![
        "# Netscape HTTP Cookie File".to_string(),
        "# http://curl.haxx.se/rfc/cookie_spec.html".to_string(),
        "# This is a generated file!  Do not edit.".to_string(),
        String::new(),
    ];

    for cookie in cookies {
        let domain = cookie.domain().unwrap_or_default();
        let include_subdomain = if domain.starts_with('.') {
            "TRUE"
        } else {
            "FALSE"
        };
        let secure = if cookie.secure().unwrap_or(false) {
            "TRUE"
        } else {
            "FALSE"
        };
        let expiry = cookie
            .expires_datetime()
            .map(|date| date.unix_timestamp())
            .unwrap_or(0);

        lines.push(
            [
                domain,
                include_subdomain,
                cookie.path().unwrap_or("/"),
                secure,
                &expiry.to_string(),
                cookie.name(),
                cookie.value(),
            ]
            .join("\t"),
        );
    }
    lines.push(String::new());

    tokio::fs::write(path, lines.join("\n"))
        .await
        .map_err(|err| err.to_string())
}

async fn download_track(app: &AppHandle, track_id: &str, dir: &Path) -> Result<(), String> {
    let cookies_path = std::env::temp_dir().join(format!("ytmusic-cookies-{track_id}.txt"));
    write_cookies_file(app, &cookies_path).await?;

    let mut args = vec![
        "--extract-audio".to_string(),
        "--audio-format".into(),
        "mp3".into(),
        "--no-playlist".into(),
        "--cookies".into(),
        cookies_path.to_string_lossy().into_owned(),
        "--output".into(),
        dir.join("%(title)s.%(ext)s").to_string_lossy().into_owned(),
    ];
    if let Some(ffmpeg) = sidecar_path("ffmpeg") {
        args.push("--ffmpeg-location".into());
        args.push(ffmpeg.to_string_lossy().into_owned());
    }
    if !cfg!(debug_assertions) {
        args.push("--quiet".into());
    }
    args.push(watch_url(track_id));

    let result = run_ytdlp(app, args).await.map(|_| ());
    let _ = tokio::fs::remove_file(&cookies_path).await;
    result
}

#[tauri::command]
pub async fn download_track_select_path(app: AppHandle) -> Option<String> {
    let mut dialog = app.dialog().file().set_title("Select path");
    if let Ok(desktop) = app.path().desktop_dir() {
        dialog = dialog.set_directory(desktop);
    }

    let folder = dialog.blocking_pick_folder()?;
    folder
        .into_path()
        .ok()
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn download_track_download(app: AppHandle, track_id: String, path: String) {
    log::info!("Downloading track {track_id} to {path}");
    let _ = app.emit("download-track-plugin:progress", ());

    if let Err(err) = download_track(&app, &track_id, Path::new(&path)).await {
        log::error!("failed to download track {track_id}: {err}");
        app.dialog()
            .message("An error occurred while downloading the track")
            .title("Error")
            .kind(MessageDialogKind::Error)
            .show(|_| {});
    }

    let _ = app.emit("download-track-plugin:downloaded", ());
}
