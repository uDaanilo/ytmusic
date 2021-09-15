import { Tray } from "electron"
import MainWindow from "./windows/main"

class App {
  public app: Electron.App
  public mainWindow: MainWindow
  public tray: Tray

  constructor(app: Electron.App) {
    this.app = app

    this.app.whenReady().then(() => this.whenReady())

    this.app.on('window-all-closed', () => this.app.quit())
  }

  private whenReady() {
    this.createMainWindow()
    this.createPlayerWindow()
    this.createTray()
  }

  private createMainWindow() {
    this.mainWindow = new MainWindow(this.app)
  }

  private createPlayerWindow() {

  }

  private createTray() {
    // this.tray = new Tray()
  }
}

export default App