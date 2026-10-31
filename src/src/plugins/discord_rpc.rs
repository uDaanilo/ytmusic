use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use tauri::{AppHandle, Manager};
use tokio::sync::{broadcast, oneshot};

use super::Plugin;
use crate::player::{Player, PlayerState};

const CLIENT_ID: &str = "889167666068197376";
const PAUSED_IMAGE_KEY: &str = "pause";

/// Shows the current track as Discord rich presence.
#[derive(Default)]
pub struct DiscordRpcPlugin {
    stop: Mutex<Option<oneshot::Sender<()>>>,
}

impl Plugin for DiscordRpcPlugin {
    fn name(&self) -> &'static str {
        "DiscordRpc"
    }

    fn enable(&self, app: &AppHandle) {
        let player = app.state::<Player>();
        let mut states = player.subscribe();
        let initial_state = player.current_state();
        let (stop_tx, mut stop_rx) = oneshot::channel();
        *self.stop.lock().unwrap() = Some(stop_tx);

        tauri::async_runtime::spawn(async move {
            let mut rpc = Rpc::default();
            if let Some(state) = initial_state {
                rpc.set_activity(&state);
            }

            loop {
                tokio::select! {
                    _ = &mut stop_rx => break,
                    state = states.recv() => match state {
                        Ok(state) => rpc.set_activity(&state),
                        Err(broadcast::error::RecvError::Lagged(_)) => continue,
                        Err(broadcast::error::RecvError::Closed) => break,
                    },
                }
            }

            rpc.close();
        });
    }

    fn disable(&self, _app: &AppHandle) {
        if let Some(stop) = self.stop.lock().unwrap().take() {
            let _ = stop.send(());
        }
    }
}

/// Lazily connected Discord IPC client that reconnects when Discord is restarted.
#[derive(Default)]
struct Rpc {
    client: Option<DiscordIpcClient>,
}

impl Rpc {
    fn connected_client(&mut self) -> Option<&mut DiscordIpcClient> {
        if self.client.is_none() {
            let mut client = DiscordIpcClient::new(CLIENT_ID);
            match client.connect() {
                Ok(()) => self.client = Some(client),
                Err(err) => {
                    log::warn!("could not connect to Discord: {err}");
                    return None;
                }
            }
        }

        self.client.as_mut()
    }

    fn set_activity(&mut self, state: &PlayerState) {
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or_default();
        let end_ms =
            now_ms + (state.track.length as i64 * 1000) - (state.current_time * 1000.0) as i64;

        let mut assets = activity::Assets::new().large_text("YTMusic");
        if let Some(thumbnail) = &state.track.thumbnail_url {
            assets = assets.large_image(thumbnail);
        }

        let mut presence = activity::Activity::new()
            .details(&state.track.title)
            .state(&state.track.author);

        if state.is_paused {
            assets = assets.small_image(PAUSED_IMAGE_KEY).small_text("PAUSED");
        } else {
            presence = presence.timestamps(activity::Timestamps::new().start(now_ms).end(end_ms));
        }
        let presence = presence.assets(assets);

        let Some(client) = self.connected_client() else {
            return;
        };
        if let Err(err) = client.set_activity(presence) {
            log::warn!("failed to set Discord activity: {err}");
            // Most likely Discord was closed; reconnect on the next update.
            self.close();
        }
    }

    fn close(&mut self) {
        if let Some(mut client) = self.client.take() {
            let _ = client.close();
        }
    }
}
