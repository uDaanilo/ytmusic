import path from "node:path"
import App from "../app"
import { BrowserWindow } from "electron/main"
import { readFileSync } from "fs"
import { getAppRootPath } from "../utils/getAppRootPath"

export class BaseWindow {
  public readonly window: Electron.BrowserWindow

  constructor(
    protected app: App,
    options: Electron.BrowserWindowConstructorOptions
  ) {
    this.window = new BrowserWindow(options)
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
