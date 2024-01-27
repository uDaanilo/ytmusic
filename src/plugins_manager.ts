import { ipcMain } from "electron"
import App from "./app"
import { OnRegisterPlugin, Plugin } from "./plugins/plugin"
import { logger } from "./utils/logger"
import { YTMUSIC_BASE_URL } from "./constants"

export class PluginState {
  constructor(
    public readonly name: string,
    public enabled: boolean,
    public readonly instance: Plugin
  ) {}

  public toJSON() {
    return {
      name: this.name,
      enabled: this.enabled,
    }
  }

  public enable() {
    this.instance.enable()
    this.enabled = true
  }

  public disable() {
    this.instance.disable()
    this.enabled = false
  }
}

export class PluginsManager {
  public plugins: Record<string, PluginState> = {}

  constructor(private app: App) {
    this.handleIpcRendererEvents()
  }

  public async registerPlugins(newPlugins: Array<{ new (app: App): Plugin }>) {
    return new Promise<void>(async (resolve) => {
      for (const NewPlugin of newPlugins) {
        const plugin = new NewPlugin(this.app) as Plugin & Partial<OnRegisterPlugin>
        this.plugins[plugin.name] = new PluginState(plugin.name, false, plugin)

        if (typeof plugin.register === "function") {
          logger.info(`Registering ${plugin.name} plugin`)
          await plugin.register()
          logger.info(`Plugin ${plugin.name} registered`)
        }

        if (this.app.settingsManager.settings.plugins[plugin.name]?.enabled) {
          this.enablePlugin(plugin.name)
        }
      }

      resolve()
    })
  }

  public enablePlugin(pluginName: string) {
    const plugin = this.plugins[pluginName]

    if(!this.app.mainWindow.window.webContents.getURL().includes(YTMUSIC_BASE_URL)) return

    plugin.enable()
    logger.info(`Plugin ${plugin.name} enabled`)
    this.app.mainWindow.window.webContents.send(
      "plugins:enabled",
      plugin.toJSON()
    )
  }

  public disablePlugin(pluginName: string) {
    const plugin = this.plugins[pluginName]
    logger.info(`Plugin ${plugin.name} disabled`)
    this.app.mainWindow.window.webContents.send(
      "plugins:disabled",
      plugin.toJSON()
    )
  }

  public async enableAllPlugins() {
    await this.app.electron.whenReady()
    this.app.mainWindow.window.webContents.on("did-finish-load", () => {
      Object.values(this.plugins).forEach((plugin) => {
        this.enablePlugin(plugin.name)
      })
    })
  }

  public disableAllPlugins() {
    Object.values(this.plugins).forEach((plugin) => {
      this.disablePlugin(plugin.name)
    })
  }

  public getState() {
    return Object.values(this.plugins).map((plugin) => {
      return plugin.toJSON()
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
