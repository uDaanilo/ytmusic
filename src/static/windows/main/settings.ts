class SettingsModal {
  private _settingsEl = document.getElementById("ytm-app-settings")
  private _closeSettingsBtn = this._settingsEl.querySelector("#close")
  private _backdropEl = this._settingsEl.querySelector("#backdrop")

  constructor() {
    this._listenModalCloseEvents()
  }

  hide() {
    this._settingsEl.style.display = "none"
    document.body.style.overflowY = "auto"
  }

  show() {
    this._settingsEl.style.display = "flex"
    document.body.style.overflowY = "hidden"
  }

  private _listenModalCloseEvents() {
    this._closeSettingsBtn.addEventListener("click", () => {
      this.hide()
    })

    this._backdropEl.addEventListener("click", () => {
      this.hide()
    })
  }
}

interface Setting {
  name: string
  type: string
  label: string
  containerElement: HTMLDivElement
  inputElement: HTMLInputElement
  isPlugin: boolean
}

interface AddSettingParams {
  name: string
  type: "boolean"
  label: string
  isPlugin: boolean
}

export class YTMAppSettings {
  private readonly settingsEl = document.getElementById("ytm-app-settings")
  private readonly settingsContentEl = this.settingsEl.querySelector(".content")
  public readonly modal = new SettingsModal()
  public settings: Record<string, Setting> = {}

  constructor() {
    window.api.settings.getState().then((settings) => {
      Object.entries(settings).forEach(([settingsName, state]) => {
        if (typeof state.label !== "string") return

        const newSetting = this.addSetting({
          type: "boolean",
          name: settingsName,
          label: state.label,
          isPlugin: state.isPlugin === true,
        })

        newSetting.inputElement.checked = state.value ?? state.enabled
        newSetting.inputElement.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement
          let updatedSetting: | Record<string, boolean> | { plugins: Record<string, { enabled: boolean }> } = {
            [settingsName]: target.checked,
          }

          if (newSetting.isPlugin) {
            updatedSetting = {
              plugins: {
                [settingsName]: {
                  enabled: target.checked,
                },
              },
            }
          }

          window.api.settings.update(updatedSetting)
        })

        this.settings[settingsName] = newSetting
      })

      this.renderSettings()
    })
  }

  addSetting(setting: AddSettingParams) {
    const settingWrapper = document.createElement("div")
    settingWrapper.classList.add("setting-wrapper")

    const switchEl = window.YTMUtils.createSwitchElement(setting.name)
    const labelEl = document.createElement("p")
    labelEl.innerText = setting.label

    settingWrapper.appendChild(labelEl)
    settingWrapper.appendChild(switchEl.containerEl)

    const newSetting: Setting = {
      name: setting.name,
      type: setting.type,
      label: setting.label,
      isPlugin: setting.isPlugin,
      containerElement: settingWrapper,
      inputElement: switchEl.checkboxEl,
    }

    this.settings[newSetting.name] = newSetting

    return newSetting
  }

  renderSettings() {
    Object.values(this.settings).forEach((setting) => {
      this.settingsContentEl.appendChild(setting.containerElement)
    })
  }
}

window.YTMAppSettings = YTMAppSettings
