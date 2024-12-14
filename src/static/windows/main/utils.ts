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
    return window.trustedTypes
      .createPolicy("default", {
        createHTML: (input) => input,
      })
      .createHTML(html) as unknown as string
  }
}

window.YTMUtils = YTMUtils
