const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld("api", {
  closeWindow: exit => {
    if(typeof exit !== "boolean") return

    ipcRenderer.send('close-window', exit)
  },
  minimizeWindow:() => {
    ipcRenderer.send('minimize-window')
  },
  emitTrackUpdate: track => {
    ipcRenderer.send('track-update', track)
  }
})