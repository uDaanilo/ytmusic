import electron from 'electron'
import path from 'node:path'

export function getAppRootPath(): string {
  if(electron.app.isPackaged) {
    return path.resolve(electron.app.getAppPath(), "..", "..")
  }

  return process.cwd()
}