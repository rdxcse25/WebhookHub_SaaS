import { PoolClient } from "pg";
import { db } from "../../infra/db.js";

/**
 * Processing states (shared contract with worker)
 */
export type EventStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "DLQ";

interface FindEventStateInput {
  tenantId: string;
  provider: string;
  eventId: string;
}

interface InsertRawEventInput {
  id: string;
  tenantId: string;
  provider: string;
  eventId: string;
  payload: unknown;
  schemaVersion: string;
}

interface InsertEventStateInput {
  id: string;
  tenantId: string;
  provider: string;
  eventId: string;
  status: EventStatus;
}

class WebhookRepository {
  /**
   * Check if an event already exists (IDEMPOTENCY)
   */
  async findEventState(input: FindEventStateInput) {
    const { tenantId, provider, eventId } = input;

    const res = await db.query(
      `
      SELECT status
      FROM events_state
      WHERE tenant_id = $1
        AND provider = $2
        AND event_id = $3
      `,
      [tenantId, provider, eventId]
    );

    return res.rows[0] ?? null;
  }

  /**
   * Insert raw webhook payload (IMMUTABLE SOURCE OF TRUTH)
   */
  async insertRawEvent(
    input: InsertRawEventInput,
    client?: PoolClient
  ): Promise<void> {
    const {
      id,
      tenantId,
      provider,
      eventId,
      payload,
      schemaVersion
    } = input;

    const executor = client ?? db;

    await executor.query(
      `
      INSERT INTO events_raw (
        id,
        tenant_id,
        provider,
        event_id,
        payload,
        schema_version
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        id,
        tenantId,
        provider,
        eventId,
        payload,
        schemaVersion
      ]
    );
  }

  /**
   * Insert initial processing state
   */
  async insertEventState(
    input: InsertEventStateInput,
    client?: PoolClient
  ): Promise<void> {
    const { id, tenantId, provider, eventId, status } = input;

    const executor = client ?? db;

    await executor.query(
      `
      INSERT INTO events_state (
        id,
        tenant_id,
        provider,
        event_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [id, tenantId, provider, eventId, status]
    );
  }

  /**
   * Run multiple operations atomically
   */
  async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export const webhookRepository = new WebhookRepository();
