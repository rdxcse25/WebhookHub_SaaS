import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import rawBody from "fastify-raw-body";

import { registerWebhookRoutes } from "./routes/webhook.routes.js";
// import { config } from "./config/index.js";
import { fastifyLogger } from "./infra/logger.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: fastifyLogger,
        trustProxy: true
    });

    await app.register(rawBody, {
        field: "rawBody",
        global: true,
        encoding: false,
        runFirst: true
    });


    // --------------------
    // Global Plugins
    // --------------------
    await app.register(rateLimit, {
        max: 100,
        timeWindow: "1 minute"
    });

    // --------------------
    // Health Check
    // --------------------
    app.get("/health", async () => {
        return { status: "ok" };
    });

    // --------------------
    // Routes
    // --------------------
    await registerRoutes(app);

    return app;
}
