import { consumer } from "../infra/kafka.js";
import { logger } from "../infra/logger.js";

import { subscriptionService } from "../services/subscription.service.js";
import { deliveryService } from "../services/delivery.service.js";
import { retryService } from "../services/retry.service.js";

export async function startEventConsumer() {
  await consumer.subscribe({
    topic: "events_ingested",
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString());

      const {
        tenantId,
        provider,
        eventId,
        eventType,
        payload
      } = event;

      logger.info(
        { tenantId, provider, eventId },
        "📥 Event received from Kafka"
      );

      try {
        /**
         * 1️⃣ Fetch active subscriptions
         */
        const subscriptions =
          await subscriptionService.getActiveSubscriptions({
            tenantId,
            provider,
            eventType
          });

        if (subscriptions.length === 0) {
          logger.warn(
            { tenantId, provider, eventType },
            "⚠️ No active subscriptions"
          );
          return;
        }

        /**
         * 2️⃣ Deliver to all subscriptions
         */
        for (const sub of subscriptions) {
          await deliveryService.deliverEvent({
            tenantId,
            provider,
            eventId,
            eventType,
            payload,
            targetUrl: sub.targetUrl,
            secret: sub.secret
          });
        }

        logger.info(
          { tenantId, provider, eventId },
          "✅ Event processed successfully"
        );
      } catch (err: any) {
        logger.error(
          {
            tenantId,
            provider,
            eventId,
            error: err?.message
          },
          "❌ Event processing failed"
        );

        /**
         * 3️⃣ Ask retry service for decision
         */
        const shouldRetry = await retryService.shouldRetry({
          tenantId,
          provider,
          eventId,
          errorReason: err?.message ?? "PROCESSING_FAILED"
        });

        /**
         * If retryService says YES → throw
         * Kafka will retry automatically
         */
        if (shouldRetry) {
          throw err;
        }

        /**
         * If retryService says NO → swallow error
         * Offset will be committed
         */
        logger.warn(
          { tenantId, provider, eventId },
          "🛑 Retry stopped — offset committed"
        );
      }
    }
  });

  logger.info("🚀 Worker started");
}
