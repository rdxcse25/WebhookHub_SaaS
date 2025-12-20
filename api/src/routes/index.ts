import { FastifyInstance } from "fastify";

import { registerWebhookRoutes } from "./webhook.routes.js";
import { registerSubscriptionRoutes } from "./subscription.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(registerWebhookRoutes, {
    prefix: "/webhooks"
  });

  await app.register(registerSubscriptionRoutes, {
    prefix: "/subscriptions"
  });
}
