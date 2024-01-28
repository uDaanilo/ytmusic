import App from "../app"
import { OnDisabledPlugin, OnEnabledPlugin, OnRegisterPlugin, Plugin } from "./plugin"

export class NormalizeVolumePlugin extends Plugin implements OnRegisterPlugin, OnEnabledPlugin, OnDisabledPlugin {
  private isRegistered = false
  constructor(app: App) {
    super(app)
  }

  public register() {
    this.onWebContentsDidFinishLoad(async () => {
      this.isRegistered = true
      if(this.isAppRunningOutsideYoutube) return

      await this.app.mainWindow.window.webContents.executeJavaScript(`
        window.normalizeVolumePlugin = {
          withoutNormalizationMaxVolume: 1,
          playerApi: window.player.playerApi,
          videoEl: document.querySelector('video'),
          getVolumeWithoutNormalization() {
            return (this.playerApi.getVolume() / 100) * this.withoutNormalizationMaxVolume
          },
          removeVolumeNormalization() {
            this.videoEl.volume = this.getVolumeWithoutNormalization()
            return this.videoEl.volume
          },
          observer: new MutationObserver((records) => {
            window.normalizeVolumePlugin.removeVolumeNormalization()
          }),
          onVolumeChange(e) {
            this.removeVolumeNormalization()
          },
          onVolumeChangeListener(e) {
            window.normalizeVolumePlugin.onVolumeChange.call(window.normalizeVolumePlugin, e)
          }
        }
  
        console.log('Normalize volume plugin registered')
      `)
    })
  }

  public enable() {
    if(!this.isRegistered) return
    this.app.mainWindow.window.webContents.executeJavaScript(`
      normalizeVolumePlugin.observer.observe(normalizeVolumePlugin.videoEl, {
        attributes: true,
        attributeFilter: ['src']
      })
      normalizeVolumePlugin.videoEl.addEventListener('volumechange', normalizeVolumePlugin.onVolumeChangeListener)
      normalizeVolumePlugin.removeVolumeNormalization()

      console.log('Normalize volume plugin enabled')
    `)
  }

  public disable() {
    this.app.mainWindow.window.webContents.executeJavaScript(`
      normalizeVolumePlugin.observer.disconnect()
      normalizeVolumePlugin.videoEl.removeEventListener('volumechange', normalizeVolumePlugin.onVolumeChangeListener)
      console.log('Normalize volume plugin disabled')
    `)
  }
}
