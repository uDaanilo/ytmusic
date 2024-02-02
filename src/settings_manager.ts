import App from "./app"
import { resolve } from "path"
import * as fs from "fs"
import { YTMUSIC_BASE_URL } from "./constants"
import { ipcMain } from "electron"
import { logger } from "./utils/logger"

interface Settings {
  return_from_last_url: boolean
  last_url?: string
  plugins: {
    [pluginName: string]: {
      enabled: boolean
    }
  }
}

export class SettingsManager {
  private readonly return_from_last_url: boolean
  private readonly plugins: { [pluginName: string]: { enabled: boolean } }
  private readonly last_url: string

  constructor(private app: App) {
    this.handleIpcRendererEvents()
  }

  get settings(): Settings {
    return {
      return_from_last_url: this.return_from_last_url,
      last_url: this.last_url,
      plugins: this.plugins,
    }
  }

  private get settingsPath() {
    if(this.app.electron.isPackaged) {
      return resolve(this.app.electron.getPath('appData'), 'ytmusic', 'settings.json')
    }

    return resolve(__dirname, "static", "settings.json")
  }

  public enable() {
    try {
      logger.info("Loading settings manager")
      this.loadSettings()
      logger.info("Settings manager loaded")
    } catch (err) {
      logger.warn(err)
      Object.assign(this, this.generateDefaultSettings())
      this.save()
    }
  }

  public update(updatedSettings: Partial<Settings>) {
    const newSettings = {
      ...this.settings,
      ...updatedSettings,
      plugins: {
        ...this.settings.plugins,
        ...updatedSettings.plugins,
      },
    }

    if (updatedSettings.plugins) {
      Object.entries(updatedSettings.plugins).forEach(([pluginName, state]) => {
        if (state.enabled) {
          this.app.pluginsManager.enablePlugin(pluginName)
        } else {
          this.app.pluginsManager.disablePlugin(pluginName)
        }
      })
    }

    Object.assign(this, newSettings)
    this.save()
  }

  private loadSettings() {
    let settings = JSON.parse(fs.readFileSync(this.settingsPath, "utf8"))

    if (
      Object.values(settings).length === 0 ||
      Object.values(settings.plugins).length === 0
    ) {
      logger.info("Settings file is empty, generating default settings...")
      settings = this.generateDefaultSettings()
    }

    Object.assign(this, settings)

    this.save()
  }

  public reloadSettings() {
    const defaultSettings = this.generateDefaultSettings()

    Object.assign(this, {
      ...defaultSettings,
      ...this.settings,
      plugins: {
        ...defaultSettings.plugins,
        ...this.settings.plugins,
      },
    })
    this.save()
  }

  private generateDefaultSettings() {
    const defaultSettings = {
      return_from_last_url: true,
      last_url: YTMUSIC_BASE_URL,
      plugins: {},
    }

    this.app.pluginsManager.getState().forEach((plugin) => {
      if(!plugin.canBeEnabled) return

      defaultSettings.plugins[plugin.name] = {
        enabled: plugin.enabled,
      }
    })

    return defaultSettings
  }

  private save() {
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings))
  }

  public handleIpcRendererEvents() {
    ipcMain.handle("settings:get-state", () => {
      const plugins = {}

      Object.entries(this.plugins).forEach(([pluginName, state]) => {
        plugins[pluginName] = {
          label: `Enable ${pluginName} plugin`,
          enabled: state.enabled,
          isPlugin: true,
        }
      })

      return {
        return_from_last_url: {
          label: "Return from last song",
          value: this.return_from_last_url,
        },
        ...plugins,
      }
    })

    ipcMain.on("settings:update", (_, updatedSetting: any) => {
      this.update(updatedSetting)
    })
  }
}
