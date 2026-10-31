use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};
use tokio::sync::broadcast;

use crate::player::Player;

const TRAY_TOOLTIP: &str = "YTMusic";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tray menu with playback controls. Replaces the Electron Windows thumbar buttons.
pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let previous = MenuItem::with_id(app, "previous", "Previous", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Play / Pause", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show YTMusic", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&previous, &toggle, &next, &separator, &show, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip(TRAY_TOOLTIP)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let player = app.state::<Player>();
            match event.id.as_ref() {
                "previous" => player.previous(app),
                "toggle" => player.toggle(app),
                "next" => player.next(app),
                "show" => show_main_window(app),
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    let tray = builder.build(app)?;

    let mut states = app.state::<Player>().subscribe();
    tauri::async_runtime::spawn(async move {
        loop {
            match states.recv().await {
                Ok(state) => {
                    let tooltip = format!("{} - {}", state.track.title, state.track.author);
                    let _ = tray.set_tooltip(Some(tooltip));
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    Ok(())
}

/// Global media keys (play/pause, next, previous).
pub fn setup_media_keys(app: &AppHandle) -> tauri::Result<()> {
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                if event.state() != ShortcutState::Pressed {
                    return;
                }
                let player = app.state::<Player>();
                match shortcut.key {
                    Code::MediaPlayPause => player.toggle(app),
                    Code::MediaTrackNext => player.next(app),
                    Code::MediaTrackPrevious => player.previous(app),
                    _ => {}
                }
            })
            .build(),
    )?;

    for code in [
        Code::MediaPlayPause,
        Code::MediaTrackNext,
        Code::MediaTrackPrevious,
    ] {
        // Another app (e.g. a media player) may already own the key; that's not fatal.
        if let Err(err) = app.global_shortcut().register(Shortcut::new(None, code)) {
            log::warn!("could not register media key {code:?}: {err}");
        }
    }

    Ok(())
}
