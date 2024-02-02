import MainWindow from "./windows/main"
import { PluginsManager } from "./plugins_manager"
import { SettingsManager } from "./settings_manager"
import { logger } from "./utils/logger"
import { Player } from "./player"

class App {
  public electron: Electron.App
  public mainWindow: MainWindow
  public pluginsManager = new PluginsManager(this)
  public settingsManager: SettingsManager
  public player: Player

  constructor(electron: Electron.App) {
    this.electron = electron
    this.electron.whenReady().then(async () => {
      logger.info("Starting app")
      this.settingsManager = new SettingsManager(this)
      this.player = new Player(this)
      this.settingsManager.enable()
      this.registerWindows()

      this.mainWindow.onWebContentsDidFinishLoad(this.player.injectWatchScripts.bind(this.player))
    })
  }

  public static start(electron: Electron.App): App {
    return new App(electron)
  }

  private registerWindows() {
    this.mainWindow = new MainWindow(this)
  }

  public registerPlugins(newPlugin: Parameters<PluginsManager["registerPlugins"]>[0]): App {
    this.electron.whenReady().then(async () => {
      await this.pluginsManager.registerPlugins(newPlugin)
      this.settingsManager.reloadSettings()
    })

    return this
  }
}

export default App
