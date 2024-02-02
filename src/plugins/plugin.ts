import App from "../app"
import { YTMUSIC_BASE_URL } from "../constants"

export interface OnRegisterPlugin {
  register(): void | Promise<void>
}

export interface OnEnabledPlugin {
  enable(): void
}

export interface OnDisabledPlugin {
  disable(): void
}

export abstract class Plugin {
  constructor(protected app: App) {
    if (!this.constructor.name.includes("Plugin"))
      throw new Error("Plugin name must have 'Plugin'")
  }

  get isAppRunningOutsideYoutube() {
    return !this.app.mainWindow.window.webContents.getURL().includes(YTMUSIC_BASE_URL)
  }

  public onWebContentsDidFinishLoad(callback: Function) {
    this.app.pluginsManager.onWebContentsDidFinishLoad(callback)
  }

  public get name() {
    return this.constructor.name.replace("Plugin", "")
  }
}
