import { PluginState } from "../../../plugins_manager"
import { SettingsManager } from "../../../settings_manager"

const { ipcRenderer, contextBridge } = require("electron")

ipcRenderer.on("plugins:enabled", (_, pluginState) => {
  const event = new CustomEvent("plugin:enabled", {
    detail: {
      pluginState,
    },
  })

  window.dispatchEvent(event)
})

ipcRenderer.on("plugins:disabled", (_, pluginState) => {
  const event = new CustomEvent("plugin:disabled", {
    detail: {
      pluginState,
    },
  })

  window.dispatchEvent(event)
})

type SettingsState = Record<
  string,
  {
    label: string
    value?: boolean
    enabled?: boolean
    isPlugin?: boolean
  }
>

export interface Api {
  close: (exit: boolean) => void
  minimize: () => void
  emit: (eventName: string, ...args: any) => void
  invoke: <T = any>(eventName: string, ...args: any) => Promise<T>
  on: (eventName: string, cb: (event: Electron.IpcRendererEvent, ...args: any) => void) => void
  plugins: {
    enable: (name: string) => void
    disable: (name: string) => void
    getState: () => Promise<Array<ReturnType<PluginState["toJSON"]>>>
  }
  settings: {
    getState: () => Promise<SettingsState>
    update: (newState: Partial<SettingsManager["settings"]>) => void
  }
}

const api: Api = {
  close: (exit) => {
    if (typeof exit !== "boolean") return

    ipcRenderer.send("main:close", exit)
  },
  minimize: () => {
    ipcRenderer.send("main:minimize")
  },
  emit: (eventName, ...args) => {
    ipcRenderer.send(eventName, ...args)
  },
  invoke: (eventName, ...args) => {
    return ipcRenderer.invoke(eventName, ...args)
  },
  on: (eventName, cb) => {
    ipcRenderer.on(eventName, cb)
  },
  plugins: {
    enable(name) {
      ipcRenderer.send("plugins:enable", name)
    },
    disable(name) {
      ipcRenderer.send("plugins:disable", name)
    },
    getState() {
      return ipcRenderer.invoke("plugins:get-state")
    },
  },
  settings: {
    getState() {
      return ipcRenderer.invoke("settings:get-state")
    },
    update(newState) {
      return ipcRenderer.send("settings:update", newState)
    },
  },
}

contextBridge.exposeInMainWorld("api", api)
