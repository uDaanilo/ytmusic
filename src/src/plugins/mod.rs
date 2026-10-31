use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::settings::SettingsManager;

pub mod discord_rpc;
pub mod download_track;
pub mod normalize_volume;
pub mod websocket;

/// A feature that can be registered at startup and optionally toggled from the settings UI.
///
/// The name is the settings key and must stay stable (e.g. `NormalizeVolume`), since it is shared
/// with the page scripts and with settings files written by the Electron version.
pub trait Plugin: Send + Sync {
    fn name(&self) -> &'static str;

    /// Plugins that can't be enabled are always on and don't show up in settings.
    fn can_be_enabled(&self) -> bool {
        true
    }

    fn register(&self, _app: &AppHandle) {}

    fn enable(&self, _app: &AppHandle) {}

    fn disable(&self, _app: &AppHandle) {}
}

struct PluginEntry {
    plugin: Box<dyn Plugin>,
    enabled: AtomicBool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginState {
    name: &'static str,
    enabled: bool,
    can_be_enabled: bool,
}

pub struct PluginsManager {
    plugins: Vec<PluginEntry>,
}

impl PluginsManager {
    pub fn new(plugins: Vec<Box<dyn Plugin>>) -> Self {
        Self {
            plugins: plugins
                .into_iter()
                .map(|plugin| PluginEntry {
                    plugin,
                    enabled: AtomicBool::new(false),
                })
                .collect(),
        }
    }

    /// Registers every plugin, enables the ones saved as enabled, and adds settings entries for
    /// new toggleable plugins.
    pub fn start(&self, app: &AppHandle, settings: &SettingsManager) {
        let saved = settings.get().plugins;

        for entry in &self.plugins {
            let name = entry.plugin.name();
            log::info!("Registering {name} plugin");
            entry.plugin.register(app);

            if entry.plugin.can_be_enabled() && saved.get(name).is_some_and(|plugin| plugin.enabled)
            {
                self.enable_plugin(app, name);
            }
        }

        settings.add_missing_plugins(
            self.plugins
                .iter()
                .filter(|entry| entry.plugin.can_be_enabled())
                .map(|entry| entry.plugin.name().to_string()),
        );
    }

    fn find(&self, name: &str) -> Option<&PluginEntry> {
        self.plugins
            .iter()
            .find(|entry| entry.plugin.name() == name)
    }

    pub fn enable_plugin(&self, app: &AppHandle, name: &str) {
        let Some(entry) = self.find(name) else {
            log::warn!("unknown plugin {name}");
            return;
        };
        if !entry.plugin.can_be_enabled() || entry.enabled.swap(true, Ordering::SeqCst) {
            return;
        }

        entry.plugin.enable(app);
        log::info!("Plugin {name} enabled");
        let _ = app.emit("plugins:enabled", Self::entry_state(entry));
    }

    pub fn disable_plugin(&self, app: &AppHandle, name: &str) {
        let Some(entry) = self.find(name) else {
            log::warn!("unknown plugin {name}");
            return;
        };
        if !entry.enabled.swap(false, Ordering::SeqCst) {
            return;
        }

        entry.plugin.disable(app);
        log::info!("Plugin {name} disabled");
        let _ = app.emit("plugins:disabled", Self::entry_state(entry));
    }

    pub fn disable_all(&self, app: &AppHandle) {
        for entry in &self.plugins {
            self.disable_plugin(app, entry.plugin.name());
        }
    }

    pub fn state(&self) -> Vec<PluginState> {
        self.plugins.iter().map(Self::entry_state).collect()
    }

    fn entry_state(entry: &PluginEntry) -> PluginState {
        PluginState {
            name: entry.plugin.name(),
            enabled: entry.enabled.load(Ordering::SeqCst),
            can_be_enabled: entry.plugin.can_be_enabled(),
        }
    }
}

#[tauri::command]
pub fn plugins_get_state(plugins: State<'_, PluginsManager>) -> Vec<PluginState> {
    plugins.state()
}

#[tauri::command]
pub fn plugins_enable(app: AppHandle, plugins: State<'_, PluginsManager>, name: String) {
    plugins.enable_plugin(&app, &name);
}

#[tauri::command]
pub fn plugins_disable(app: AppHandle, plugins: State<'_, PluginsManager>, name: String) {
    plugins.disable_plugin(&app, &name);
}
