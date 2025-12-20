import { db } from "../infra/db.js";

export const dlqService = {
  async sendToDLQ(event: any, err: any) {
    await db.query(
      `
      INSERT INTO events_dlq (event_id, payload, error)
      VALUES ($1, $2, $3)
      `,
      [event.eventId, event.payload, err.message]
    );
  }
};
