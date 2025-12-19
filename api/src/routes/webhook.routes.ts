import { FastifyInstance } from "fastify";
import { handleWebhook } from "../modules/webhook/webhook.controller.js";

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.post(
    "/:provider/:tenantId",
    {
      config: {
        rateLimit: {
          max: 100,
          timeWindow: "1 minute"
        }
      }
    },
    handleWebhook
  );
}
