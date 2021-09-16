const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld("api", {
  closePlayer: () => {
    ipcRenderer.send('hide-miniplayer')
  },
  playPause: () => {
    ipcRenderer.send('play-pause')
  },
  nextTrack: () => {
    ipcRenderer.send('next-track')
  },
  previousTrack: () => {
    ipcRenderer.send('previous-track')
  },
  onTrackUpdate(cb) {
    ipcRenderer.on('track-update', (e, track) => cb(track))
  }
})