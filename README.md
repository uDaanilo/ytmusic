<p align="center">
  <img width="64px" src="src/icons/icon.png">
</p>
<h1 align="center">YTMusic</h1>

<p align="center">A desktop application of <a href="https://music.youtube.com">youtube music</a> with some addicional features</p>

## ✔️ Features

- ✨ Custom Plugins
- ⬇️ Download music
- 👌 Starts on last song listened
- 🎛️ Tray menu and media keys
- 🔌 Websocket remote control and Discord rich presence

## 🎁 Download

### You can see all releases [here](https://github.com/uDaanilo/ytmusic/releases)

## 🚧 Development

### ⚒️ Quick start

1. Cloning repository

```sh
$ git clone https://github.com/uDaanilo/ytmusic.git
```

2. Installing prerequisites

- [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- Node.js and Yarn

3. Downloading dependencies and the yt-dlp/ffmpeg binaries

```sh
$ yarn
$ yarn sidecars
```

4. Starting project

```sh
$ yarn dev
```

### 🧩 Building project

```sh
$ yarn build
```

Releases are built by the `Release` GitHub workflow when a `v*` tag is pushed.

## 🚀 Built with

- [Tauri](https://tauri.app)
- [Rust](https://www.rust-lang.org)
- [Typescript](https://www.typescriptlang.org/)

## License

This project is under the license MIT
