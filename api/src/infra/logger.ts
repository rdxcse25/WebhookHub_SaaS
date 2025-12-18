import pino, { Logger as PinoLogger } from "pino";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";

/**
 * Create a single Pino instance
 */
const baseLogger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",

  base: {
    service: config.SERVICE_NAME
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  transport:
    config.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
});

/**
 * Standalone logger
 * Use this anywhere: logger.info(), logger.error(), etc.
 */
export const logger: PinoLogger = baseLogger;

/**
 * Fastify-compatible logger
 * Passed ONLY to Fastify()
 */
export const fastifyLogger: FastifyBaseLogger =
  baseLogger as unknown as FastifyBaseLogger;
