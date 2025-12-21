import { db } from "../infra/db.js";
import { deliveryService } from "../services/delivery.service.js";
import { logger } from "../infra/logger.js";

export async function startRetryWorker() {
  setInterval(async () => {
    const res = await db.query(
      `
      SELECT
        d.id,
        d.tenant_id,
        d.provider,
        d.event_id,
        d.retry_count,
        s.target_url,
        s.secret,
        r.payload,
        r.schema_version
      FROM event_deliveries d
      JOIN webhook_subscriptions s
        ON s.id = d.subscription_id
      JOIN events_raw r
        ON r.event_id = d.event_id
      WHERE d.status = 'FAILED'
        AND d.next_retry_at <= NOW()
      LIMIT 20
      `
    );

    for (const row of res.rows) {
      try {
        await deliveryService.deliverEvent({
          tenantId: row.tenant_id,
          provider: row.provider,
          eventId: row.event_id,
          payload: row.payload,
          targetUrl: row.target_url,
          secret: row.secret
        });

        await db.query(
          `
          UPDATE event_deliveries
          SET status = 'SUCCESS',
              updated_at = NOW()
          WHERE id = $1
          `,
          [row.id]
        );

        logger.info(
          { deliveryId: row.id },
          "✅ Retry delivery succeeded"
        );
      } catch (err: any) {
        logger.error(
          { deliveryId: row.id, err: err.message },
          "❌ Retry delivery failed"
        );
      }
    }
  }, 5000); // poll every 5 seconds
}
