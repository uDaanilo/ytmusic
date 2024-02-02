import path from "node:path"
import App from "../app"
import { BrowserWindow } from "electron/main"
import { readFileSync } from "fs"
import { getAppRootPath } from "../utils/getAppRootPath"

export class BaseWindow {
  public readonly window: Electron.BrowserWindow
  private webContentsLoaded = false
  private onWebContentsDidFinishLoadCallbacks: Array<Function> = []

  constructor(
    protected app: App,
    options: Electron.BrowserWindowConstructorOptions
  ) {
    this.window = new BrowserWindow(options)
    this.handleOnWebContentsDidFinishLoadCallbacks()
  }

  public onWebContentsDidFinishLoad(callback: Function) {
    if (this.webContentsLoaded) {
      callback()
      return
    }

    this.onWebContentsDidFinishLoadCallbacks.push(callback)
  }

  private handleOnWebContentsDidFinishLoadCallbacks() {
    this.app.electron.whenReady().then(() => {
      this.window.webContents.on('did-start-loading', () => {
        this.webContentsLoaded = false
      })

      this.window.webContents.on("did-finish-load", async () => {
        this.webContentsLoaded = true
        this.onWebContentsDidFinishLoadCallbacks.forEach((cb) => cb())
      })
    })
  }

  public async injectCSSFile(filePath: string) {
    const css = readFileSync(path.resolve(getAppRootPath(), filePath))
    return await this.window.webContents.insertCSS(css.toString())
  }

  public async injectJavascriptFile(filePath: string) {
    const js = readFileSync(path.resolve(getAppRootPath(), filePath))
    return await this.window.webContents.executeJavaScript(js.toString() + ";0")
  }
}
