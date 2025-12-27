import pino, { type Logger } from "pino";
import { config } from "../config/index.js";

export const logger: Logger = pino({
  level: config.logLevel,
  base: { service: "scrape-job-api" }
});
