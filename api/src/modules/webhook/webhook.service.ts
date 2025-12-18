import { v4 as uuidv4 } from "uuid";

import { webhookRepository } from "./webhook.repository.js";
import { publishEventToKafka } from "../../infra/kafka.js";
import { logger } from "../../infra/logger.js";

/**
 * Generic webhook ingestion input
 */
interface IngestWebhookEventInput {
  tenantId: string;
  provider: string;
  eventId: string;
  payload: unknown;
  eventType?: string;
}

class WebhookService {
  /**
   * Ingest webhook event in a transaction-safe manner
   */
  async ingestEvent(input: IngestWebhookEventInput): Promise<void> {
    const {
      tenantId,
      provider,
      eventId,
      payload,
      eventType
    } = input;

    let shouldPublishToKafka = false;

    /**
     * Step 1 + 2 (TRANSACTIONAL)
     *
     * - Check idempotency
     * - Insert raw event
     * - Insert initial state
     *
     * These MUST be atomic.
     */
    await webhookRepository.withTransaction(async (tx) => {
      const existing =
        await webhookRepository.findEventState(
          { tenantId, provider, eventId }
        );

      if (existing) {
        logger.info(
          { tenantId, provider, eventId },
          "Duplicate webhook event detected, skipping ingestion"
        );
        return;
      }

      // Insert immutable raw event
      await webhookRepository.insertRawEvent(
        {
          id: uuidv4(),
          tenantId,
          provider,
          eventId,
          payload,
          schemaVersion: "v1"
        },
        tx
      );

      // Insert initial processing state
      await webhookRepository.insertEventState(
        {
          id: uuidv4(),
          tenantId,
          provider,
          eventId,
          status: "RECEIVED"
        },
        tx
      );

      shouldPublishToKafka = true;
    });

    /**
     * Step 3 (OUTSIDE TRANSACTION)
     *
     * Kafka publish is NOT transactional with DB.
     * This is intentional and correct.
     */
    if (shouldPublishToKafka) {
      await publishEventToKafka({
        tenantId,
        provider,
        eventId,
        eventType,
        payload
      });

      logger.info(
        { tenantId, provider, eventId },
        "Webhook event ingested and published to Kafka"
      );
    }
  }
}

export const webhookService = new WebhookService();
