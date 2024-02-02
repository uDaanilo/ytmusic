import { ipcMain } from "electron"
import App from "./app"
import { EventEmitter } from "node:events"
import { IgnoreWhenRunningOutsideYoutube } from "./utils/ignoreWhenOutsideYoutube"

export interface Track {
  id: string
  title: string
  author: string
  length: string
  thumbnailUrl: string
}

export interface PlayerState {
  track: Track
  currentTime: number
  isPaused: boolean
}

export class Player extends EventEmitter {
  private _currentTrack: Track
  private _isPlaying: boolean

  constructor(private app: App) {
    super()
    this.handleIpcRendererEvents()
  }

  get currentTrack(): Track {
    return this._currentTrack
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  @IgnoreWhenRunningOutsideYoutube()
  public async play() {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerApi.playVideo()
    `)
  }

  @IgnoreWhenRunningOutsideYoutube()
  public async pause() {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerApi.pauseVideo()
    `)
  }

  @IgnoreWhenRunningOutsideYoutube()
  public async next() {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerApi.nextVideo()
    `)
  }

  @IgnoreWhenRunningOutsideYoutube()
  public async previous() {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerApi.previousVideo()
    `)
  }

  @IgnoreWhenRunningOutsideYoutube()
  public async injectWatchScripts() {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerController.playerApi.addEventListener('onStateChange', (state) => {
        const track = {
          id: window.player.__data.playerResponse.videoDetails.videoId,
          title: window.player.__data.playerResponse.videoDetails.title,
          author: window.player.__data.playerResponse.videoDetails.author,
          length: +window.player.__data.playerResponse.videoDetails.lengthSeconds,
          thumbnailUrl: window.player.__data.playerResponse.videoDetails.thumbnail.thumbnails.reduce((prev, current) => prev.height > current.height ? prev : current, "")?.url
        }

        window.api.emit('player:stateChange', {
          track,
          currentTime: window.player.playerApi.getCurrentTime(),
          isPlaying: state === 1,
          isPaused: state === 2,
        })
      })
    `)
  }

  public handleIpcRendererEvents() {
    ipcMain.on("player:stateChange", (_event, state: { track: Track, isPlaying: boolean, isPaused: boolean, currentTime: number }) => {
      this.emit('state_change', {
        track: state.track,
        currentTime: state.currentTime,
        isPaused: state.isPaused
      } as PlayerState)

      this._currentTrack = state.track
      this._isPlaying = state.isPlaying
    })
  }
}