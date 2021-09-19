import { BrowserWindow, ipcMain } from "electron"
import { resolve } from 'path'

class PlayerWindow {
  private app: Electron.App
  public win: BrowserWindow
  private appIcon: string

  constructor(app: Electron.App, icon: string) {
    this.app = app
    this.appIcon = icon

    this.init()

    this.win.webContents.on('did-finish-load', () => {
      process.argv.includes('NODE_ENV=development') ? this.win.webContents.openDevTools() : null
    })

    this.win.on('close', e => e.preventDefault())

    ipcMain.on('show-miniplayer', () => this.win.show())
    ipcMain.on('hide-miniplayer', () => this.win.hide())
  }

  private init() {
    this.win = new BrowserWindow({
      width: 456,
      height: 275,
      frame: false,
      resizable: false,
      maximizable: false,
      show: false,
      transparent: true,
      alwaysOnTop: true,
      icon: this.appIcon,
      webPreferences: {
        contextIsolation: true,
        preload: resolve(__dirname, '..', 'static', 'scripts', 'playerPreload.js'),
        nativeWindowOpen: true
      }
    })

    this.win.loadFile(resolve(__dirname, '..', 'static', 'player.html'))
  }

}

export default PlayerWindow