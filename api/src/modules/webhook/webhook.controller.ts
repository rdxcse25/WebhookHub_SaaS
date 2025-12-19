import { FastifyRequest, FastifyReply } from "fastify";
import { webhookService } from "./webhook.service.js";
import { verifierFactory } from "../../providers/verifier.factory.js";
import { logger } from "../../infra/logger.js";

export async function handleWebhook(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { provider, tenantId } = request.params as {
    provider: string;
    tenantId: string;
  };

  // 🔍 HARD PROOF LOG
  logger.info(
    {
      provider,
      tenantId,
      rawBodyExists: !!request.rawBody,
      isRawBodyBuffer: Buffer.isBuffer(request.rawBody),
      bodyType: typeof request.body
    },
    "Webhook request received"
  );

  try {
    const verifier = verifierFactory.get(provider);
    if (!request.rawBody || !Buffer.isBuffer(request.rawBody)) {
      logger.error("Raw body missing or invalid");
      return reply.code(400).send({ error: "Invalid webhook payload" });
    }

    const verified = verifier.verify({
      rawBody: request.rawBody,
      headers: request.headers,
      secret: "test_webhook_secret" // later from DB
    });

    await webhookService.ingestEvent({
      tenantId,
      provider,
      eventId: verified.eventId,
      eventType: verified.eventType,
      payload: verified.payload
    });

    return reply.code(202).send({ status: "accepted" });
  } catch (err) {
    logger.warn({ err }, "Webhook verification failed");
    return reply.code(400).send({ error: "Invalid webhook" });
  }
}
