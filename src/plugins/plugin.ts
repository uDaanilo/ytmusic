import App from "../app"
import { isRunningOutsideYoutube } from "../utils/ignoreWhenOutsideYoutube"

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
    return isRunningOutsideYoutube()
  }

  public onWebContentsDidFinishLoad(callback: Function) {
    this.app.pluginsManager.onWebContentsDidFinishLoad(callback)
  }

  public get name() {
    return this.constructor.name.replace("Plugin", "")
  }
}
