import { api } from "../api"
import { getPlayerApi, YTMUtils } from "../utils"

const DOWNLOAD_ICON = `
  <div class="ytm-icon">
    <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px">
      <g><rect fill="none" height="24" width="24"/></g><g><g><path d="M12,2C6.49,2,2,6.49,2,12s4.49,10,10,10s10-4.49,10-10S17.51,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M14.59,8.59L16,10l-4,4l-4-4l1.41-1.41L11,10.17V6h2v4.17L14.59,8.59z M17,17H7v-2h10V17z"/></g></g>
    </svg>
  </div>
`

export function setupDownloadButton(rightControlsEl: Element) {
  const iconButtonEl = document.createElement("div")

  async function download() {
    const selectedPath = await api.invoke<string | null>("download_track_select_path")
    if (!selectedPath) return

    const trackId = getPlayerApi().getVideoData().video_id
    api.invoke("download_track_download", { trackId, path: selectedPath })
  }

  function setDownloadIconButtonToDefaultState() {
    iconButtonEl.removeAttribute("style")
    iconButtonEl.className = "ytm-icon-button"
    iconButtonEl.style.flex = "none"
    iconButtonEl.innerHTML = YTMUtils.createTrustedHTML(DOWNLOAD_ICON)
    iconButtonEl.addEventListener("click", download)
  }

  api.on("download-track-plugin:progress", () => {
    iconButtonEl.className = ""
    iconButtonEl.style.flex = ""
    iconButtonEl.innerHTML = YTMUtils.createTrustedHTML("")
    iconButtonEl.style.display = "flex"
    iconButtonEl.style.justifyContent = "center"
    iconButtonEl.style.alignItems = "center"
    iconButtonEl.style.padding = "8px"
    iconButtonEl.style.width = "40px"
    iconButtonEl.style.height = "40px"
    iconButtonEl.style.boxSizing = "border-box"
    iconButtonEl.removeEventListener("click", download)
    iconButtonEl.appendChild(YTMUtils.createCircularProgressElement(24))
  })

  api.on("download-track-plugin:downloaded", () => {
    setDownloadIconButtonToDefaultState()
  })

  setDownloadIconButtonToDefaultState()
  rightControlsEl.appendChild(iconButtonEl)
}
