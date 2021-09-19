import RPC from 'discord-rpc'

class DiscordRPC {
  private clientId = '889167666068197376'
  private activity = {
    details: '',
    state: '',
    startTimestamp: null,
    endTimestamp: null,
    largeImageKey: 'main',
    largeImageText: 'YTMusic',
    smallImageKey: '',
    smallImageText: ''
  }
  public rpc = new RPC.Client({ transport: 'ipc' })

  constructor() {
    this.login()
  }

  async setActivity({ details, state, length, playing }) {
    if(isNaN(length)) return

    this.activity = { ...this.activity, details, state }

    if(playing) {
      delete this.activity.smallImageKey
      delete this.activity.smallImageText

      this.activity.startTimestamp = Date.now()
      this.activity.endTimestamp = Date.now() + (length * 1000)
    } else {
      delete this.activity.startTimestamp
      delete this.activity.endTimestamp

      this.activity.smallImageKey = 'pause'
      this.activity.smallImageText = 'PAUSED'
    }

    this.rpc.setActivity(this.activity)
  }

  destroy() {
    this.rpc.destroy()
    this.rpc = null
  }

  login() {
    this.rpc.login({ clientId: this.clientId })
  }

}

export default DiscordRPC