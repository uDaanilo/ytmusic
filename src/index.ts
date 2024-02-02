import { app as electron } from "electron"
import App from "./app"
import { NormalizeVolumePlugin } from "./plugins/normalize_volume"
import { DownloadTrackPlugin } from "./plugins/download_track"
import { DiscordRpcPlugin } from "./plugins/discord_rpc"

const app = App.start(electron).registerPlugins([NormalizeVolumePlugin, DownloadTrackPlugin, DiscordRpcPlugin])
export { app }