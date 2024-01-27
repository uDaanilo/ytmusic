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
}

window.YTMUtils = YTMUtils
