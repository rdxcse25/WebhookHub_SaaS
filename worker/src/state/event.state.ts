import { db } from "../infra/db.js";

export async function markProcessing(
  tenantId: string,
  provider: string,
  eventId: string
) {
  const res = await db.query(
    `
    UPDATE events_state
    SET status = 'PROCESSING',
        updated_at = NOW()
    WHERE tenant_id = $1
      AND provider = $2
      AND event_id = $3
      AND status = 'RECEIVED'
    RETURNING id
    `,
    [tenantId, provider, eventId]
  );

  return res.rowCount === 1;
}

export async function markDelivered(
  tenantId: string,
  provider: string,
  eventId: string
) {
  await db.query(
    `
    UPDATE events_state
    SET status = 'SUCCESS',
        updated_at = NOW()
    WHERE tenant_id = $1
      AND provider = $2
      AND event_id = $3
      AND status = 'PROCESSING'
    `,
    [tenantId, provider, eventId]
  );
}

export async function markFailed(
  tenantId: string,
  provider: string,
  eventId: string,
  reason: string
) {
  await db.query(
    `
    UPDATE events_state
    SET status = 'FAILED',
        error_reason = $4,
        retry_count = retry_count + 1,
        updated_at = NOW()
    WHERE tenant_id = $1
      AND provider = $2
      AND event_id = $3
    `,
    [tenantId, provider, eventId, reason]
  );
}
