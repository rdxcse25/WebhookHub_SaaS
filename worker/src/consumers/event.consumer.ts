import { consumer } from "../infra/kafka.js";
import { db } from "../infra/db.js";
import { deliveryService } from "../services/delivery.service.js";
import { logger } from "../infra/logger.js";
import { v4 as uuidv4 } from "uuid";
import { calculateBackoffMs } from "../utils/backoff.js";

export async function startEventConsumer() {
  await consumer.subscribe({
    topic: "events_ingested",
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value!.toString());
      const { tenantId, provider, eventId, eventType, payload } = event;

      logger.info({ eventId }, "📥 Processing event");

      /**
       * 1️⃣ Fetch active subscriptions
       */
      const subs = await db.query(
        `
        SELECT id, target_url, secret
        FROM webhook_subscriptions
        WHERE tenant_id = $1
          AND provider = $2
          AND event_type = $3
          AND is_active = true
        `,
        [tenantId, provider, eventType]
      );

      /**
       * 2️⃣ Create delivery rows (idempotent)
       */
      for (const sub of subs.rows) {
        await db.query(
          `
          INSERT INTO event_deliveries (
            id,
            tenant_id,
            provider,
            event_id,
            subscription_id,
            status
          )
          VALUES (
            $1, $2, $3, $4, $5, 'PENDING'
          )
          ON CONFLICT (event_id, subscription_id) DO NOTHING
          `,
          [
            uuidv4(),
            tenantId,
            provider,
            eventId,
            sub.id
          ]
        );
      }

      /**
       * 3️⃣ Fetch PENDING deliveries only
       */
      const deliveries = await db.query(
        `
        SELECT
          d.id AS delivery_id,
          d.retry_count,
          s.target_url,
          s.secret
        FROM event_deliveries d
        JOIN webhook_subscriptions s
          ON s.id = d.subscription_id
        WHERE d.event_id = $1
          AND d.status = 'PENDING'
        `,
        [eventId]
      );

      /**
       * 4️⃣ Attempt delivery ONCE
       */
      for (const delivery of deliveries.rows) {
        try {
          await deliveryService.deliverEvent({
            tenantId,
            provider,
            eventId,
            eventType,
            payload,
            targetUrl: delivery.target_url,
            secret: delivery.secret
          });

          await db.query(
            `
            UPDATE event_deliveries
            SET status = 'SUCCESS',
                updated_at = NOW()
            WHERE id = $1
            `,
            [delivery.delivery_id]
          );
        } catch (err: any) {
          const currentRetryCount =
            typeof delivery.retry_count === "number"
              ? delivery.retry_count
              : 0;

          const retryCount = currentRetryCount + 1;
          const delayMs = calculateBackoffMs(retryCount);
          const nextRetryAt = new Date(Date.now() + delayMs);

          await db.query(
            `
    UPDATE event_deliveries
    SET
      retry_count = $2,
      status = 'FAILED',
      last_error = $3,
      next_retry_at = $4,
      updated_at = NOW()
    WHERE id = $1
    `,
            [
              delivery.delivery_id,
              retryCount,
              err.message,
              nextRetryAt
            ]
          );

          logger.warn(
            {
              deliveryId: delivery.delivery_id,
              retryCount,
              nextRetryAt
            },
            "⏳ Delivery scheduled for retry"
          );
        }
      }

      logger.info({ eventId }, "✅ Event ingestion completed");
    }
  });
}
