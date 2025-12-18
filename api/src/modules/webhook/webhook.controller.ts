import { FastifyRequest, FastifyReply } from "fastify";
import { getVerifier } from "../../providers/verifier.factory.js";
import { webhookService } from "./webhook.service.js";
import { config } from "../../config/index.js";
import { logger } from "../../infra/logger.js";

export class WebhookController {
  async handleWebhook(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { provider, tenantId } = request.params as {
      provider: string;
      tenantId: string;
    };

    const rawBody = request.body as Buffer;

    let normalizedEvent;

    try {
      const verifier = getVerifier(provider);

      normalizedEvent = verifier.verify({
        rawBody,
        headers: request.headers,
        secret: config.STRIPE_SIGNING_SECRET // later: per-tenant secret
      });
    } catch (err) {
      logger.warn({ err, provider, tenantId }, "Webhook verification failed");
      return reply.status(400).send({ error: "Invalid webhook" });
    }

    await webhookService.ingestEvent({
      tenantId,
      provider,
      eventId: normalizedEvent.eventId,
      payload: normalizedEvent.payload,
      eventType: normalizedEvent.eventType
    });

    return reply.status(200).send({ received: true });
  }
}

export const webhookController = new WebhookController();
