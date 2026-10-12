use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Listener, Manager, State};

use crate::plugins::PluginsManager;

pub const YTMUSIC_BASE_URL: &str = "https://music.youtube.com";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PluginSettings {
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_true")]
    pub return_from_last_url: bool,
    #[serde(default)]
    pub last_url: Option<String>,
    #[serde(default)]
    pub plugins: BTreeMap<String, PluginSettings>,
}

fn default_true() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            return_from_last_url: true,
            last_url: Some(YTMUSIC_BASE_URL.to_string()),
            plugins: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct SettingsUpdate {
    pub return_from_last_url: Option<bool>,
    pub last_url: Option<String>,
    pub plugins: Option<BTreeMap<String, PluginSettings>>,
}

pub struct SettingsManager {
    path: PathBuf,
    settings: Mutex<Settings>,
}

impl SettingsManager {
    pub fn load(app: &AppHandle) -> Self {
        let dir = app
            .path()
            .app_data_dir()
            .expect("could not resolve app data dir");
        fs::create_dir_all(&dir).expect("could not create app data dir");
        let path = dir.join("settings.json");

        let settings = read_settings(&path)
            .or_else(|| import_electron_settings(app))
            .unwrap_or_default();

        let manager = Self {
            path,
            settings: Mutex::new(settings),
        };
        manager.save();
        manager
    }

    pub fn get(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    /// Adds a disabled entry for every toggleable plugin that has no saved state yet.
    pub fn add_missing_plugins(&self, plugin_names: impl IntoIterator<Item = String>) {
        {
            let mut settings = self.settings.lock().unwrap();
            for name in plugin_names {
                settings
                    .plugins
                    .entry(name)
                    .or_insert(PluginSettings { enabled: false });
            }
        }
        self.save();
    }

    pub fn update(&self, app: &AppHandle, update: SettingsUpdate) {
        {
            let mut settings = self.settings.lock().unwrap();
            if let Some(value) = update.return_from_last_url {
                settings.return_from_last_url = value;
            }
            if let Some(value) = update.last_url {
                settings.last_url = Some(value);
            }
            if let Some(plugins) = &update.plugins {
                for (name, state) in plugins {
                    settings.plugins.insert(name.clone(), state.clone());
                }
            }
        }
        self.save();

        if let Some(plugins) = update.plugins {
            let manager = app.state::<PluginsManager>();
            for (name, state) in plugins {
                if state.enabled {
                    manager.enable_plugin(app, &name);
                } else {
                    manager.disable_plugin(app, &name);
                }
            }
        }
    }

    /// The URL to open on startup: the last visited YTM page, if that setting is on.
    pub fn start_url(&self) -> String {
        let settings = self.settings.lock().unwrap();
        if !settings.return_from_last_url {
            return YTMUSIC_BASE_URL.to_string();
        }

        settings
            .last_url
            .as_deref()
            .filter(|url| is_ytmusic_url(url))
            .unwrap_or(YTMUSIC_BASE_URL)
            .to_string()
    }

    pub fn setup(app: &AppHandle) {
        let handle = app.clone();
        app.listen_any("main:url_change", move |event| {
            let Ok(url) = serde_json::from_str::<String>(event.payload()) else {
                return;
            };
            let settings = handle.state::<SettingsManager>();
            if settings.get().return_from_last_url && is_ytmusic_url(&url) {
                settings.update(
                    &handle,
                    SettingsUpdate {
                        last_url: Some(url),
                        ..Default::default()
                    },
                );
            }
        });
    }

    fn save(&self) {
        let settings = self.settings.lock().unwrap();
        let result = serde_json::to_string(&*settings)
            .map_err(|err| err.to_string())
            .and_then(|json| fs::write(&self.path, json).map_err(|err| err.to_string()));

        if let Err(err) = result {
            log::error!("failed to save settings to {}: {err}", self.path.display());
        }
    }
}

fn is_ytmusic_url(url: &str) -> bool {
    url == YTMUSIC_BASE_URL || url.starts_with(&format!("{YTMUSIC_BASE_URL}/"))
}

fn read_settings(path: &PathBuf) -> Option<Settings> {
    let content = fs::read_to_string(path).ok()?;
    match serde_json::from_str(&content) {
        Ok(settings) => Some(settings),
        Err(err) => {
            log::warn!("ignoring invalid settings file {}: {err}", path.display());
            None
        }
    }
}

/// The Electron app kept its settings in `<appData>/ytmusic/settings.json`.
fn import_electron_settings(app: &AppHandle) -> Option<Settings> {
    let path = app
        .path()
        .data_dir()
        .ok()?
        .join("ytmusic")
        .join("settings.json");
    let settings = read_settings(&path)?;
    log::info!("imported settings from {}", path.display());
    Some(settings)
}

#[tauri::command]
pub fn settings_get_state(settings: State<'_, SettingsManager>) -> Value {
    let settings = settings.get();
    let mut state = Map::new();

    state.insert(
        "return_from_last_url".into(),
        json!({ "label": "Return from last song", "value": settings.return_from_last_url }),
    );

    for (name, plugin) in settings.plugins {
        state.insert(
            name.clone(),
            json!({
                "label": format!("Enable {name} plugin"),
                "enabled": plugin.enabled,
                "isPlugin": true,
            }),
        );
    }

    Value::Object(state)
}

#[tauri::command]
pub fn settings_update(
    app: AppHandle,
    settings: State<'_, SettingsManager>,
    update: SettingsUpdate,
) {
    settings.update(&app, update);
}
