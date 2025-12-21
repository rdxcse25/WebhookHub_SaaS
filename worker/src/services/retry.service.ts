import { db } from "../infra/db.js";
import { logger } from "../infra/logger.js";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/env.js";

interface RetryDeliveryInput {
  deliveryId: string;
  errorReason: string;
}

class RetryService {
  /**
   * Decide whether a DELIVERY should be retried or moved to DLQ
   *
   * Returns:
   * - true  → retry (throw → Kafka will redeliver)
   * - false → stop retrying (commit offset)
   */
  async shouldRetryDelivery(
    input: RetryDeliveryInput
  ): Promise<boolean> {
    const { deliveryId, errorReason } = input;

    /**
     * 1️⃣ Fetch delivery retry count
     */
    const res = await db.query(
      `
      SELECT retry_count
      FROM event_deliveries
      WHERE id = $1
      `,
      [deliveryId]
    );

    if (res.rowCount === 0) {
      logger.warn(
        { deliveryId },
        "⚠️ Retry skipped — delivery not found"
      );
      return false;
    }

    const retryCount: number = res.rows[0].retry_count;

    /**
     * 2️⃣ Max retries reached → DLQ
     */
    if (retryCount >= config.MAX_RETRIES) {
      logger.error(
        { deliveryId, retryCount },
        "☠️ Max retries exceeded — moving delivery to DLQ"
      );

      await this.moveDeliveryToDLQ(
        deliveryId,
        errorReason
      );

      return false;
    }

    /**
     * 3️⃣ Increment retry count
     */
    await db.query(
      `
        UPDATE event_deliveries
        SET
          retry_count = retry_count + 1,
          last_error = $2,
          status = 'FAILED',
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        deliveryId,
        errorReason
      ]
    );

    logger.warn(
      { deliveryId, retryCount: retryCount + 1 },
      "🔁 Retrying delivery via Kafka"
    );

    /**
     * Kafka retry via throw
     */
    return true;
  }

  /**
   * Move DELIVERY to DLQ
   */
  async moveDeliveryToDLQ(
    deliveryId: string,
    reason: string
  ): Promise<void> {
    /**
     * Fetch full delivery + payload
     */
    const res = await db.query(
      `
      SELECT
        d.tenant_id,
        d.provider,
        d.event_id,
        r.payload
      FROM event_deliveries d
      JOIN events_raw r
        ON r.event_id = d.event_id
       AND r.provider = d.provider
       AND r.tenant_id = d.tenant_id
      WHERE d.id = $1
      `,
      [deliveryId]
    );

    if (res.rowCount === 0) return;

    const { tenant_id, provider, event_id, payload } =
      res.rows[0];

    /**
     * Insert into DLQ
     */
    const uuid_id = uuidv4();
    await db.query(
      `
      INSERT INTO events_dlq (
        id,
        tenant_id,
        provider,
        event_id,
        payload,
        failure_reason
      )
      VALUES (
        $1, $2, $3, $4, $5, $6
      )
      `,
      [uuid_id, tenant_id, provider, event_id, payload, reason]
    );

    /**
     * Mark delivery as DLQ
     */
    await db.query(
      `
      UPDATE event_deliveries
      SET status = 'DLQ',
          updated_at = NOW()
      WHERE id = $1
      `,
      [deliveryId]
    );

    logger.fatal(
      { deliveryId, reason },
      "🪦 Delivery moved to DLQ"
    );
  }
}

export const retryService = new RetryService();
