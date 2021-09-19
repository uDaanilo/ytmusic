import { app } from 'electron'
import fs from 'fs'
import { resolve } from 'path'

class Config {
  private configPath = app.isPackaged ? resolve(app.getAppPath(), '..', '..', 'dist', 'static', 'config.json') : resolve(__dirname, 'static', 'config.json')
  public value = JSON.parse(fs.readFileSync(this.configPath, { encoding: 'utf-8' }))
  
  public set(newConfig: object) {
    fs.writeFileSync(this.configPath, JSON.stringify(newConfig))
  }
}

export default Config