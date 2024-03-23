import { Server, Socket } from "socket.io";
import { OnDisabledPlugin, OnEnabledPlugin, Plugin } from "./plugin";
import { logger } from "../utils/logger";
import { PlayerState, Track } from "../player";
import ytdl from "ytdl-core";

export class WebsocketPlugin extends Plugin implements OnEnabledPlugin, OnDisabledPlugin {
  private ws: Server = null
  private currentTrack: Track = null
  private currentDownloadLinks: string[] = []

  public enable() {
    this.ws = new Server(40002, {
      cors: {
        origin: "*",
      },
    })

    this.listenEvents()
    this.app.player.on("state_change", this.emitPlayerState)
    logger.info("Websocket server started")
  }

  public disable(): void {
    this.ws?.close()
    this.app.player.off("state_change", this.emitPlayerState)
    logger.info("Websocket server stopped")
  }

  private async getDownloadLinks(videoId: string): Promise<string[]> {
    const videoInfo = await ytdl.getInfo(videoId)
    return videoInfo.formats
      .filter(v => !v.hasAudio && v.width > 1000 && !v.isHLS && !v.isDashMPD)
      .map(v => v.url)
  }

  private async formatState(state: PlayerState) {
    if(state.isVideo && state.track.id !== this.currentTrack?.id) {
      this.currentDownloadLinks = await this.getDownloadLinks(state.track.id)
    }

    return {
      track: state.track,
      currentTime: state.currentTime,
      isPaused: state.isPaused,
      isVideo: state.isVideo,
      videoSources: this.currentDownloadLinks
    }
  }

  private emitPlayerState = async (state: PlayerState) => {
    this.ws.emit("state_change", await this.formatState(state))
    this.currentTrack = state.track
  }

  private async emitCurrentState(socket: Socket) {
    if(this.app.player.currentState) {
      socket.emit('state_change', await this.formatState({
        ...this.app.player.currentState,
        currentTime: await this.app.player.getCurrentTime()
      }))

      this.currentTrack = this.app.player.currentState.track
    }
  }

  private listenEvents() {
    this.ws.on("connection", (socket) => {
      logger.info(`New user on websocket: ${socket.id}`)
      this.emitCurrentState(socket)

      socket.on('play', () => this.app.player.play())
      socket.on('pause', () => this.app.player.pause())
      socket.on('next', () => this.app.player.next())
      socket.on('previous', () => this.app.player.previous())
      socket.on('seek', (value: number) => this.app.player.seek(value))
      socket.on('get_state', async (ack) => {
        const currentTime = await this.app.player.getCurrentTime()
        ack(currentTime)
      })

      socket.on("disconnect", () => {
        logger.info(`User disconnected from websocket: ${socket.id}`)
      })
    })
  }
}