use std::sync::{Arc, Mutex};

use serde::Serialize;
use socketioxide::extract::{AckSender, Data, SocketRef};
use socketioxide::SocketIo;
use tauri::{AppHandle, Manager};
use tokio::sync::{broadcast, watch};
use tower_http::cors::CorsLayer;

use super::download_track::ytdlp_info;
use super::Plugin;
use crate::player::{Player, PlayerState, Track};

const ADDR: &str = "0.0.0.0:40002";

/// socket.io server exposing the player state and controls to external clients.
#[derive(Default)]
pub struct WebsocketPlugin {
    stop: Mutex<Option<watch::Sender<bool>>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StatePayload {
    track: Track,
    current_time: f64,
    is_paused: bool,
    is_video: bool,
    video_sources: Vec<String>,
}

/// Video-only download URLs for the current track, cached by track id since yt-dlp is slow.
#[derive(Default)]
struct VideoSources {
    track_id: Option<String>,
    urls: Vec<String>,
}

#[derive(Clone)]
struct Context {
    app: AppHandle,
    video_sources: Arc<tokio::sync::Mutex<VideoSources>>,
}

impl Context {
    async fn format_state(&self, state: PlayerState) -> StatePayload {
        let mut sources = self.video_sources.lock().await;

        if state.is_video && sources.track_id.as_deref() != Some(&state.track.id) {
            sources.urls = video_sources(&self.app, &state.track.id).await;
            sources.track_id = Some(state.track.id.clone());
        }

        StatePayload {
            video_sources: if state.is_video {
                sources.urls.clone()
            } else {
                Vec::new()
            },
            track: state.track,
            current_time: state.current_time,
            is_paused: state.is_paused,
            is_video: state.is_video,
        }
    }

    fn player(&self) -> tauri::State<'_, Player> {
        self.app.state::<Player>()
    }

    async fn current_time(&self) -> Option<f64> {
        self.player().current_time(&self.app).await
    }
}

async fn video_sources(app: &AppHandle, track_id: &str) -> Vec<String> {
    let info = match ytdlp_info(app, track_id).await {
        Ok(info) => info,
        Err(err) => {
            log::warn!("failed to get video sources for {track_id}: {err}");
            return Vec::new();
        }
    };

    info["formats"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|format| {
            let protocol = format["protocol"].as_str().unwrap_or_default();
            format["acodec"].as_str() == Some("none")
                && format["width"].as_u64().unwrap_or(0) > 1000
                && !protocol.contains("m3u8")
                && !protocol.contains("dash")
        })
        .filter_map(|format| format["url"].as_str().map(String::from))
        .collect()
}

fn on_connect(socket: SocketRef, ctx: Context) {
    log::info!("New user on websocket: {}", socket.id);

    {
        let socket = socket.clone();
        let ctx = ctx.clone();
        tauri::async_runtime::spawn(async move {
            let Some(mut state) = ctx.player().current_state() else {
                return;
            };
            if let Some(current_time) = ctx.current_time().await {
                state.current_time = current_time;
            }
            let payload = ctx.format_state(state).await;
            let _ = socket.emit("state_change", &payload);
        });
    }

    let c = ctx.clone();
    socket.on("play", async move || c.player().play(&c.app));
    let c = ctx.clone();
    socket.on("pause", async move || c.player().pause(&c.app));
    let c = ctx.clone();
    socket.on("next", async move || c.player().next(&c.app));
    let c = ctx.clone();
    socket.on("previous", async move || c.player().previous(&c.app));
    let c = ctx.clone();
    socket.on("seek", async move |Data(value): Data<f64>| {
        c.player().seek(&c.app, value)
    });
    let c = ctx;
    socket.on("get_state", async move |ack: AckSender| {
        let _ = ack.send(&c.current_time().await);
    });

    socket.on_disconnect(async |socket: SocketRef| {
        log::info!("User disconnected from websocket: {}", socket.id);
    });
}

impl Plugin for WebsocketPlugin {
    fn name(&self) -> &'static str {
        "Websocket"
    }

    fn enable(&self, app: &AppHandle) {
        let (stop_tx, stop_rx) = watch::channel(false);
        *self.stop.lock().unwrap() = Some(stop_tx);

        let ctx = Context {
            app: app.clone(),
            video_sources: Default::default(),
        };
        let (layer, io) = SocketIo::new_layer();
        {
            let ctx = ctx.clone();
            io.ns("/", async move |socket: SocketRef| {
                on_connect(socket, ctx.clone())
            });
        }

        let mut server_stop = stop_rx.clone();
        tauri::async_runtime::spawn(async move {
            let router = axum::Router::new()
                .layer(layer)
                .layer(CorsLayer::permissive());
            let listener = match tokio::net::TcpListener::bind(ADDR).await {
                Ok(listener) => listener,
                Err(err) => {
                    log::error!("Websocket server failed to bind {ADDR}: {err}");
                    return;
                }
            };

            log::info!("Websocket server started");
            let shutdown = async move {
                let _ = server_stop.wait_for(|stop| *stop).await;
            };
            if let Err(err) = axum::serve(listener, router)
                .with_graceful_shutdown(shutdown)
                .await
            {
                log::error!("Websocket server error: {err}");
            }
            log::info!("Websocket server stopped");
        });

        let mut states = app.state::<Player>().subscribe();
        let mut broadcast_stop = stop_rx;
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::select! {
                    _ = async { let _ = broadcast_stop.wait_for(|stop| *stop).await; } => break,
                    state = states.recv() => match state {
                        Ok(state) => {
                            let payload = ctx.format_state(state).await;
                            let _ = io.emit("state_change", &payload).await;
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => continue,
                        Err(broadcast::error::RecvError::Closed) => break,
                    },
                }
            }
        });
    }

    fn disable(&self, _app: &AppHandle) {
        if let Some(stop) = self.stop.lock().unwrap().take() {
            let _ = stop.send(true);
        }
    }
}
