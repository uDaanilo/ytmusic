import { invoke } from "@tauri-apps/api/core"
import { emit, listen } from "@tauri-apps/api/event"

export type SettingsState = Record<
  string,
  {
    label: string
    value?: boolean
    enabled?: boolean
    isPlugin?: boolean
  }
>

export interface PluginState {
  name: string
  enabled: boolean
  canBeEnabled: boolean
}

export interface SettingsUpdate {
  return_from_last_url?: boolean
  last_url?: string
  plugins?: Record<string, { enabled: boolean }>
}

// Same surface as the Electron preload API, backed by Tauri commands and events.
export interface Api {
  emit: (eventName: string, payload?: unknown) => void
  invoke: <T = any>(command: string, args?: Record<string, unknown>) => Promise<T>
  on: <T = any>(eventName: string, cb: (event: { event: string }, payload: T) => void) => void
  plugins: {
    enable: (name: string) => void
    disable: (name: string) => void
    getState: () => Promise<PluginState[]>
  }
  settings: {
    getState: () => Promise<SettingsState>
    update: (newState: SettingsUpdate) => void
  }
}

export const api: Api = {
  emit: (eventName, payload) => {
    emit(eventName, payload)
  },
  invoke: (command, args) => {
    return invoke(command, args)
  },
  on: (eventName, cb) => {
    listen(eventName, (event) => cb({ event: event.event }, event.payload as any))
  },
  plugins: {
    enable(name) {
      invoke("plugins_enable", { name })
    },
    disable(name) {
      invoke("plugins_disable", { name })
    },
    getState() {
      return invoke("plugins_get_state")
    },
  },
  settings: {
    getState() {
      return invoke("settings_get_state")
    },
    update(update) {
      invoke("settings_update", { update })
    },
  },
}

type BridgeHandler = () => unknown | Promise<unknown>
const bridgeHandlers: Record<string, BridgeHandler> = {}

/**
 * Answers `bridge:request` events from the Rust side. Tauri's `eval` can't return values,
 * so Rust asks by name and the page replies with a `bridge:response` carrying the same id.
 */
export function handleBridgeRequest(name: string, handler: BridgeHandler) {
  bridgeHandlers[name] = handler
}

export function listenBridgeRequests() {
  listen<{ id: number; name: string }>("bridge:request", async ({ payload }) => {
    const handler = bridgeHandlers[payload.name]
    let value: unknown = null

    try {
      value = handler ? await handler() : null
    } catch (err) {
      console.error(`bridge handler ${payload.name} failed`, err)
    }

    emit("bridge:response", { id: payload.id, value })
  })
}
