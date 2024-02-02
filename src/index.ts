import { app as electron } from "electron"
import App from "./app"
import { NormalizeVolumePlugin } from "./plugins/normalize_volume"
import { DownloadTrackPlugin } from "./plugins/download_track"
import { DiscordRpcPlugin } from "./plugins/discord_rpc"

App.start(electron).registerPlugins([NormalizeVolumePlugin, DownloadTrackPlugin, DiscordRpcPlugin])
