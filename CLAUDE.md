# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tauri 2 desktop wrapper around https://music.youtube.com (migrated from Electron), with a Rust backend and a TypeScript script injected into the YTM page. Extra features are plugins: volume normalization, track download, Discord RPC, and a socket.io remote-control server. Releases target Windows (WebView2), macOS (WKWebView) and Linux (WebKitGTK).

## Commands

- `yarn sidecars [target-triple]` — download yt-dlp and ffmpeg into `src/binaries/` (gitignored). Required before the first build: Tauri fails if the `externalBin` files for the current target are missing.
- `yarn dev` — `tauri dev` (runs `yarn build:web` first, opens devtools)
- `yarn build` — release build + NSIS installer
- `yarn build:web` — esbuild bundle of `web/` into `dist-web/inject.js`
- `yarn typecheck:web` — esbuild doesn't type-check; run this for `web/`
- In `src/`: `cargo clippy`, `cargo fmt`. `dist-web/inject.js` must exist first, since it's embedded with `include_str!`.

There are no tests. Releases come from `.github/workflows/release.yml` (tauri-action matrix: Windows x64, macOS arm64 + x64, Linux x64; triggered by `v*` tags). The app version is read from `package.json`.

`tauri dev` only watches `src/`. After editing `web/`, run `yarn build:web` and touch a Rust file to reload.

## Architecture

The window loads the remote YTM site. Everything happens through `web/`, which is bundled and registered as the window's `initialization_script` (`src/src/main.rs`). That script runs on every navigation, and `web/index.ts` bails out unless the host is `music.youtube.com`, so Google sign-in pages are left alone.

**Remote-origin IPC.** The page is a remote origin, so it can only call what `src/capabilities/ytmusic.json` allows. A new `#[tauri::command]` has to be added in three places:
- `generate_handler!` in `main.rs`
- the `AppManifest` command list in `build.rs`
- an `allow-<command-name>` entry in the capability

Without that, the call is rejected at runtime.

**Rust ↔ page communication** (all via Tauri events, global `app.emit` / `listen_any`):
- Page → Rust events: `page:ready`, `player:state_change`, `main:url_change` (YTM is an SPA, so the page polls `location.href`).
- Rust → page events: `player:command` (`{action, value}`), `plugins:enabled` / `plugins:disabled`, and the download progress events.
- `webview.eval()` can't return values. To read from the page, use `Bridge::request` (`bridge.rs`): it emits `bridge:request {id, name}`, and the page answers through handlers registered with `handleBridgeRequest` in `web/api.ts`.
- `web/api.ts` keeps the old Electron `window.api`-style `Api` surface (`emit`/`invoke`/`on`/`plugins`/`settings`) on top of `@tauri-apps/api`.

**YTM internals.** The player API is `document.getElementById("movie_player")` (`getPlayerApi()` in `web/utils.ts`): `playVideo`, `getPlayerState`, `getPlayerResponse().videoDetails`, `getVideoData()`, and so on. The old `window.player.playerApi` / `inst.__data` paths no longer exist. YTM enforces Trusted Types, so every `innerHTML` assignment goes through `trustedHTML()` (`web/trusted.ts`), which uses a single shared policy.

**State** is held in Tauri managed state:
- `SettingsManager` (`settings.rs`): JSON file in the app data dir; imports the Electron app's `<appData>/ytmusic/settings.json` on first run.
- `Player` (`player.rs`): latest state plus a `tokio::broadcast` that the tray, Discord and websocket subscribe to.
- `Bridge`
- `PluginsManager`

## Plugins

Rust plugins implement the `Plugin` trait (`src/src/plugins/mod.rs`) and are listed in `main.rs`.
- `name()` is the settings key and must stay stable (`NormalizeVolume`, `DownloadTrack`, `DiscordRpc`, `Websocket`); settings files from the Electron version use the same keys.
- Plugins with `can_be_enabled() == false` are always on and hidden from the settings UI.

Page-side plugin code lives in `web/page/`:
- Each module syncs its own enabled state with `plugins_get_state` on every load and listens for `plugins:enabled` / `plugins:disabled`.
- `NormalizeVolume` is entirely page-side; its Rust plugin is an empty marker.

Plugin notes:
- **DownloadTrack**: exports webview cookies (`cookies_for_url`) to a Netscape file, then runs the `yt-dlp` sidecar with `--extract-audio --audio-format mp3 --ffmpeg-location <ffmpeg sidecar>`.
- **Websocket**: socketioxide + axum on `0.0.0.0:40002`. The event names and payloads (`state_change` with `videoSources`, `play`/`pause`/`next`/`previous`/`seek`/`get_state`) are a public contract for existing clients. socketioxide 0.18 handlers must be async closures.
- **DiscordRpc**: `discord-rich-presence`, reconnects lazily when Discord restarts.

The tray menu and global media keys (`tray.rs`) replace the Electron thumbar buttons. On macOS, WKWebView needs a Safari user agent (`USER_AGENT` in `main.rs`), or YTM shows "browser deprecated".
