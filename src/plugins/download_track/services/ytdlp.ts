import childProcess from "child_process"
import { resolve } from "path"
import { Readable } from "stream"
import { getAppRootPath } from "../../../utils/getAppRootPath"
import { logger } from "../../../utils/logger"

export type Format = {
  format_id: string
  url: string
  ext: string
  vcodec: string
  acodec: string
  abr: number
  protocol: "https" | "http"
  audio_ext: string
  video_ext: string
  format: string
  resolution: string
  http_headers: Record<string, any>
}

export type Thumbnail = {
  url: string
  id: string
}

export interface YTDLPData {
  id: string
  title: string
  thumbnail: string
  uploader: string
  uploader_url: string
  timestamp: number
  release_timestamp: number
  duration: number
  track: string
  track_number: number
  track_id: string
  artist: string
  album: string
  formats: Format[]
  webpage_url: string
  original_url: string
  webpage_url_basename: string
  webpage_url_domain: string
  extractor: string
  extractor_key: string
  playlist?: []
  playlist_index?: string
  thumbnails: Thumbnail[]
  display_id: string
  upload_date: string
  release_date: string
  requested_subtitles?: string
  _has_drm?: boolean
  format_id: string
  url: string
  ext: string
  vcodec: string
  acodec: string
  abr: number
  protocol: "https" | "http"
  audio_ext: string
  video_ext: string
  format: string
  resolution: string
  http_headers: Record<string, string>
  epoch: number
  _filename: string
  filename: string
  urls: string
  entries: []
  _type: string
  _version: {
    version: string
    current_git_head?: string
    release_git_head: string
    repository: string
  }
}

export interface Playlist {
  _type: "playlist"
  uploader_id: string
  id: string
  title: string
  description: string
  entries: YTDLPData[]
}

interface YTDLPInstanceConfig {
  cookiesPath?: string
}

class YoutubeDlp {
  constructor(private config: YTDLPInstanceConfig) {}

  private ytdlp(args: string[]) {
    if (process.env.NODE_ENV !== "development") {
      args.push("-q")
    }

    if (this.config.cookiesPath) {
      args.push("--cookies", this.config.cookiesPath)
    }

    return childProcess.spawn(resolve(getAppRootPath(), "dist/static/plugins/download_track/bin/yt-dlp"), args)
  }

  async getInfo(url: string): Promise<YTDLPData> {
    const { stdout } = this.ytdlp(["-J", url])

    return new Promise<YTDLPData>((resolve) => {
      let data = ""
      stdout.on("data", (chunk) => {
        data += chunk.toString()
      })

      stdout.on("close", () => {
        resolve(JSON.parse(data.toString()))
      })
    })
  }

  async download(url: string) {
    return new Promise<Readable>((resolve, reject) => {
      const args = ["--buffer-size", "16K", "--format", "bestaudio*", "--output", "-", url]
      const { stdout, stderr } = this.ytdlp(args)
      let errorMessage = ""

      stderr.on("data", (chunk) => (errorMessage += chunk.toString()))
      stderr.once("end", () => {
        if (errorMessage) reject(errorMessage)
      })

      stdout.once("readable", () => {
        logger.info("Stream is readable")
        resolve(stdout)
      })
    })
  }
}

export default YoutubeDlp
