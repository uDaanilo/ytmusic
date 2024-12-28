import { app, session } from "electron"
import { YTMUSIC_BASE_URL } from "../../constants"
import * as path from "node:path"
import * as fs from "node:fs"

export class DownloadTrackPluginCookiesManager {
  private readonly COOKES_FILE_PATH = path.resolve(app.getPath("temp"), "ytmusic-cookies.txt")

  public async createYTCookiesFile(): Promise<string> {
    const cookies = await session.defaultSession.cookies.get({ url: YTMUSIC_BASE_URL })

    const formattedCookies = cookies.map((cookie) => {
      const includeSubDomain = !!cookie.domain?.startsWith(".")
      const expiry = cookie.expirationDate?.toFixed() ?? "0"
      const arr = [cookie.domain, includeSubDomain, cookie.path, cookie.secure, expiry, cookie.name, cookie.value]
      return arr.map((v) => (typeof v === "boolean" ? v.toString().toUpperCase() : v))
    })

    const netScapeCookies = [
      "# Netscape HTTP Cookie File",
      "# http://curl.haxx.se/rfc/cookie_spec.html",
      "# This is a generated file!  Do not edit.",
      "",
      ...formattedCookies.map((row) => row.join("\t")),
      "",
    ].join("\n")

    await fs.promises.writeFile(this.COOKES_FILE_PATH, netScapeCookies)

    return this.COOKES_FILE_PATH
  }

  public async deleteYTCookiesFile() {
    await fs.promises.unlink(this.COOKES_FILE_PATH)
  }
}
