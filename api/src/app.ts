import Fastify, { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

import { registerWebhookRoutes } from "./routes/webhook.routes.js";
import { config } from "./config/index.js";
import { fastifyLogger } from "./infra/logger.js";

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: fastifyLogger,
        trustProxy: true
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
    await app.register(registerWebhookRoutes, {
        prefix: "/webhooks"
    });

    return app;
}
