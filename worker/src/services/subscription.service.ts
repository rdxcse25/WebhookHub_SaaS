import { db } from "../infra/db.js";
import { logger } from "../infra/logger.js";

interface GetSubscriptionsInput {
  tenantId: string;
  provider: string;
  eventType: string;
}

export interface ActiveSubscription {
  id: string;
  targetUrl: string;
  secret: string;
}

export const subscriptionService = {
  async getActiveSubscriptions(
    input: GetSubscriptionsInput
  ): Promise<ActiveSubscription[]> {
    const { tenantId, provider, eventType } = input;

    const res = await db.query(
      `
      SELECT
        id,
        target_url AS "targetUrl",
        secret
      FROM webhook_subscriptions
      WHERE tenant_id = $1
        AND provider = $2
        AND event_type = $3
        AND is_active = true
      `,
      [tenantId, provider, eventType]
    );

    logger.info(
      {
        tenantId,
        provider,
        eventType,
        count: res.rowCount
      },
      "📡 Active webhook subscriptions fetched"
    );

    return res.rows;
  }
};
