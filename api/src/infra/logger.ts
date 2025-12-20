import { pino, Logger as PinoLogger } from "pino";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../config/index.js";

export const logger:PinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: process.env.SERVICE_NAME || "webhookhub"
  }
});

export const fastifyLogger: FastifyBaseLogger =
  logger as unknown as FastifyBaseLogger;