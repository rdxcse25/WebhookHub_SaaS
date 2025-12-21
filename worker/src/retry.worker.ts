import { db } from "./infra/db.js";
import { deliveryService } from "./services/delivery.service.js";
import { retryService } from "./services/retry.service.js";
import { logger } from "./infra/logger.js";
import { config } from "./config/env.js";
import { calculateBackoffMs } from "./utils/backoff.js";

const POLL_INTERVAL_MS = 2000; // 5s (dev-safe)

export async function startRetryWorkerJs() {
    logger.info("🔁 Retry worker started");

    while (true) {
        try {
            /**
             * 1️⃣ Fetch deliveries ready for retry
             */
            const res = await db.query(`
        SELECT
          d.id           AS delivery_id,
          d.tenant_id,
          d.provider,
          d.event_id,
          r.payload,
          s.target_url,
          s.secret
        FROM event_deliveries d
        JOIN events_raw r
          ON r.event_id = d.event_id
         AND r.tenant_id = d.tenant_id
         AND r.provider = d.provider
        JOIN webhook_subscriptions s
          ON s.id = d.subscription_id
        WHERE d.status = 'FAILED'
          AND d.next_retry_at <= NOW()
        ORDER BY d.next_retry_at
        LIMIT 10
      `);

            for (const row of res.rows) {
                const {
                    delivery_id,
                    tenant_id,
                    provider,
                    event_id,
                    payload,
                    target_url,
                    secret
                } = row;

                logger.info(
                    { deliveryId: delivery_id, eventId: event_id },
                    "🔁 Retrying delivery"
                );

                try {
                    await deliveryService.deliverEvent({
                        tenantId: tenant_id,
                        provider,
                        eventId: event_id,
                        payload,
                        targetUrl: target_url,
                        secret,
                        skipEventLock: true
                    });

                    await db.query(
                        `
            UPDATE event_deliveries
            SET status = 'SUCCESS',
                updated_at = NOW()
            WHERE id = $1
            `,
                        [delivery_id]
                    );

                    logger.info(
                        { deliveryId: delivery_id },
                        "✅ Retry succeeded"
                    );
                } catch (err: any) {
                    const res = await db.query(
                        `SELECT retry_count FROM event_deliveries WHERE id = $1`,
                        [delivery_id]
                    );

                    const retryCount = res.rows[0].retry_count + 1;

                    if (retryCount >= config.MAX_RETRIES) {
                        await retryService.moveDeliveryToDLQ(
                            delivery_id,
                            err.message
                        );
                        continue;
                    }

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
                            delivery_id,
                            retryCount,
                            err.message,
                            nextRetryAt
                        ]
                    );

                    logger.warn(
                        { deliveryId: delivery_id, retryCount, nextRetryAt },
                        "⏳ Retry rescheduled"
                    );
                }

            }
        } catch (err) {
            logger.error({ err }, "❌ Retry worker loop error");
        }

        await sleep(POLL_INTERVAL_MS);
    }
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}
