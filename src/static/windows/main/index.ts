import { Api } from "./preload"
import { YTMAppSettings } from "./settings"
import { YTMAppTitlebar } from "./titlebar"
import { YTMUtils } from "./utils"

declare global {
  interface Window {
    YTMAppTitlebar: typeof YTMAppTitlebar
    YTMAppSettings: typeof YTMAppSettings
    YTMUtils: typeof YTMUtils
    ytmApp: YTMApp
    api: Api
  }
}

class YTMApp {
  public readonly titlebar: YTMAppTitlebar
  public readonly settings: YTMAppSettings

  constructor() {
    this.titlebar = new window.YTMAppTitlebar()
    this.settings = new window.YTMAppSettings()
  }
}

window.ytmApp = new YTMApp()
