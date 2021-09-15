import { BrowserWindow, ipcMain } from "electron"
import { readFileSync } from "fs"
import { resolve } from 'path'

class MainWindow {
  private app: Electron.App
  private window: Electron.BrowserWindow

  constructor(app: Electron.App) {
    this.app = app
    this.init()

    this.window.webContents.openDevTools()

    this.window.webContents.on('did-finish-load', () => {
      this.injectCSS()
      this.setTitleBar()
    })

    ipcMain.on('minimize-window', () => this.minimizeWindow())
    ipcMain.on('close-window', (e, exit) => this.closeWindow(exit))
  }
  
  private init() {
    this.window = new BrowserWindow({
      width: 1280,
      height: 720,
      frame: false,
      backgroundColor: '#000',
      show: true,
      webPreferences: {
        preload: resolve(__dirname, '..', '..', 'static', 'scripts', 'preload.js'),
        contextIsolation: true
      }
    })

    this.window.loadURL('https://music.youtube.com', { userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/71.0' })
  }

  private setTitleBar() {
    const script = readFileSync(resolve(__dirname, '..', '..', 'static', 'scripts', 'setTitleBar.js'))

    this.window.webContents.executeJavaScript(script.toString())
  }

  private injectCSS() {
    const css = readFileSync(resolve(__dirname, '..', '..', 'static', 'css', 'main.css'))

    this.window.webContents.insertCSS(css.toString())
  }

  public minimizeWindow() {
    this.window.hide()
  }

  public closeWindow(exit: boolean = false) {
    if(exit) {
      this.window.close()
      return
    }

    this.window.minimize()
  }
}

export default MainWindow