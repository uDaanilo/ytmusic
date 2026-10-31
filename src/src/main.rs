// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;
mod player;
mod plugins;
mod settings;
mod tray;

use tauri::webview::PageLoadEvent;
use tauri::window::Color;
use tauri::{AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder};

use bridge::Bridge;
use player::Player;
use plugins::discord_rpc::DiscordRpcPlugin;
use plugins::download_track::DownloadTrackPlugin;
use plugins::normalize_volume::NormalizeVolumePlugin;
use plugins::websocket::WebsocketPlugin;
use plugins::PluginsManager;
use settings::SettingsManager;

/// The page bundle built from `web/` by `yarn build:web`. It runs on every page load, before
/// the page's own scripts.
const INJECT_SCRIPT: &str = include_str!("../../dist-web/inject.js");

/// YTM rejects WKWebView's default user agent ("Your browser is deprecated"), so present as the
/// Safari version matching the engine. WebView2 already sends a regular Edge user agent.
#[cfg(target_os = "macos")]
const USER_AGENT: Option<&str> = Some(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
);
#[cfg(not(target_os = "macos"))]
const USER_AGENT: Option<&str> = None;

fn create_main_window(app: &AppHandle, start_url: &str) -> tauri::Result<()> {
    let url = Url::parse(start_url).expect("invalid start url");
    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
        .title("YTMusic")
        .inner_size(1280.0, 720.0)
        .background_color(Color(0, 0, 0, 255))
        .initialization_script(INJECT_SCRIPT);
    if let Some(user_agent) = USER_AGENT {
        builder = builder.user_agent(user_agent);
    }
    let window = builder.build()?;

    if cfg!(debug_assertions) || std::env::args().any(|arg| arg == "--devtools") {
        window.open_devtools();
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Bridge::default())
        .manage(Player::new())
        .manage(PluginsManager::new(vec![
            Box::new(NormalizeVolumePlugin),
            Box::new(DownloadTrackPlugin),
            Box::<DiscordRpcPlugin>::default(),
            Box::<WebsocketPlugin>::default(),
        ]))
        .invoke_handler(tauri::generate_handler![
            settings::settings_get_state,
            settings::settings_update,
            plugins::plugins_get_state,
            plugins::plugins_enable,
            plugins::plugins_disable,
            plugins::download_track::download_track_select_path,
            plugins::download_track::download_track_download,
        ])
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Started {
                webview.state::<Bridge>().reset();
            }
        })
        .setup(|app| {
            log::info!("Starting app");
            let handle = app.handle().clone();

            let settings = SettingsManager::load(&handle);
            let start_url = settings.start_url();
            app.manage(settings);

            Bridge::setup(&handle);
            Player::setup(&handle);
            SettingsManager::setup(&handle);

            create_main_window(&handle, &start_url)?;

            handle
                .state::<PluginsManager>()
                .start(&handle, &handle.state::<SettingsManager>());

            tray::setup_tray(&handle)?;
            tray::setup_media_keys(&handle)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                app.state::<PluginsManager>().disable_all(app);
            }
        });
}
