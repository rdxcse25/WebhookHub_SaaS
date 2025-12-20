import { db } from "../../infra/db.js";
import { randomUUID } from "crypto";

export const subscriptionRepository = {
  async create(input: {
    tenantId: string;
    provider: string;
    eventType: string;
    targetUrl: string;
    secret: string;
  }) {
    const res = await db.query(
      `
      INSERT INTO webhook_subscriptions (
        id,
        tenant_id,
        provider,
        event_type,
        target_url,
        secret
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        randomUUID(),
        input.tenantId,
        input.provider,
        input.eventType,
        input.targetUrl,
        input.secret
      ]
    );

    return res.rows[0];
  },

  async list(tenantId: string) {
    const res = await db.query(
      `
      SELECT
        id,
        provider,
        event_type,
        target_url,
        is_active,
        created_at
      FROM webhook_subscriptions
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      `,
      [tenantId]
    );

    return res.rows;
  },

  async disable(id: string) {
    await db.query(
      `
      UPDATE webhook_subscriptions
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
      `,
      [id]
    );
  },

  async rotateSecret(id: string, newSecret: string) {
    await db.query(
      `
      UPDATE webhook_subscriptions
      SET secret = $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [id, newSecret]
    );
  }
};
