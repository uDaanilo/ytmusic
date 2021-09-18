import { ipcMain, Menu, nativeImage, Tray } from "electron"
import MainWindow from "./windows/main"
import PlayerWindow from "./windows/player"
import { resolve } from 'path'

class App {
  public app: Electron.App
  public mainWindow: MainWindow
  public playerWindow: PlayerWindow
  public tray: Tray
  public appIcon = resolve('static', 'img', 'icon.png')

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
    this.mainWindow = new MainWindow(this.app, this.appIcon)
  }

  private createPlayerWindow() {
    this.playerWindow = new PlayerWindow(this.app, this.appIcon)
  }

  private createTray() {
    this.tray = new Tray(this.appIcon)
    const icon = nativeImage.createFromPath(this.appIcon).resize({ width: 16, height: 16 })

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'YTMusic',
        type: 'normal',
        enabled: false,
        icon
      },
      {
        label: 'Quit',
        type: 'normal',
        click: () => {
          this.app.exit()
        }
      },
    ])

    this.tray.setContextMenu(contextMenu)
  }
}

export default App