import { db } from "../infra/db.js";
import { logger } from "../infra/logger.js";

/**
 * Retry configuration
 */
const MAX_RETRIES = 5;

interface RetryDecisionInput {
  tenantId: string;
  provider: string;
  eventId: string;
  errorReason: string;
}

class RetryService {
  /**
   * Decide whether event should be retried or sent to DLQ.
   *
   * Returns:
   * - true  → retry (Kafka will re-deliver)
   * - false → stop retrying (offset can be committed)
   */
  async shouldRetry(
    input: RetryDecisionInput
  ): Promise<boolean> {
    const { tenantId, provider, eventId, errorReason } = input;

    /**
     * 1️⃣ Fetch retry count safely
     */
    const res = await db.query(
      `
      SELECT retry_count
      FROM events_state
      WHERE tenant_id = $1
        AND provider = $2
        AND event_id = $3
      `,
      [tenantId, provider, eventId]
    );

    if (res.rowCount === 0) {
      logger.warn(
        { tenantId, provider, eventId },
        "⚠️ Retry decision skipped — event state not found"
      );
      return false;
    }

    const retryCount: number = res.rows[0].retry_count;

    /**
     * 2️⃣ Check retry limit
     */
    if (retryCount >= MAX_RETRIES) {
      logger.error(
        { tenantId, provider, eventId, retryCount },
        "☠️ Max retries exceeded — moving to DLQ"
      );

      await this.moveToDLQ(
        tenantId,
        provider,
        eventId,
        errorReason
      );

      return false;
    }

    /**
     * 3️⃣ Increment retry count
     */
    await db.query(
      `
      UPDATE events_state
      SET retry_count = retry_count + 1,
          updated_at = NOW()
      WHERE tenant_id = $1
        AND provider = $2
        AND event_id = $3
      `,
      [tenantId, provider, eventId]
    );

    logger.warn(
      { tenantId, provider, eventId, retryCount: retryCount + 1 },
      "🔁 Retrying event via Kafka"
    );

    /**
     * Returning true tells consumer to THROW
     * Kafka will retry automatically
     */
    return true;
  }

  /**
   * Move event to DLQ table
   */
  private async moveToDLQ(
    tenantId: string,
    provider: string,
    eventId: string,
    reason: string
  ): Promise<void> {
    const payloadRes = await db.query(
      `
      SELECT payload
      FROM events_raw
      WHERE tenant_id = $1
        AND provider = $2
        AND event_id = $3
      `,
      [tenantId, provider, eventId]
    );

    const payload = payloadRes.rows[0]?.payload ?? null;

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
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [tenantId, provider, eventId, payload, reason]
    );

    await db.query(
      `
      UPDATE events_state
      SET status = 'FAILED',
          updated_at = NOW()
      WHERE tenant_id = $1
        AND provider = $2
        AND event_id = $3
      `,
      [tenantId, provider, eventId]
    );

    logger.fatal(
      { tenantId, provider, eventId, reason },
      "🪦 Event moved to DLQ"
    );
  }
}

export const retryService = new RetryService();
