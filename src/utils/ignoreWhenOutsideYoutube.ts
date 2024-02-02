import { YTMUSIC_BASE_URL } from "../constants";
import { app } from "..";

export const isRunningOutsideYoutube = () => !app?.mainWindow?.window?.webContents?.getURL().includes(YTMUSIC_BASE_URL)

export function IgnoreWhenRunningOutsideYoutube() {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod: Function = descriptor.value

    descriptor.value = function(...args: any[]) {
      if(isRunningOutsideYoutube()) {
        return
      }

      originalMethod.apply(this, args)
    }
  }
}
