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
  isVideo: boolean
}

export class Player extends EventEmitter {
  private _currentTrack: Track
  private _isPlaying: boolean
  private _currentState: PlayerState

  constructor(private app: App) {
    super()
    this.handleIpcRendererEvents()
  }

  get currentTrack(): Track {
    return this._currentTrack
  }

  get currentState(): PlayerState {
    return this._currentState
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  public async getCurrentTime(): Promise<number> {
    return await this.app.mainWindow.window.webContents.executeJavaScript(`getState().currentTime`)
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
  public async seek(value: number) {
    await this.app.mainWindow.window.webContents.executeJavaScript(`
      window.player.playerApi.seekTo(${value})
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
      const PLAYER_STATE_CODES = {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5
      }

      function getState() {
        const playerState = window.player.playerApi.getPlayerState()

        const track = {
          id: window.player.inst.__data.playerResponse.videoDetails.videoId,
          title: window.player.inst.__data.playerResponse.videoDetails.title,
          author: window.player.inst.__data.playerResponse.videoDetails.author,
          length: +window.player.inst.__data.playerResponse.videoDetails.lengthSeconds,
          thumbnailUrl: window.player.inst.__data.playerResponse.videoDetails.thumbnail.thumbnails.reduce((prev, current) => prev.height > current.height ? prev : current, "")?.url
        }

        return {
          track,
          currentTime: window.player.playerApi.getCurrentTime(),
          isPlaying: playerState === PLAYER_STATE_CODES.PLAYING,
          isPaused: playerState === PLAYER_STATE_CODES.PAUSED || playerState === PLAYER_STATE_CODES.BUFFERING,
          isVideo: window.player.playerApi.getSize().width > 0
        }
      }

      window.api.on('player:get_state', () => window.api.emit('player:state_change', getState()))
      console.log(window.player.playerController.playerApi.addEventListener)
      window.player.playerController.playerApi.addEventListener('onStateChange', (state) => {
        if(state !== PLAYER_STATE_CODES.PLAYING && state !== PLAYER_STATE_CODES.PAUSED && state !== PLAYER_STATE_CODES.BUFFERING) return

        window.api.emit('player:state_change', getState())
      })
    `)
  }

  public handleIpcRendererEvents() {
    ipcMain.on("player:state_change", async (_event, state: PlayerState & { isPlaying: boolean }) => {
      this.emit('state_change', {
        track: state.track,
        currentTime: state.currentTime,
        isPaused: state.isPaused,
        isVideo: state.isVideo,
      } as PlayerState)

      this._currentState = state
      this._currentTrack = state.track
      this._isPlaying = state.isPlaying
    })
  }
}