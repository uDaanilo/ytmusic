use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tokio::sync::oneshot;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(3);

/// Request/response channel to the YTM page.
///
/// Tauri's `eval` can't return values, so Rust emits a `bridge:request` with an id and the page
/// (`web/api.ts`) answers with a `bridge:response` carrying the same id.
#[derive(Default)]
pub struct Bridge {
    pending: Mutex<HashMap<u64, oneshot::Sender<Value>>>,
    next_id: AtomicU64,
    page_ready: AtomicBool,
}

#[derive(Deserialize)]
struct BridgeResponse {
    id: u64,
    value: Value,
}

impl Bridge {
    pub fn setup(app: &AppHandle) {
        let handle = app.clone();
        app.listen_any("bridge:response", move |event| {
            let Ok(response) = serde_json::from_str::<BridgeResponse>(event.payload()) else {
                return;
            };
            let bridge = handle.state::<Bridge>();
            let sender = bridge.pending.lock().unwrap().remove(&response.id);
            if let Some(sender) = sender {
                let _ = sender.send(response.value);
            }
        });

        let handle = app.clone();
        app.listen_any("page:ready", move |_| {
            log::info!("YouTube Music page ready");
            handle
                .state::<Bridge>()
                .page_ready
                .store(true, Ordering::SeqCst);
        });
    }

    /// Called when the webview starts loading a new page.
    pub fn reset(&self) {
        self.page_ready.store(false, Ordering::SeqCst);
        self.pending.lock().unwrap().clear();
    }

    pub fn is_page_ready(&self) -> bool {
        self.page_ready.load(Ordering::SeqCst)
    }

    /// Asks the page for the value of a named handler registered with `handleBridgeRequest`.
    /// Returns `None` if the page isn't ready, doesn't answer in time, or the value doesn't parse.
    pub async fn request<T: DeserializeOwned>(&self, app: &AppHandle, name: &str) -> Option<T> {
        if !self.is_page_ready() {
            return None;
        }

        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id, tx);

        if let Err(err) = app.emit("bridge:request", json!({ "id": id, "name": name })) {
            log::warn!("bridge request {name} failed to emit: {err}");
            self.pending.lock().unwrap().remove(&id);
            return None;
        }

        let value = match tokio::time::timeout(REQUEST_TIMEOUT, rx).await {
            Ok(Ok(value)) => value,
            _ => {
                self.pending.lock().unwrap().remove(&id);
                log::warn!("bridge request {name} timed out");
                return None;
            }
        };

        serde_json::from_value(value).ok()
    }
}
