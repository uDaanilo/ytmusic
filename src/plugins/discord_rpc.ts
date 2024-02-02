import App from "../app";
import { PlayerState, Track } from "../player";
import { OnDisabledPlugin, OnEnabledPlugin, Plugin } from "./plugin";
import DiscordRPC from 'discord-rpc'

export class DiscordRpcPlugin extends Plugin implements OnEnabledPlugin, OnDisabledPlugin {
  private readonly CLIENT_ID = '889167666068197376'
  private readonly PAUSED_IMAGE_KEY = 'pause'
  private rpc: DiscordRPC.Client | null = null

  constructor(app: App) {
    super(app)
  }

  private onNewTrackListener = (state: PlayerState) => {
    this.setActivity(state)
  }

  public enable(): void {
    this.rpc = new DiscordRPC.Client({ transport: 'ipc' })
    this.rpc.login({ clientId: this.CLIENT_ID })
    this.app.player.on('state_change', this.onNewTrackListener)
  }

  public disable(): void {
    this.rpc.destroy()
    this.app.player.off('state_change', this.onNewTrackListener)
  }

  private setActivity(state: PlayerState) {
    const activity: DiscordRPC.Presence = {
      details: state.track.title,
      state: state.track.author,
      startTimestamp: Date.now(),
      endTimestamp: Date.now() + (parseInt(state.track.length) * 1000) - (state.currentTime * 1000),
      largeImageKey: state.track.thumbnailUrl,
      largeImageText: 'YTMusic',
    }

    if(state.isPaused) {
      delete activity.startTimestamp
      delete activity.endTimestamp

      activity.smallImageKey = this.PAUSED_IMAGE_KEY
      activity.smallImageText = 'PAUSED'
    }

    this.rpc.setActivity(activity)
  }
}