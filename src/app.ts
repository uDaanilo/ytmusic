import MainWindow from "./windows/main"
import { PluginsManager } from "./plugins_manager"
import { SettingsManager } from "./settings_manager"
import { logger } from "./utils/logger"

class App {
  public electron: Electron.App
  public mainWindow: MainWindow
  public pluginsManager = new PluginsManager(this)
  public settingsManager: SettingsManager

  private constructor(electron: Electron.App) {
    this.electron = electron
    this.electron.whenReady().then(async () => {
      logger.info("Starting app")
      this.settingsManager = new SettingsManager(this)
      this.settingsManager.enable()
      this.registerWindows()
    })
  }

  public static start(electron: Electron.App) {
    return new App(electron)
  }

  private registerWindows() {
    this.mainWindow = new MainWindow(this)
  }

  public registerPlugins(
    newPlugin: Parameters<PluginsManager["registerPlugins"]>[0]
  ) {
    this.electron.whenReady().then(async () => {
      await this.pluginsManager.registerPlugins(newPlugin)
      this.settingsManager.reloadSettings()
    })
  }
}

export default App
