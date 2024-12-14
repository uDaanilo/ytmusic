import { ThumbarButton, ipcMain, nativeImage } from "electron"
import { BaseWindow } from "./base"
import { YTMUSIC_BASE_URL, YTMUSIC_ICON_PATH } from "../constants"
import path from "node:path"
import { readFile } from "node:fs/promises"
import App from "../app"
import { getAppRootPath } from "../utils/getAppRootPath"
import { PlayerState } from "../player"

class MainWindow extends BaseWindow {
  constructor(app: App) {
    super(app, {
      width: 1280,
      height: 720,
      backgroundColor: "#000",
      show: true,
      autoHideMenuBar: true,
      icon: YTMUSIC_ICON_PATH,
      webPreferences: {
        preload: path.resolve(getAppRootPath(), "dist", "static", "windows", "main", "preload.js"),
      },
    })

    this.init()
    this.handleIpcRendererEvents()
    this.setTaskbarButtons()
  }

  private async init() {
    await this.window.loadURL(this.getLastUrl())

    if (!this.app.electron.isPackaged || process.argv.includes("--devtools")) {
      setTimeout(() => {
        this.window.webContents.openDevTools()
      }, 1e3)
    }

    await this.injectFrontendScripts()
    this.window.show()

    if (this.app.settingsManager.settings.return_from_last_url) {
      this.watchLastUrl()
    }
  }

  private async injectAppSettingsHtmlTemplate() {
    const htmlTemplate = await readFile(
      path.resolve(getAppRootPath(), "dist/static/windows/main/settings_template.html")
    )
    await this.window.webContents.executeJavaScript(`
      const el = document.createElement('div')
      el.setAttribute('id', 'ytm-app-settings')
      el.innerHTML = window.trustedTypes.createPolicy("ytmAppSettings", { createHTML: (input) => input }).createHTML(\`${htmlTemplate}\`)
      el.style.width = '100%'
      el.style.height = '100vh'
      el.style.position = 'absolute'
      el.style.top = '0'
      el.style.display = 'none'
      el.style.alignItems = 'center'
      document.body.prepend(el)
      ;0
    `)
  }

  private async injectFrontendScripts() {
    await this.injectCSSFile("dist/static/windows/main/css/styles.css")
    await this.window.webContents.executeJavaScript("var exports = {};")
    await this.injectAppSettingsHtmlTemplate()
    await this.injectJavascriptFile("dist/static/windows/main/utils.js")
    await this.injectJavascriptFile("dist/static/windows/main/settings.js")
    await this.injectJavascriptFile("dist/static/windows/main/titlebar.js")
    await this.injectJavascriptFile("dist/static/windows/main/index.js")
  }

  private handleIpcRendererEvents() {
    ipcMain.on("main:minimize", () => {
      this.window.minimize()
    })
  }

  private watchLastUrl() {
    this.window.webContents.on("did-navigate-in-page", (_e, url) => {
      this.app.settingsManager.update({
        last_url: url,
      })
    })
  }

  private getLastUrl() {
    if (!this.app.settingsManager.settings.return_from_last_url) return YTMUSIC_BASE_URL

    try {
      const lastUrl = this.app.settingsManager.settings.last_url
      const lastHostname = new URL(lastUrl).hostname
      const baseHostName = new URL(YTMUSIC_BASE_URL).hostname

      if (lastHostname !== baseHostName) return YTMUSIC_BASE_URL

      return lastUrl
    } catch (_err) {
      return YTMUSIC_BASE_URL
    }
  }

  private setTaskbarButtons() {
    const buttons: Record<string, ThumbarButton> = {
      previous: {
        tooltip: "Previous",
        icon: nativeImage.createFromPath(path.resolve(getAppRootPath(), "dist/static/img/prev.png")),
        click: this.app.player.previous.bind(this.app.player),
      },
      play: {
        tooltip: "Play",
        icon: nativeImage.createFromPath(path.resolve(getAppRootPath(), "dist/static/img/play.png")),
        click: this.app.player.play.bind(this.app.player),
      },
      pause: {
        tooltip: "Pause",
        icon: nativeImage.createFromPath(path.resolve(getAppRootPath(), "dist/static/img/pause.png")),
        click: this.app.player.pause.bind(this.app.player),
      },
      next: {
        tooltip: "Next",
        icon: nativeImage.createFromPath(path.resolve(getAppRootPath(), "dist/static/img/next.png")),
        click: this.app.player.next.bind(this.app.player),
      },
    }

    this.app.player.on("state_change", (state: PlayerState) => {
      const buttonsToSet = state.isPaused
        ? [buttons.previous, buttons.play, buttons.next]
        : [buttons.previous, buttons.pause, buttons.next]

      this.window.setThumbarButtons(buttonsToSet)
    })

    this.window.setThumbarButtons([buttons.previous, buttons.play, buttons.next])
  }
}

export default MainWindow
