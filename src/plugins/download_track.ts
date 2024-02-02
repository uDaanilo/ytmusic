import { ipcMain, session } from "electron"
import App from "../app"
import { OnRegisterPlugin, Plugin } from "./plugin"
import path from 'path'
import ytdl from "ytdl-core"
import ffmpeg from 'ffmpeg-static'
import childProcess from "child_process"
import { dialog } from "electron"
import { logger } from "../utils/logger"
import { YTMUSIC_BASE_URL } from "../constants"


export class DownloadTrackPlugin extends Plugin implements OnRegisterPlugin {
  constructor(app: App) {
    super(app)
    this.handleIpcRendererEvents()
  }

  public register(): void {
    this.onWebContentsDidFinishLoad(() => {
      if(this.isAppRunningOutsideYoutube) return


      this.app.mainWindow.window.webContents.executeJavaScript(`
        const iconButtonEl = document.createElement('div')
        async function download() {
          const selectedPath = await window.api.invoke('download-track-plugin:select-path')
          if(!selectedPath) return
          window.api.emit('download-track-plugin:download', window.player.playerApi.getVideoData().video_id, selectedPath[0])
        }

        function setDownloadIconButtonToDefaultState() {
          iconButtonEl.classList.add('ytm-icon-button')
          iconButtonEl.style.flex = 'none'
          iconButtonEl.innerHTML = \`
            <div class="ytm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px">
                <g><rect fill="none" height="24" width="24"/></g><g><g><path d="M12,2C6.49,2,2,6.49,2,12s4.49,10,10,10s10-4.49,10-10S17.51,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M14.59,8.59L16,10l-4,4l-4-4l1.41-1.41L11,10.17V6h2v4.17L14.59,8.59z M17,17H7v-2h10V17z"/></g></g>
              </svg>
            </div>
          \`
          iconButtonEl.addEventListener('click', download)
        }

        window.api.on('download-track-plugin:progress', () => {
          iconButtonEl.className = ''
          iconButtonEl.style.flex = ''
          iconButtonEl.innerHTML = ''
          iconButtonEl.style.display = 'flex'
          iconButtonEl.style.justifyContent = 'center'
          iconButtonEl.style.alignItems = 'center'
          iconButtonEl.style.padding = '8px'
          iconButtonEl.style.width = '40px'
          iconButtonEl.style.height = '40px'
          iconButtonEl.style.boxSizing = 'border-box'
          iconButtonEl.removeEventListener('click', download)
          iconButtonEl.appendChild(window.YTMUtils.createCircularProgressElement(24))
        })

        window.api.on('download-track-plugin:downloaded', () => {
          setDownloadIconButtonToDefaultState()
        })

        setDownloadIconButtonToDefaultState()
        document.querySelector('.right-controls-buttons').appendChild(iconButtonEl)
        ;0
      `)

    })
  }

  private async downloadTrack(trackId: string, selectedPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.app.mainWindow.window.webContents.send('download-track-plugin:progress')
      const trackUrl = `https://youtube.com/watch?v=${trackId}`
  
      const cookies = await session.defaultSession.cookies.get({ url: YTMUSIC_BASE_URL })
      const ytdlRequestOptions = {
        headers: {
          'cookie': cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
        }
      }
      const trackInfo = await ytdl.getBasicInfo(trackUrl, {
        requestOptions: ytdlRequestOptions
      })
      const stream = ytdl(trackUrl, {
        requestOptions: ytdlRequestOptions,
        quality: 'highestaudio',
      })
  
      const fileName = trackInfo.videoDetails.title.replace(/[\\/:*?"<>|]/g, '')
      const filePath = path.resolve(selectedPath, `${fileName}.mp3`)
  
      const { stdin, stderr, stdout } = childProcess.execFile(ffmpeg, [
        '-i', '-',
        '-f', 'mp3',
        '-vn', filePath
      ])
  
      stdin.on("error", (err) => {
        reject(err)
      })
  
      stderr.on("error", (err) => {
        reject(err)
      })
  
      stdout.on('end', () => {
        this.app.mainWindow.window.webContents.send('download-track-plugin:downloaded')
        resolve()
      })
  
      stream.pipe(stdin)
    })
  }

  private handleIpcRendererEvents() {
    ipcMain.handle("download-track-plugin:select-path", () => {
      return dialog.showOpenDialogSync({
        title: "Select path",
        defaultPath: this.app.electron.getPath("desktop"),
        properties: ['openDirectory']
      })
    })

    ipcMain.on("download-track-plugin:download", async (_, trackId: string, selectedPath: string) => {
      try {
        await this.downloadTrack(trackId, selectedPath)
      } catch (err) {
        logger.error(err)
        this.app.mainWindow.window.webContents.send('download-track-plugin:downloaded')
        this.showErrorBoxDialog()
      }
    })
  }

  private showErrorBoxDialog() {
    dialog.showErrorBox('Error', 'An error occurred while downloading the track')
  }
}