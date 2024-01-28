import winston from "winston"
import electron from "electron"
import { getAppRootPath } from "./getAppRootPath"
import path from "node:path"

const logsBasePath = path.resolve(getAppRootPath(), "logs")
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.File({
      filename: path.resolve(logsBasePath, "errors.log"),
      level: "error",
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.File({ filename: path.resolve(logsBasePath, "logs.log") }),
  ],
})

if (!electron.app.isPackaged) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.cli(),
      handleExceptions: true,
      handleRejections: true,
    })
  )
}
