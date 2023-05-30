import { ipcMain, Menu, nativeImage, session, Tray } from "electron"
import MainWindow from "./windows/main"
import PlayerWindow from "./windows/player"
import { resolve } from 'path'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from "cross-fetch"
import RPC from './rpc'
import Config from "./config"

class App {
  public app: Electron.App
  public mainWindow: MainWindow
  public playerWindow: PlayerWindow
  public tray: Tray
  public appIcon = resolve(__dirname, 'static', 'img', 'icon.png')
  public rpc: RPC | null
  public config = new Config()

  constructor(app: Electron.App) {
    this.app = app

    if(this.config.value.enableRPC)
      this.rpc = new RPC()

    this.app.whenReady()
      .then(() => this.whenReady())

    this.app.on('window-all-closed', () => this.app.quit())

    ipcMain.on('track-update', (e, track) => {
      this.playerWindow.win.webContents.send('track-update', track)

      if(!track.title) return
      if(!this.rpc) return

      this.rpc.setActivity({
        details: track.title,
        state: track.author,
        length: track.length - track.currentTime,
        playing: track.playing,
        largeImage: track.thumbnail
      })
    })
  }
  
  private async whenReady() {
    await this.enableAdBlock()
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
        label: 'Discord Rich Precense',
        type: 'checkbox',
        checked: this.config.value.enableRPC,
        click: () => {
          const enableRPC = contextMenu.items[1].checked

          this.config.set({ enableRPC })

          if(enableRPC) {
            this.rpc = new RPC()
          } else {
            this.rpc.destroy()

            this.rpc = null
          }
        }
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

  private async enableAdBlock() {
    const blocker = await ElectronBlocker.fromPrebuiltAdsOnly(fetch)

    blocker.enableBlockingInSession(session.defaultSession)
  }
}

export default App