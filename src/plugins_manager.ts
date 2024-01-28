import App from "./app"
import { ipcMain } from "electron"
import { OnDisabledPlugin, OnEnabledPlugin, OnRegisterPlugin, Plugin } from "./plugins/plugin"
import { logger } from "./utils/logger"

export class PluginState {
  constructor(
    public readonly name: string,
    public enabled: boolean,
    public readonly instance: Plugin & Partial<OnRegisterPlugin & OnEnabledPlugin & OnDisabledPlugin>
  ) {}

  get canBeEnabled() {
    return typeof this.instance.enable === "function"
  }

  public toJSON() {
    return {
      name: this.name,
      enabled: this.enabled,
      canBeEnabled: this.canBeEnabled,
    }
  }

  public enable() {
    this.instance.enable?.()
    this.enabled = true
  }

  public disable() {
    this.instance.disable?.()
    this.enabled = false
  }
}

export class PluginsManager {
  public plugins: Record<string, PluginState> = {}
  private onWebContentsDidFinishLoadCallbacks: Array<Function> = []

  constructor(private app: App) {
    this.handleIpcRendererEvents()
  }

  public async registerPlugins(newPlugins: Array<{ new (app: App): Plugin }>) {
    return new Promise<void>((resolve) => {
      for (const NewPlugin of newPlugins) {
        const plugin = new NewPlugin(this.app) as Plugin & Partial<OnRegisterPlugin>
        this.plugins[plugin.name] = new PluginState(plugin.name, false, plugin)

        if (typeof plugin.register === "function") {
          logger.info(`Registering ${plugin.name} plugin`)
          plugin.register()
          logger.info(`Plugin ${plugin.name} registered`)
        }

        if (this.app.settingsManager.settings.plugins[plugin.name]?.enabled) {
          this.enablePlugin(plugin.name)
        }
      }

      this.handleOnWebContentsDidFinishLoadCallbacks()

      resolve()
    })
  }

  public enablePlugin(pluginName: string) {
    const plugin = this.plugins[pluginName]

    if(plugin.instance.isAppRunningOutsideYoutube) return

    plugin.enable()
    logger.info(`Plugin ${plugin.name} enabled`)
    this.app.mainWindow.window.webContents.send("plugins:enabled", plugin.toJSON())
  }

  public disablePlugin(pluginName: string) {
    const plugin = this.plugins[pluginName]
    logger.info(`Plugin ${plugin.name} disabled`)
    this.app.mainWindow.window.webContents.send("plugins:disabled", plugin.toJSON())
  }

  public getState() {
    return Object.values(this.plugins).map((plugin) => {
      return plugin.toJSON()
    })
  }

  public onWebContentsDidFinishLoad(callback: Function) {
    this.onWebContentsDidFinishLoadCallbacks.push(callback)
  }

  private handleOnWebContentsDidFinishLoadCallbacks() {
    this.app.electron.whenReady().then(() => {
      this.app.mainWindow.window.webContents.on("did-finish-load", async () => {
        for(const callback of this.onWebContentsDidFinishLoadCallbacks) {
          await callback()
        }
      })
    })
  }

  public handleIpcRendererEvents() {
    ipcMain.handle("plugins:get-state", () => {
      return this.getState()
    })

    ipcMain.on("plugins:enable", (_, pluginName: string) => {
      const plugin = this.plugins[pluginName]
      plugin.enable()
      plugin.enabled = true
      this.app.mainWindow.window.webContents.send(
        "plugins:enabled",
        plugin.toJSON()
      )
    })

    ipcMain.on("plugins:disable", (_, pluginName: string) => {
      const plugin = this.plugins[pluginName]
      plugin.disable()
      plugin.enabled = false
      this.app.mainWindow.window.webContents.send(
        "plugins:disabled",
        plugin.toJSON()
      )
    })
  }
}
