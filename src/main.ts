import { ipcMain, Tray } from "electron"
import MainWindow from "./windows/main"
import PlayerWindow from "./windows/player"

class App {
  public app: Electron.App
  public mainWindow: MainWindow
  public playerWindow: PlayerWindow
  public tray: Tray

  constructor(app: Electron.App) {
    this.app = app

    this.app.whenReady()
      .then(() => this.whenReady())

    this.app.on('window-all-closed', () => this.app.quit())
    ipcMain.on('track-update', (e, track) => this.playerWindow.win.webContents.send('track-update', track))
  }
  
  private whenReady() {
    this.createMainWindow()
    this.createPlayerWindow()
    this.createTray()
    
    this.mainWindow.win.on('closed', () => this.playerWindow.win.destroy())
  }

  private createMainWindow() {
    this.mainWindow = new MainWindow(this.app)
  }

  private createPlayerWindow() {
    this.playerWindow = new PlayerWindow(this.app)
  }

  private createTray() {
    // this.tray = new Tray()
  }
}

export default App