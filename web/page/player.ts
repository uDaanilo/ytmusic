import { emit, listen } from "@tauri-apps/api/event"
import { handleBridgeRequest } from "../api"
import { getPlayerApi } from "../utils"

const PLAYER_STATE_CODES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
}

type PlayerCommand =
  | { action: "play" | "pause" | "toggle" | "next" | "previous" }
  | { action: "seek"; value: number }

function getState() {
  const playerApi = getPlayerApi()
  const playerState = playerApi.getPlayerState()
  const videoDetails = playerApi.getPlayerResponse().videoDetails

  const track = {
    id: videoDetails.videoId,
    title: videoDetails.title,
    author: videoDetails.author,
    length: +videoDetails.lengthSeconds,
    thumbnailUrl: videoDetails.thumbnail?.thumbnails?.reduce(
      (prev: any, current: any) => (prev.height > current.height ? prev : current),
      ""
    )?.url,
  }

  return {
    track,
    currentTime: playerApi.getCurrentTime(),
    isPlaying: playerState === PLAYER_STATE_CODES.PLAYING,
    isPaused: playerState === PLAYER_STATE_CODES.PAUSED || playerState === PLAYER_STATE_CODES.BUFFERING,
    isVideo: playerApi.getSize().width > 0,
  }
}

function emitState() {
  try {
    emit("player:state_change", getState())
  } catch (err) {
    // No track loaded yet.
  }
}

function runCommand(command: PlayerCommand) {
  const playerApi = getPlayerApi()

  switch (command.action) {
    case "play":
      return playerApi.playVideo()
    case "pause":
      return playerApi.pauseVideo()
    case "toggle":
      return playerApi.getPlayerState() === PLAYER_STATE_CODES.PLAYING ? playerApi.pauseVideo() : playerApi.playVideo()
    case "next":
      return playerApi.nextVideo()
    case "previous":
      return playerApi.previousVideo()
    case "seek":
      return playerApi.seekTo(command.value)
  }
}

export function watchPlayer() {
  handleBridgeRequest("player:current_time", () => getPlayerApi().getCurrentTime())

  listen("player:get_state", emitState)
  listen<PlayerCommand>("player:command", ({ payload }) => runCommand(payload))

  getPlayerApi().addEventListener("onStateChange", (state: number) => {
    if (
      state !== PLAYER_STATE_CODES.PLAYING &&
      state !== PLAYER_STATE_CODES.PAUSED &&
      state !== PLAYER_STATE_CODES.BUFFERING
    )
      return

    emitState()
  })
}
