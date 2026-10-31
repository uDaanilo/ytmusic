// Downloads the yt-dlp and ffmpeg sidecar binaries into src/binaries, named with the
// target triple suffix Tauri expects (e.g. yt-dlp-x86_64-pc-windows-msvc.exe).
//
// Usage: node scripts/fetch-sidecars.mjs [target-triple]   (defaults to the host triple)
import { execSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const YT_DLP_BASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download"
const FFMPEG_BASE = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0"

const TARGETS = {
  "x86_64-pc-windows-msvc": { ytdlp: "yt-dlp.exe", ffmpeg: "ffmpeg-win32-x64.gz", ext: ".exe" },
  "aarch64-apple-darwin": { ytdlp: "yt-dlp_macos", ffmpeg: "ffmpeg-darwin-arm64.gz", ext: "" },
  "x86_64-apple-darwin": { ytdlp: "yt-dlp_macos", ffmpeg: "ffmpeg-darwin-x64.gz", ext: "" },
  "x86_64-unknown-linux-gnu": { ytdlp: "yt-dlp_linux", ffmpeg: "ffmpeg-linux-x64.gz", ext: "" },
}

const target = process.argv[2] ?? execSync("rustc --print host-tuple").toString().trim()
const assets = TARGETS[target]
if (!assets) {
  console.error(`Unsupported target ${target}. Supported: ${Object.keys(TARGETS).join(", ")}`)
  process.exit(1)
}

const binDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "binaries")
mkdirSync(binDir, { recursive: true })

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function fetchSidecar(name, url, gzipped) {
  const out = resolve(binDir, `${name}-${target}${assets.ext}`)
  if (existsSync(out) && !process.argv.includes("--force")) {
    console.log(`${out} already exists, skipping (use --force to refresh)`)
    return
  }

  console.log(`Downloading ${url}`)
  const data = await download(url)
  writeFileSync(out, gzipped ? gunzipSync(data) : data)
  chmodSync(out, 0o755)
  console.log(`Wrote ${out}`)
}

await fetchSidecar("yt-dlp", `${YT_DLP_BASE}/${assets.ytdlp}`, false)
await fetchSidecar("ffmpeg", `${FFMPEG_BASE}/${assets.ffmpeg}`, true)
