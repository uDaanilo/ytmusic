import { BrowserWindow, ipcMain } from "electron"
import { readFileSync } from "fs"
import { resolve } from 'path'

class MainWindow {
  private app: Electron.App
  public win: Electron.BrowserWindow
  private appIcon: string

  constructor(app: Electron.App, icon: string) {
    this.app = app
    this.appIcon = icon
    
    this.init()

    this.win.webContents.on('did-finish-load', () => {
      process.argv.includes('NODE_ENV=development') ? this.win.webContents.openDevTools() : null

      this.injectCSS()
      this.setTitleBar()
      this.insertTrackWatcher()
    })

    ipcMain.on('minimize-window', () => this.minimizeWindow())
    ipcMain.on('close-window', (e, exit) => this.closeWindow(exit))

    ipcMain.on('play-pause', () => this.playPause())
    ipcMain.on('next-track', () => this.nextTrack())
    ipcMain.on('previous-track', () => this.previousTrack())

    ipcMain.on('show-miniplayer', () => this.win.hide())
    ipcMain.on('hide-miniplayer', () => this.win.show())
  }
  
  private init() {
    this.win = new BrowserWindow({
      width: 1280,
      height: 720,
      frame: false,
      backgroundColor: '#000',
      show: false,
      icon: this.appIcon,
      webPreferences: {
        preload: resolve(__dirname, '..', 'static', 'scripts', 'mainPreload.js'),
        contextIsolation: true,
      }
    })

    this.win.loadURL('https://music.youtube.com', { userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/71.0' })
  }

  private async setTitleBar() {
    const script = readFileSync(resolve(__dirname, '..', 'static', 'scripts', 'setTitleBar.js'))

    await this.win.webContents.executeJavaScript(script.toString())

    this.win.show()
  }

  private insertTrackWatcher() {
    const script = readFileSync(resolve(__dirname, '..', 'static', 'scripts', 'trackWatcher.js'))

    this.win.webContents.executeJavaScript(script.toString())
  }

  private injectCSS() {
    const css = readFileSync(resolve(__dirname, '..', 'static', 'css', 'main.css'))

    this.win.webContents.insertCSS(css.toString())
  }

  public minimizeWindow() {
    this.win.minimize()
  }

  public closeWindow(exit: boolean = false) {
    if(exit) {
      this.win.destroy()
      return
    }

    ipcMain.emit('show-miniplayer')
  }

  public playPause() {
    this.win.webContents.executeJavaScript(`
      document.querySelector('#play-pause-button').click()
    `)
  }

  public nextTrack() {
    this.win.webContents.executeJavaScript(`
      document.querySelector('.next-button').click()
    `)
  }

  public previousTrack() {
    this.win.webContents.executeJavaScript(`
      document.querySelector('.previous-button').click()
    `)
  }
}

export default MainWindow