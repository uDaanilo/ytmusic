import { api, PluginState } from "../api"
import { getPlayerApi } from "../utils"

const PLUGIN_NAME = "NormalizeVolume"

// YTM lowers the <video> volume per track (loudness normalization). This keeps the element
// volume pinned to the player's volume slider instead.
export function setupNormalizeVolume() {
  const playerApi = getPlayerApi()
  const videoEl = document.querySelector("video")
  const withoutNormalizationMaxVolume = 1
  let enabled = false

  const removeVolumeNormalization = () => {
    videoEl.volume = (playerApi.getVolume() / 100) * withoutNormalizationMaxVolume
  }
  const observer = new MutationObserver(removeVolumeNormalization)

  const enable = () => {
    if (enabled) return
    enabled = true
    observer.observe(videoEl, { attributes: true, attributeFilter: ["src"] })
    videoEl.addEventListener("volumechange", removeVolumeNormalization)
    removeVolumeNormalization()
    console.log("Normalize volume plugin enabled")
  }

  const disable = () => {
    if (!enabled) return
    enabled = false
    observer.disconnect()
    videoEl.removeEventListener("volumechange", removeVolumeNormalization)
    console.log("Normalize volume plugin disabled")
  }

  api.on<PluginState>("plugins:enabled", (_, plugin) => plugin.name === PLUGIN_NAME && enable())
  api.on<PluginState>("plugins:disabled", (_, plugin) => plugin.name === PLUGIN_NAME && disable())

  // Plugin state lives in Rust and survives page reloads, so sync on every load.
  api.plugins.getState().then((plugins) => {
    if (plugins.find((plugin) => plugin.name === PLUGIN_NAME)?.enabled) enable()
  })
}
