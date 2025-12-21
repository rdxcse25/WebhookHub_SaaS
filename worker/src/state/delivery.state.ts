import { db } from "../infra/db.js";

export async function markDeliveryProcessing(deliveryId: string) {
  const res = await db.query(
    `
    UPDATE event_deliveries
    SET status = 'PROCESSING', updated_at = NOW()
    WHERE id = $1 AND status = 'PENDING'
    RETURNING id
    `,
    [deliveryId]
  );

  return res.rowCount === 1;
}

export async function markDeliverySuccess(deliveryId: string) {
  await db.query(
    `
    UPDATE event_deliveries
    SET status = 'SUCCESS', updated_at = NOW()
    WHERE id = $1
    `,
    [deliveryId]
  );
}

export async function markDeliveryFailed(
  deliveryId: string,
  reason: string
) {
  await db.query(
    `
    UPDATE event_deliveries
    SET status = 'FAILED',
        retry_count = retry_count + 1,
        last_error = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [deliveryId, reason]
  );
}
