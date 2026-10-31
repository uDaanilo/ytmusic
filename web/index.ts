import { emit } from "@tauri-apps/api/event"
import { listenBridgeRequests } from "./api"
import { YTMAppSettings } from "./settings"
import { YTMAppTitlebar } from "./titlebar"
import { domReady, getPlayerApi, waitFor } from "./utils"
import { trustedHTML } from "./trusted"
import { watchPlayer } from "./page/player"
import { setupNormalizeVolume } from "./page/normalize_volume"
import { setupDownloadButton } from "./page/download_button"
import styles from "./assets/styles.css"
import settingsTemplate from "./assets/settings_template.html"

declare global {
  interface Window {
    ytmApp: YTMApp
  }
}

class YTMApp {
  public readonly titlebar: YTMAppTitlebar
  public readonly settings: YTMAppSettings

  constructor(headerRightContent: HTMLElement) {
    this.titlebar = new YTMAppTitlebar(headerRightContent)
    this.settings = new YTMAppSettings()
  }
}

function injectStyles() {
  const styleEl = document.createElement("style")
  styleEl.textContent = styles
  document.head.appendChild(styleEl)
}

function injectSettingsTemplate() {
  const el = document.createElement("div")
  el.setAttribute("id", "ytm-app-settings")
  el.innerHTML = trustedHTML(settingsTemplate)
  el.style.width = "100%"
  el.style.height = "100vh"
  el.style.position = "absolute"
  el.style.top = "0"
  el.style.display = "none"
  el.style.alignItems = "center"
  document.body.prepend(el)
}

// YTM is a single-page app, so in-app navigation never reaches Tauri's navigation hooks.
function watchUrl() {
  let lastUrl = location.href
  emit("main:url_change", lastUrl)

  setInterval(() => {
    if (location.href === lastUrl) return
    lastUrl = location.href
    emit("main:url_change", lastUrl)
  }, 1000)
}

async function boot() {
  listenBridgeRequests()
  await domReady()

  injectStyles()
  injectSettingsTemplate()
  watchUrl()

  const headerRightContent = await waitFor(() => document.querySelector<HTMLElement>("#right-content"))
  window.ytmApp = new YTMApp(headerRightContent)

  await waitFor(() => getPlayerApi()?.getPlayerState && document.querySelector("video"))
  watchPlayer()
  setupNormalizeVolume()

  const rightControls = await waitFor(() => document.querySelector(".right-controls-buttons"))
  setupDownloadButton(rightControls)

  emit("page:ready")
}

// The initialization script runs on every navigation, including Google sign-in pages.
if (window.top === window && location.host === "music.youtube.com") {
  boot().catch((err) => console.error("ytmusic: failed to boot", err))
}
