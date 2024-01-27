import { app as electron } from "electron"
import App from "./app"
import { NormalizeVolumePlugin } from "./plugins/normalize_volume"

App.start(electron).registerPlugins([NormalizeVolumePlugin])
