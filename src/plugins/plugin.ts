import App from "../app"
import { YTMUSIC_BASE_URL } from "../constants"

export interface OnRegisterPlugin {
  register(): Promise<void> | void
}

export abstract class Plugin {
  constructor(protected app: App) {
    if (!this.constructor.name.includes("Plugin"))
      throw new Error("Plugin name must have 'Plugin'")
  }

  get isRunningOutsideYoutube() {
    return !this.app.mainWindow.window.webContents.getURL().includes(YTMUSIC_BASE_URL)
  }

  public get name() {
    return this.constructor.name.replace("Plugin", "")
  }

  public enable() {
    throw new Error("Method not implemented.")
  }

  public disable() {
    throw new Error("Method not implemented.")
  }

}
