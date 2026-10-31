import { trustedHTML } from "./trusted"

export class YTMUtils {
  static createSwitchElement(id: string, state = false) {
    const containerEl = document.createElement("div")
    const checkboxEl = document.createElement("input")
    checkboxEl.setAttribute("type", "checkbox")
    checkboxEl.setAttribute("id", id)
    checkboxEl.checked = state

    const labelEl = document.createElement("label")
    labelEl.classList.add("switch")
    labelEl.setAttribute("for", id)

    containerEl.appendChild(checkboxEl)
    containerEl.appendChild(labelEl)

    return {
      checkboxEl,
      containerEl,
    }
  }

  static createCircularProgressElement(size: number) {
    const svgNamespace = "http://www.w3.org/2000/svg"
    const spanEl = document.createElement("span")

    spanEl.style.width = `${size}px`
    spanEl.style.height = `${size}px`
    spanEl.classList.add("circular-progress")

    const svgEl = document.createElementNS(svgNamespace, "svg")

    const svgViewBox = `${(size + 4) / 2} ${(size + 4) / 2} ${size + 4} ${size + 4}`
    svgEl.setAttributeNS(null, "viewBox", svgViewBox)

    const circleEl = document.createElementNS(svgNamespace, "circle")
    circleEl.setAttributeNS(null, "cx", String(size + 4))
    circleEl.setAttributeNS(null, "cy", String(size + 4))
    circleEl.setAttributeNS(null, "r", String(size / 2))
    circleEl.setAttributeNS(null, "fill", "none")
    circleEl.setAttributeNS(null, "stroke-width", "3.6")
    circleEl.setAttributeNS(null, "stroke", "red")

    svgEl.appendChild(circleEl)
    spanEl.appendChild(svgEl)

    return spanEl
  }

  static createTrustedHTML(html: string): string {
    return trustedHTML(html)
  }
}

export function domReady(): Promise<void> {
  if (document.readyState !== "loading") return Promise.resolve()
  return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }))
}

/** Polls until `getter` returns a truthy value. YTM renders its custom elements well after DOMContentLoaded. */
export function waitFor<T>(getter: () => T | null | undefined, intervalMs = 100): Promise<T> {
  return new Promise((resolve) => {
    const check = () => {
      let value: T | null | undefined
      try {
        value = getter()
      } catch {
        value = null
      }

      if (value) {
        resolve(value)
        return
      }

      setTimeout(check, intervalMs)
    }

    check()
  })
}

/**
 * YouTube's player API object (`#movie_player`): playVideo, getPlayerState, getPlayerResponse...
 * Older YTM builds exposed it as `window.player.playerApi`, which no longer exists.
 */
export function getPlayerApi(): any {
  return document.getElementById("movie_player")
}
