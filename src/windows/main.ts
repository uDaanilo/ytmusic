import { BrowserWindow, ipcMain, nativeImage } from "electron"
import { BaseWindow } from "./base"
import { YTMUSIC_BASE_URL, YTMUSIC_ICON_PATH } from "../constants"
import * as path from "path"
import { readFile } from "node:fs/promises"
import App from "../app"
import { logger } from "../utils/logger"
import { getAppRootPath } from "../utils/getAppRootPath"

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
        preload: path.resolve(
          getAppRootPath(),
          "dist",
          "static",
          "windows",
          "main",
          "preload.js"
        ),
      },
    })

    this.init()
    this.handleIpcRendererEvents()
  }

  private async init() {
    await this.window.loadURL(this.getLastUrl())


    if(!this.app.electron.isPackaged) {
      setTimeout(() => {
        this.window.webContents.openDevTools()
      }, 3e3)
    }

    await this.injectFrontendScripts()
    this.window.show()

    if (this.app.settingsManager.settings.return_from_last_url) {
      this.watchLastUrl()
    }
  }

  private async injectAppSettingsHtmlTemplate() {
    const htmlTemplate = await readFile(
      "dist/static/windows/main/settings_template.html"
    )
    await this.window.webContents.executeJavaScript(`
      var exports = {}

      const el = document.createElement('div')
      el.setAttribute('id', 'ytm-app-settings')
      el.innerHTML = \`${htmlTemplate}\`
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
    if (!this.app.settingsManager.settings.return_from_last_url)
      return YTMUSIC_BASE_URL

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
}

export default MainWindow
