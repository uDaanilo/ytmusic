use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Listener, Manager};
use tokio::sync::broadcast;

use crate::bridge::Bridge;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub title: String,
    pub author: String,
    pub length: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub track: Track,
    pub current_time: f64,
    pub is_paused: bool,
    pub is_video: bool,
}

/// Mirrors the YTM player's state (reported by `web/page/player.ts`) and controls it by
/// sending `player:command` events to the page.
pub struct Player {
    state: Mutex<Option<PlayerState>>,
    tx: broadcast::Sender<PlayerState>,
}

impl Player {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(16);
        Self {
            state: Mutex::new(None),
            tx,
        }
    }

    pub fn setup(app: &AppHandle) {
        let handle = app.clone();
        app.listen_any(
            "player:state_change",
            move |event| match serde_json::from_str::<PlayerState>(event.payload()) {
                Ok(state) => {
                    let player = handle.state::<Player>();
                    *player.state.lock().unwrap() = Some(state.clone());
                    let _ = player.tx.send(state);
                }
                Err(err) => log::warn!("invalid player state: {err}"),
            },
        );
    }

    pub fn subscribe(&self) -> broadcast::Receiver<PlayerState> {
        self.tx.subscribe()
    }

    pub fn current_state(&self) -> Option<PlayerState> {
        self.state.lock().unwrap().clone()
    }

    pub async fn current_time(&self, app: &AppHandle) -> Option<f64> {
        app.state::<Bridge>()
            .request(app, "player:current_time")
            .await
    }

    fn command(&self, app: &AppHandle, payload: serde_json::Value) {
        if !app.state::<Bridge>().is_page_ready() {
            return;
        }
        if let Err(err) = app.emit("player:command", payload) {
            log::warn!("failed to send player command: {err}");
        }
    }

    pub fn play(&self, app: &AppHandle) {
        self.command(app, json!({ "action": "play" }));
    }

    pub fn pause(&self, app: &AppHandle) {
        self.command(app, json!({ "action": "pause" }));
    }

    pub fn toggle(&self, app: &AppHandle) {
        self.command(app, json!({ "action": "toggle" }));
    }

    pub fn next(&self, app: &AppHandle) {
        self.command(app, json!({ "action": "next" }));
    }

    pub fn previous(&self, app: &AppHandle) {
        self.command(app, json!({ "action": "previous" }));
    }

    pub fn seek(&self, app: &AppHandle, value: f64) {
        self.command(app, json!({ "action": "seek", "value": value }));
    }
}
